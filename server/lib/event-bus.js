/**
 * Internal Event Bus
 *
 * Decoupled pub/sub for cross-cutting concerns (e.g. Web UI → Discord sync).
 * Uses Node's built-in EventEmitter — no external dependencies.
 *
 * Web UI code emits events here.
 * Discord (and future adapters: Telegram, etc.) subscribe here.
 * Neither side knows about the other.
 *
 * Events:
 *   'session:start'  — { projectPath, sessionId, isNew, prompt }
 *   'session:text'   — { projectPath, sessionId, content, model }
 *   'session:tool'   — { projectPath, sessionId, tool, input }
 *   'session:result' — { projectPath, sessionId, subtype, cost, duration }
 *   'session:error'  — { projectPath, sessionId, message }
 */

import { EventEmitter } from 'node:events';

export const eventBus = new EventEmitter();

// Prevent memory leak warnings for multiple subscribers (Discord + future adapters)
eventBus.setMaxListeners(20);
