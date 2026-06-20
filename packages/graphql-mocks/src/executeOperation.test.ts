import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { buildMocks } from './mockSchema.js';
import { schema } from './test/schema.js';

const mocks = buildMocks(schema, { seed: 1, count: 5 });

describe('dataForOperation', () => {
  it('shapes a single-object query to its selection set', () => {
    const doc = parse(`
      query UserById($id: ID!) {
        user(id: $id) { __typename id name email }
      }
    `);
    const data = mocks.dataForOperation(doc) as {
      user: { __typename: string; id: string; name: string; email: string } | null;
    };
    expect(data.user).not.toBeNull();
    expect(data.user?.__typename).toBe('User');
    expect(Object.keys(data.user ?? {}).sort()).toEqual(['__typename', 'email', 'id', 'name']);
    // The picked user is a real pooled instance.
    expect(mocks.User?.some((u) => (u as { id: string }).id === data.user?.id)).toBe(true);
  });

  it('only includes selected fields, not the whole mock object', () => {
    const doc = parse('{ user(id: "x") { id } }');
    const data = mocks.dataForOperation(doc) as { user: Record<string, unknown> | null };
    expect(Object.keys(data.user ?? {})).toEqual(['id']);
    expect(data.user).not.toHaveProperty('email');
  });

  it('resolves list fields and follows wired relationships', () => {
    const doc = parse(`
      query {
        users { id posts { id author { id } } }
      }
    `);
    const data = mocks.dataForOperation(doc) as {
      users: { id: string; posts: { id: string; author: { id: string } }[] }[];
    };
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeGreaterThan(0);
    const withPosts = data.users.find((u) => u.posts.length > 0);
    expect(withPosts?.posts[0]?.author.id).toBeDefined();
  });

  it('resolves union fields via __typename with inline fragments', () => {
    const doc = parse(`
      query Search($query: String!) {
        search(query: $query) {
          __typename
          ... on User { id name }
          ... on Post { id title }
          ... on Comment { id body }
        }
      }
    `);
    const data = mocks.dataForOperation(doc) as {
      search: { __typename: string; id: string }[];
    };
    expect(data.search.length).toBeGreaterThan(0);
    for (const item of data.search) {
      expect(['User', 'Post', 'Comment']).toContain(item.__typename);
      expect(item.id).toBeDefined();
    }
  });

  it('infers the data type from a TypedDocumentNode', () => {
    type Data = { users: { id: string }[] };
    const doc = parse('{ users { id } }') as TypedDocumentNode<Data, Record<string, never>>;
    const data = mocks.dataForOperation(doc); // typed as Data
    expect(data.users[0]?.id).toBeDefined();
  });

  it('auto-fills required variables it is not given', () => {
    // $id: ID! is required; we pass nothing and it still resolves.
    const doc = parse('query($id: ID!) { user(id: $id) { id } }');
    const data = mocks.dataForOperation(doc) as { user: { id: string } | null };
    expect(data.user?.id).toBeDefined();
  });
});
