/**
 * WebSocket utilities - client management, broadcast, send
 */

// Connected clients
export const clients = new Set();

// Map of sessionId -> Set of WebSocket clients watching that session
const sessionWatchers = new Map();

/**
 * Register a client as watching a session
 * Notifies existing watchers that session is now shared
 * @param {string} sessionId
 * @param {WebSocket} ws
 * @returns {boolean} True if there were other watchers
 */
export function watchSession(sessionId, ws) {
  if (!sessionId || !ws) return false;

  let watchers = sessionWatchers.get(sessionId);
  if (!watchers) {
    watchers = new Set();
    sessionWatchers.set(sessionId, watchers);
  }

  // Check before adding (single-threaded so this is safe)
  const hadOtherWatchers = watchers.size > 0;
  watchers.add(ws);

  // Notify existing watchers that someone else joined
  if (hadOtherWatchers) {
    for (const client of watchers) {
      if (client !== ws) {
        send(client, {
          type: 'session_active_elsewhere',
          isActiveElsewhere: true,
        });
      }
    }
  }

  return hadOtherWatchers;
}

/**
 * Unregister a client from watching a session
 * Notifies remaining watchers if session is now single-user
 * @param {string} sessionId
 * @param {WebSocket} ws
 */
export function unwatchSession(sessionId, ws) {
  if (!sessionId || !ws) return;

  const watchers = sessionWatchers.get(sessionId);
  if (!watchers) return;

  watchers.delete(ws);

  if (watchers.size === 0) {
    sessionWatchers.delete(sessionId);
  } else if (watchers.size === 1) {
    // Only one watcher left - notify them session is no longer shared
    for (const client of watchers) {
      send(client, {
        type: 'session_active_elsewhere',
        isActiveElsewhere: false,
      });
    }
  }
}

/**
 * Unregister a client from all sessions (on disconnect)
 * Notifies remaining watchers if session becomes single-user
 * @param {WebSocket} ws
 */
export function unwatchAllSessions(ws) {
  if (!ws) return;

  // Collect sessions to clean up (avoid modifying map during iteration)
  const sessionsToCleanup = [];
  for (const [sessionId, watchers] of sessionWatchers) {
    if (watchers.has(ws)) {
      sessionsToCleanup.push(sessionId);
    }
  }

  for (const sessionId of sessionsToCleanup) {
    unwatchSession(sessionId, ws);
  }
}

/**
 * Check how many clients are watching a session
 * @param {string} sessionId
 * @param {WebSocket} [excludeWs] - Optional client to exclude from count
 * @returns {number} Number of watchers
 */
export function getSessionWatcherCount(sessionId, excludeWs = null) {
  if (!sessionWatchers.has(sessionId)) return 0;
  const watchers = sessionWatchers.get(sessionId);
  if (excludeWs && watchers.has(excludeWs)) {
    return watchers.size - 1;
  }
  return watchers.size;
}

/**
 * Broadcast message to all clients watching a session
 * @param {string} sessionId
 * @param {Object} message
 * @param {WebSocket} [excludeWs] - Optional client to exclude (the sender)
 */
export function broadcastToSession(sessionId, message, excludeWs = null) {
  if (!sessionWatchers.has(sessionId)) return;

  const data = JSON.stringify(message);
  for (const client of sessionWatchers.get(sessionId)) {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(data);
    }
  }
}

/**
 * Broadcast message to all connected clients
 * @param {Object} message
 */
export function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

/**
 * Send message to specific client
 * @param {WebSocket} ws
 * @param {Object} message
 */
export function send(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}
