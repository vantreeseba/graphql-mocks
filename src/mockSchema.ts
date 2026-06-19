import { GraphQLSchema, buildSchema } from 'graphql';
import { buildGraph } from './graphBuilder.js';
import type { BuildMocksOptions, MockResult } from './types.js';

/**
 * Generate a pool of interconnected mock objects from a GraphQL schema.
 *
 * @param schema - A compiled `GraphQLSchema` or an SDL string.
 * @param options - Optional configuration (count, faker, seed, scalars, overrides, etc.).
 * @returns A `MockResult` with pools keyed by type name plus `find()` and `toResolvers()` helpers.
 *
 * @typeParam TTypes - Optional map of type name → object shape. When supplied, the matching
 * pools come back typed (`mocks.User` is `User[]`) instead of `unknown[]`, removing the need
 * to cast at the call site:
 *
 * ```ts
 * const mocks = buildMocks<{ User: UserFragment }>(schema, { count: { User: 40 } });
 * const users = mocks.User; // UserFragment[]
 * ```
 */
export function buildMocks<TTypes extends Record<string, unknown> = Record<string, unknown>>(
  schema: GraphQLSchema | string,
  options: BuildMocksOptions = {},
): MockResult<TTypes> {
  let resolvedSchema: GraphQLSchema;

  if (typeof schema === 'string') {
    resolvedSchema = buildSchema(schema);
  } else if (schema instanceof GraphQLSchema) {
    resolvedSchema = schema;
  } else {
    throw new TypeError(
      '[graphql-mocks] buildMocks() expects a GraphQLSchema instance or an SDL string',
    );
  }

  return buildGraph(resolvedSchema, options) as MockResult<TTypes>;
}
