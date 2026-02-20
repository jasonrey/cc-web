/**
 * Terminal Watch Event Handler
 *
 * Handles enabling/disabling watch mode for terminal bookmarks.
 *
 * @event terminal:watch:update
 * @param {Object} message - { bookmarkId, scope, projectSlug, watch: { enabled, interval, mode } }
 */

import { updateBookmarkWatch } from '../lib/terminal-bookmarks.js';
import watchManager from '../lib/watchManager.js';
import { broadcast, send } from '../lib/ws.js';

const MIN_INTERVAL_S = 1;
const MAX_INTERVAL_S = 3600;

// Debounce timer for broadcasts to prevent storm on rapid toggles
let broadcastTimer = null;
const BROADCAST_DEBOUNCE_MS = 80;

function scheduleBroadcast(projectSlug, bookmarks) {
  if (broadcastTimer) clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    broadcast({ type: 'terminal:bookmarks', projectSlug, ...bookmarks });
    broadcast({
      type: 'terminal:watch:state',
      active: watchManager.getActiveWatchIds(),
    });
  }, BROADCAST_DEBOUNCE_MS);
}

export async function watchUpdateHandler(ws, message) {
  const { bookmarkId, scope, projectSlug, watch } = message;

  if (!bookmarkId || !projectSlug) {
    send(ws, {
      type: 'terminal:error',
      error: 'bookmarkId and projectSlug are required',
    });
    return;
  }

  // Validate and clamp interval server-side
  if (watch?.enabled) {
    const interval = Number(watch.interval);
    if (!Number.isFinite(interval) || interval < MIN_INTERVAL_S) {
      send(ws, {
        type: 'terminal:error',
        error: `Watch interval must be at least ${MIN_INTERVAL_S} second`,
      });
      return;
    }
    watch.interval = Math.min(interval, MAX_INTERVAL_S);
  }

  const resolvedScope = scope || 'project';

  // Persist watch config to bookmark
  const bookmarks = updateBookmarkWatch(
    resolvedScope,
    projectSlug,
    bookmarkId,
    watch,
  );

  if (watch?.enabled) {
    // Find the updated bookmark to pass to watchManager.
    // Tag it with _scope so watchManager can store it on the process entry,
    // enabling reliable scope inference when the kill handler runs later.
    const allBookmarks = [...bookmarks.global, ...bookmarks.project];
    const bookmark = allBookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      bookmark._scope = resolvedScope;
      watchManager.startWatch(projectSlug, bookmark);
    }
  } else {
    watchManager.stopWatch(bookmarkId);
  }

  // Debounced broadcast to prevent storm on rapid toggles
  scheduleBroadcast(projectSlug, bookmarks);
}
