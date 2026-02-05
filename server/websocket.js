/**
 * WebSocket Connection Handler
 *
 * Routes incoming messages to appropriate event handlers.
 * Each connection maintains its own context (currentProjectPath, currentSessionId).
 */

import { handlers } from './events/index.js';
import { clients, send, unwatchAllSessions } from './lib/ws.js';

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws
 */
export function handleWebSocket(ws) {
  clients.add(ws);
  console.log(`Client connected (${clients.size})`);

  // Per-connection context
  const context = {
    currentProjectPath: null,
    currentSessionId: null,
  };

  send(ws, { type: 'connected' });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const handler = handlers[message.type];

      if (handler) {
        await handler(ws, message, context);
      } else {
        console.log('Unknown message type:', message.type);
      }
    } catch (err) {
      console.error('Message handling error:', err);
      send(ws, { type: 'error', message: err.message });
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected (${clients.size})`);
    unwatchAllSessions(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
    unwatchAllSessions(ws);
  });
}
