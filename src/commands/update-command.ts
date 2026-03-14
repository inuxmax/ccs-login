/**
 * Update Command Handler
 *
 * Handles `ccs update` command - checks for updates and installs latest version.
 * Uses npm/yarn/pnpm/bun package managers exclusively.
 */

import { spawn } from 'child_process';
import { initUI, header, ok, fail, warn, info, color } from '../utils/ui';
import { detectPackageManager } from '../utils/package-manager-detector';
import { compareVersionsWithPrerelease } from '../utils/update-checker';
import { getVersion } from '../utils/version';

/**
 * Options for the update command
 */
export interface UpdateOptions {
  force?: boolean;
  beta?: boolean;
}

// Version (from centralized utility)
const CCS_VERSION = getVersion();

/**
 * Handle the update command
 * Checks for updates and installs the latest version
 */
export async function handleUpdateCommand(options: UpdateOptions = {}): Promise<void> {
  await initUI();
  const { force = false, beta = false } = options;
  const targetTag = beta ? 'dev' : 'latest';

  console.log('');
  console.log(header('Checking for updates...'));
  console.log('');

  // Force reinstall - skip update check
  if (force) {
    console.log(info(`Force reinstall from @${targetTag} channel...`));
    console.log('');
    await performNpmUpdate(targetTag, true);
    return;
  }

  const { checkForUpdates } = await import('../utils/update-checker');

  const updateResult = await checkForUpdates(CCS_VERSION, true, 'npm', targetTag);

  if (updateResult.status === 'check_failed') {
    handleCheckFailed(updateResult.message ?? 'Update check failed', targetTag);
    return;
  }

  if (updateResult.status === 'no_update') {
    handleNoUpdate(updateResult.reason);
    return;
  }

  // Update available
  console.log(warn(`Update available: ${updateResult.current} -> ${updateResult.latest}`));
  console.log('');

  // Check if this is a downgrade (e.g., stable to older dev)
  const isDowngrade =
    updateResult.latest &&
    updateResult.current &&
    compareVersionsWithPrerelease(updateResult.latest, updateResult.current) < 0;

  // This happens when stable user requests @dev but @dev base is older
  if (isDowngrade && beta) {
    console.log(
      warn(
        'WARNING: Downgrading from ' +
          (updateResult.current || 'unknown') +
          ' to ' +
          (updateResult.latest || 'unknown')
      )
    );
    console.log(warn('Dev channel may be behind stable.'));
    console.log('');
  }

  // Show beta warning
  if (beta) {
    console.log(warn('Installing from @dev channel (unstable)'));
    console.log(warn('Not recommended for production use'));
    console.log(info('Use `ccs update` (without --beta) to return to stable'));
    console.log('');
  }

  await performNpmUpdate(targetTag);
}

/**
 * Handle failed update check
 */
function handleCheckFailed(message: string, targetTag: string = 'latest'): void {
  console.log(fail(message));
  console.log('');
  console.log(warn('Possible causes:'));
  console.log('  - Network connection issues');
  console.log('  - Firewall blocking requests');
  console.log('  - GitHub/npm API temporarily unavailable');
  console.log('');
  console.log('Try again later or update manually:');

  const packageManager = detectPackageManager();
  let manualCommand: string;

  switch (packageManager) {
    case 'npm':
      manualCommand = `npm install -g @kaitranntt/ccs@${targetTag}`;
      break;
    case 'yarn':
      manualCommand = `yarn global add @kaitranntt/ccs@${targetTag}`;
      break;
    case 'pnpm':
      manualCommand = `pnpm add -g @kaitranntt/ccs@${targetTag}`;
      break;
    case 'bun':
      manualCommand = `bun add -g @kaitranntt/ccs@${targetTag}`;
      break;
    default:
      manualCommand = `npm install -g @kaitranntt/ccs@${targetTag}`;
  }

  console.log(color(`  ${manualCommand}`, 'command'));
  console.log('');
  process.exit(1);
}

/**
 * Handle no update available
 */
function handleNoUpdate(reason: string | undefined): void {
  const version = getVersion();

  let message = `You are already on the latest version (${version})`;

  switch (reason) {
    case 'dismissed':
      message = `Update dismissed. You are on version ${version}`;
      console.log(warn(message));
      break;
    case 'cached':
      message = `No updates available (cached result). You are on version ${version}`;
      console.log(info(message));
      break;
    default:
      console.log(ok(message));
  }
  console.log('');
  process.exit(0);
}

/**
 * Perform update via npm/yarn/pnpm/bun
 */
async function performNpmUpdate(
  targetTag: string = 'latest',
  isReinstall: boolean = false
): Promise<void> {
  const packageManager = detectPackageManager();
  let updateCommand: string;
  let updateArgs: string[];
  let cacheCommand: string | null;
  let cacheArgs: string[] | null;

  switch (packageManager) {
    case 'npm':
      updateCommand = 'npm';
      updateArgs = ['install', '-g', `@kaitranntt/ccs@${targetTag}`];
      cacheCommand = 'npm';
      cacheArgs = ['cache', 'clean', '--force'];
      break;
    case 'yarn':
      updateCommand = 'yarn';
      updateArgs = ['global', 'add', `@kaitranntt/ccs@${targetTag}`];
      cacheCommand = 'yarn';
      cacheArgs = ['cache', 'clean'];
      break;
    case 'pnpm':
      updateCommand = 'pnpm';
      updateArgs = ['add', '-g', `@kaitranntt/ccs@${targetTag}`];
      cacheCommand = 'pnpm';
      cacheArgs = ['store', 'prune'];
      break;
    case 'bun':
      updateCommand = 'bun';
      updateArgs = ['add', '-g', `@kaitranntt/ccs@${targetTag}`];
      // On Windows, bun's global bin symlink may not update properly without removal first
      // Pre-remove to ensure clean reinstall (mirrors dev-install.sh behavior)
      cacheCommand = process.platform === 'win32' ? 'bun' : null;
      cacheArgs = process.platform === 'win32' ? ['remove', '-g', '@kaitranntt/ccs'] : null;
      break;
    default:
      updateCommand = 'npm';
      updateArgs = ['install', '-g', `@kaitranntt/ccs@${targetTag}`];
      cacheCommand = 'npm';
      cacheArgs = ['cache', 'clean', '--force'];
  }

  console.log(info(`${isReinstall ? 'Reinstalling' : 'Updating'} via ${packageManager}...`));
  console.log('');

  const isWindows = process.platform === 'win32';

  const performUpdate = (): void => {
    // On Windows, use shell with full command string to avoid deprecation warning
    // Also suppress Node deprecation warnings that may come from package managers
    // Pipe stderr on Windows to filter npm cleanup warnings (EPERM on native modules)
    const child = isWindows
      ? spawn(`${updateCommand} ${updateArgs.join(' ')}`, [], {
          stdio: ['inherit', 'inherit', 'pipe'],
          shell: true,
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        })
      : spawn(updateCommand, updateArgs, { stdio: 'inherit' });

    // On Windows, filter stderr to hide npm cleanup warnings (EPERM on bcrypt.node etc.)
    // These warnings are cosmetic - update succeeds despite file locking by antivirus/indexing
    // Use line-buffering to handle chunk splitting (data events don't guarantee message boundaries)
    if (isWindows && child.stderr) {
      let stderrBuffer = '';
      child.stderr.on('data', (data: Buffer) => {
        stderrBuffer += data.toString();
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        for (const line of lines) {
          // Skip npm cleanup warnings (EPERM, ENOTEMPTY, EBUSY on native module prebuilds)
          if (!/npm warn cleanup/i.test(line)) {
            process.stderr.write(line + '\n');
          }
        }
      });
      child.stderr.on('close', () => {
        // Flush remaining buffer on stream close
        if (stderrBuffer && !/npm warn cleanup/i.test(stderrBuffer)) {
          process.stderr.write(stderrBuffer);
        }
      });
    }

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('');
        console.log(ok(`${isReinstall ? 'Reinstall' : 'Update'} successful!`));
        console.log('');
        console.log(`Run ${color('ccs --version', 'command')} to verify`);
        console.log(info(`Tip: Use ${color('ccs config', 'command')} for web-based configuration`));
        console.log('');
      } else {
        console.log('');
        console.log(fail(`${isReinstall ? 'Reinstall' : 'Update'} failed`));
        console.log('');
        console.log('Try manually:');
        console.log(color(`  ${updateCommand} ${updateArgs.join(' ')}`, 'command'));
        console.log('');
      }
      process.exit(code || 0);
    });

    child.on('error', () => {
      console.log('');
      console.log(fail(`Failed to run ${packageManager} ${isReinstall ? 'reinstall' : 'update'}`));
      console.log('');
      console.log('Try manually:');
      console.log(color(`  ${updateCommand} ${updateArgs.join(' ')}`, 'command'));
      console.log('');
      process.exit(1);
    });
  };

  if (cacheCommand && cacheArgs) {
    // For bun on Windows, we pre-remove instead of cache clear
    const isBunPreRemove = packageManager === 'bun' && cacheArgs.includes('remove');
    const stepMessage = isBunPreRemove
      ? 'Removing existing installation...'
      : 'Clearing package cache...';
    const failMessage = isBunPreRemove
      ? 'Pre-removal failed, proceeding anyway...'
      : 'Cache clearing failed, proceeding anyway...';

    console.log(info(stepMessage));
    // On Windows, use shell with full command string to avoid deprecation warning
    const cacheChild = isWindows
      ? spawn(`${cacheCommand} ${cacheArgs.join(' ')}`, [], {
          stdio: 'inherit',
          shell: true,
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        })
      : spawn(cacheCommand, cacheArgs, { stdio: 'inherit' });

    cacheChild.on('exit', (code) => {
      if (code !== 0) {
        console.log(warn(failMessage));
      }
      performUpdate();
    });

    cacheChild.on('error', () => {
      console.log(warn(failMessage));
      performUpdate();
    });
  } else {
    performUpdate();
  }
}
