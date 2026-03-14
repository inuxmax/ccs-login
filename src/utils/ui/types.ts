/**
 * UI Module Internal Types
 *
 * Type definitions for dynamically imported ESM modules
 * @module utils/ui/types
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChalkInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BoxenFunction = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GradientStringInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OraModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ListrClass = any;

/**
 * Color palette (Professional cyan-to-blue)
 */
export const COLORS = {
  primary: '#00ECFA', // Bright cyan
  secondary: '#0099FF', // Sky blue
  neutral: '#808080', // Gray
} as const;

/**
 * Module cache for lazy loading
 */
export interface ModuleCache {
  chalk: ChalkInstance | null;
  boxen: BoxenFunction | null;
  gradient: GradientStringInstance | null;
  ora: OraModule | null;
  listr: ListrClass | null;
}

/**
 * Shared module state
 */
export const moduleCache: ModuleCache = {
  chalk: null,
  boxen: null,
  gradient: null,
  ora: null,
  listr: null,
};

export let initialized = false;

export function setInitialized(value: boolean): void {
  initialized = value;
}
