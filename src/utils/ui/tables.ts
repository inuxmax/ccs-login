/**
 * Table Rendering
 *
 * Styled table output with cli-table3
 * @module utils/ui/tables
 */

import type { TableOptions } from '../../types/utils';
import { color } from './colors';

// cli-table3 is CommonJS
const Table = require('cli-table3');

/**
 * Create styled table
 */
export function table(rows: string[][], options: TableOptions = {}): string {
  // Build table configuration
  const tableConfig: Record<string, unknown> = {
    wordWrap: options.wordWrap ?? true,
    chars:
      options.style === 'ascii'
        ? {
            top: '-',
            'top-mid': '+',
            'top-left': '+',
            'top-right': '+',
            bottom: '-',
            'bottom-mid': '+',
            'bottom-left': '+',
            'bottom-right': '+',
            left: '|',
            'left-mid': '+',
            mid: '-',
            'mid-mid': '+',
            right: '|',
            'right-mid': '+',
            middle: '|',
          }
        : {
            top: '─',
            'top-mid': '┬',
            'top-left': '┌',
            'top-right': '┐',
            bottom: '─',
            'bottom-mid': '┴',
            'bottom-left': '└',
            'bottom-right': '┘',
            left: '│',
            'left-mid': '├',
            mid: '─',
            'mid-mid': '┼',
            right: '│',
            'right-mid': '┤',
            middle: '│',
          },
  };

  // Only add head if provided (cli-table3 requires head length to match rows)
  if (options.head && options.head.length > 0) {
    tableConfig.head = options.head.map((h: string) => color(h, 'primary'));
  }

  // Only add colWidths if provided
  if (options.colWidths) {
    tableConfig.colWidths = options.colWidths;
  }

  const tableInstance = new Table(tableConfig);

  rows.forEach((row) => tableInstance.push(row));
  return tableInstance.toString();
}
