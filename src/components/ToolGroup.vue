<script setup>
import * as Diff from 'diff';
import { computed, ref } from 'vue';
import { formatToolCompact } from '../utils/format.js';
import DiffViewer from './DiffViewer.vue';

const props = defineProps({
  items: Array,
});

const expanded = ref(false);
const expandedDiffs = ref(new Set());
const expandedResults = ref(new Set());

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

function toggleDiff(index) {
  if (expandedDiffs.value.has(index)) {
    expandedDiffs.value.delete(index);
  } else {
    expandedDiffs.value.add(index);
  }
}

function isDiffExpanded(index) {
  return expandedDiffs.value.has(index);
}

function toggleResult(index) {
  if (expandedResults.value.has(index)) {
    expandedResults.value.delete(index);
  } else {
    expandedResults.value.add(index);
  }
}

function isResultExpanded(index) {
  return expandedResults.value.has(index);
}

// Find the next tool_result for a given tool_use
function getNextResult(index) {
  // Look for the next tool_result item after this tool_use
  for (let i = index + 1; i < props.items.length; i++) {
    if (props.items[i].type === 'tool_result') {
      return props.items[i];
    }
    // Stop if we hit another tool_use (result belongs to that one)
    if (props.items[i].type === 'tool_use') {
      break;
    }
  }
  return null;
}

// Check if there's a result for this tool
function hasResult(index) {
  return getNextResult(index) !== null;
}

// Compute diff stats for Edit tools
function getDiffStats(item) {
  if (
    item.tool !== 'Edit' ||
    !item.input?.old_string ||
    !item.input?.new_string
  ) {
    return null;
  }

  // Use same algorithm as DiffViewer to get accurate counts
  const changes = Diff.diffLines(item.input.old_string, item.input.new_string);
  let additions = 0;
  let deletions = 0;

  for (const change of changes) {
    const content = change.value;
    const splitLines = content.split('\n');
    // Remove trailing empty string from final newline
    if (splitLines.length > 1 && splitLines[splitLines.length - 1] === '') {
      splitLines.pop();
    }

    if (change.added) {
      additions += splitLines.length;
    } else if (change.removed) {
      deletions += splitLines.length;
    }
  }

  return { additions, deletions };
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
        <div v-if="item.type === 'tool_use'" class="tool-use" :data-tool-id="item.id" :data-tool-name="item.tool">
          <div class="tool-use-header">
            <span class="tool-icon">{{ formatTool(item).icon }}</span>
            <span class="tool-name">{{ item.tool }}</span>

            <!-- Diff stats for Edit tool (clickable to toggle) -->
            <div
              v-if="item.tool === 'Edit' && item.input?.old_string && item.input?.new_string"
              class="tool-toggle-section clickable"
              @click.stop="toggleDiff(index)"
            >
              <span class="diff-stats-item added">+{{ getDiffStats(item).additions }}</span>
              <span class="diff-stats-item removed">-{{ getDiffStats(item).deletions }}</span>
              <span class="toggle-icon">{{ isDiffExpanded(index) ? '▼' : '▶' }}</span>
            </div>

            <!-- Result toggle for tools with results -->
            <div
              v-else-if="hasResult(index)"
              class="tool-toggle-section clickable"
              @click.stop="toggleResult(index)"
            >
              <span class="result-label">Result</span>
              <span class="toggle-icon">{{ isResultExpanded(index) ? '▼' : '▶' }}</span>
            </div>
          </div>

          <div class="tool-use-content">
            <code v-if="formatTool(item).type === 'command'" class="tool-command">{{ truncate(formatTool(item).primary, 200) }}</code>
            <code v-else-if="formatTool(item).type === 'path'" class="tool-path">{{ formatTool(item).primary }}</code>
            <code v-else-if="formatTool(item).type === 'pattern'" class="tool-pattern">{{ formatTool(item).primary }}</code>
            <span v-else class="tool-text">{{ formatTool(item).primary }}</span>
          </div>

          <!-- Show diff for Edit tool (collapsible) -->
          <div v-if="item.tool === 'Edit' && item.input?.old_string && item.input?.new_string && isDiffExpanded(index)" class="tool-diff">
            <DiffViewer
              :old-content="item.input.old_string"
              :new-content="item.input.new_string"
              :hide-header="true"
            />
          </div>

          <!-- Show result inline (collapsible, collapsed by default) -->
          <div v-if="hasResult(index) && isResultExpanded(index)" class="tool-result-inline">
            <pre class="tool-result-content">{{ getNextResult(index).content }}</pre>
          </div>

        </div>

        <!-- Skip standalone tool_result if it was already shown inline with a tool_use -->
        <!-- Only show orphan results (not preceded by a tool_use) -->
        <div v-else-if="item.type === 'tool_result' && (!items[index - 1] || items[index - 1].type !== 'tool_use')" class="tool-result-orphan">
          <div class="tool-result-header">
            <div class="tool-result-badge">✓</div>
            <span class="result-label">Result (orphan)</span>
          </div>
          <pre class="tool-result-content">{{ item.content }}</pre>
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

.tool-toggle-section {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  transition: background 0.15s;
}

.tool-toggle-section.clickable {
  cursor: pointer;
  user-select: none;
}

.tool-toggle-section.clickable:hover {
  background: var(--bg-hover);
}

.diff-stats-item {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

.diff-stats-item.added {
  color: #22c55e;
}

.diff-stats-item.removed {
  color: #ef4444;
}

.result-label {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.toggle-icon {
  font-size: 9px;
  color: var(--text-muted);
}

.tool-diff {
  border-top: 1px solid var(--border-color);
}

.tool-diff :deep(.diff-viewer) {
  margin: 0;
  border: none;
  border-radius: 0;
}

/* Remove max-height and overflow from diff-content when inside tool group */
.tool-diff :deep(.diff-content) {
  max-height: none;
  overflow-y: visible;
}

.tool-result-inline {
  border-top: 1px solid var(--border-color);
  padding: 10px;
  background: var(--bg-primary);
}

.tool-result-inline .tool-result-content {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  /* Removed max-height and overflow - parent tool-group-content handles scrolling */
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

.tool-result-orphan {
  background: rgba(34, 197, 94, 0.05);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--success-color);
  overflow: hidden;
}

.tool-result-orphan .tool-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
}

.tool-result-badge {
  color: var(--success-color);
  font-size: 10px;
  flex-shrink: 0;
}

.tool-result-orphan .result-label {
  flex: 1;
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.tool-result-orphan .tool-result-content {
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  /* Removed max-height and overflow - parent tool-group-content handles scrolling */
  border-top: 1px solid rgba(34, 197, 94, 0.2);
}
</style>
