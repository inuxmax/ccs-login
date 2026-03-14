/**
 * Analytics Utils Tests
 * Unit tests for formatTokens utility function
 */

import { describe, it, expect } from 'vitest';
import { formatTokens } from '../../../../../src/pages/analytics/utils';

describe('formatTokens', () => {
  describe('small numbers (< 1K)', () => {
    it('returns exact number for 0', () => {
      expect(formatTokens(0)).toBe('0');
    });

    it('returns exact number for single digits', () => {
      expect(formatTokens(1)).toBe('1');
      expect(formatTokens(9)).toBe('9');
    });

    it('returns exact number for double digits', () => {
      expect(formatTokens(10)).toBe('10');
      expect(formatTokens(99)).toBe('99');
    });

    it('returns exact number for triple digits', () => {
      expect(formatTokens(100)).toBe('100');
      expect(formatTokens(999)).toBe('999');
    });
  });

  describe('thousands (1K - 999K)', () => {
    it('formats 1000 as 1K', () => {
      expect(formatTokens(1000)).toBe('1K');
    });

    it('formats numbers in thousands with no decimal', () => {
      expect(formatTokens(1500)).toBe('2K');
      expect(formatTokens(5000)).toBe('5K');
      expect(formatTokens(10000)).toBe('10K');
      expect(formatTokens(100000)).toBe('100K');
      expect(formatTokens(999000)).toBe('999K');
    });

    it('handles edge cases near 1000', () => {
      expect(formatTokens(999)).toBe('999');
      expect(formatTokens(1001)).toBe('1K');
    });
  });

  describe('millions (1M - 999M)', () => {
    it('formats 1000000 as 1.0M', () => {
      expect(formatTokens(1_000_000)).toBe('1.0M');
    });

    it('formats numbers in millions with one decimal', () => {
      expect(formatTokens(1_500_000)).toBe('1.5M');
      expect(formatTokens(10_000_000)).toBe('10.0M');
      expect(formatTokens(100_000_000)).toBe('100.0M');
      expect(formatTokens(999_000_000)).toBe('999.0M');
    });

    it('handles edge cases near 1M', () => {
      expect(formatTokens(999_999)).toBe('1000K');
      expect(formatTokens(1_000_001)).toBe('1.0M');
    });

    it('formats 2.5M correctly', () => {
      expect(formatTokens(2_500_000)).toBe('2.5M');
    });
  });

  describe('billions (1B+)', () => {
    it('formats 1000000000 as 1.0B', () => {
      expect(formatTokens(1_000_000_000)).toBe('1.0B');
    });

    it('formats numbers in billions with one decimal', () => {
      expect(formatTokens(1_500_000_000)).toBe('1.5B');
      expect(formatTokens(10_000_000_000)).toBe('10.0B');
      expect(formatTokens(100_000_000_000)).toBe('100.0B');
    });

    it('handles edge cases near 1B', () => {
      expect(formatTokens(999_999_999)).toBe('1000.0M');
      expect(formatTokens(1_000_000_001)).toBe('1.0B');
    });

    it('formats 2.7B correctly', () => {
      expect(formatTokens(2_700_000_000)).toBe('2.7B');
    });
  });

  describe('negative numbers', () => {
    it('handles negative numbers', () => {
      // Function doesn't explicitly handle negatives but should not crash
      expect(formatTokens(-100)).toBe('-100');
    });
  });

  describe('decimal precision', () => {
    it('millions round to one decimal', () => {
      expect(formatTokens(1_234_567)).toBe('1.2M');
      expect(formatTokens(1_250_000)).toBe('1.3M'); // 1.25 rounds to 1.3
      expect(formatTokens(1_240_000)).toBe('1.2M');
    });

    it('billions round to one decimal', () => {
      expect(formatTokens(1_234_567_890)).toBe('1.2B');
      expect(formatTokens(1_250_000_000)).toBe('1.3B');
    });
  });
});
