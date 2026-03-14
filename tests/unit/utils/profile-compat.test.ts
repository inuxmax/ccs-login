import { describe, expect, it } from 'bun:test';
import {
  getProfileLookupCandidates,
  isLegacyProfileAlias,
  resolveAliasToCanonical,
} from '../../../src/utils/profile-compat';

describe('profile-compat', () => {
  describe('getProfileLookupCandidates', () => {
    it('returns km candidates with legacy kimi fallback', () => {
      expect(getProfileLookupCandidates('km')).toEqual(['km', 'kimi']);
    });

    it('keeps non-aliased profiles unchanged', () => {
      expect(getProfileLookupCandidates('glm')).toEqual(['glm']);
    });

    it('normalizes uppercase input and still resolves aliases', () => {
      expect(getProfileLookupCandidates('KM')).toEqual(['KM', 'km', 'kimi']);
    });

    it('handles surrounding whitespace', () => {
      expect(getProfileLookupCandidates('  km  ')).toEqual(['km', 'kimi']);
    });

    it('returns empty candidates for empty input', () => {
      expect(getProfileLookupCandidates('')).toEqual([]);
      expect(getProfileLookupCandidates('   ')).toEqual([]);
    });
  });

  describe('isLegacyProfileAlias', () => {
    it('returns true for km -> kimi', () => {
      expect(isLegacyProfileAlias('km', 'kimi')).toBe(true);
    });

    it('returns false for canonical names', () => {
      expect(isLegacyProfileAlias('km', 'km')).toBe(false);
      expect(isLegacyProfileAlias('glm', 'glm')).toBe(false);
    });

    it('returns false for unrelated names', () => {
      expect(isLegacyProfileAlias('glm', 'kimi')).toBe(false);
    });
  });

  describe('resolveAliasToCanonical', () => {
    it('maps legacy kimi alias to canonical km', () => {
      expect(resolveAliasToCanonical('kimi')).toBe('km');
      expect(resolveAliasToCanonical('KIMI')).toBe('km');
    });

    it('keeps canonical and non-aliased names', () => {
      expect(resolveAliasToCanonical('km')).toBe('km');
      expect(resolveAliasToCanonical('glm')).toBe('glm');
    });
  });
});
