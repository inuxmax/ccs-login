/**
 * Preset Mock Responses
 *
 * Common response fixtures for CCS CLI tests.
 * Import these instead of duplicating response shapes.
 */

import type { MockResponse, MockFetchHandler } from '../types';

// ============================================================================
// CLIProxy API Responses
// ============================================================================

/** Successful health check response */
export const HEALTH_OK: MockResponse = {
  status: 200,
  body: { healthy: true, version: '1.0.0' },
};

/** Failed health check response */
export const HEALTH_FAIL: MockResponse = {
  status: 503,
  body: { healthy: false, error: 'Service unavailable' },
};

/** Successful file upload response */
export const UPLOAD_SUCCESS: MockResponse = {
  status: 200,
  body: { status: 'ok', id: 'uploaded-123' },
};

/** Unauthorized response */
export const UNAUTHORIZED: MockResponse = {
  status: 401,
  body: { error: 'Unauthorized' },
};

/** Forbidden response */
export const FORBIDDEN: MockResponse = {
  status: 403,
  body: { error: 'Forbidden' },
};

/** Not found response */
export const NOT_FOUND: MockResponse = {
  status: 404,
  body: { error: 'Not Found' },
};

/** Internal server error response */
export const SERVER_ERROR: MockResponse = {
  status: 500,
  body: { error: 'Internal Server Error' },
};

// ============================================================================
// Remote Proxy Responses
// ============================================================================

/** Remote proxy connection success */
export const REMOTE_PROXY_OK: MockResponse = {
  status: 200,
  body: { connected: true, latency: 50 },
};

/** Remote proxy connection timeout */
export const REMOTE_PROXY_TIMEOUT: MockResponse = {
  status: 408,
  body: { error: 'Request Timeout' },
  delay: 100,
};

// ============================================================================
// Token Upload Responses
// ============================================================================

/** Token upload success */
export const TOKEN_UPLOAD_OK: MockResponse = {
  status: 200,
  body: { status: 'ok', id: 'token-456', type: 'gemini' },
};

/** Token upload conflict (already exists) */
export const TOKEN_UPLOAD_CONFLICT: MockResponse = {
  status: 409,
  body: { error: 'Token already exists', id: 'existing-789' },
};

// ============================================================================
// Mock Fetch Handler Presets
// ============================================================================

/** Health endpoint handler */
export const HEALTH_HANDLER: MockFetchHandler = {
  url: /\/health$/,
  method: 'GET',
  response: { healthy: true },
};

/** Upload endpoint handler */
export const UPLOAD_HANDLER: MockFetchHandler = {
  url: /\/v0\/management\/auth-files/,
  method: 'POST',
  response: { status: 'ok', id: 'uploaded-123' },
  status: 200,
};

/** Messages endpoint handler (Claude API mock) */
export const MESSAGES_HANDLER: MockFetchHandler = {
  url: /\/v1\/messages/,
  method: 'POST',
  response: {
    id: 'msg-123',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'Mock response' }],
  },
  status: 200,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a delayed response for timeout testing
 */
export function createDelayedResponse(base: MockResponse, delayMs: number): MockResponse {
  return { ...base, delay: delayMs };
}

/**
 * Create error response with custom message
 */
export function createErrorResponse(status: number, message: string): MockResponse {
  return { status, body: { error: message } };
}
