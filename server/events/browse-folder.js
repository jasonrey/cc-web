/**
 * Event: browse_folder
 *
 * Browse filesystem directory contents.
 * Returns list of files and subdirectories (hidden files excluded).
 *
 * @event browse_folder
 * @param {Object} message - { path: string|null } - Path to browse, null for $HOME
 * @returns {void} Sends: { type: 'folder_contents', path, contents }
 *
 * @example
 * // Request
 * { type: 'browse_folder', path: '/home/ts/projects' }
 *
 * // Response
 * {
 *   type: 'folder_contents',
 *   path: '/home/ts/projects',
 *   contents: [
 *     { name: 'foo', path: '/home/ts/projects/foo', isDirectory: true },
 *     { name: 'file.txt', path: '/home/ts/projects/file.txt', isDirectory: false }
 *   ]
 * }
 */

import { browseFolderContents } from '../lib/folders.js';
import { send } from '../lib/ws.js';

export function handler(ws, message, _context) {
  const result = browseFolderContents(message.path);

  send(ws, {
    type: 'folder_contents',
    path: result.path,
    contents: result.contents,
  });
}
