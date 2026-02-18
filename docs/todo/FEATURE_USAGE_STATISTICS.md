# Usage Statistics

## Requirements

- Display Claude API usage statistics, mirroring the native `claude` CLI's TUI stats view
- Show current usage against the plan limit (tokens / cost)
- Show reset time (when the billing period resets)
- Show per-model breakdown if available
- Optionally show per-session or per-project usage

## Context

- The native Claude Code CLI has a `/cost` command and a stats TUI that shows:
  - Input/output tokens used this session
  - Cost estimate for current session
  - Total usage toward plan limit
  - Time until plan reset
- Claude usage data is written to `~/.claude/usage/` as JSONL or JSON files (one per day or billing period)
- Usage is tracked per API key / account, not per project
- The stats are read from local files — no API call needed to fetch them

## Scope

- Read usage data from `~/.claude/` (investigate exact file/folder structure)
- Backend endpoint or WebSocket event to serve usage data to the frontend
- Frontend view/panel to display the stats — placement TBD (sidebar widget, dedicated view, header badge, etc.)
- Show at minimum:
  - Tokens used (input + output) for current period
  - Cost estimate for current period
  - Plan limit and % used (if determinable)
  - Reset date/time
- Nice to have:
  - Per-session breakdown
  - Per-model breakdown (Sonnet vs Haiku vs Opus)
  - Historical chart (daily usage over time)

## Plan

1. **Investigate local usage file format**
   - Inspect `~/.claude/usage/` or equivalent — what files exist, what schema
   - Check if `~/.claude/settings.json` or similar stores plan/limit info
   - Understand how the native CLI reads and computes stats

2. **Backend: usage reader**
   - New `server/lib/usage.js` — reads and aggregates usage files
   - Expose via a new WebSocket event `get_usage_stats` → responds with `usage_stats`
   - Or expose as a simple REST endpoint `GET /api/usage` if polling is acceptable

3. **Frontend: stats display**
   - Decide on placement (a settings/info panel, sidebar section, or dedicated route)
   - Display usage bar (used / limit), reset countdown, and session cost
   - Auto-refresh periodically (e.g. every 60s) or on demand

4. **Nice-to-have: historical chart**
   - Aggregate daily totals from usage files
   - Simple bar or line chart using a lightweight lib or CSS-only bars
