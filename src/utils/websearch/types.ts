/**
 * WebSearch Type Definitions
 *
 * Contains all type definitions for WebSearch CLI providers and status.
 *
 * @module utils/websearch/types
 */

import type { ComponentStatus } from '../../types/utils';

/**
 * Gemini CLI installation status
 * @deprecated Use ComponentStatus directly
 */
export type GeminiCliStatus = ComponentStatus;

/**
 * Grok CLI installation status
 * @deprecated Use ComponentStatus directly
 */
export type GrokCliStatus = ComponentStatus;

/**
 * OpenCode CLI installation status
 * @deprecated Use ComponentStatus directly
 */
export type OpenCodeCliStatus = ComponentStatus;

/**
 * WebSearch availability status for third-party profiles
 */
export type WebSearchReadiness = 'ready' | 'needs_auth' | 'unavailable';

/**
 * WebSearch status for display
 */
export interface WebSearchStatus {
  readiness: WebSearchReadiness;
  geminiCli: boolean;
  geminiAuthenticated: boolean;
  grokCli: boolean;
  opencodeCli: boolean;
  message: string;
}

/**
 * WebSearch CLI provider information for health checks and UI
 */
export interface WebSearchCliInfo {
  /** Provider ID */
  id: 'gemini' | 'grok' | 'opencode';
  /** Display name */
  name: string;
  /** CLI command name */
  command: string;
  /** Whether CLI is installed */
  installed: boolean;
  /** CLI version if installed */
  version: string | null;
  /** Install command */
  installCommand: string;
  /** Docs URL */
  docsUrl: string;
  /** Whether this provider requires an API key */
  requiresApiKey: boolean;
  /** API key environment variable name */
  apiKeyEnvVar?: string;
  /** Brief description */
  description: string;
  /** Free tier available? */
  freeTier: boolean;
}

/**
 * WebSearch provider configuration from config.yaml
 */
export interface WebSearchProviderConfig {
  enabled?: boolean;
  model?: string;
  timeout?: number;
}

/**
 * WebSearch configuration from config.yaml
 */
export interface WebSearchConfig {
  enabled: boolean;
  providers?: {
    gemini?: WebSearchProviderConfig;
    opencode?: WebSearchProviderConfig;
    grok?: WebSearchProviderConfig;
  };
}
