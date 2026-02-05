<script setup>
import { computed, ref } from 'vue';
import { formatToolCompact } from '../utils/format.js';

const props = defineProps({
  items: Array,
});

const expanded = ref(false);

// Truncate string to max length
function truncate(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}…`;
}

// Count tool uses and results
const toolCount = computed(() => {
  return props.items.filter((i) => i.type === 'tool_use').length;
});

// Get summary of tools used
const toolSummary = computed(() => {
  const tools = props.items
    .filter((i) => i.type === 'tool_use')
    .map((i) => i.tool);

  // Count occurrences
  const counts = {};
  for (const tool of tools) {
    counts[tool] = (counts[tool] || 0) + 1;
  }

  // Format as "Read x2, Edit, Bash x3"
  return Object.entries(counts)
    .map(([tool, count]) => (count > 1 ? `${tool} ×${count}` : tool))
    .join(', ');
});

// Format tool display using shared utility
function formatTool(item) {
  return formatToolCompact(item.tool, item.input);
}

function toggle() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <div class="tool-group" :class="{ expanded }">
    <div class="tool-group-header" @click="toggle">
      <span class="tool-group-icon">⚙️</span>
      <span class="tool-group-summary">{{ toolSummary }}</span>
      <span class="tool-group-count">{{ toolCount }} tool{{ toolCount !== 1 ? 's' : '' }}</span>
      <span class="tool-group-toggle">{{ expanded ? '▼' : '▶' }}</span>
    </div>

    <div class="tool-group-content" v-if="expanded">
      <div v-for="(item, index) in items" :key="index" class="tool-item">
        <!-- Tool use -->
        <div v-if="item.type === 'tool_use'" class="tool-use">
          <div class="tool-use-header">
            <span class="tool-icon">{{ formatTool(item).icon }}</span>
            <span class="tool-name">{{ item.tool }}</span>
          </div>
          <div class="tool-use-content">
            <code v-if="formatTool(item).type === 'command'" class="tool-command">{{ truncate(formatTool(item).primary, 200) }}</code>
            <code v-else-if="formatTool(item).type === 'path'" class="tool-path">{{ formatTool(item).primary }}</code>
            <code v-else-if="formatTool(item).type === 'pattern'" class="tool-pattern">{{ formatTool(item).primary }}</code>
            <span v-else class="tool-text">{{ formatTool(item).primary }}</span>
          </div>
        </div>

        <!-- Tool result -->
        <div v-else-if="item.type === 'tool_result'" class="tool-result">
          <div class="tool-result-badge">✓</div>
          <pre class="tool-result-content">{{ truncate(item.content, 300) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-group {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tool-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.tool-group-header:hover {
  background: var(--bg-hover);
}

.tool-group-icon {
  font-size: 14px;
}

.tool-group-summary {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-group-count {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  color: var(--text-muted);
}

.tool-group-toggle {
  font-size: 10px;
  color: var(--text-muted);
}

.tool-group-content {
  border-top: 1px solid var(--border-color);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.tool-item {
  font-size: 12px;
}

.tool-use {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.tool-use-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-color);
}

.tool-icon {
  font-size: 12px;
}

.tool-name {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 11px;
}

.tool-use-content {
  padding: 8px 10px;
}

.tool-command {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.tool-path {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  word-break: break-all;
}

.tool-pattern {
  font-family: var(--font-mono);
  font-size: 11px;
  color: #60a5fa;
}

.tool-text {
  color: var(--text-primary);
  font-size: 12px;
}

.tool-result {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(34, 197, 94, 0.05);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--success-color);
}

.tool-result-badge {
  color: var(--success-color);
  font-size: 10px;
  flex-shrink: 0;
}

.tool-result-content {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  max-height: 100px;
  overflow-y: auto;
}
</style>
