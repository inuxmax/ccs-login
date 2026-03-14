/**
 * Spinner / Progress
 *
 * Ora-based spinner with TTY fallback
 * @module utils/ui/spinner
 */

import type { SpinnerOptions, SpinnerController } from '../../types/utils';
import { moduleCache } from './types';
import { isInteractive } from './init';
import { color } from './colors';
import { ok, fail, warn, info } from './indicators';

/**
 * Create and start a spinner
 * Falls back to plain text output in non-TTY environments
 */
export async function spinner(options: SpinnerOptions | string): Promise<SpinnerController> {
  const opts = typeof options === 'string' ? { text: options } : options;
  const isEnabled = isInteractive();

  // Lazy load ora if not already loaded
  if (!moduleCache.ora && isEnabled) {
    try {
      moduleCache.ora = (await import('ora')).default;
    } catch (_e) {
      // Fallback to plain text
    }
  }

  if (moduleCache.ora && isEnabled) {
    const s = moduleCache
      .ora({
        text: opts.text,
        color: 'cyan',
        prefixText: opts.prefixText,
        isEnabled,
      })
      .start();

    return {
      succeed: (msg?: string) => s.succeed(msg || `${color('[OK]', 'success')} ${opts.text}`),
      fail: (msg?: string) => s.fail(msg || `${color('[X]', 'error')} ${opts.text}`),
      warn: (msg?: string) => s.warn(msg || `${color('[!]', 'warning')} ${opts.text}`),
      info: (msg?: string) => s.info(msg || `${color('[i]', 'info')} ${opts.text}`),
      update: (text: string) => {
        s.text = text;
      },
      stop: () => s.stop(),
    };
  }

  // Fallback: plain text (non-TTY)
  console.log(`[i] ${opts.text}...`);
  return {
    succeed: (msg?: string) => console.log(ok(msg || opts.text)),
    fail: (msg?: string) => console.log(fail(msg || opts.text)),
    warn: (msg?: string) => console.log(warn(msg || opts.text)),
    info: (msg?: string) => console.log(info(msg || opts.text)),
    update: (_text: string) => {
      /* no-op in non-TTY */
    },
    stop: () => {
      /* no-op */
    },
  };
}
