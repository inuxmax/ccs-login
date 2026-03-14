/**
 * Binary Updater
 * Re-exports installer and lifecycle functionality.
 */

// Re-export installer functions
export {
  downloadAndInstall,
  deleteBinary,
  getBinaryPath,
  isBinaryInstalled,
  getBinaryInfo,
} from './installer';

// Re-export lifecycle functions
export { ensureBinary } from './lifecycle';
