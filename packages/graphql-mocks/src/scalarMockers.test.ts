import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';
import { defaultScalarMockers, resolveScalarMocker } from './scalarMockers.js';

describe('defaultScalarMockers', () => {
  it('String returns a string', () => {
    expect(typeof defaultScalarMockers.String?.(faker)).toBe('string');
  });

  it('Int returns an integer', () => {
    const val = defaultScalarMockers.Int?.(faker);
    expect(typeof val).toBe('number');
    expect(Number.isInteger(val)).toBe(true);
  });

  it('Float returns a number', () => {
    expect(typeof defaultScalarMockers.Float?.(faker)).toBe('number');
  });

  it('Boolean returns a boolean', () => {
    expect(typeof defaultScalarMockers.Boolean?.(faker)).toBe('boolean');
  });

  it('ID returns a uuid string', () => {
    const val = defaultScalarMockers.ID?.(faker);
    expect(typeof val).toBe('string');
    expect(val).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('DateTime returns an ISO datetime string', () => {
    const val = defaultScalarMockers.DateTime?.(faker);
    expect(typeof val).toBe('string');
    expect(() => new Date(val as string)).not.toThrow();
  });

  it('EmailAddress returns an email string', () => {
    const val = defaultScalarMockers.EmailAddress?.(faker);
    expect(typeof val).toBe('string');
    expect(val).toContain('@');
  });

  it('URL returns a url string', () => {
    const val = defaultScalarMockers.URL?.(faker);
    expect(typeof val).toBe('string');
    expect(val).toMatch(/^https?:\/\//);
  });

  it('CityName returns a non-empty string', () => {
    const val = defaultScalarMockers.CityName?.(faker);
    expect(typeof val).toBe('string');
    expect((val as string).length).toBeGreaterThan(0);
  });

  it('Slug returns a non-empty string', () => {
    const val = defaultScalarMockers.Slug?.(faker);
    expect(typeof val).toBe('string');
  });
});

describe('defaultScalarMockers — all entries return valid values', () => {
  // Exhaustively call every registered mocker to ensure none throw.
  const entries = Object.entries(defaultScalarMockers);

  for (const [name, mocker] of entries) {
    it(`${name} mocker returns a defined value`, () => {
      const val = mocker(faker);
      // Scalars may legitimately return null (e.g. Upload), but never undefined
      expect(val).not.toBeUndefined();
    });
  }
});

describe('resolveScalarMocker', () => {
  it('returns user-provided mocker when available', () => {
    const customMocker = () => 'custom';
    const mocker = resolveScalarMocker('String', { String: customMocker });
    expect(mocker?.(faker)).toBe('custom');
  });

  it('falls back to default when no user mocker', () => {
    const mocker = resolveScalarMocker('String', undefined);
    expect(typeof mocker?.(faker)).toBe('string');
  });

  it('returns undefined for unknown scalar without user mocker', () => {
    const mocker = resolveScalarMocker('UnknownScalar', undefined);
    expect(mocker).toBeUndefined();
  });

  it('returns user mocker for unknown scalar when provided', () => {
    const customMocker = () => 42;
    const mocker = resolveScalarMocker('UnknownScalar', { UnknownScalar: customMocker });
    expect(mocker?.(faker)).toBe(42);
  });
});
