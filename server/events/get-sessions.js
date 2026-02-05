/**
 * Event: get_sessions
 *
 * Returns sessions list for the currently selected project.
 * Requires a project to be selected first via select_project.
 *
 * @event get_sessions
 * @param {Object} message - Empty object {}
 * @returns {void} Sends: { type: 'sessions_list', sessions }
 *
 * @example
 * // Request
 * { type: 'get_sessions' }
 *
 * // Response
 * {
 *   type: 'sessions_list',
 *   sessions: [
 *     { sessionId: 'abc123', firstPrompt: 'Help me...', messageCount: 10, created: '...', modified: '...' }
 *   ]
 * }
 */

import { getAllTitles } from '../lib/session-titles.js';
import { getSessionsList } from '../lib/sessions.js';
import { send } from '../lib/ws.js';

export function handler(ws, _message, context) {
  if (!context.currentProjectPath) {
    send(ws, { type: 'error', message: 'No project selected' });
    return;
  }

  const sessions = getSessionsList(context.currentProjectPath);
  const titles = getAllTitles(context.currentProjectPath);

  // Enrich sessions with titles
  const enrichedSessions = sessions.map((session) => ({
    ...session,
    title: titles[session.sessionId] || null,
  }));

  send(ws, {
    type: 'sessions_list',
    sessions: enrichedSessions,
  });
}
