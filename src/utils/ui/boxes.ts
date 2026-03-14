/**
 * Box Rendering
 *
 * Styled box containers with fallback ASCII rendering
 * @module utils/ui/boxes
 */

import type { BoxOptions } from '../../types/utils';
import { moduleCache, COLORS } from './types';
import { useColors } from './init';

/**
 * Fallback ASCII box renderer (when boxen not available)
 */
function renderAsciiBox(content: string, options: BoxOptions): string {
  const lines = content.split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length), (options.title?.length || 0) + 4);
  const width = maxLen + 4;

  let result = '';
  const padding = options.padding ?? 1;

  // Top border with optional title
  if (options.title) {
    const titlePad = Math.floor((width - options.title.length - 4) / 2);
    result +=
      '+' +
      '-'.repeat(titlePad) +
      ' ' +
      options.title +
      ' ' +
      '-'.repeat(width - titlePad - options.title.length - 4) +
      '+\n';
  } else {
    result += '+' + '-'.repeat(width - 2) + '+\n';
  }

  // Padding top
  for (let i = 0; i < padding; i++) {
    result += '|' + ' '.repeat(width - 2) + '|\n';
  }

  // Content
  for (const line of lines) {
    const pad = width - line.length - 4;
    result += '| ' + line + ' '.repeat(Math.max(0, pad)) + ' |\n';
  }

  // Padding bottom
  for (let i = 0; i < padding; i++) {
    result += '|' + ' '.repeat(width - 2) + '|\n';
  }

  // Bottom border
  result += '+' + '-'.repeat(width - 2) + '+';

  return result;
}

/**
 * Render content in a styled box
 */
export function box(content: string, options: BoxOptions = {}): string {
  if (!moduleCache.boxen) {
    return renderAsciiBox(content, options);
  }

  const borderColor = useColors() ? options.borderColor || COLORS.primary : undefined;

  return moduleCache.boxen(content, {
    padding: options.padding ?? 1,
    margin: options.margin ?? 0,
    borderStyle: options.borderStyle || 'round',
    borderColor,
    title: options.title,
    titleAlignment: options.titleAlignment || 'center',
  });
}

/**
 * Render error box (red border)
 */
export function errorBox(content: string, title = 'ERROR'): string {
  return box(content, {
    title,
    borderColor: 'red',
    borderStyle: 'round',
    padding: 1,
    margin: 1,
  });
}

/**
 * Render info box (primary color border)
 */
export function infoBox(content: string, title?: string): string {
  return box(content, {
    title,
    borderColor: COLORS.primary,
    borderStyle: 'round',
    padding: 1,
  });
}

/**
 * Render warning box (yellow border)
 */
export function warnBox(content: string, title = 'WARNING'): string {
  return box(content, {
    title,
    borderColor: 'yellow',
    borderStyle: 'round',
    padding: 1,
  });
}
