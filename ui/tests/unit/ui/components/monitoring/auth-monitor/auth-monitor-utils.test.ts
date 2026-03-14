/**
 * Auth Monitor Utils Tests
 * Unit tests for getSuccessRate, cleanEmail, and ACCOUNT_COLORS
 */

import { describe, it, expect } from 'vitest';
import {
  getSuccessRate,
  cleanEmail,
  ACCOUNT_COLORS,
} from '../../../../../../src/components/monitoring/auth-monitor/utils';

describe('getSuccessRate', () => {
  describe('edge cases', () => {
    it('returns 100 when both success and failure are 0', () => {
      expect(getSuccessRate(0, 0)).toBe(100);
    });

    it('returns 100 when success is non-zero and failure is 0', () => {
      expect(getSuccessRate(100, 0)).toBe(100);
      expect(getSuccessRate(1, 0)).toBe(100);
      expect(getSuccessRate(1000, 0)).toBe(100);
    });

    it('returns 0 when success is 0 and failure is non-zero', () => {
      expect(getSuccessRate(0, 100)).toBe(0);
      expect(getSuccessRate(0, 1)).toBe(0);
      expect(getSuccessRate(0, 1000)).toBe(0);
    });
  });

  describe('normal cases', () => {
    it('calculates 90% correctly', () => {
      expect(getSuccessRate(90, 10)).toBe(90);
    });

    it('calculates 75% correctly', () => {
      expect(getSuccessRate(75, 25)).toBe(75);
    });

    it('calculates 50% correctly', () => {
      expect(getSuccessRate(50, 50)).toBe(50);
    });

    it('calculates 25% correctly', () => {
      expect(getSuccessRate(25, 75)).toBe(25);
    });

    it('calculates 10% correctly', () => {
      expect(getSuccessRate(10, 90)).toBe(10);
    });
  });

  describe('rounding', () => {
    it('rounds to nearest integer', () => {
      expect(getSuccessRate(1, 2)).toBe(33); // 33.33...
      expect(getSuccessRate(2, 1)).toBe(67); // 66.66...
    });

    it('handles 1/3 ratio', () => {
      expect(getSuccessRate(1, 3)).toBe(25);
    });

    it('handles small numbers', () => {
      expect(getSuccessRate(1, 1)).toBe(50);
      expect(getSuccessRate(1, 9)).toBe(10);
      expect(getSuccessRate(9, 1)).toBe(90);
    });
  });

  describe('large numbers', () => {
    it('handles large numbers correctly', () => {
      expect(getSuccessRate(900000, 100000)).toBe(90);
      expect(getSuccessRate(999999, 1)).toBe(100); // rounds up
    });
  });
});

describe('cleanEmail', () => {
  describe('common domains to strip', () => {
    it('strips @gmail.com', () => {
      expect(cleanEmail('user@gmail.com')).toBe('user');
      expect(cleanEmail('john.doe@gmail.com')).toBe('john.doe');
      expect(cleanEmail('test123@gmail.com')).toBe('test123');
    });

    it('strips @yahoo.com', () => {
      expect(cleanEmail('user@yahoo.com')).toBe('user');
      expect(cleanEmail('john.doe@yahoo.com')).toBe('john.doe');
    });

    it('strips @hotmail.com', () => {
      expect(cleanEmail('user@hotmail.com')).toBe('user');
      expect(cleanEmail('john.doe@hotmail.com')).toBe('john.doe');
    });

    it('strips @outlook.com', () => {
      expect(cleanEmail('user@outlook.com')).toBe('user');
      expect(cleanEmail('john.doe@outlook.com')).toBe('john.doe');
    });

    it('strips @icloud.com', () => {
      expect(cleanEmail('user@icloud.com')).toBe('user');
      expect(cleanEmail('john.doe@icloud.com')).toBe('john.doe');
    });
  });

  describe('case insensitivity', () => {
    it('strips uppercase domains', () => {
      expect(cleanEmail('user@GMAIL.COM')).toBe('user');
      expect(cleanEmail('user@Gmail.Com')).toBe('user');
      expect(cleanEmail('user@OUTLOOK.COM')).toBe('user');
    });
  });

  describe('preserves other domains', () => {
    it('preserves company domains', () => {
      expect(cleanEmail('user@company.com')).toBe('user@company.com');
      expect(cleanEmail('admin@acme.org')).toBe('admin@acme.org');
      expect(cleanEmail('dev@startup.io')).toBe('dev@startup.io');
    });

    it('preserves educational domains', () => {
      expect(cleanEmail('student@university.edu')).toBe('student@university.edu');
    });

    it('preserves government domains', () => {
      expect(cleanEmail('agent@agency.gov')).toBe('agent@agency.gov');
    });

    it('preserves subdomains of common providers', () => {
      expect(cleanEmail('user@mail.gmail.com')).toBe('user@mail.gmail.com');
    });
  });

  describe('edge cases', () => {
    it('handles email-like strings without @ symbol', () => {
      expect(cleanEmail('notanemail')).toBe('notanemail');
    });

    it('handles empty string', () => {
      expect(cleanEmail('')).toBe('');
    });

    it('handles email with numbers', () => {
      expect(cleanEmail('user123@gmail.com')).toBe('user123');
    });

    it('handles email with plus addressing', () => {
      expect(cleanEmail('user+tag@gmail.com')).toBe('user+tag');
    });

    it('handles email with dots', () => {
      expect(cleanEmail('first.last@gmail.com')).toBe('first.last');
    });
  });
});

describe('ACCOUNT_COLORS', () => {
  it('is an array with at least 10 colors', () => {
    expect(Array.isArray(ACCOUNT_COLORS)).toBe(true);
    expect(ACCOUNT_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it('contains valid hex color codes', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    ACCOUNT_COLORS.forEach((color) => {
      expect(color).toMatch(hexColorRegex);
    });
  });

  it('all colors are unique', () => {
    const uniqueColors = new Set(ACCOUNT_COLORS);
    expect(uniqueColors.size).toBe(ACCOUNT_COLORS.length);
  });

  it('contains expected colors', () => {
    expect(ACCOUNT_COLORS).toContain('#1e6091'); // Deep Cerulean
    expect(ACCOUNT_COLORS).toContain('#2d8a6e'); // Deep Seaweed
    expect(ACCOUNT_COLORS).toContain('#c92a2d'); // Deep Strawberry
  });
});
