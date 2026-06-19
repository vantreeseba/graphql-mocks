import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { plugin, validate } from '../src/index.js';

const schema = buildSchema(`
  type Query { users: [User!]! }
  type Mutation { addUser(name: String!): User! }

  type User {
    id: ID!
    name: String!
    todos: [Todo!]!
  }

  type Todo {
    id: ID!
    title: String!
    user: User!
  }

  scalar DateTime
  enum Role { ADMIN USER }
`);

/** The plugin returns `{ prepend, content }`; flatten it to a single string for assertions. */
function render(...args: Parameters<typeof plugin>) {
  const out = plugin(...args) as { prepend: string[]; content: string };
  return [...out.prepend, '', out.content].join('\n');
}

describe('plugin', () => {
  it('emits a SchemaTypeMap of the object types', () => {
    const code = render(schema, [], {});
    expect(code).toContain("import type * as Types from './graphql';");
    expect(code).toContain('export type SchemaTypeMap = {');
    expect(code).toContain('User: Types.User;');
    expect(code).toContain('Todo: Types.Todo;');
  });

  it('excludes root operation types, introspection, scalars and enums', () => {
    const code = render(schema, [], {});
    expect(code).not.toContain('Query:');
    expect(code).not.toContain('Mutation:');
    expect(code).not.toMatch(/__\w/);
    expect(code).not.toContain('DateTime:');
    expect(code).not.toContain('Role:');
  });

  it('sorts entries deterministically', () => {
    const code = render(schema, [], {});
    expect(code.indexOf('Todo:')).toBeLessThan(code.indexOf('User:'));
  });

  it('honors the configured naming convention for the value side', () => {
    const code = render(schema, [], { namingConvention: 'change-case-all#upperCase' });
    // Key stays the raw runtime type name; value follows the naming convention.
    expect(code).toContain('User: Types.USER;');
    expect(code).toContain('Todo: Types.TODO;');
  });

  it('respects config overrides', () => {
    const code = render(schema, [], {
      typeMapName: 'MockTypes',
      typesImportPath: '../gen/types',
      typesNamespace: 'Gen',
    });
    expect(code).toContain("import type * as Gen from '../gen/types';");
    expect(code).toContain('export type MockTypes = {');
    expect(code).toContain('User: Gen.User;');
  });

  it('emits an empty object literal for a schema with no object types', () => {
    const empty = buildSchema('scalar DateTime');
    const code = render(empty, [], {});
    expect(code).toContain('export type SchemaTypeMap = {};');
  });

  it('falls back to defaults when config is undefined', () => {
    const code = render(schema, [], undefined as never);
    expect(code).toContain("import type * as Types from './graphql';");
    expect(code).toContain('User: Types.User;');
  });
});

describe('validate', () => {
  it('accepts string config values', async () => {
    await expect(validate(schema, [], { typeMapName: 'X' }, 'out.ts', [])).resolves.toBeUndefined();
  });

  it('accepts an empty config', async () => {
    await expect(validate(schema, [], {}, 'out.ts', [])).resolves.toBeUndefined();
  });

  it('accepts an undefined config', async () => {
    await expect(validate(schema, [], undefined as never, 'out.ts', [])).resolves.toBeUndefined();
  });

  it('rejects non-string config values', async () => {
    await expect(validate(schema, [], { typeMapName: 123 }, 'out.ts', [])).rejects.toThrow(
      /must be a string/,
    );
  });
});
