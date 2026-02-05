/**
 * MCP (Model Context Protocol) Server Configuration Loader
 *
 * Loads MCP server configurations from Claude CLI config files.
 * Supports three scopes with merge precedence: user < project < local
 *
 * Config locations:
 * - User (global): ~/.claude.json -> mcpServers
 * - Project: ~/.claude.json -> projects[projectPath].mcpServers
 * - Local: .mcp.json in project root (personal overrides, gitignored)
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CLAUDE_CONFIG_PATH = join(homedir(), '.claude.json');

/**
 * Read and parse a JSON file safely
 * @param {string} filePath
 * @returns {object|null}
 */
function readJsonFile(filePath) {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Load user-level (global) MCP servers from ~/.claude.json
 * @returns {Record<string, object>}
 */
function loadUserMcpServers() {
  const config = readJsonFile(CLAUDE_CONFIG_PATH);
  if (!config?.mcpServers) {
    return {};
  }
  return config.mcpServers;
}

/**
 * Load project-level MCP servers from ~/.claude.json -> projects[projectPath]
 * @param {string} projectPath - Absolute path to the project
 * @returns {Record<string, object>}
 */
function loadProjectMcpServers(projectPath) {
  if (!projectPath) {
    return {};
  }

  const config = readJsonFile(CLAUDE_CONFIG_PATH);
  if (!config?.projects?.[projectPath]?.mcpServers) {
    return {};
  }
  return config.projects[projectPath].mcpServers;
}

/**
 * Load local MCP servers from .mcp.json in project root
 * These are personal overrides, typically gitignored
 * @param {string} projectPath - Absolute path to the project
 * @returns {Record<string, object>}
 */
function loadLocalMcpServers(projectPath) {
  if (!projectPath) {
    return {};
  }

  const localConfigPath = join(projectPath, '.mcp.json');
  const config = readJsonFile(localConfigPath);

  if (!config) {
    return {};
  }

  // .mcp.json can be either { serverName: config } or { mcpServers: { serverName: config } }
  if (config.mcpServers) {
    return config.mcpServers;
  }

  // Filter out non-server entries (like _comment)
  const servers = {};
  for (const [key, value] of Object.entries(config)) {
    if (key.startsWith('_')) continue;
    if (typeof value === 'object' && value !== null) {
      servers[key] = value;
    }
  }
  return servers;
}

/**
 * Load OAuth credentials for MCP servers from ~/.claude/.credentials.json
 * @returns {Record<string, object>}
 */
function loadMcpCredentials() {
  const credentialsPath = join(homedir(), '.claude', '.credentials.json');
  const config = readJsonFile(credentialsPath);

  if (!config?.mcpOAuth) {
    return {};
  }

  // mcpOAuth keys are in format: "serverName|hash"
  // Extract server name and credentials
  const credentials = {};
  for (const [key, value] of Object.entries(config.mcpOAuth)) {
    const serverName = key.split('|')[0];
    if (serverName && value.accessToken) {
      credentials[serverName] = {
        accessToken: value.accessToken,
        expiresAt: value.expiresAt,
        refreshToken: value.refreshToken,
      };
    }
  }
  return credentials;
}

/**
 * Apply OAuth credentials to HTTP MCP servers that need them
 * @param {Record<string, object>} servers - MCP server configs
 * @param {Record<string, object>} credentials - OAuth credentials by server name
 * @returns {Record<string, object>}
 */
function applyCredentials(servers, credentials) {
  const result = {};

  for (const [name, config] of Object.entries(servers)) {
    const serverConfig = { ...config };

    // Only apply to HTTP servers that have matching credentials
    if (serverConfig.type === 'http' && credentials[name]) {
      const cred = credentials[name];

      // Check if token is not expired (with 5 minute buffer)
      const isExpired =
        cred.expiresAt && Date.now() > cred.expiresAt - 5 * 60 * 1000;

      if (!isExpired && cred.accessToken) {
        serverConfig.headers = {
          ...serverConfig.headers,
          Authorization: `Bearer ${cred.accessToken}`,
        };
      }
    }

    result[name] = serverConfig;
  }

  return result;
}

/**
 * Load and merge MCP servers from all scopes
 * Merge precedence: user < project < local (local wins)
 *
 * @param {string} projectPath - Absolute path to the project
 * @returns {Record<string, object>} Merged MCP server configurations
 */
export function loadMcpServers(projectPath) {
  // Load from all scopes
  const userServers = loadUserMcpServers();
  const projectServers = loadProjectMcpServers(projectPath);
  const localServers = loadLocalMcpServers(projectPath);

  // Merge with precedence: user < project < local
  const merged = {
    ...userServers,
    ...projectServers,
    ...localServers,
  };

  // Load and apply OAuth credentials
  const credentials = loadMcpCredentials();
  const withCredentials = applyCredentials(merged, credentials);

  // Log loaded servers (without sensitive data)
  const serverNames = Object.keys(withCredentials);
  if (serverNames.length > 0) {
    console.log(`Loaded MCP servers: ${serverNames.join(', ')}`);
  }

  return withCredentials;
}

/**
 * Get MCP server info for display (without sensitive data)
 * @param {string} projectPath - Absolute path to the project
 * @returns {Array<{name: string, type: string, source: string}>}
 */
export function getMcpServerInfo(projectPath) {
  const userServers = loadUserMcpServers();
  const projectServers = loadProjectMcpServers(projectPath);
  const localServers = loadLocalMcpServers(projectPath);

  const info = [];

  // Track which servers come from which scope
  const allNames = new Set([
    ...Object.keys(userServers),
    ...Object.keys(projectServers),
    ...Object.keys(localServers),
  ]);

  for (const name of allNames) {
    // Determine source (highest precedence wins)
    let source = 'user';
    let config = userServers[name];

    if (projectServers[name]) {
      source = 'project';
      config = projectServers[name];
    }
    if (localServers[name]) {
      source = 'local';
      config = localServers[name];
    }

    info.push({
      name,
      type: config?.type || 'stdio',
      source,
    });
  }

  return info;
}
