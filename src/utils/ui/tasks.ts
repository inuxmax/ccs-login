/**
 * Task Lists
 *
 * Listr2 integration with fallback task runner
 * @module utils/ui/tasks
 */

import { moduleCache } from './types';
import { isInteractive, isClaudeCodeContext } from './init';
import { info } from './indicators';
import { spinner } from './spinner';

/**
 * Task list item interface
 */
export interface TaskItem<T> {
  title: string;
  task: (ctx: T) => Promise<void> | void;
  skip?: () => boolean | string;
}

/**
 * Task list options
 */
export interface TaskListOptions {
  concurrent?: boolean;
}

/**
 * Fallback task runner (no Listr2)
 * Uses spinners for sequential task execution
 */
async function runTasksFallback<T>(tasks: TaskItem<T>[]): Promise<T> {
  const ctx = {} as T;

  for (const task of tasks) {
    if (task.skip) {
      const skipResult = task.skip();
      if (skipResult) {
        console.log(info(`${task.title} [skipped]`));
        continue;
      }
    }

    const spin = await spinner(task.title);
    try {
      await task.task(ctx);
      spin.succeed();
    } catch (e) {
      spin.fail(`${task.title}: ${(e as Error).message}`);
      throw e;
    }
  }

  return ctx;
}

/**
 * Create a task list for progress display
 * Uses Listr2 in TTY mode, falls back to spinners in non-TTY
 */
export async function taskList<T>(tasks: TaskItem<T>[], options: TaskListOptions = {}): Promise<T> {
  // Lazy load Listr2 if not already loaded
  if (!moduleCache.listr && isInteractive()) {
    try {
      const listr2 = await import('listr2');
      moduleCache.listr = listr2.Listr;
    } catch (_e) {
      // Fallback to sequential execution with spinners
      return runTasksFallback(tasks);
    }
  }

  if (moduleCache.listr && isInteractive()) {
    // Determine renderer based on context
    // Use 'simple' in non-TTY, CI, or Claude Code context
    const useSimple = isClaudeCodeContext();

    const list = new moduleCache.listr(
      tasks.map((t) => ({
        title: t.title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        task: async (ctx: any) => t.task(ctx),
        skip: t.skip,
      })),
      {
        concurrent: options.concurrent ?? false,
        renderer: useSimple ? 'simple' : 'default',
        rendererOptions: {
          showSubtasks: true,
          collapseSubtasks: false,
        },
      }
    );

    return list.run({} as T);
  }

  // Fallback: non-interactive or Listr2 not available
  return runTasksFallback(tasks);
}
