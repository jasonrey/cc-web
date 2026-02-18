<script setup>
import { computed } from 'vue';

const props = defineProps({
  stats: {
    type: Object,
    default: null,
  },
});

function formatNumber(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTokens(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeUntil(iso) {
  if (!iso) return '—';
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'soon';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

// Build chart bars from recentDays (last 14 for compactness)
const chartDays = computed(() => {
  if (!props.stats?.recentDays?.length) return [];
  const days = props.stats.recentDays.slice(-14);
  const max = Math.max(...days.map((d) => d.messageCount), 1);
  return days.map((d) => ({
    date: d.date.slice(5), // MM-DD
    messageCount: d.messageCount,
    height: Math.max(4, Math.round((d.messageCount / max) * 60)),
  }));
});

// Peak hour label
const peakHour = computed(() => {
  const counts = props.stats?.hourCounts;
  if (!counts) return null;
  const peak = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!peak) return null;
  const h = Number(peak[0]);
  const label =
    h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
  return label;
});

// Today's total tokens
const todayTotalTokens = computed(() => {
  if (!props.stats?.today?.tokensByModel) return 0;
  return Object.values(props.stats.today.tokensByModel).reduce(
    (a, b) => a + b,
    0,
  );
});

// Period total tokens
const periodTotalTokens = computed(() => {
  if (!props.stats?.period?.tokensByModel) return 0;
  return Object.values(props.stats.period.tokensByModel).reduce(
    (a, b) => a + b,
    0,
  );
});
</script>

<template>
  <div class="usage-stats" v-if="stats">

    <!-- Reset banner -->
    <div class="reset-banner">
      <div class="reset-info">
        <span class="reset-label">Billing period resets</span>
        <span class="reset-date">{{ formatDate(stats.resetDate) }}</span>
      </div>
      <div class="reset-countdown">{{ timeUntil(stats.resetDate) }} remaining</div>
    </div>

    <!-- Today / Period cards -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="card-label">Today</div>
        <div class="card-main">{{ formatNumber(stats.today.messageCount) }}</div>
        <div class="card-sub">messages</div>
        <div class="card-detail">{{ formatTokens(todayTotalTokens) }} tokens · {{ stats.today.sessionCount }} session{{ stats.today.sessionCount !== 1 ? 's' : '' }}</div>
      </div>
      <div class="stat-card">
        <div class="card-label">This period</div>
        <div class="card-main">{{ formatNumber(stats.period.messageCount) }}</div>
        <div class="card-sub">messages</div>
        <div class="card-detail">{{ formatTokens(periodTotalTokens) }} tokens · {{ stats.period.sessionCount }} sessions</div>
      </div>
      <div class="stat-card">
        <div class="card-label">All time</div>
        <div class="card-main">{{ formatNumber(stats.allTime.totalMessages) }}</div>
        <div class="card-sub">messages</div>
        <div class="card-detail">{{ stats.allTime.totalSessions }} sessions since {{ formatDate(stats.allTime.firstSessionDate) }}</div>
      </div>
    </div>

    <!-- Activity chart (last 14 days) -->
    <div class="section" v-if="chartDays.length">
      <div class="section-title">Daily activity <span class="section-sub">(last 14 days)</span></div>
      <div class="bar-chart">
        <div
          v-for="day in chartDays"
          :key="day.date"
          class="bar-col"
          :title="`${day.date}: ${day.messageCount} messages`"
        >
          <div class="bar" :style="{ height: day.height + 'px' }"></div>
          <div class="bar-label">{{ day.date.slice(3) }}</div>
        </div>
      </div>
      <div class="chart-note" v-if="peakHour">Peak activity hour: {{ peakHour }}</div>
    </div>

    <!-- Per-model breakdown -->
    <div class="section" v-if="stats.allTime.modelBreakdown.length">
      <div class="section-title">Model usage <span class="section-sub">(all time)</span></div>
      <div class="model-table">
        <div class="model-row header">
          <span>Model</span>
          <span>Input</span>
          <span>Output</span>
          <span>Cache read</span>
        </div>
        <div
          v-for="m in stats.allTime.modelBreakdown"
          :key="m.modelId"
          class="model-row"
        >
          <span class="model-name">{{ m.name }}</span>
          <span>{{ formatTokens(m.inputTokens) }}</span>
          <span>{{ formatTokens(m.outputTokens) }}</span>
          <span class="dim">{{ formatTokens(m.cacheReadTokens) }}</span>
        </div>
      </div>
    </div>

  </div>
  <div class="usage-empty" v-else>
    <p>No usage data found.</p>
    <p class="dim">Expected at <code>~/.claude/stats-cache.json</code></p>
  </div>
</template>

<style scoped>
.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Reset banner */
.reset-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.reset-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reset-label {
  color: var(--text-secondary);
}

.reset-date {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 13px;
}

.reset-countdown {
  color: var(--text-secondary);
  font-size: 12px;
}

/* Stat cards */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.card-main {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.card-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.card-detail {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
}

/* Section */
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-sub {
  font-weight: 400;
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: 0;
}

/* Bar chart */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 72px;
  padding-bottom: 16px;
  position: relative;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  height: 100%;
}

.bar {
  width: 100%;
  background: var(--text-secondary);
  border-radius: 2px 2px 0 0;
  opacity: 0.6;
  transition: opacity 0.15s ease;
  min-height: 4px;
}

.bar-col:hover .bar {
  opacity: 1;
}

.bar-label {
  font-size: 9px;
  color: var(--text-muted);
  white-space: nowrap;
}

.chart-note {
  font-size: 11px;
  color: var(--text-muted);
}

/* Model table */
.model-table {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
}

.model-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}

.model-row.header {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  padding-bottom: 4px;
}

.model-row:not(.header) {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.model-name {
  font-weight: 500;
}

.dim {
  color: var(--text-secondary);
}

/* Empty state */
.usage-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 13px;
}

.usage-empty code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
</style>
