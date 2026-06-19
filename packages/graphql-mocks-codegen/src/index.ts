/**
 * A [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) plugin that
 * emits a `SchemaTypeMap` — a `{ TypeName: GeneratedType }` map of every object
 * type in your schema — so you can hand it to
 * [`@vantreeseba/graphql-mocks`](../graphql-mocks)'s `buildMocks<TTypes>` and get
 * typed mock pools back without a cast:
 *
 * ```ts
 * import { buildMocks } from '@vantreeseba/graphql-mocks';
 * import type { SchemaTypeMap } from './__generated__/schema-type-map';
 *
 * const mocks = buildMocks<SchemaTypeMap>(schema);
 * mocks.User; // User[] — typed, no cast
 * ```
 *
 * The map KEY is the raw GraphQL type name (what the mock pools are keyed by at
 * runtime, e.g. `AWS_Address`); the VALUE references the generated TS type, whose
 * name comes from codegen's own naming convention via `convertFactory`, so the
 * references stay correct even if the naming convention changes.
 *
 * Run it pointed at the same generated types file your `typescript` plugin /
 * `client` preset emits (default import path `./graphql`).
 *
 * @packageDocumentation
 */

import type { PluginFunction, PluginValidateFn } from '@graphql-codegen/plugin-helpers';
import { type NamingConvention, convertFactory } from '@graphql-codegen/visitor-plugin-common';
import { type GraphQLSchema, isObjectType } from 'graphql';

/** Configuration for the {@link plugin}. Every field has a sensible default. */
export interface GraphqlMocksPluginConfig {
  /** Name of the generated type-map type. Default `SchemaTypeMap`. */
  typeMapName?: string;
  /** Module path the generated TS types are imported from. Default `./graphql`. */
  typesImportPath?: string;
  /** Namespace alias the generated types are imported under. Default `Types`. */
  typesNamespace?: string;
  /**
   * The codegen naming convention used to derive generated TS type names from
   * GraphQL type names. Set this to match the convention used by the `typescript`
   * plugin / `client` preset producing `typesImportPath`. Passed straight to
   * codegen's `convertFactory`.
   */
  namingConvention?: NamingConvention;
}

const DEFAULTS = {
  typeMapName: 'SchemaTypeMap',
  typesImportPath: './graphql',
  typesNamespace: 'Types',
} satisfies Required<
  Pick<GraphqlMocksPluginConfig, 'typeMapName' | 'typesImportPath' | 'typesNamespace'>
>;

/**
 * The schema's mockable object type names: every object type, excluding the root
 * operation types (Query/Mutation/Subscription) — which aren't mocked as pools —
 * and introspection types (`__*`), sorted for deterministic output.
 */
function objectTypeNames(schema: GraphQLSchema): string[] {
  const roots = new Set(
    [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()]
      .filter((type): type is NonNullable<typeof type> => type != null)
      .map((type) => type.name),
  );
  return Object.values(schema.getTypeMap())
    .filter((type) => isObjectType(type) && !type.name.startsWith('__') && !roots.has(type.name))
    .map((type) => type.name)
    .sort();
}

export const plugin: PluginFunction<GraphqlMocksPluginConfig> = (schema, _documents, config) => {
  const opts = { ...DEFAULTS, ...config };
  // `convertFactory` maps a GraphQL type name to its generated TS type name using
  // codegen's own naming convention (read from `config`), so we don't hard-code it.
  const convert = convertFactory(config ?? {});
  const names = objectTypeNames(schema);

  const entries = names
    .map((name) => `  ${name}: ${opts.typesNamespace}.${convert(name)};`)
    .join('\n');
  const body = entries ? `{\n${entries}\n}` : '{}';

  return {
    prepend: [`import type * as ${opts.typesNamespace} from '${opts.typesImportPath}';`],
    content: `export type ${opts.typeMapName} = ${body};\n`,
  };
};

export const validate: PluginValidateFn = async (_schema, _documents, config) => {
  for (const key of ['typeMapName', 'typesImportPath', 'typesNamespace'] as const) {
    const value = config?.[key];
    if (value !== undefined && typeof value !== 'string') {
      throw new Error(`graphql-mocks-codegen: config option \`${key}\` must be a string.`);
    }
  }
};
