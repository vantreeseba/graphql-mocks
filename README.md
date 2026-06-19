# graphql-mocks

A monorepo for the `@vantreeseba/graphql-mocks` toolkit — realistic,
graph-connected mock data from a GraphQL schema.

## Packages

| Package | Description |
|---|---|
| [`@vantreeseba/graphql-mocks`](./packages/graphql-mocks) | The runtime: generate interconnected mock objects from a `GraphQLSchema` (or SDL) using faker. See its [README](./packages/graphql-mocks/README.md). |
| [`@vantreeseba/graphql-mocks-codegen`](./packages/graphql-mocks-codegen) | A GraphQL Code Generator plugin that emits a `SchemaTypeMap` for typing mock pools. See its [README](./packages/graphql-mocks-codegen/README.md). |

## Development

This is an npm-workspaces monorepo.

```bash
npm install
npm run build        # build every package
npm test             # test every package
npm run typecheck    # type-check every package
npm run typecheck:tests
npm run check        # biome lint + format check (whole repo)
```

Run a script in a single package with `-w`:

```bash
npm run test -w packages/graphql-mocks-codegen
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and
drive a single, repo-wide release via
[semantic-release](https://semantic-release.gitbook.io/): one version and tag for
the whole repo, with every package published together at that version.
