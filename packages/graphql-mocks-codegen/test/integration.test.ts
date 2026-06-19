import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end smoke test that runs the real `@graphql-codegen/cli` against the
 * *built* plugin, loaded by package name. The CLI's default `graphql-codegen`
 * bin is CommonJS (`cjs/bin.js`), so it `require()`s the plugin — which is the
 * exact path that used to throw `No "exports" main defined` before the package
 * shipped a `require` (CJS) export. This guards that regression for real.
 */

const require = createRequire(import.meta.url);
const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = join(packageDir, 'test', '__integration_tmp__');
const PKG = '@vantreeseba/graphql-mocks-codegen';

/** Resolve the CLI's CommonJS bin (the one `npx graphql-codegen` invokes). */
function resolveCodegenBin(): string {
  const cliPkgPath = require.resolve('@graphql-codegen/cli/package.json');
  const cliPkg = JSON.parse(readFileSync(cliPkgPath, 'utf8')) as { bin: Record<string, string> };
  return join(dirname(cliPkgPath), cliPkg.bin['graphql-codegen']);
}

beforeAll(() => {
  // `npm test` can run before `npm run build` in CI, so build on demand — the
  // CLI loads the published `dist/`, not the TypeScript source.
  if (!existsSync(join(packageDir, 'dist', 'cjs', 'index.js'))) {
    execFileSync('npm', ['run', 'build'], { cwd: packageDir, stdio: 'inherit' });
  }
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
}, 120_000);

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('integration: loaded via require()', () => {
  it('resolves the package through the CJS (require) export', () => {
    expect(require.resolve(PKG)).toMatch(/dist[/\\]cjs[/\\]index\.js$/);
    const mod = require(PKG) as Record<string, unknown>;
    expect(typeof mod.plugin).toBe('function');
    expect(typeof mod.validate).toBe('function');
  });
});

describe('integration: real graphql-codegen CLI run', () => {
  it('generates a SchemaTypeMap end-to-end', () => {
    writeFileSync(
      join(tmpDir, 'schema.graphql'),
      `type Query { users: [User!]! }
       type User { id: ID! name: String! todos: [Todo!]! }
       type Todo { id: ID! title: String! user: User! }`,
    );
    writeFileSync(
      join(tmpDir, 'codegen.json'),
      JSON.stringify({
        schema: './schema.graphql',
        generates: {
          './out.ts': { plugins: ['typescript', PKG] },
        },
      }),
    );

    try {
      execFileSync(process.execPath, [resolveCodegenBin(), '--config', 'codegen.json'], {
        cwd: tmpDir,
        stdio: 'pipe',
      });
    } catch (err) {
      const e = err as { stdout?: Buffer; stderr?: Buffer };
      throw new Error(
        `graphql-codegen failed:\n${e.stdout?.toString() ?? ''}\n${e.stderr?.toString() ?? ''}`,
      );
    }

    const out = readFileSync(join(tmpDir, 'out.ts'), 'utf8');
    // The `typescript` plugin emitted the base types the map references...
    expect(out).toContain('export type User = {');
    // ...and our plugin emitted the SchemaTypeMap pointing at them.
    expect(out).toContain('export type SchemaTypeMap = {');
    expect(out).toContain('User: Types.User;');
    expect(out).toContain('Todo: Types.Todo;');
  }, 60_000);
});
