/**
 * Event: new_session
 *
 * Clears current session to start fresh.
 * The actual session is created when the first prompt is sent.
 *
 * @event new_session
 * @param {Object} message - Empty object {}
 * @returns {void} Sends: session_selected, task_status
 *
 * @example
 * // Request
 * { type: 'new_session' }
 *
 * // Response
 * { type: 'session_selected', sessionId: null, projectPath: '-home-...', isNew: true }
 * { type: 'task_status', taskId: null, status: 'idle', resultsCount: 0 }
 */

import { send, unwatchSession } from '../lib/ws.js';

export function handler(ws, _message, context) {
  // Unwatch previous session if any
  if (context.currentSessionId) {
    unwatchSession(context.currentSessionId, ws);
  }
  context.currentSessionId = null;

  send(ws, {
    type: 'session_selected',
    sessionId: null,
    projectPath: context.currentProjectPath,
    isNew: true,
  });

  send(ws, {
    type: 'task_status',
    taskId: null,
    status: 'idle',
    resultsCount: 0,
  });
}
