# @vantreeseba/graphql-mocks

Generate realistic, graph-connected mock data from a GraphQL schema using faker.

Relationships are wired as actual object references — `todo.user` is the same object as `mocks.User[i]`, not a copy. Useful for tests, Storybook stories, and demos.

## Install

```bash
npm install @vantreeseba/graphql-mocks
# peer deps
npm install graphql @faker-js/faker
```

## Usage

### Basic

```ts
import { buildMocks } from '@vantreeseba/graphql-mocks';
import { schema } from './schema'; // your GraphQLSchema

const mocks = buildMocks(schema);

mocks.User   // unknown[] — 5 User objects
mocks.Todo   // unknown[] — 5 Todo objects, each .user points into mocks.User
```

### SDL string input

```ts
const mocks = buildMocks(`
  type User { id: ID!, name: String!, email: String! }
  type Todo { id: ID!, title: String!, user: User! }
  type Query { users: [User!]! }
`);
```

### Count, seed, nullChance

```ts
const mocks = buildMocks(schema, {
  seed: 42,                                   // deterministic output
  count: { User: 10, Todo: 50, _default: 5 }, // per-type counts
  nullChance: 0.1,                            // 10% chance nullable fields are null
});
```

### Custom scalar mockers

```ts
import { faker } from '@faker-js/faker';

const mocks = buildMocks(schema, {
  faker,
  scalars: {
    DateTime: (f) => f.date.recent().toISOString(),
    CityName: (f) => f.location.city(),
    Rating:   (f) => f.number.int({ min: 1, max: 5 }),
  },
});
```

### Field overrides

```ts
const mocks = buildMocks(schema, {
  seed: 42,
  overrides: {
    User: {
      name:   () => 'Alice',
      avatar: (faker) => faker.image.avatar(), // receives the same seeded faker
    },
  },
});
```

Override functions are passed the generator's faker instance, so they stay deterministic under `seed` without importing a separate faker.

### `__typename` and stable ids

Every object gets a `__typename` by default (the Apollo cache needs it). Turn it off with `addTypename: false`. Enable `stableIds` to give each object with an `id` field a readable, collision-free `TypeName-<index>` id instead of a random scalar:

```ts
const mocks = buildMocks(schema, { stableIds: true });
mocks.User[0]; // { __typename: 'User', id: 'User-0', ... }
```

An explicit `overrides` entry for `id` still wins over `stableIds`.

### Interfaces / unions

```ts
const mocks = buildMocks(schema, {
  resolveType: (abstractTypeName) => {
    if (abstractTypeName === 'SearchResult') return 'Post';
    return 'User';
  },
});
```

### Helpers

```ts
// Find a specific item. With a typed map (see Typed pools) the item is inferred:
const user = mocks.find('User', (u) => u.id === targetId);
// Without a typed map, pass the type explicitly:
const user2 = mocks.find<User>('User', (u) => u.id === targetId);

// Apollo Server / GraphQL Yoga mock resolvers
const resolvers = mocks.toResolvers();
// { User: () => <random User from pool>, Todo: () => <random Todo>, ... }
addMocksToSchema({ schema, mocks: resolvers });

// Resolve a query/mutation against the graph — data is shaped to the selection set.
// Root fields are picked from the pools by return type; nested fields follow the
// already-wired references. No need to assemble the response by hand.
const data = mocks.dataForOperation(UserByIdQuery);
// { user: { id, name, posts: [{ id, author: { id } }] } } — exactly the fields queried
```

`dataForOperation` understands lists, fragments, and interface/union fields (resolved via each mock's `__typename`). Variables don't influence which mocks are chosen, so they're optional — any required ones are auto-filled with placeholders just so execution succeeds. With a `TypedDocumentNode` the return type is inferred from the document.

## Apollo `MockedProvider`

These helpers turn a `TypedDocumentNode` into an entry for Apollo's `MockedProvider` `mocks` array — no hand-written `request`/`result` boilerplate.

The `*FromPool` variants need **no data argument at all**: they resolve the result straight from a `MockResult` graph (via `dataForOperation`), so the query's own selection set decides which mocks come back. Point them at the same `mocks` you built from the schema:

```tsx
import { MockedProvider } from '@apollo/client/testing';
import { buildMocks, mockOperationFromPool } from '@vantreeseba/graphql-mocks';
import { AwardByIdQuery } from './graphql';

const mocks = buildMocks<SchemaTypeMap>(schema);

render(
  <MockedProvider mocks={[mockOperationFromPool(mocks, AwardByIdQuery)]}>
    <AwardCard />
  </MockedProvider>,
);
```

Prefer to supply the data yourself? `mockOperation` takes the result data directly; the result/variables types are inferred from the document, so `data` is type-checked against the operation's result type:

```ts
import { mockOperation } from '@vantreeseba/graphql-mocks';

mockOperation(AwardByIdQuery, { award: mockAwards[0], __typename: 'Query' });
```

By default a mock matches **any** variables and may be used any number of times (`maxUsageCount: Infinity`). Override per call when you need exact matching, a delay, or an error (the same `options` apply to every helper here):

```ts
mockOperationFromPool(mocks, AwardByIdQuery, {
  variables: { id: 'Award-0' }, // exact match (or a predicate (vars) => boolean)
  delay: 50,
  maxUsageCount: 1,
});
```

For the common "success / loading / error" trio, `mockOperationVariants` (data passed in) and `mockOperationVariantsFromPool` (data from the graph) return all three at once:

```ts
import { mockOperationVariantsFromPool } from '@vantreeseba/graphql-mocks';

const m = mockOperationVariantsFromPool(mocks, AwardByIdQuery);
m.withResults;      // resolves with data drawn from the pool
m.withLongLoadTime; // stays pending — drive loading states
m.withError;        // rejects with an error naming the operation
```

`@graphql-typed-document-node/core` (bundled with Apollo Client and graphql-codegen) provides the `TypedDocumentNode` type; it's an optional peer, only needed if you use these helpers.

## Typed pools

Pools are `unknown[]` by default — the type names and shapes only exist at runtime (in the schema), so they can't be inferred from the `schema` argument. Pass an optional `TTypes` map to declare them and the matching pools come back typed, no cast needed:

```ts
const mocks = buildMocks<{ User: User; Todo: Todo }>(schema);

mocks.User // User[]
mocks.Todo // Todo[]
mocks.Other // still unknown[] — any type not in the map falls back
```

### Auto-typing with GraphQL Code Generator

Rather than hand-maintaining the map, generate it from the schema so every type is typed automatically. Add a tiny custom plugin that emits a `name → type` map alongside the standard `typescript` plugin:

```js
// codegen/type-map-plugin.cjs
const { isObjectType } = require('graphql');

module.exports.plugin = (schema) => {
  // Exclude root operation types — you don't mock Query/Mutation/Subscription as pools.
  const roots = new Set(
    [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()]
      .filter(Boolean)
      .map((t) => t.name),
  );

  const names = Object.values(schema.getTypeMap())
    .filter((t) => isObjectType(t) && !t.name.startsWith('__') && !roots.has(t.name))
    .map((t) => t.name)
    .sort();

  return {
    content: `export type SchemaTypeMap = {\n${names
      .map((n) => `  ${n}: ${n};`)
      .join('\n')}\n};\n`,
  };
};
```

Run it right after `typescript` so the referenced types are defined in the same file:

```ts
// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  generates: {
    './src/generated/graphql.ts': {
      plugins: ['typescript', './codegen/type-map-plugin.cjs'],
    },
  },
};

export default config;
```

This produces:

```ts
export type SchemaTypeMap = {
  Todo: Todo;
  User: User;
  // ...every object type
};
```

Use it as the default type parameter on your own wrapper so callers get typed pools with zero annotation:

```ts
import { buildMocks, type BuildMocksOptions, type MockResult } from '@vantreeseba/graphql-mocks';
import type { SchemaTypeMap } from './generated/graphql';

export function getMocks<
  TTypes extends Record<string, unknown> = SchemaTypeMap,
>(options?: BuildMocksOptions<TTypes>): MockResult<TTypes> {
  return buildMocks<TTypes>(schemaSDL, options);
}

getMocks().User // User[] — no generic, no cast
getMocks<{ User: UserFragment }>().User // override per-call when you want a fragment shape
```

The generated `typescript` types add `__typename?: 'User'` by default and wrap nullable fields as `Maybe<T>`, which lines up with the mock output (with `nullChance: 0`, nothing is null). For typed one-off lookups without the map, `find<User>('User', …)` also works.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count` | `number \| { [type]: number, _default?: number }` | `5` | Instances per type |
| `faker` | `Faker` | internal | Custom faker instance (e.g. locale) |
| `seed` | `number` | — | Seed faker for deterministic output |
| `nullChance` | `number` | `0` | Probability (0–1) nullable fields are `null` |
| `scalars` | `Record<string, (faker) => unknown>` | — | Custom scalar mockers (merged over defaults) |
| `overrides` | `Record<type, Record<field, (faker) => unknown>>` | — | Per-field replacement functions (receive the seeded faker). With a `TTypes` map, type/field keys autocomplete and each return type is bound to the field's type |
| `resolveType` | `(abstractType: string) => string` | — | Concrete type for interface/union fields. With a `TTypes` map, the return is constrained to the map's type names |
| `addTypename` | `boolean` | `true` | Add `__typename` to every object (Apollo cache needs it) |
| `stableIds` | `boolean` | `false` | Give `id` fields stable `TypeName-<index>` values |
