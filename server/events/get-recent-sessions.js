/**
 * Event: get_recent_sessions
 *
 * Returns recent sessions across all projects, sorted by modification date.
 * Used for the "Recent Sessions" tab on the landing page.
 *
 * @event get_recent_sessions
 * @param {Object} message - { limit?: number }
 * @returns {void} Sends: recent_sessions
 *
 * @example
 * // Request
 * { type: 'get_recent_sessions', limit: 50 }
 *
 * // Response
 * {
 *   type: 'recent_sessions',
 *   sessions: [
 *     {
 *       sessionId: 'abc-123',
 *       projectSlug: '-home-ts-projects-foo',
 *       projectName: 'foo',
 *       projectPath: '/home/ts/projects/foo',
 *       firstPrompt: 'Help me with...',
 *       messageCount: 10,
 *       created: '2024-01-01T00:00:00Z',
 *       modified: '2024-01-02T00:00:00Z'
 *     }
 *   ]
 * }
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { config, getProjectDisplayName, slugToPath } from '../config.js';
import { getAllTitles } from '../lib/session-titles.js';
import { send } from '../lib/ws.js';

export function handler(ws, message) {
  const limit = message.limit || 50;

  try {
    if (!existsSync(config.projectsDir)) {
      send(ws, { type: 'recent_sessions', sessions: [] });
      return;
    }

    const entries = readdirSync(config.projectsDir, { withFileTypes: true });
    const allSessions = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectSlug = entry.name;
        const sessionsDir = join(config.projectsDir, projectSlug);
        const indexPath = join(sessionsDir, 'sessions-index.json');

        if (existsSync(indexPath)) {
          try {
            const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
            const projectName = getProjectDisplayName(projectSlug);
            const projectPath = slugToPath(projectSlug);
            const titles = getAllTitles(projectSlug);

            for (const session of data.entries || []) {
              // Use JSONL file mtime for accurate modification time
              // (sessions-index.json's modified field is stale)
              const jsonlPath = join(sessionsDir, `${session.sessionId}.jsonl`);
              let modified = session.modified;
              if (existsSync(jsonlPath)) {
                try {
                  const stats = statSync(jsonlPath);
                  modified = stats.mtime.toISOString();
                } catch {
                  // Fall back to index modified if stat fails
                }
              }

              allSessions.push({
                sessionId: session.sessionId,
                projectSlug,
                projectName,
                projectPath,
                firstPrompt:
                  session.firstPrompt?.substring(0, 100) || 'No prompt',
                messageCount: session.messageCount || 0,
                created: session.created,
                modified,
                title: titles[session.sessionId] || null,
              });
            }
          } catch {
            // Skip projects with malformed index
          }
        }
      }
    }

    // Sort by modification date (most recent first)
    allSessions.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    // Limit results
    const limitedSessions = allSessions.slice(0, limit);

    send(ws, {
      type: 'recent_sessions',
      sessions: limitedSessions,
    });
  } catch (err) {
    console.error('Failed to load recent sessions:', err.message);
    send(ws, { type: 'recent_sessions', sessions: [] });
  }
}
