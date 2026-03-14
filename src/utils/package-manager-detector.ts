/**
 * Package Manager Detector Utilities
 *
 * Cross-platform package manager detection utilities for CCS.
 * Now only supports npm-based installation (npm/yarn/pnpm/bun).
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/**
 * Detect which package manager was used for installation
 */
export function detectPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  const scriptPath = process.argv[1];

  // Check if script path contains package manager indicators
  if (scriptPath.includes('.pnpm')) return 'pnpm';
  if (scriptPath.includes('yarn')) return 'yarn';
  if (scriptPath.includes('bun')) return 'bun';

  // Check parent directories for lock files
  const binDir = path.dirname(scriptPath);

  let checkDir = binDir;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(checkDir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(checkDir, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(checkDir, 'bun.lockb'))) return 'bun';
    checkDir = path.dirname(checkDir);
  }

  // Check if package managers are available on the system
  try {
    const yarnResult = spawnSync('yarn', ['global', 'list', '--pattern', '@kaitranntt/ccs'], {
      encoding: 'utf8',
      shell: true,
      timeout: 5000,
    });
    if (yarnResult.status === 0 && yarnResult.stdout.includes('@kaitranntt/ccs')) {
      return 'yarn';
    }
  } catch (_err) {
    // Continue to next check
  }

  try {
    const pnpmResult = spawnSync('pnpm', ['list', '-g', '--pattern', '@kaitranntt/ccs'], {
      encoding: 'utf8',
      shell: true,
      timeout: 5000,
    });
    if (pnpmResult.status === 0 && pnpmResult.stdout.includes('@kaitranntt/ccs')) {
      return 'pnpm';
    }
  } catch (_err) {
    // Continue to next check
  }

  try {
    const bunResult = spawnSync('bun', ['pm', 'ls', '-g', '--pattern', '@kaitranntt/ccs'], {
      encoding: 'utf8',
      shell: true,
      timeout: 5000,
    });
    if (bunResult.status === 0 && bunResult.stdout.includes('@kaitranntt/ccs')) {
      return 'bun';
    }
  } catch (_err) {
    // Continue to default
  }

  return 'npm';
}
