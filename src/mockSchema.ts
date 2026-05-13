import { GraphQLSchema, buildSchema } from 'graphql';
import { buildGraph } from './graphBuilder.js';
import type { BuildMocksOptions, MockResult } from './types.js';

/**
 * Generate a pool of interconnected mock objects from a GraphQL schema.
 *
 * @param schema - A compiled `GraphQLSchema` or an SDL string.
 * @param options - Optional configuration (count, faker, seed, scalars, overrides, etc.).
 * @returns A `MockResult` with pools keyed by type name plus `find()` and `toResolvers()` helpers.
 */
export function buildMocks(
  schema: GraphQLSchema | string,
  options: BuildMocksOptions = {},
): MockResult {
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

  return buildGraph(resolvedSchema, options);
}
