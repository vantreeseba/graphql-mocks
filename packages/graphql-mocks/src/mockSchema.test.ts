import { faker } from '@faker-js/faker';
import type { GraphQLSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { buildMocks } from './mockSchema.js';
import { schema } from './test/schema.js';

const sdl = `
  type Author {
    id: ID!
    name: String!
    age: Int!
  }
  type Book {
    id: ID!
    title: String!
    author: Author!
  }
  type Query { books: [Book!]! }
`;

describe('buildMocks — GraphQLSchema input', () => {
  it('accepts a GraphQLSchema object', () => {
    const result = buildMocks(schema, { faker, seed: 1 });
    expect(Array.isArray(result.User)).toBe(true);
  });

  it('returns pool with correct number of items (default 5)', () => {
    const result = buildMocks(schema, { faker, seed: 1 });
    expect(result.User?.length).toBe(5);
  });
});

describe('buildMocks — SDL string input', () => {
  it('accepts an SDL string and returns mock data', () => {
    const result = buildMocks(sdl, { faker, seed: 1 });
    expect(Array.isArray(result.Author)).toBe(true);
    expect(Array.isArray(result.Book)).toBe(true);
    expect(result.Query).toBeUndefined();
  });

  it('wires relationships from SDL schema', () => {
    const result = buildMocks(sdl, { faker, seed: 1 });
    const book = result.Book?.[0] as Record<string, unknown>;
    expect(result.Author).toContain(book.author);
  });
});

describe('find()', () => {
  it('returns the first matching item', () => {
    const result = buildMocks(schema, { faker, seed: 42 });
    const users = result.User as Array<{ id: string; name: string }>;
    const target = users[2];
    if (!target) throw new Error('no user at index 2');
    const found = result.find<{ id: string; name: string }>('User', (u) => u.id === target.id);
    expect(found).toBe(target);
  });

  it('returns undefined when no item matches', () => {
    const result = buildMocks(schema, { faker, seed: 42 });
    const found = result.find('User', (u: Record<string, unknown>) => u.id === 'nonexistent-id');
    expect(found).toBeUndefined();
  });

  it('returns undefined for unknown type', () => {
    const result = buildMocks(schema, { faker, seed: 42 });
    const found = result.find('NonExistentType', () => true);
    expect(found).toBeUndefined();
  });
});

describe('toResolvers()', () => {
  it('returns an object with a function per type', () => {
    const result = buildMocks(schema, { faker, seed: 42 });
    const resolvers = result.toResolvers();
    expect(typeof resolvers.User).toBe('function');
    expect(typeof resolvers.Todo).toBe('function');
    expect(typeof resolvers.Post).toBe('function');
  });

  it('resolver function returns an item from the pool', () => {
    const result = buildMocks(schema, { faker, seed: 42 });
    const resolvers = result.toResolvers();
    const user = resolvers.User?.();
    expect(result.User).toContain(user);
  });

  it('does not include Query in resolvers (not mocked)', () => {
    const result = buildMocks(schema, { faker, seed: 42 });
    const resolvers = result.toResolvers();
    expect(resolvers.Query).toBeUndefined();
  });
});

describe('buildMocks — faker options', () => {
  it('works without a seed (non-deterministic)', () => {
    const result = buildMocks(sdl, {});
    expect(Array.isArray(result.Author)).toBe(true);
    expect(result.Author?.length).toBe(5);
  });

  it('seeds a provided faker instance', () => {
    const fakerA = faker;
    const r1 = buildMocks(sdl, { faker: fakerA, seed: 99 });
    const r2 = buildMocks(sdl, { faker: fakerA, seed: 99 });
    const a1 = (r1.Author?.[0] as Record<string, unknown>).id;
    const a2 = (r2.Author?.[0] as Record<string, unknown>).id;
    expect(a1).toBe(a2);
  });
});

describe('buildMocks — input validation', () => {
  it('throws for invalid input type', () => {
    expect(() => buildMocks(42 as unknown as GraphQLSchema, {})).toThrow();
  });
});
