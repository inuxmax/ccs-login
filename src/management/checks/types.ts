/**
 * Health Check Types and Interfaces
 */

import { ok, fail, warn, info } from '../../utils/ui';

/**
 * Spinner interface for ora or fallback
 */
export interface Spinner {
  start(): {
    succeed(msg?: string): void;
    fail(msg?: string): void;
    warn(msg?: string): void;
    info(msg?: string): void;
    text: string;
  };
}

/**
 * Details for individual health check
 */
export interface HealthCheckDetails {
  status: 'OK' | 'ERROR' | 'WARN';
  info: string;
}

/**
 * Individual health check item
 */
export interface HealthCheckItem {
  name: string;
  status: 'success' | 'error' | 'warning';
  message?: string;
  fix?: string;
}

/**
 * Health issue (error or warning)
 */
export interface HealthIssue {
  name: string;
  message: string;
  fix?: string;
}

/**
 * Health check results container
 */
export class HealthCheck {
  public checks: HealthCheckItem[] = [];
  public warnings: HealthIssue[] = [];
  public errors: HealthIssue[] = [];
  public details: Record<string, HealthCheckDetails> = {};

  addCheck(
    name: string,
    status: 'success' | 'error' | 'warning',
    message = '',
    fix: string | undefined = undefined,
    details: HealthCheckDetails | undefined = undefined
  ): void {
    this.checks.push({ name, status, message, fix });

    if (status === 'error') this.errors.push({ name, message, fix });
    if (status === 'warning') this.warnings.push({ name, message, fix });

    // Store details for summary table
    if (details) {
      this.details[name] = details;
    }
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  isHealthy(): boolean {
    return !this.hasErrors();
  }
}

/**
 * Base interface for all health checks
 */
export interface IHealthChecker {
  name: string;
  run(results: HealthCheck): Promise<void> | void;
}

/**
 * Create ora spinner with fallback for environments where ora is unavailable
 */
export function createSpinner(): (text: string) => Spinner {
  try {
    const oraModule = require('ora');
    return oraModule.default || oraModule;
  } catch (_e) {
    // ora not available, create fallback spinner that uses console.log with UI colors
    return function (text: string): Spinner {
      return {
        start: () => ({
          succeed: (msg?: string) => console.log(msg || ok(text)),
          fail: (msg?: string) => console.log(msg || fail(text)),
          warn: (msg?: string) => console.log(msg || warn(text)),
          info: (msg?: string) => console.log(msg || info(text)),
          text: '',
        }),
      };
    };
  }
}
