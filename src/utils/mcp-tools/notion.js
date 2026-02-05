/**
 * MCP Tool Display: notion
 *
 * Notion workspace tools via Notion MCP server.
 */

export default {
  'notion-search': (input, { truncate }) => ({
    icon: '📝',
    primary: input.query || 'Search Notion',
    secondary: input.page_url ? `in: ${truncate(input.page_url, 40)}` : null,
    type: 'text',
  }),

  'notion-fetch': (input) => ({
    icon: '📄',
    primary: input.id || 'Fetch page',
    secondary: 'Notion',
    type: 'path',
  }),

  'notion-update-page': (input, { truncate }) => ({
    icon: '✏️',
    primary: 'Update page',
    secondary: input.data?.page_id ? truncate(input.data.page_id, 20) : null,
    type: 'text',
  }),

  'notion-create-pages': (input) => ({
    icon: '➕',
    primary: `Create ${input.pages?.length || 1} page(s)`,
    secondary: 'Notion',
    type: 'text',
  }),

  'notion-create-database': (input) => ({
    icon: '🗃️',
    primary: 'Create database',
    secondary: input.title?.[0]?.text?.content || null,
    type: 'text',
  }),

  'notion-update-data-source': (input, { truncate }) => ({
    icon: '🔄',
    primary: 'Update data source',
    secondary: input.data_source_id ? truncate(input.data_source_id, 20) : null,
    type: 'text',
  }),

  'notion-move-pages': (input) => ({
    icon: '📦',
    primary: `Move ${input.page_or_database_ids?.length || 1} page(s)`,
    secondary: null,
    type: 'text',
  }),

  'notion-duplicate-page': (input, { truncate }) => ({
    icon: '📋',
    primary: 'Duplicate page',
    secondary: input.page_id ? truncate(input.page_id, 20) : null,
    type: 'text',
  }),

  'notion-create-comment': (_input) => ({
    icon: '💬',
    primary: 'Add comment',
    secondary: 'Notion',
    type: 'text',
  }),

  'notion-get-comments': (input, { truncate }) => ({
    icon: '💬',
    primary: 'Get comments',
    secondary: input.page_id ? truncate(input.page_id, 20) : null,
    type: 'text',
  }),

  'notion-get-teams': (input) => ({
    icon: '👥',
    primary: input.query ? `Search teams: ${input.query}` : 'List teams',
    secondary: 'Notion',
    type: 'text',
  }),

  'notion-get-users': (input) => ({
    icon: '👤',
    primary: input.query ? `Search users: ${input.query}` : 'List users',
    secondary: 'Notion',
    type: 'text',
  }),

  'notion-query-database-view': (input, { truncate }) => ({
    icon: '📊',
    primary: 'Query database view',
    secondary: input.view_url ? truncate(input.view_url, 40) : null,
    type: 'text',
  }),
};
