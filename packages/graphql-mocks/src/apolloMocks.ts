import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type DocumentNode, Kind } from 'graphql';
import type { MockResult } from './types.js';

/** The subset of a `MockResult` these helpers need: the operation resolver. */
type OperationDataSource = Pick<MockResult, 'dataForOperation'>;

/** Concrete variables for data resolution (a matcher function can't drive pool selection). */
function variablesForData<TVars>(
  variables: TVars | VariableMatcher<TVars> | undefined,
): TVars | undefined {
  return typeof variables === 'function' ? undefined : variables;
}

/**
 * Predicate form of `request.variables` — Apollo invokes it with the incoming
 * variables and uses the boolean to decide whether the mock matches.
 */
export type VariableMatcher<TVars> = (variables: TVars) => boolean;

/**
 * A single entry in Apollo's `MockedProvider` `mocks` array (Apollo Client v4's
 * `MockLink.MockedResponse`), reproduced structurally so this package keeps a
 * type-only relationship to `@apollo/client` — there is no runtime dependency on
 * Apollo. The returned objects are assignable straight into `mocks={[...]}`.
 */
export interface MockedResponse<TData = unknown, TVars = unknown> {
  request: {
    query: DocumentNode;
    variables?: TVars | VariableMatcher<TVars>;
  };
  result?: { data?: TData };
  error?: Error;
  delay?: number;
  maxUsageCount?: number;
}

export interface MockOperationOptions<TVars = unknown> {
  /**
   * Variables to match: concrete variables for an exact match, or a predicate.
   * Defaults to a predicate that matches any variables, so a mock satisfies the
   * operation regardless of the variables it is called with.
   */
  variables?: TVars | VariableMatcher<TVars>;
  /** Artificial delay in milliseconds before the result resolves. */
  delay?: number;
  /** Resolve with this error instead of data. */
  error?: Error;
  /**
   * How many times the mock may be matched before Apollo warns on an extra use.
   * Defaults to `Infinity` so one mock covers any number of renders/refetches.
   */
  maxUsageCount?: number;
}

/** Delay (ms) used by the `withLongLoadTime` variant to keep a query pending. */
const LONG_LOAD_DELAY_MS = 1_000_000;

/** Default `request.variables` matcher: accept whatever variables the query is called with. */
const matchAnyVariables: VariableMatcher<unknown> = () => true;

/** Pull the operation name out of a document for diagnostics; undefined if anonymous. */
function operationName(document: DocumentNode): string | undefined {
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION && definition.name) {
      return definition.name.value;
    }
  }
  return undefined;
}

/**
 * Build a single Apollo `MockedProvider` mock for a query or mutation.
 *
 * @param operation - A `TypedDocumentNode` (query or mutation) — the result/variables
 * types are inferred from it, so `data` is checked against the operation's result type.
 * @param data - The mocked result data returned for the operation.
 * @param options - Optional `variables`/`delay`/`error`/`maxUsageCount` overrides.
 *
 * ```ts
 * import { MockedProvider } from '@apollo/client/testing';
 * import { mockOperation } from '@vantreeseba/graphql-mocks';
 *
 * const mocks = [mockOperation(AwardByIdQuery, { award: mockAwards[0], __typename: 'Query' })];
 * <MockedProvider mocks={mocks}>…</MockedProvider>
 * ```
 */
export function mockOperation<TData, TVars>(
  operation: TypedDocumentNode<TData, TVars>,
  data: TData,
  options: MockOperationOptions<TVars> = {},
): MockedResponse<TData, TVars> {
  return {
    request: {
      query: operation,
      variables: options.variables ?? (matchAnyVariables as VariableMatcher<TVars>),
    },
    result: { data },
    error: options.error,
    delay: options.delay,
    maxUsageCount: options.maxUsageCount ?? Number.POSITIVE_INFINITY,
  };
}

export interface MockOperationVariants<TData, TVars> {
  /** Resolves immediately with `data`. */
  withResults: MockedResponse<TData, TVars>;
  /** Stays pending (very long delay) — drive loading states. */
  withLongLoadTime: MockedResponse<TData, TVars>;
  /** Rejects with an error — drive error states. */
  withError: MockedResponse<TData, TVars>;
}

/**
 * Build the common trio of mocks for one operation: a success, a perpetually-loading,
 * and an error variant. Mirrors the typical hand-rolled `MockQueries` helper so a test
 * can pick the state it needs:
 *
 * ```ts
 * const m = mockOperationVariants(AwardByIdQuery, awardData);
 * // <MockedProvider mocks={[m.withResults]} /> | m.withLongLoadTime | m.withError
 * ```
 *
 * `withError` uses `options.error` when provided, otherwise a generated error naming the
 * operation. The same applies to queries and mutations.
 */
export function mockOperationVariants<TData, TVars>(
  operation: TypedDocumentNode<TData, TVars>,
  data: TData,
  options: MockOperationOptions<TVars> = {},
): MockOperationVariants<TData, TVars> {
  return {
    withResults: mockOperation(operation, data, options),
    withLongLoadTime: mockOperation(operation, data, { ...options, delay: LONG_LOAD_DELAY_MS }),
    withError: mockOperation(operation, data, {
      ...options,
      error:
        options.error ??
        new Error(
          `[graphql-mocks] mock error for operation "${operationName(operation) ?? 'anonymous'}"`,
        ),
    }),
  };
}

/**
 * Like {@link mockOperation}, but the result data is resolved automatically from a
 * `MockResult` pool (via `mocks.dataForOperation`) instead of being passed in — the query's
 * selection set selects matching mocks from the graph.
 *
 * ```ts
 * const mocks = buildMocks(schema);
 * const awardMock = mockOperationFromPool(mocks, AwardByIdQuery);
 * ```
 */
export function mockOperationFromPool<TData, TVars>(
  mocks: OperationDataSource,
  operation: TypedDocumentNode<TData, TVars>,
  options: MockOperationOptions<TVars> = {},
): MockedResponse<TData, TVars> {
  const data = mocks.dataForOperation(operation, variablesForData(options.variables) as never);
  return mockOperation(operation, data, options);
}

/**
 * Like {@link mockOperationVariants}, but the success data is resolved automatically from a
 * `MockResult` pool instead of being passed in.
 */
export function mockOperationVariantsFromPool<TData, TVars>(
  mocks: OperationDataSource,
  operation: TypedDocumentNode<TData, TVars>,
  options: MockOperationOptions<TVars> = {},
): MockOperationVariants<TData, TVars> {
  const data = mocks.dataForOperation(operation, variablesForData(options.variables) as never);
  return mockOperationVariants(operation, data, options);
}
