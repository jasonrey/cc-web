import { loadUsageStats } from '../lib/usage.js';
import { send } from '../lib/ws.js';

export async function handler(ws) {
  const stats = loadUsageStats();
  send(ws, {
    type: 'usage_stats',
    stats,
  });
}
