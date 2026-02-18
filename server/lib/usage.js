/**
 * Usage statistics reader
 *
 * Reads Claude's local stats-cache.json to provide usage data
 * without any API calls — all data is already tracked locally by the CLI.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const STATS_CACHE_PATH = join(homedir(), '.claude', 'stats-cache.json');

// Token costs per million tokens (USD) — Max plan shows $0 but we compute
// estimates anyway so the UI can show relative model usage
const MODEL_COSTS = {
  input: {
    'claude-opus-4': 15.0,
    'claude-sonnet-4': 3.0,
    'claude-haiku-4': 0.8,
  },
  output: {
    'claude-opus-4': 75.0,
    'claude-sonnet-4': 15.0,
    'claude-haiku-4': 4.0,
  },
};

function getModelFamily(modelId) {
  if (modelId.includes('opus')) return 'claude-opus-4';
  if (modelId.includes('sonnet')) return 'claude-sonnet-4';
  if (modelId.includes('haiku')) return 'claude-haiku-4';
  return 'claude-sonnet-4';
}

function friendlyModelName(modelId) {
  if (modelId.includes('opus')) return 'Opus';
  if (modelId.includes('sonnet')) return 'Sonnet';
  if (modelId.includes('haiku')) return 'Haiku';
  return modelId;
}

/**
 * Infer the billing period reset date.
 * Claude Max resets monthly from the account creation / first-use date.
 * We use the firstSessionDate from stats-cache as the anchor day-of-month.
 */
function inferResetDate(firstSessionDate) {
  if (!firstSessionDate) return null;

  const anchor = new Date(firstSessionDate);
  const anchorDay = anchor.getUTCDate();
  const now = new Date();

  // Build reset date for current month
  let reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), anchorDay),
  );

  // If that reset date is in the past, advance to next month
  if (reset <= now) {
    reset = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, anchorDay),
    );
  }

  return reset.toISOString();
}

/**
 * Get the start date of the current billing period
 */
function getBillingPeriodStart(firstSessionDate) {
  if (!firstSessionDate) return null;

  const anchor = new Date(firstSessionDate);
  const anchorDay = anchor.getUTCDate();
  const now = new Date();

  // Current period start = this month's anchor day (or last month's if we haven't hit it yet)
  let periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), anchorDay),
  );

  if (periodStart > now) {
    // Haven't reached anchor day this month yet — period started last month
    periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, anchorDay),
    );
  }

  return periodStart.toISOString();
}

export function loadUsageStats() {
  if (!existsSync(STATS_CACHE_PATH)) {
    return null;
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(STATS_CACHE_PATH, 'utf8'));
  } catch {
    return null;
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const periodStart = getBillingPeriodStart(raw.firstSessionDate);
  const resetDate = inferResetDate(raw.firstSessionDate);

  // Aggregate per-model totals for the current billing period
  const periodModelTokens = {};
  if (Array.isArray(raw.dailyModelTokens) && periodStart) {
    const periodStartDate = new Date(periodStart);
    for (const day of raw.dailyModelTokens) {
      if (new Date(day.date) >= periodStartDate) {
        for (const [model, tokens] of Object.entries(day.tokensByModel || {})) {
          if (!periodModelTokens[model]) periodModelTokens[model] = 0;
          periodModelTokens[model] += tokens;
        }
      }
    }
  }

  // Aggregate per-model totals for today
  const todayModelTokens = {};
  const todayActivity = (raw.dailyActivity || []).find(
    (d) => d.date === todayStr,
  );
  const todayModelDay = (raw.dailyModelTokens || []).find(
    (d) => d.date === todayStr,
  );
  if (todayModelDay) {
    for (const [model, tokens] of Object.entries(
      todayModelDay.tokensByModel || {},
    )) {
      todayModelTokens[model] = tokens;
    }
  }

  // Build per-model breakdown (all-time from modelUsage)
  const modelBreakdown = [];
  for (const [modelId, usage] of Object.entries(raw.modelUsage || {})) {
    const family = getModelFamily(modelId);
    const inputCost =
      (usage.inputTokens / 1_000_000) * (MODEL_COSTS.input[family] || 3.0);
    const outputCost =
      (usage.outputTokens / 1_000_000) * (MODEL_COSTS.output[family] || 15.0);
    modelBreakdown.push({
      modelId,
      name: friendlyModelName(modelId),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadInputTokens,
      cacheWriteTokens: usage.cacheCreationInputTokens,
      estimatedCostUSD: Math.round((inputCost + outputCost) * 100) / 100,
    });
  }

  // Sort models by total tokens descending
  modelBreakdown.sort(
    (a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens),
  );

  // Last 30 days of daily activity for the chart
  const recentDays = (raw.dailyActivity || []).slice(-30).map((day) => ({
    date: day.date,
    messageCount: day.messageCount,
    sessionCount: day.sessionCount,
    toolCallCount: day.toolCallCount,
  }));

  // Period totals (messages + sessions from daily activity)
  let periodMessages = 0;
  let periodSessions = 0;
  if (periodStart) {
    const periodStartDate = new Date(periodStart);
    for (const day of raw.dailyActivity || []) {
      if (new Date(day.date) >= periodStartDate) {
        periodMessages += day.messageCount;
        periodSessions += day.sessionCount;
      }
    }
  }

  return {
    // Billing period
    periodStart,
    resetDate,

    // Today
    today: {
      date: todayStr,
      messageCount: todayActivity?.messageCount || 0,
      sessionCount: todayActivity?.sessionCount || 0,
      toolCallCount: todayActivity?.toolCallCount || 0,
      tokensByModel: todayModelTokens,
    },

    // Current billing period
    period: {
      messageCount: periodMessages,
      sessionCount: periodSessions,
      tokensByModel: periodModelTokens,
    },

    // All-time
    allTime: {
      totalSessions: raw.totalSessions || 0,
      totalMessages: raw.totalMessages || 0,
      firstSessionDate: raw.firstSessionDate,
      modelBreakdown,
    },

    // Chart data (last 30 days)
    recentDays,

    // Peak usage hour
    hourCounts: raw.hourCounts || {},
  };
}
