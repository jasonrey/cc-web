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

// Map of toolUseId -> { resolve, reject, sessionId, createdAt }
export const pendingQuestions = new Map();

// TTL for pending questions (10 minutes)
const PENDING_QUESTION_TTL_MS = 10 * 60 * 1000;

/**
 * Clean up expired pending questions to prevent memory leaks
 */
function cleanupExpiredQuestions() {
  const now = Date.now();
  for (const [toolUseId, pending] of pendingQuestions) {
    if (now - pending.createdAt > PENDING_QUESTION_TTL_MS) {
      pendingQuestions.delete(toolUseId);
      logger.log(
        `[answer_question] Cleaned up expired pending question: ${toolUseId}`,
      );
    }
  }
}

// Run cleanup every 5 minutes
const cleanupInterval = setInterval(cleanupExpiredQuestions, 5 * 60 * 1000);
// Allow process to exit without waiting for interval
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Handle answer_question WebSocket event
 */
export async function handler(ws, message, context) {
  const { toolUseId, answers } = message;

  logger.log(
    `[answer_question] Received handler call: toolUseId=${toolUseId}, answers=${JSON.stringify(answers)}`,
  );
  logger.log(
    `[answer_question] Pending questions: ${Array.from(pendingQuestions.keys()).join(', ')}`,
  );

  if (!toolUseId || !answers) {
    logger.log(
      '[answer_question] Invalid payload - missing toolUseId or answers',
    );
    send(ws, {
      type: 'error',
      message: 'Invalid answer_question payload',
      sessionId: context.currentSessionId,
    });
    return;
  }

  const pending = pendingQuestions.get(toolUseId);
  if (!pending) {
    logger.log(
      `[answer_question] No pending question found for toolUseId: ${toolUseId}`,
    );
    send(ws, {
      type: 'error',
      message: 'No pending question found for this toolUseId',
      sessionId: context.currentSessionId,
    });
    return;
  }

  // SECURITY: Verify the answering client owns the session that asked the question
  if (
    context.currentSessionId &&
    pending.sessionId &&
    context.currentSessionId !== pending.sessionId
  ) {
    logger.log(
      `[answer_question] Session mismatch: client=${context.currentSessionId}, question=${pending.sessionId}`,
    );
    send(ws, {
      type: 'error',
      message: 'Session mismatch: cannot answer questions from another session',
      sessionId: context.currentSessionId,
    });
    return;
  }

  logger.log('[answer_question] Converting answers to natural user message');

  // Convert the Q&A into a natural language message
  // Format: "Here are my answers: [question]: [answer], [question2]: [answer2]"
  const answerLines = Object.entries(answers).map(([header, answer]) => {
    if (Array.isArray(answer)) {
      return `${header}: ${answer.join(', ')}`;
    }
    return `${header}: ${answer}`;
  });

  const naturalMessage = `Here are my answers:\n${answerLines.join('\n')}`;

  logger.log(
    `[answer_question] Constructed natural message: ${naturalMessage}`,
  );

  // Trigger prompt handler with the natural message
  const { handler: promptHandler } = await import('./prompt.js');

  // Update context to point to the session we're resuming
  context.currentSessionId = pending.sessionId;

  await promptHandler(
    ws,
    {
      type: 'prompt',
      prompt: naturalMessage,
    },
    context,
  );

  pendingQuestions.delete(toolUseId);
  logger.log(
    `[answer_question] Question ${toolUseId} answered with natural message`,
  );
}
