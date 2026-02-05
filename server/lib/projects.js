/**
 * Project utilities - list projects from ~/.claude/projects/
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { config, getProjectDisplayName, slugToPath } from '../config.js';

/**
 * Get list of available projects from ~/.claude/projects/
 * @returns {Array<{slug: string, name: string, path: string, sessionCount: number, lastModified: string|null}>}
 */
export function getProjectsList() {
  try {
    if (!existsSync(config.projectsDir)) {
      return [];
    }

    const entries = readdirSync(config.projectsDir, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const slug = entry.name;
        const displayName = getProjectDisplayName(slug);
        const sessionsDir = join(config.projectsDir, slug);
        const indexPath = join(sessionsDir, 'sessions-index.json');

        let sessionCount = 0;
        let lastModified = null;

        if (existsSync(indexPath)) {
          try {
            const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
            sessionCount = data.entries?.length || 0;
            if (data.entries?.length > 0) {
              // Use JSONL file mtime for accurate timestamps
              // (sessions-index.json's modified field is stale)
              let latestMtime = null;
              for (const entry of data.entries) {
                const jsonlPath = join(sessionsDir, `${entry.sessionId}.jsonl`);
                if (existsSync(jsonlPath)) {
                  try {
                    const stats = statSync(jsonlPath);
                    if (!latestMtime || stats.mtime > latestMtime) {
                      latestMtime = stats.mtime;
                    }
                  } catch (_err) {
                    // Ignore stat errors (file may have been deleted)
                  }
                }
              }
              lastModified = latestMtime
                ? latestMtime.toISOString()
                : data.entries[0].modified;
            }
          } catch (_err) {
            // Skip projects with malformed sessions-index.json
          }
        }

        // Only include projects that have sessions
        if (sessionCount > 0) {
          projects.push({
            slug,
            name: displayName,
            path: slugToPath(slug),
            sessionCount,
            lastModified,
          });
        }
      }
    }

    // Sort by last modified
    return projects.sort((a, b) => {
      if (!a.lastModified) return 1;
      if (!b.lastModified) return -1;
      return new Date(b.lastModified) - new Date(a.lastModified);
    });
  } catch (err) {
    console.error('Failed to load projects:', err.message);
    return [];
  }
}
