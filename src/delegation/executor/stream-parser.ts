/**
 * Stream parsing utilities for Claude CLI stream-json output
 */

import type { StreamMessage, ToolInput } from './types';
import { warn } from '../../utils/ui';

/**
 * Buffer for incomplete JSON lines during streaming
 */
export class StreamBuffer {
  private partialLine = '';

  /**
   * Process incoming data chunk and extract complete JSON messages
   * @param dataStr - Raw data string from stream
   * @returns Array of parsed StreamMessage objects
   */
  parseChunk(dataStr: string): StreamMessage[] {
    const messages: StreamMessage[] = [];
    const chunk = this.partialLine + dataStr;
    const lines = chunk.split('\n');
    this.partialLine = lines.pop() || ''; // Save incomplete line for next chunk

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const msg: StreamMessage = JSON.parse(line);
        messages.push(msg);
      } catch (parseError) {
        // Skip malformed JSON lines (shouldn't happen with stream-json)
        if (process.env.CCS_DEBUG) {
          console.error(warn(`Failed to parse stream-json line: ${(parseError as Error).message}`));
        }
      }
    }

    return messages;
  }

  /**
   * Reset buffer state
   */
  reset(): void {
    this.partialLine = '';
  }
}

/**
 * Format tool use message for verbose logging
 * @param toolName - Name of the tool
 * @param toolInput - Tool input parameters
 * @returns Formatted verbose message
 */
export function formatToolVerbose(toolName: string, toolInput: ToolInput): string {
  let verboseMsg = `[Tool] ${toolName}`;

  switch (toolName) {
    case 'Bash':
      if (toolInput.command) {
        const command = toolInput.command as string;
        const cmd = command.length > 80 ? command.substring(0, 77) + '...' : command;
        verboseMsg += `: ${cmd}`;
      }
      break;

    case 'Edit':
    case 'Write':
    case 'Read':
      if (toolInput.file_path) {
        verboseMsg += `: ${toolInput.file_path}`;
      }
      break;

    case 'NotebookEdit':
    case 'NotebookRead':
      if (toolInput.notebook_path) {
        verboseMsg += `: ${toolInput.notebook_path}`;
      }
      break;

    case 'Grep':
      if (toolInput.pattern) {
        verboseMsg += `: searching for "${toolInput.pattern}"`;
        if (toolInput.path) {
          verboseMsg += ` in ${toolInput.path}`;
        }
      }
      break;

    case 'Glob':
      if (toolInput.pattern) {
        verboseMsg += `: ${toolInput.pattern}`;
      }
      break;

    case 'SlashCommand':
      if (toolInput.command) {
        verboseMsg += `: ${toolInput.command}`;
      }
      break;

    case 'Task':
      if (toolInput.description) {
        verboseMsg += `: ${toolInput.description}`;
      } else if (toolInput.prompt) {
        const promptText = toolInput.prompt as string;
        const prompt = promptText.length > 60 ? promptText.substring(0, 57) + '...' : promptText;
        verboseMsg += `: ${prompt}`;
      }
      break;

    case 'TodoWrite':
      if (toolInput.todos && Array.isArray(toolInput.todos)) {
        const inProgressTask = toolInput.todos.find(
          (t: { status: string; activeForm?: string }) => t.status === 'in_progress'
        );
        if (inProgressTask && inProgressTask.activeForm) {
          verboseMsg += `: ${inProgressTask.activeForm}`;
        } else {
          verboseMsg += `: ${toolInput.todos.length} task(s)`;
        }
      }
      break;

    case 'WebFetch':
      if (toolInput.url) {
        verboseMsg += `: ${toolInput.url}`;
      }
      break;

    case 'WebSearch':
      if (toolInput.query) {
        verboseMsg += `: "${toolInput.query}"`;
      }
      break;

    default:
      // For unknown tools, show first meaningful parameter
      if (Object.keys(toolInput).length > 0) {
        const firstKey = Object.keys(toolInput)[0];
        const firstValue = toolInput[firstKey];
        if (typeof firstValue === 'string' && firstValue.length < 60) {
          verboseMsg += `: ${firstValue}`;
        }
      }
  }

  return verboseMsg;
}
