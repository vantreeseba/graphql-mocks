// Mark dist/cjs as a CommonJS scope. The package root is `"type": "module"`,
// so without this the CJS files emitted into dist/cjs would be parsed as ESM
// and fail to load under `require()` (the exact failure the dual build fixes).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cjsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cjs');
writeFileSync(join(cjsDir, 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
