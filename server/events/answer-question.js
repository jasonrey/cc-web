/**
 * Event: answer_question
 *
 * Receives user's answers to an AskUserQuestion prompt from the frontend.
 * Resolves the pending Promise in prompt.js so the SDK stream can continue.
 *
 * @event answer_question
 * @param {Object} message - { toolUseId: string, answers: Record<string, string|string[]> }
 */

import { logger } from '../lib/logger.js';
import { send } from '../lib/ws.js';

// Map of toolUseId -> { resolve, reject, sessionId }
export const pendingQuestions = new Map();

/**
 * Handle answer_question WebSocket event
 */
export function handler(ws, message, context) {
  const { toolUseId, answers } = message;

  if (!toolUseId || !answers) {
    send(ws, {
      type: 'error',
      message: 'Invalid answer_question payload',
      sessionId: context.currentSessionId,
    });
    return;
  }

  const pending = pendingQuestions.get(toolUseId);
  if (!pending) {
    send(ws, {
      type: 'error',
      message: 'No pending question found for this toolUseId',
      sessionId: context.currentSessionId,
    });
    return;
  }

  logger.log(`Received answer for question ${toolUseId}`);
  pending.resolve(answers);
  pendingQuestions.delete(toolUseId);
}

/**
 * Wait for user to answer a question.
 * Returns a Promise that resolves when the frontend sends answer_question.
 *
 * No timeout - the user must either answer or cancel the task.
 * This avoids unexpected stream termination from arbitrary timeouts.
 * The existing task cancel (AbortController) serves as the escape hatch.
 *
 * @param {string} toolUseId - The tool_use ID to wait for
 * @param {string} sessionId - The session ID for this question
 * @returns {Promise<Record<string, string|string[]>>} User's answers
 */
export function waitForQuestionAnswer(toolUseId, sessionId) {
  return new Promise((resolve, reject) => {
    pendingQuestions.set(toolUseId, { resolve, reject, sessionId });
  });
}
