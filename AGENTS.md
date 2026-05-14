# AGENTS.md

## Project

`@vantreeseba/graphql-mocks` — Generate realistic, graph-connected mock data from a GraphQL schema using faker.

## Purpose

Takes a `GraphQLSchema` (or SDL string), introspects all object types, and produces a set of interconnected mock objects where relationships are honored — e.g. `User.todos` references actual mocked `Todo` objects, and `Todo.user` points back to a `User`. Useful for tests, demos, and Storybook mocking.

## Specifications

All feature requirements and API contracts are in [specifications.md](./specifications.md).

## Stack

- **Language:** TypeScript 5, strict mode, ESM only
- **Tests:** Vitest + `@vitest/coverage-v8` (`npm test`, `npm run coverage`)
- **Formatting/linting:** Biome (`npm run check`)
- **Build:** `tsc` (`npm run build`) — outputs to `dist/`
- **Peer deps:** `graphql >=16`, `@faker-js/faker >=9`
- **Optional peer dep:** `graphql-scalars ^1.23` (scalar names from this package are recognized by convention; the library is not imported at runtime)
- **No lodash** — inline any string utilities needed

## Project structure

```
src/
  index.ts              — public API entry point
  mockSchema.ts         — main buildMocks() function
  scalarMockers.ts      — default scalar → faker mapping
  typeMocker.ts         — per-type field mock generator
  graphBuilder.ts       — assembles cross-type relationships into a graph
  helpers.ts            — utility functions
  types.ts              — all public TypeScript types

  test/
    schema.ts           — test GraphQL schema (rich, with custom scalars)
  *.test.ts             — tests live alongside source modules
```

## Key conventions

- All exports go through `src/index.ts`
- Default scalar mockers: `String → faker.lorem.word()`, `Int → faker.number.int()`, etc.
- Unknown scalars fall back to `faker.lorem.word()` and emit `console.warn`
- Custom scalar names (e.g. `CityName`, `EmailAddress`) map to semantic faker calls
- Nullable fields have a configurable chance of being `null` (default 0)
- Scalar list fields generate 1–3 items; relationship list fields generate 1–5 items
- Circular references are resolved: back-references point to already-generated objects, not new ones
- User scalar overrides merge over the default map (user wins)
- Coverage target: ≥90% lines/branches

## Running locally

```bash
npm install
npm test            # run vitest (single pass)
npm run test:watch  # vitest watch mode
npm run coverage    # vitest with v8 coverage
npm run build       # compile to dist/
npm run check       # biome lint + format check
```

## Commit conventions

Follow semantic commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`.

## Git workflow

- **Never rebase.** Always integrate remote changes with a merge commit:
  ```bash
  git pull --no-rebase   # merge, not rebase
  git push
  ```
- Fast-forward is fine when it applies naturally; use `--no-rebase` to ensure merge
  semantics when the remote has diverged.
