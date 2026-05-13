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
  overrides: {
    User: {
      name:  () => 'Alice',
      email: () => 'alice@example.com',
    },
  },
});
```

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
// Find a specific item
const user = mocks.find<User>('User', (u) => u.id === targetId);

// Apollo Server / GraphQL Yoga mock resolvers
const resolvers = mocks.toResolvers();
// { User: () => <random User from pool>, Todo: () => <random Todo>, ... }
addMocksToSchema({ schema, mocks: resolvers });
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count` | `number \| { [type]: number, _default?: number }` | `5` | Instances per type |
| `faker` | `Faker` | internal | Custom faker instance (e.g. locale) |
| `seed` | `number` | — | Seed faker for deterministic output |
| `nullChance` | `number` | `0` | Probability (0–1) nullable fields are `null` |
| `scalars` | `Record<string, (faker) => unknown>` | — | Custom scalar mockers (merged over defaults) |
| `overrides` | `Record<type, Record<field, () => unknown>>` | — | Per-field replacement functions |
| `resolveType` | `(abstractType: string) => string` | — | Concrete type for interface/union fields |

See [specifications.md](./specifications.md) for the full API contract and built-in scalar mocker list.
