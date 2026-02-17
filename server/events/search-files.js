import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { slugToPath } from '../config.js';
import { send } from '../lib/ws.js';

/**
 * Check if query is a glob pattern
 * @param {string} query - Search query
 * @returns {boolean}
 */
function isGlobPattern(query) {
  return query.includes('*') || query.includes('?');
}

/**
 * Convert glob pattern to regex
 * @param {string} pattern - Glob pattern (e.g., "*.md", "test*.js")
 * @returns {RegExp}
 */
function globToRegex(pattern) {
  // Escape special regex characters except * and ?
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Recursively search for files and folders in a directory
 * @param {string} dirPath - Directory to search
 * @param {string} query - Search query (case-insensitive or glob pattern)
 * @param {number} maxDepth - Maximum depth to recurse
 * @param {number} maxResults - Maximum results to return
 * @param {string} basePath - Base path for relative paths
 * @returns {Promise<Array>} Array of file/folder paths
 */
async function searchFiles(
  dirPath,
  query,
  maxDepth = 5,
  maxResults = 100,
  basePath = dirPath,
) {
  const results = [];
  const lowerQuery = query.toLowerCase();
  const isGlob = isGlobPattern(query);
  const globRegex = isGlob ? globToRegex(query) : null;

  // Common directories to skip
  const skipDirs = new Set([
    'node_modules',
    '.git',
    '.next',
    '.nuxt',
    'dist',
    'build',
    'coverage',
    '.cache',
    '.DS_Store',
    '__pycache__',
    '.pytest_cache',
    '.venv',
    'venv',
    '.env',
  ]);

  async function search(currentPath, depth) {
    if (depth > maxDepth || results.length >= maxResults) {
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        // Skip hidden files/folders and common build directories
        if (entry.name.startsWith('.') || skipDirs.has(entry.name)) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        const fileName = entry.name.toLowerCase();

        // Check if item matches search criteria
        let matches = false;

        if (isGlob) {
          // Glob pattern matching (only against filename)
          matches = globRegex.test(entry.name);
        } else {
          // Fuzzy match: check if all query chars appear in order
          let queryIndex = 0;
          for (const char of fileName) {
            if (char === lowerQuery[queryIndex]) {
              queryIndex++;
              if (queryIndex === lowerQuery.length) break;
            }
          }
          matches = queryIndex === lowerQuery.length;
        }

        if (entry.isDirectory()) {
          // Add matching directories to results
          if (matches) {
            results.push({
              name: entry.name,
              path: fullPath,
              relativePath,
              directory: path.dirname(relativePath),
              isDirectory: true,
            });
          }
          // Always recurse into directories
          await search(fullPath, depth + 1);
        } else if (entry.isFile()) {
          // Add matching files to results
          if (matches) {
            results.push({
              name: entry.name,
              path: fullPath,
              relativePath,
              directory: path.dirname(relativePath),
              isDirectory: false,
            });
          }
        }
      }
    } catch (_err) {
      // Skip directories we can't read (permissions, etc.)
    }
  }

  await search(dirPath, 0);
  return results;
}

/**
 * Handle files:search WebSocket event
 */
export async function handleFilesSearch(ws, payload, context) {
  const { query, projectPath } = payload;

  try {
    // Get project slug from context or use provided path
    // context.currentProjectPath is actually a slug, not a path
    const projectSlugOrPath = projectPath || context?.currentProjectPath;

    if (!projectSlugOrPath) {
      throw new Error('No project path specified');
    }

    // Convert slug to path if it starts with dash (slug format)
    const actualPath = projectSlugOrPath.startsWith('-')
      ? slugToPath(projectSlugOrPath)
      : projectSlugOrPath;

    // Validate path exists and is a directory
    const resolvedPath = realpathSync(actualPath);
    const stats = await fs.stat(resolvedPath);

    if (!stats.isDirectory()) {
      throw new Error('Search path must be a directory');
    }

    // Perform search
    const results = await searchFiles(resolvedPath, query);

    send(ws, {
      type: 'files:search:result',
      query,
      projectPath: resolvedPath,
      results,
      count: results.length,
    });
  } catch (err) {
    send(ws, {
      type: 'files:search:error',
      query,
      error: err.message,
    });
  }
}
