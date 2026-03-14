/**
 * Environment Diagnostics Module
 *
 * Provides detailed environment detection diagnostics for troubleshooting
 * OAuth authentication issues, particularly for Windows users experiencing
 * false headless detection.
 *
 * Case study: Vietnamese Windows users reported "command hangs" because
 * Windows terminal wrappers don't set isTTY correctly, triggering
 * headless mode when browser should be available.
 */

/**
 * Detailed environment diagnostic information
 */
export interface EnvironmentDiagnostics {
  /** Operating system platform */
  platform: NodeJS.Platform;
  /** Platform display name */
  platformName: string;
  /** Current shell (from SHELL env or detected) */
  shell: string;
  /** Terminal program (TERM_PROGRAM env) */
  termProgram: string | null;
  /** Whether running in SSH session */
  sshSession: boolean;
  /** SSH detection reason */
  sshReason: string | null;
  /** stdin TTY status */
  ttyStatus: boolean | 'undefined';
  /** stdout TTY status */
  stdoutTty: boolean | 'undefined';
  /** Display environment (Linux X11/Wayland) */
  display: string | null;
  /** Windows Terminal detected (WT_SESSION env) */
  windowsTerminal: boolean;
  /** VS Code integrated terminal detected */
  vsCodeTerminal: boolean;
  /** CI environment detected */
  ciEnvironment: boolean;
  /** Final headless detection result */
  detectedHeadless: boolean;
  /** Reasons why headless was detected (or not) */
  headlessReasons: string[];
  /** Browser capability assessment */
  browserCapability: 'available' | 'unlikely' | 'unknown';
  /** Browser capability reason */
  browserReason: string;
}

/**
 * Detect current shell from environment
 */
function detectShell(): string {
  if (process.env.SHELL) {
    return process.env.SHELL;
  }
  if (process.platform === 'win32') {
    if (process.env.PSModulePath) {
      return 'PowerShell';
    }
    if (process.env.COMSPEC) {
      return process.env.COMSPEC;
    }
    return 'cmd.exe';
  }
  return 'unknown';
}

/**
 * Check if running in SSH session
 */
function checkSshSession(): { isSsh: boolean; reason: string | null } {
  if (process.env.SSH_TTY) {
    return { isSsh: true, reason: 'SSH_TTY set' };
  }
  if (process.env.SSH_CLIENT) {
    return { isSsh: true, reason: 'SSH_CLIENT set' };
  }
  if (process.env.SSH_CONNECTION) {
    return { isSsh: true, reason: 'SSH_CONNECTION set' };
  }
  return { isSsh: false, reason: null };
}

/**
 * Check browser capability based on environment
 */
function assessBrowserCapability(
  platform: NodeJS.Platform,
  sshSession: boolean,
  display: string | null,
  windowsTerminal: boolean,
  vsCodeTerminal: boolean
): { capability: 'available' | 'unlikely' | 'unknown'; reason: string } {
  // SSH session - no browser
  if (sshSession) {
    return { capability: 'unlikely', reason: 'SSH session detected' };
  }

  // Windows desktop - should always have browser
  if (platform === 'win32') {
    if (windowsTerminal || vsCodeTerminal) {
      return { capability: 'available', reason: 'Windows desktop terminal' };
    }
    // Even plain cmd.exe on Windows desktop should have browser access
    return { capability: 'available', reason: 'Windows desktop environment' };
  }

  // macOS - always has browser unless SSH
  if (platform === 'darwin') {
    return { capability: 'available', reason: 'macOS desktop environment' };
  }

  // Linux - depends on DISPLAY/WAYLAND
  if (platform === 'linux') {
    if (display) {
      return { capability: 'available', reason: `Display available: ${display}` };
    }
    return { capability: 'unlikely', reason: 'No DISPLAY or WAYLAND_DISPLAY' };
  }

  return { capability: 'unknown', reason: 'Unknown platform' };
}

/**
 * Determine if environment is headless (improved detection)
 * Returns both result and reasons for transparency
 */
function detectHeadless(): { isHeadless: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // SSH session
  if (process.env.SSH_TTY || process.env.SSH_CLIENT || process.env.SSH_CONNECTION) {
    reasons.push('SSH session detected');
    return { isHeadless: true, reasons };
  }

  // Linux without display
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    reasons.push('Linux without DISPLAY/WAYLAND_DISPLAY');
    return { isHeadless: true, reasons };
  }

  // Windows desktop - NEVER headless unless SSH (already checked above)
  // This fixes false positive on Windows where isTTY is undefined
  if (process.platform === 'win32') {
    reasons.push('Windows desktop - browser available');
    return { isHeadless: false, reasons };
  }

  // macOS - check for proper terminal
  if (process.platform === 'darwin') {
    if (!process.stdin.isTTY) {
      reasons.push('Non-interactive stdin on macOS');
      return { isHeadless: true, reasons };
    }
    reasons.push('macOS with TTY - browser available');
    return { isHeadless: false, reasons };
  }

  // Linux with display - check TTY
  if (process.platform === 'linux') {
    if (!process.stdin.isTTY) {
      reasons.push('Non-interactive stdin on Linux');
      return { isHeadless: true, reasons };
    }
    reasons.push('Linux with display and TTY');
    return { isHeadless: false, reasons };
  }

  // Default fallback
  reasons.push('Default: assuming headless');
  return { isHeadless: true, reasons };
}

/**
 * Get comprehensive environment diagnostics
 */
export function getEnvironmentDiagnostics(): EnvironmentDiagnostics {
  const platform = process.platform;
  const ssh = checkSshSession();
  const display =
    process.platform === 'linux'
      ? process.env.DISPLAY || process.env.WAYLAND_DISPLAY || null
      : null;
  const windowsTerminal = !!process.env.WT_SESSION;
  const vsCodeTerminal = !!(
    process.env.VSCODE_GIT_IPC_HANDLE ||
    process.env.VSCODE_IPC_HOOK_CLI ||
    process.env.TERM_PROGRAM === 'vscode'
  );
  const ciEnvironment = !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL
  );

  const browser = assessBrowserCapability(
    platform,
    ssh.isSsh,
    display,
    windowsTerminal,
    vsCodeTerminal
  );
  const headless = detectHeadless();

  // Platform display name
  const platformNames: Record<string, string> = {
    win32: 'Windows',
    darwin: 'macOS',
    linux: 'Linux',
    freebsd: 'FreeBSD',
    openbsd: 'OpenBSD',
  };

  return {
    platform,
    platformName: platformNames[platform] || platform,
    shell: detectShell(),
    termProgram: process.env.TERM_PROGRAM || null,
    sshSession: ssh.isSsh,
    sshReason: ssh.reason,
    ttyStatus: process.stdin.isTTY === undefined ? 'undefined' : process.stdin.isTTY,
    stdoutTty: process.stdout.isTTY === undefined ? 'undefined' : process.stdout.isTTY,
    display,
    windowsTerminal,
    vsCodeTerminal,
    ciEnvironment,
    detectedHeadless: headless.isHeadless,
    headlessReasons: headless.reasons,
    browserCapability: browser.capability,
    browserReason: browser.reason,
  };
}

/**
 * Check if environment should use headless OAuth flow
 * Uses improved detection that avoids Windows false positives
 */
export function shouldUseHeadlessAuth(): boolean {
  return detectHeadless().isHeadless;
}

/**
 * Format diagnostics for display
 */
export function formatEnvironmentDiagnostics(diag: EnvironmentDiagnostics): string[] {
  const lines: string[] = [];

  // Platform
  lines.push(`Platform                ${diag.platformName} (${diag.platform})`);

  // Shell
  lines.push(`Shell                   ${diag.shell}`);

  // Terminal
  if (diag.termProgram) {
    lines.push(`Terminal Program        ${diag.termProgram}`);
  }
  if (diag.windowsTerminal) {
    lines.push(`Windows Terminal        Yes`);
  }
  if (diag.vsCodeTerminal) {
    lines.push(`VS Code Terminal        Yes`);
  }

  // SSH
  lines.push(`SSH Session             ${diag.sshSession ? `Yes (${diag.sshReason})` : 'No'}`);

  // TTY
  const ttyDisplay =
    diag.ttyStatus === 'undefined' ? 'undefined [!]' : diag.ttyStatus ? 'Yes' : 'No';
  lines.push(`stdin TTY               ${ttyDisplay}`);

  // Display (Linux)
  if (diag.platform === 'linux') {
    lines.push(`Display                 ${diag.display || 'Not set'}`);
  }

  // CI
  if (diag.ciEnvironment) {
    lines.push(`CI Environment          Yes`);
  }

  // Browser capability
  const browserIcon =
    diag.browserCapability === 'available'
      ? '[OK]'
      : diag.browserCapability === 'unlikely'
        ? '[!]'
        : '[?]';
  lines.push(`Browser Capability      ${browserIcon} ${diag.browserReason}`);

  // Headless detection result
  const headlessIcon = diag.detectedHeadless ? '[!]' : '[OK]';
  lines.push(`Headless Mode           ${headlessIcon} ${diag.detectedHeadless ? 'Yes' : 'No'}`);
  for (const reason of diag.headlessReasons) {
    lines.push(`                        → ${reason}`);
  }

  return lines;
}

export default {
  getEnvironmentDiagnostics,
  shouldUseHeadlessAuth,
  formatEnvironmentDiagnostics,
};
