# Specifications — @vantreeseba/graphql-mocks

## Purpose

Generate a pool of realistic, interconnected mock objects from a GraphQL schema. Useful for tests, Storybook stories, and demos where you want schema-accurate data with proper cross-type references (graph structure, not trees).

---

## Public API

### `buildMocks(schema, options?)`

```typescript
import { buildMocks } from '@vantreeseba/graphql-mocks';

const mocks = buildMocks(schema, options);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `GraphQLSchema \| string` | A compiled schema object or SDL string |
| `options` | `BuildMocksOptions` | Optional. See below. |

**Returns:** `MockResult` — a plain object keyed by type name, with `find()` and `toResolvers()` helpers attached.

---

### `BuildMocksOptions`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `count` | `number \| CountConfig` | `5` | Number of instances per type. Either a flat number or a per-type map. |
| `faker` | `Faker` | internal singleton | A custom Faker instance (e.g. with a specific locale). |
| `seed` | `number` | — | Seeds the faker instance for deterministic output. Applied to `options.faker` if provided. |
| `nullChance` | `number` | `0` | Probability (0–1) that a nullable field is set to `null`. |
| `scalars` | `Record<string, ScalarMocker>` | — | Per-scalar mocker overrides. Merged over defaults; user wins. |
| `overrides` | `Record<string, Record<string, FieldOverrideFn>>` | — | Per-type, per-field replacement functions. Called once per instance. |
| `resolveType` | `(abstractTypeName: string) => string` | — | Required when the schema has interface or union fields. Returns the concrete type name to use. |

**`CountConfig` shape:**
```typescript
type CountConfig = number | { _default?: number; [typeName: string]: number | undefined };
// Examples:
count: 10                                     // 10 of every type
count: { User: 10, Todo: 30, _default: 5 }   // per-type with fallback
```

---

### `MockResult`

```typescript
type MockResult = Record<string, unknown[]> & {
  find<T = unknown>(typeName: string, predicate: (item: T) => boolean): T | undefined;
  toResolvers(): Record<string, () => unknown>;
};
```

**Pool access:**
```typescript
mocks.User   // unknown[] — all mocked User instances (cast to User[] as needed)
mocks.Todo   // unknown[] — all mocked Todo instances
```

**`find<T>(typeName, predicate)`** — Look up an item from the pool.
```typescript
const user = mocks.find<User>('User', u => u.id === targetId);
```

**`toResolvers()`** — Returns `{ TypeName: () => randomItemFromPool }` for each mocked type. Compatible with Apollo Server's `mocks` option and GraphQL Yoga's `useMockSchema`.
```typescript
const resolvers = mocks.toResolvers();
// resolvers.User() → a random User from the pool
// resolvers.Todo() → a random Todo from the pool
```

---

## Graph construction (two-pass algorithm)

1. **Pass 1 — scalars:** Generate N instances of each non-operation object type. Only scalar and enum fields are populated. Relationship fields are left empty.

2. **Pass 2 — relationships:** For each instance, wire up relationship fields by picking from the pools built in pass 1. This prevents infinite recursion and ensures cross-references point to the same objects (true graph, not a tree).

**Key consequence:** `User.todos[0].user === mocks.User[someIndex]`. References are the exact same objects — not copies.

---

## Mocked types

All `GraphQLObjectType` instances are mocked **except:**
- `Query`
- `Mutation`
- `Subscription`
- Internal types prefixed with `__`

---

## Scalar mocker defaults

Built-in scalar → faker mapping (user overrides win):

| Scalar | Faker call |
|--------|-----------|
| `String` | `faker.lorem.word()` |
| `Int` | `faker.number.int({ min: 1, max: 1000 })` |
| `Float` | `faker.number.float(...)` |
| `Boolean` | `faker.datatype.boolean()` |
| `ID` | `faker.string.uuid()` |
| `DateTime` / `DateTimeISO` | `faker.date.recent().toISOString()` |
| `Date` | ISO date string (date part only) |
| `Time` | ISO time string (time part only) |
| `EmailAddress` | `faker.internet.email()` |
| `URL` | `faker.internet.url()` |
| `PhoneNumber` | `faker.phone.number()` |
| `UUID` / `GUID` | `faker.string.uuid()` |
| `CityName` | `faker.location.city()` |
| `CountryCode` | `faker.location.countryCode()` |
| `CountryName` | `faker.location.country()` |
| `PostalCode` | `faker.location.zipCode()` |
| `Latitude` / `Longitude` | `faker.location.latitude/longitude()` |
| `IPv4` / `IPv6` / `MAC` / `Port` | faker.internet counterparts |
| `HexColorCode` | `faker.color.rgb({ format: 'hex' })` |
| `Slug` | slugified lorem words |
| `Rating` | `faker.number.int({ min: 1, max: 5 })` |
| `Currency` | `faker.finance.currencyCode()` |
| `JSON` / `JSONObject` | `{ key: lorem, value: lorem }` |
| `BigInt` | `BigInt(...)` |
| Any unknown scalar | `faker.lorem.word()` + `console.warn` |

Custom scalars like `CityName`, `Slug`, `Rating` are included in the defaults by name-based detection. Extend via the `scalars` option for any scalar not in this list.

---

## Nullability

- **Required fields** (`Type!`): always populated.
- **Nullable fields** (`Type`): populated by default (`nullChance: 0`).
- With `nullChance: 0.2`, each nullable field independently has a 20% chance of being `null`.

---

## List fields

- **Scalar list fields** (`[String!]!`): 1–3 items by default.
- **Relationship list fields** (`[User!]!`): 1–5 items picked from the related type's pool.

---

## Interfaces and unions

When a field returns an abstract type (interface or union), you must provide `resolveType`:

```typescript
const mocks = buildMocks(schema, {
  resolveType: (abstractTypeName) => {
    if (abstractTypeName === 'SearchResult') return 'Post';
    return 'User';
  },
});
```

Without `resolveType`, abstract fields are set to `null` and a `console.warn` is emitted.

---

## Field overrides

```typescript
const mocks = buildMocks(schema, {
  overrides: {
    User: {
      name: () => 'Alice',
      email: () => 'alice@example.com',
    },
  },
});
```

Override functions are called once per object instance, replacing the generated value wholesale. They take priority over scalar mockers and `nullChance`.

---

## Scalar overrides

```typescript
const mocks = buildMocks(schema, {
  scalars: {
    CityName: (faker) => faker.location.city(),
    MyCustomScalar: () => 'constant-value',
  },
});
```

Merged over the default scalar map; user wins on conflicts.

---

## Faker control

```typescript
import { faker } from '@faker-js/faker/locale/de';

// Use a custom locale
const mocks = buildMocks(schema, { faker });

// Seed for reproducible tests
const mocks = buildMocks(schema, { seed: 42 });

// Both: seed a custom instance
const mocks = buildMocks(schema, { faker, seed: 42 });
```

---

## Exported utilities

```typescript
import { defaultScalarMockers, resolveScalarMocker } from '@vantreeseba/graphql-mocks';
```

- **`defaultScalarMockers`** — The built-in scalar mocker map. Useful for inspecting or extending defaults.
- **`resolveScalarMocker(name, userScalars)`** — Returns the mocker for a scalar name (user override first, then default, then `undefined`).
