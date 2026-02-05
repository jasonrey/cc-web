/**
 * MCP Tool Display: dbhub
 *
 * Database query tools via dbhub MCP server.
 */

export default {
  execute_sql: (input) => ({
    icon: '🗄️',
    primary: input.sql || 'SQL Query',
    secondary: null,
    type: 'command',
  }),
};
