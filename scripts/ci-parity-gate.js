const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function run(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

function runQuiet(command, args) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return typeof result.status === 'number' ? result.status : 1;
}

function getStdout(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  process.chdir(repoRoot);

  if (process.env.CCS_SKIP_PREPUSH_GATE === '1') {
    console.log('[i] Skipping pre-push CI parity gate (CCS_SKIP_PREPUSH_GATE=1).');
    return;
  }

  if (!fs.existsSync(path.join(repoRoot, 'AGENTS.md'))) {
    console.log('[X] Missing AGENTS.md in this worktree.');
    console.log('    Ensure you are in a valid CCS repository/worktree before pushing.');
    process.exit(1);
  }

  let currentBranch = '';
  try {
    currentBranch = getStdout('git rev-parse --abbrev-ref HEAD');
  } catch {
    console.log('[X] git is required for CI parity gate.');
    process.exit(1);
  }

  if (!currentBranch || currentBranch === 'HEAD') {
    console.log('[i] Detached HEAD detected. Skipping pre-push CI parity gate.');
    return;
  }

  const baseBranch =
    process.env.CCS_PR_BASE ||
    (currentBranch === 'main' || /^hotfix\//.test(currentBranch) || /^kai\/hotfix-/.test(currentBranch)
      ? 'main'
      : 'dev');

  console.log('[i] Pre-push CI parity gate');
  console.log(`    branch: ${currentBranch}`);
  console.log(`    base:   ${baseBranch}`);

  runQuiet('git', ['fetch', 'origin', baseBranch, '--quiet']);

  const hasRemoteBase =
    runQuiet('git', ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${baseBranch}`]) === 0;

  if (hasRemoteBase) {
    const isAncestor =
      runQuiet('git', ['merge-base', '--is-ancestor', `origin/${baseBranch}`, 'HEAD']) === 0;
    if (!isAncestor) {
      console.log(`[X] Branch '${currentBranch}' is behind origin/${baseBranch}.`);
      console.log('    Rebase or merge before pushing:');
      console.log(`    git pull --rebase origin ${baseBranch}`);
      process.exit(1);
    }
  }

  console.log('[i] Running CI-equivalent local checks...');
  run('bun', ['run', 'build:all']);
  run('bun', ['run', 'validate']);
  console.log('[OK] CI parity gate passed.');
}

main();
