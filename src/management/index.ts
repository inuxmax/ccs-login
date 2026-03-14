/**
 * Management Module Barrel Export
 *
 * Provides system management functionality including health checks,
 * diagnostics, instance management, and repair utilities.
 */

// Manager classes (default exports)
export { default as Doctor } from './doctor';
export { default as InstanceManager } from './instance-manager';
export { default as RecoveryManager } from './recovery-manager';
export { default as SharedManager } from './shared-manager';

// Environment diagnostics
export {
  type EnvironmentDiagnostics,
  getEnvironmentDiagnostics,
  shouldUseHeadlessAuth,
  formatEnvironmentDiagnostics,
} from './environment-diagnostics';

// OAuth port diagnostics
export {
  OAUTH_CALLBACK_PORTS,
  OAUTH_FLOW_TYPES,
  type OAuthFlowType,
  type OAuthPortDiagnostic,
  type EnhancedPreflightResult,
  type PreflightCheck,
  checkOAuthPort,
  checkAllOAuthPorts,
  checkAuthCodePorts,
  getPortConflicts,
  formatOAuthPortDiagnostics,
  preflightOAuthCheck,
  enhancedPreflightOAuthCheck,
} from './oauth-port-diagnostics';

// Health checks
export * from './checks';

// Repair utilities
export * from './repair';
