/**
 * Color System
 *
 * Semantic color functions with TTY awareness
 * @module utils/ui/colors
 */

import type { SemanticColor } from '../../types/utils';
import { moduleCache, COLORS } from './types';
import { useColors } from './init';

/**
 * Apply semantic color to text
 */
export function color(text: string, semantic: SemanticColor): string {
  if (!moduleCache.chalk || !useColors()) return text;

  switch (semantic) {
    case 'success':
      return moduleCache.chalk.green.bold(text);
    case 'error':
      return moduleCache.chalk.red.bold(text);
    case 'warning':
      return moduleCache.chalk.yellow(text);
    case 'info':
      return moduleCache.chalk.cyan(text);
    case 'dim':
      return moduleCache.chalk.gray(text);
    case 'primary':
      return moduleCache.chalk.hex(COLORS.primary).bold(text);
    case 'secondary':
      return moduleCache.chalk.hex(COLORS.secondary)(text);
    case 'command':
      return moduleCache.chalk.yellow.bold(text);
    case 'path':
      return moduleCache.chalk.cyan.underline(text);
    default:
      return text;
  }
}

/**
 * Apply gradient to text (for headers)
 * Uses cyan-to-blue gradient for professional look
 */
export function gradientText(text: string): string {
  if (!moduleCache.gradient || !useColors()) return text;
  return moduleCache.gradient([COLORS.primary, COLORS.secondary])(text);
}

/**
 * Bold text
 */
export function bold(text: string): string {
  if (!moduleCache.chalk || !useColors()) return text;
  return moduleCache.chalk.bold(text);
}

/**
 * Dim text
 */
export function dim(text: string): string {
  if (!moduleCache.chalk || !useColors()) return text;
  return moduleCache.chalk.dim(text);
}
