/**
 * MCP Tool Display Configuration
 *
 * This module provides display configurations for MCP tools.
 * Each server has its own file in this folder for easy maintenance.
 *
 * To add a new MCP server:
 * 1. Create a new file: `{server-name}.js`
 * 2. Export a `tools` object mapping tool names to display functions
 * 3. Import and register it in this file
 */

import { truncate } from '../format.js';
import dbhubTools from './dbhub.js';
import notionTools from './notion.js';
import playwrightTools from './playwright.js';

/**
 * Registry of MCP server tool configurations
 * Key: server name (from mcp__{server}__tool)
 * Value: object mapping tool names to display functions
 */
const MCP_SERVERS = {
  dbhub: dbhubTools,
  notion: notionTools,
  playwright: playwrightTools,
};

/**
 * Get display info for an MCP tool
 * @param {string} server - MCP server name
 * @param {string} toolName - Tool name within the server
 * @param {object} input - Tool input parameters
 * @returns {object} Display configuration { icon, primary, secondary, type }
 */
export function getMcpToolDisplay(server, toolName, input = {}) {
  const serverTools = MCP_SERVERS[server];

  if (serverTools?.[toolName]) {
    const display = serverTools[toolName](input, { truncate });
    return {
      icon: display.icon || '🔌',
      primary: display.primary || toolName,
      secondary: display.secondary || null,
      type: display.type || 'text',
    };
  }

  // Default for unknown MCP tools
  return {
    icon: '🔌',
    primary: toolName,
    secondary: `MCP: ${server}`,
    type: 'mcp',
  };
}
