/**
 * Status Indicators
 *
 * ASCII-only status markers (NO EMOJIS)
 * @module utils/ui/indicators
 */

import { color } from './colors';

/**
 * Success indicator: [OK]
 */
export function ok(message: string): string {
  return `${color('[OK]', 'success')} ${message}`;
}

/**
 * Error indicator: [X]
 */
export function fail(message: string): string {
  return `${color('[X]', 'error')} ${message}`;
}

/**
 * Warning indicator: [!]
 */
export function warn(message: string): string {
  return `${color('[!]', 'warning')} ${message}`;
}

/**
 * Info indicator: [i]
 */
export function info(message: string): string {
  return `${color('[i]', 'info')} ${message}`;
}
