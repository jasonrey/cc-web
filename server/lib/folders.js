/**
 * Folder utilities - browse filesystem directories
 */

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Browse folder contents
 * @param {string|null} folderPath - Path to browse, defaults to $HOME
 * @returns {{path: string, contents: Array<{name: string, path: string, isDirectory: boolean}>}}
 */
export function browseFolderContents(folderPath) {
  const targetPath = folderPath || homedir();

  try {
    if (!existsSync(targetPath)) {
      return { path: targetPath, contents: [] };
    }

    const entries = readdirSync(targetPath, { withFileTypes: true });
    const contents = entries
      .filter((entry) => !entry.name.startsWith('.')) // Hide hidden files
      .map((entry) => ({
        name: entry.name,
        path: join(targetPath, entry.name),
        isDirectory: entry.isDirectory(),
      }))
      .sort((a, b) => {
        // Directories first, then alphabetically
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    return { path: targetPath, contents };
  } catch (err) {
    console.error('Failed to browse folder:', err.message);
    return { path: targetPath, contents: [] };
  }
}
