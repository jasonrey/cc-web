import {
  addBookmark,
  getBookmarks,
  removeBookmark,
} from '../lib/terminal-bookmarks.js';
import watchManager from '../lib/watchManager.js';
import { send } from '../lib/ws.js';

export async function getHandler(ws, message) {
  const { projectSlug } = message;
  const bookmarks = getBookmarks(projectSlug);
  send(ws, { type: 'terminal:bookmarks', ...bookmarks });
  // Also send current watch state so client knows which are active
  send(ws, {
    type: 'terminal:watch:state',
    active: watchManager.getActiveWatchIds(),
  });
}

export async function addHandler(ws, message) {
  const { scope, projectSlug, command, cwd } = message;
  const bookmarks = addBookmark(scope, projectSlug, command, cwd);
  send(ws, { type: 'terminal:bookmarks', ...bookmarks });
}

export async function removeHandler(ws, message) {
  const { scope, projectSlug, id } = message;
  const bookmarks = removeBookmark(scope, projectSlug, id);
  send(ws, { type: 'terminal:bookmarks', ...bookmarks });
}
