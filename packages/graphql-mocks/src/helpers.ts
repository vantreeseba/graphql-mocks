import { faker as defaultFaker } from '@faker-js/faker';
import type { Faker } from '@faker-js/faker';
import type { BuildMocksOptions, CountConfig } from './types.js';

export const OPERATION_TYPE_NAMES = new Set(['Query', 'Mutation', 'Subscription']);

export function resolveCount(
  typeName: string,
  config: CountConfig | undefined,
  defaultCount = 5,
): number {
  if (config === undefined) return defaultCount;
  if (typeof config === 'number') return config;
  return config[typeName] ?? config._default ?? defaultCount;
}

export function resolveFaker(options: BuildMocksOptions): Faker {
  const f = options.faker ?? defaultFaker;
  if (options.seed !== undefined) {
    f.seed(options.seed);
  }
  return f;
}
