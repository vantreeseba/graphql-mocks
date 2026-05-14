import { faker as defaultFaker } from '@faker-js/faker';
import { Faker, en } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';
import { OPERATION_TYPE_NAMES, resolveCount, resolveFaker } from './helpers.js';

describe('resolveCount', () => {
  it('returns default 5 when no config provided', () => {
    expect(resolveCount('User', undefined)).toBe(5);
  });

  it('returns flat number when config is a number', () => {
    expect(resolveCount('User', 10)).toBe(10);
    expect(resolveCount('Todo', 10)).toBe(10);
  });

  it('returns per-type count when type is in config map', () => {
    expect(resolveCount('User', { User: 10, _default: 3 })).toBe(10);
    expect(resolveCount('Todo', { Todo: 20, _default: 3 })).toBe(20);
  });

  it('falls back to _default in map when type not specified', () => {
    expect(resolveCount('Comment', { User: 10, _default: 3 })).toBe(3);
  });

  it('falls back to built-in default when type not in map and no _default', () => {
    expect(resolveCount('Comment', { User: 10 })).toBe(5);
  });

  it('respects custom built-in default argument', () => {
    expect(resolveCount('User', undefined, 7)).toBe(7);
  });
});

describe('resolveFaker', () => {
  it('returns a faker instance when no options given', () => {
    const f = resolveFaker({});
    expect(typeof f.lorem.word()).toBe('string');
  });

  it('returns the provided faker instance', () => {
    const custom = new Faker({ locale: en });
    const f = resolveFaker({ faker: custom });
    expect(f).toBe(custom);
  });

  it('seeds the provided faker instance', () => {
    const f1 = new Faker({ locale: en });
    const f2 = new Faker({ locale: en });
    resolveFaker({ faker: f1, seed: 99 });
    resolveFaker({ faker: f2, seed: 99 });
    expect(f1.lorem.word()).toBe(f2.lorem.word());
  });

  it('seeds the default faker when no faker provided', () => {
    resolveFaker({ seed: 42 });
    const word1 = defaultFaker.lorem.word();
    resolveFaker({ seed: 42 });
    const word2 = defaultFaker.lorem.word();
    expect(word1).toBe(word2);
  });
});

describe('OPERATION_TYPE_NAMES', () => {
  it('contains Query, Mutation, Subscription', () => {
    expect(OPERATION_TYPE_NAMES.has('Query')).toBe(true);
    expect(OPERATION_TYPE_NAMES.has('Mutation')).toBe(true);
    expect(OPERATION_TYPE_NAMES.has('Subscription')).toBe(true);
  });

  it('does not contain regular types', () => {
    expect(OPERATION_TYPE_NAMES.has('User')).toBe(false);
    expect(OPERATION_TYPE_NAMES.has('Todo')).toBe(false);
  });
});
