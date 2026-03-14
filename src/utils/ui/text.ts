/**
 * Text Formatting
 *
 * Headers, subheaders, and text utilities
 * @module utils/ui/text
 */

import { moduleCache, COLORS } from './types';
import { useColors } from './init';
import { gradientText, bold, dim } from './colors';

/**
 * Print section header with optional gradient
 */
export function header(text: string, useGradient = true): string {
  if (useGradient && useColors()) {
    return gradientText(text);
  }
  return bold(text);
}

/**
 * Print subsection header
 */
export function subheader(text: string): string {
  if (!moduleCache.chalk || !useColors()) return text;
  return moduleCache.chalk.hex(COLORS.primary)(text);
}

/**
 * Print horizontal rule
 */
export function hr(char = '─', width = 60): string {
  if (!useColors()) {
    return '-'.repeat(width);
  }
  return dim(char.repeat(width));
}

/**
 * Print section header with ═══ borders
 * Format: ═══ Title ═══
 */
export function sectionHeader(title: string): string {
  const border = '═══';
  const headerText = `${border} ${title} ${border}`;
  // Use gradient + bold for visual appeal
  if (moduleCache.gradient && moduleCache.chalk && useColors()) {
    return moduleCache.chalk.bold(
      moduleCache.gradient([COLORS.primary, COLORS.secondary])(headerText)
    );
  }
  // Fallback to bold primary color
  if (useColors() && moduleCache.chalk) {
    return moduleCache.chalk.hex(COLORS.primary).bold(headerText);
  }
  return headerText;
}
