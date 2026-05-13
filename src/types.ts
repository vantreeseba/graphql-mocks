import type { Faker } from '@faker-js/faker';

export type ScalarMocker = (faker: Faker) => unknown;
export type FieldOverrideFn = () => unknown;
export type CountConfig = number | { _default?: number; [typeName: string]: number | undefined };

export interface BuildMocksOptions {
  /**
   * Number of instances to generate per type. Either a flat number or a per-type map.
   * @default 5
   */
  count?: CountConfig;
  /** Provide a custom Faker instance (e.g. with a specific locale). */
  faker?: Faker;
  /** Seed the faker instance for deterministic output. Applied to `options.faker` if provided. */
  seed?: number;
  /**
   * Probability (0–1) that a nullable field will be set to null.
   * @default 0
   */
  nullChance?: number;
  /**
   * Custom scalar mockers. Merged over the built-in defaults; user wins on conflicts.
   * Key is the scalar name as it appears in the schema.
   */
  scalars?: Record<string, ScalarMocker>;
  /**
   * Per-type, per-field override functions. The function is called once per object instance.
   * Return value replaces the generated value for that field entirely.
   */
  overrides?: Record<string, Record<string, FieldOverrideFn>>;
  /**
   * Required when the schema has interface or union fields.
   * Return the concrete type name to use when mocking a field of that abstract type.
   */
  resolveType?: (abstractTypeName: string) => string;
}

export interface MockHelpers {
  find<T = unknown>(typeName: string, predicate: (item: T) => boolean): T | undefined;
  toResolvers(): Record<string, () => unknown>;
}

// MockResult exposes the pool data directly (mocks.User) plus helper methods.
// TypeScript index signatures conflict with named methods, so we use an intersection
// and cast at the creation site. mocks.User is unknown[] at compile time;
// consumers cast with mocks.User as MyUser[] or use find<MyUser>() for typed access.
export type MockResult = Record<string, unknown[]> & MockHelpers;
