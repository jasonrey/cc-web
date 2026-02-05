/**
 * Event: get_project_status
 *
 * Returns project status including git branch and file changes.
 * Called when entering a chat session to populate the toolbar.
 *
 * @event get_project_status
 * @param {Object} message - {}
 * @returns {void} Sends: project_status
 *
 * @example
 * // Request
 * { type: 'get_project_status' }
 *
 * // Response
 * {
 *   type: 'project_status',
 *   cwd: '/home/ts/projects/foo',
 *   gitBranch: 'main',
 *   gitChanges: { added: 2, modified: 3, deleted: 1 }
 * }
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { slugToPath } from '../config.js';
import { send } from '../lib/ws.js';

export function handler(ws, _message, context) {
  if (!context.currentProjectPath) {
    send(ws, {
      type: 'project_status',
      cwd: null,
      gitBranch: null,
      gitChanges: null,
    });
    return;
  }

  const cwd = slugToPath(context.currentProjectPath);

  let gitBranch = null;
  let gitChanges = null;

  // Only attempt git commands if the directory exists
  if (cwd && existsSync(cwd)) {
    try {
      // Get current branch - suppress stderr to avoid error output for non-git dirs
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      // Get file changes
      const status = execSync('git status --porcelain', {
        cwd,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const changes = { added: 0, modified: 0, deleted: 0 };
      const lines = status.split('\n').filter(Boolean);

      for (const line of lines) {
        const code = line.substring(0, 2);
        if (code.includes('A') || code === '??') {
          changes.added++;
        } else if (code.includes('M') || code.includes('R')) {
          changes.modified++;
        } else if (code.includes('D')) {
          changes.deleted++;
        }
      }

      gitChanges = changes;
    } catch (_err) {
      // Not a git repo, git not available, or other git error - silently ignore
      // gitBranch and gitChanges will remain null
    }
  }

  send(ws, {
    type: 'project_status',
    cwd,
    gitBranch,
    gitChanges,
  });
}
