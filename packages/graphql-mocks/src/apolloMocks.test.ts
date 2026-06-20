import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { mockOperation, mockOperationVariants } from './apolloMocks.js';

type AwardData = { award: { id: string } | null };
type AwardVars = { id: string };

const AwardByIdQuery = parse(
  'query AwardById($id: ID!) { award(id: $id) { id } }',
) as TypedDocumentNode<AwardData, AwardVars>;

const AnonymousQuery = parse('{ award { id } }') as TypedDocumentNode<AwardData, AwardVars>;

const data: AwardData = { award: { id: 'Award-0' } };

describe('mockOperation', () => {
  it('produces a MockedProvider entry with the query and data', () => {
    const mock = mockOperation(AwardByIdQuery, data);
    expect(mock.request.query).toBe(AwardByIdQuery);
    expect(mock.result).toEqual({ data });
    expect(mock.error).toBeUndefined();
    expect(mock.delay).toBeUndefined();
  });

  it('defaults maxUsageCount to Infinity so one mock covers any number of uses', () => {
    expect(mockOperation(AwardByIdQuery, data).maxUsageCount).toBe(Number.POSITIVE_INFINITY);
  });

  it('defaults variables to a matcher that accepts any variables', () => {
    const { variables } = mockOperation(AwardByIdQuery, data).request;
    expect(typeof variables).toBe('function');
    if (typeof variables === 'function') {
      expect(variables({ id: 'anything' })).toBe(true);
    }
  });

  it('passes through concrete variables, delay, error, and maxUsageCount', () => {
    const error = new Error('boom');
    const mock = mockOperation(AwardByIdQuery, data, {
      variables: { id: 'Award-0' },
      delay: 50,
      error,
      maxUsageCount: 2,
    });
    expect(mock.request.variables).toEqual({ id: 'Award-0' });
    expect(mock.delay).toBe(50);
    expect(mock.error).toBe(error);
    expect(mock.maxUsageCount).toBe(2);
  });
});

describe('mockOperationVariants', () => {
  it('returns success, long-load, and error variants', () => {
    const variants = mockOperationVariants(AwardByIdQuery, data);

    expect(variants.withResults.result).toEqual({ data });
    expect(variants.withResults.delay).toBeUndefined();

    expect(variants.withLongLoadTime.delay).toBe(1_000_000);

    expect(variants.withError.error).toBeInstanceOf(Error);
    expect(variants.withError.error?.message).toContain('AwardById');
  });

  it('uses a provided error for the error variant', () => {
    const error = new Error('custom');
    const variants = mockOperationVariants(AwardByIdQuery, data, { error });
    expect(variants.withError.error).toBe(error);
  });

  it('labels the generated error "anonymous" for unnamed operations', () => {
    const variants = mockOperationVariants(AnonymousQuery, data);
    expect(variants.withError.error?.message).toContain('anonymous');
  });

  it('threads options into every variant', () => {
    const variants = mockOperationVariants(AwardByIdQuery, data, { maxUsageCount: 3 });
    expect(variants.withResults.maxUsageCount).toBe(3);
    expect(variants.withLongLoadTime.maxUsageCount).toBe(3);
    expect(variants.withError.maxUsageCount).toBe(3);
  });
});
