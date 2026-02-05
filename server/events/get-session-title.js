/**
 * Event: get_session_title
 *
 * Get the custom title for a session.
 *
 * @event get_session_title
 * @param {Object} message - { sessionId: string }
 * @returns {void} Sends: session_title
 */

import { getTitle } from '../lib/session-titles.js';
import { send } from '../lib/ws.js';

export function handler(ws, message, context) {
  const { sessionId } = message;

  if (!context.currentProjectPath) {
    send(ws, { type: 'error', message: 'No project selected' });
    return;
  }

  if (!sessionId) {
    send(ws, { type: 'error', message: 'Session ID required' });
    return;
  }

  const title = getTitle(context.currentProjectPath, sessionId);

  send(ws, {
    type: 'session_title',
    sessionId,
    title,
  });
}
