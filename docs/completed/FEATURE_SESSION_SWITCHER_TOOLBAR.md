# Feature: Session Switcher in Toolbar

## Overview
Add a quick session switcher in the chat view toolbar, showing 3 recent sessions beside the mode tabs (Chat/Terminal/Files). This enables fast context switching without opening the sidebar.

## Current State Analysis

### Layout Structure
```
[Sidebar Toggle] [Mode Tabs: Chat | Terminal | Files] ←→ [flex-grow space] → [Task Status]
```

### Proposed Layout
```
[Sidebar Toggle] [Mode Tabs] [Recent Sessions (3)] ←→ [flex-grow space] → [Task Status]
```

## UX Analysis & Recommendations

### Question 1: Should current session be part of the 3 recent sessions?

**Recommendation: NO - Exclude current session from the switcher**

**Reasoning:**
1. **Avoid Redundancy**: Current session is already indicated by the session title at the top
2. **Maximize Utility**: Use all 3 slots for *other* sessions you can switch to
3. **Clear Intent**: The switcher is for *switching*, not showing current state
4. **Industry Pattern**: Browser tab bars, VS Code recent files - they show alternatives, not current

**Behavior:**
- Show the 3 most recent sessions **excluding** the current one
- When you switch to a session, it gets excluded and the next recent one appears
- After sending a message, the current session might become #1 in recency, but still excluded from display

### Question 2: How to handle session titles?

**Recommendation: Smart truncation with tooltips**

**Implementation:**
```css
.recent-session-item {
  max-width: 150px;      /* Limit per session */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-sessions-group {
  display: flex;
  gap: 8px;
  flex-shrink: 1;        /* Allow shrinking if space tight */
  min-width: 0;          /* Enable flex shrinking */
}
```

**Responsive behavior:**
- All screen sizes: Always show 2 sessions (consistent)
- Desktop/Tablet: ~150px max per session
- Mobile: Flex to fill available space with aggressive truncation

### Question 3: Visual Design

**Recommendation: Pill-style buttons with subtle differentiation**

**Visual Hierarchy:**
```
Mode Tabs (primary) > Recent Sessions (secondary) > Task Status (indicator)
```

**Design:**
- Mode tabs: Current style (14px icon + text, active state)
- Recent sessions: Smaller text-only pills with subtle background
- Clear visual separation: vertical divider or spacing

---

## Implementation Plan

### Phase 1: Data Layer (Backend Already Has This!)

The `recentSessions` ref is already populated by the global WebSocket! ✅

**What's available:**
```javascript
const recentSessions = ref([]);  // From useWebSocket.js
```

**Structure:**
```javascript
{
  sessionId: "abc123",
  title: "Session Title",
  timestamp: 1234567890,
  projectPath: "/path/to/project"
}
```

### Phase 2: UI Component

**Location:** `src/views/ChatView.vue` (between mode tabs and task status)

**Template:**
```vue
<!-- After .mode-tabs-group, before .task-status-indicator -->
<div class="recent-sessions-divider"></div>

<div class="recent-sessions-group">
  <button
    v-for="session in displayedRecentSessions"
    :key="session.sessionId"
    class="recent-session-item"
    :title="session.title"
    @click="switchToSession(session.sessionId)"
  >
    {{ session.title }}
  </button>
</div>
```

**Computed:**
```javascript
const displayedRecentSessions = computed(() => {
  // Get global recent sessions
  const recent = recentSessions.value || [];

  // Filter out current session
  const filtered = recent.filter(s => s.sessionId !== currentSession.value);

  // Always take first 2 (consistent across all screen sizes)
  return filtered.slice(0, 2);
});
```

**Method:**
```javascript
function switchToSession(sessionId) {
  // Navigate to the session
  router.push({
    name: 'chat',
    params: { sessionId }
  });
}
```

### Phase 3: Responsive Design

**Breakpoints:**
```css
/* Desktop/Tablet: Fixed width sessions */
@media (min-width: 640px) {
  .recent-session-item {
    max-width: 150px;
  }
}

/* Mobile: Flex to fill space, aggressive truncation */
@media (max-width: 639px) {
  .recent-sessions-group {
    flex: 1;
    max-width: 100%;
    overflow: hidden;
  }

  .recent-session-item {
    flex: 1;
    min-width: 0;
    max-width: none; /* Remove max-width, let flex handle it */
  }
}
```

### Phase 4: Styling

```css
/* Divider between mode tabs and recent sessions */
.recent-sessions-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 12px;
}

/* Recent sessions container */
.recent-sessions-group {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 1;
  min-width: 0;
}

/* Individual session pill */
.recent-session-item {
  padding: 6px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  /* Truncation - always enabled */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Default max-width (overridden on mobile) */
  max-width: 150px;
}

.recent-session-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
}

.recent-session-item:active {
  transform: scale(0.98);
}
```

---

## Edge Cases & Considerations

### 1. Empty State
**When:** Fresh project, no recent sessions
**Solution:** Hide the entire recent sessions group (conditional rendering)

```vue
<template v-if="displayedRecentSessions.length > 0">
  <div class="recent-sessions-divider"></div>
  <div class="recent-sessions-group">
    ...
  </div>
</template>
```

### 2. Very Long Session Titles
**When:** Auto-generated titles like "Implement authentication system with JWT..."
**Solution:** CSS truncation + tooltip (already in template with `:title`)

### 3. Same Project vs Different Projects
**When:** Should we show sessions from other projects?
**Recommendation:** Show all recent sessions regardless of project
**Reasoning:**
- More useful for polyglot workflows
- User can see project name in tooltip
- Matches VS Code "Recent Files" behavior

**Enhancement (optional):**
```vue
<button
  v-for="session in displayedRecentSessions"
  :title="`${session.title}\n${getShortPath(session.projectPath)}`"
  ...
>
  {{ session.title }}
  <span v-if="session.projectPath !== currentProjectPath" class="project-badge">
    {{ getProjectName(session.projectPath) }}
  </span>
</button>
```

### 4. Performance
**Consideration:** Re-rendering on every message?
**Solution:** `computed` with `recentSessions` ref already optimized
**Impact:** Negligible (max 3 buttons, simple filter)

---

## Alternative Approaches (Not Recommended)

### Option A: Dropdown Instead of Pills
**Pros:** More compact, can show more sessions
**Cons:** Extra click required, less discoverable, slower interaction

### Option B: Show Icons Only
**Pros:** More compact
**Cons:** No context without hover, poor UX for similar sessions

### Option C: Infinite Scroll of Sessions
**Pros:** See all sessions
**Cons:** Clutters UI, defeats purpose of "quick access"

---

## Success Metrics

1. **Adoption:** Track session switches via toolbar vs sidebar
2. **Speed:** Measure time to switch sessions (should be < 1 second)
3. **Space:** Ensure toolbar doesn't overflow on 1024px screens

---

## Implementation Checklist

- [ ] Add `displayedRecentSessions` computed property
- [ ] Add `switchToSession` method
- [ ] Add template between mode tabs and task status
- [ ] Add CSS for divider and session pills
- [ ] Add responsive breakpoints
- [ ] Test on mobile/tablet/desktop
- [ ] Test with 0, 1, 2, 3+ sessions
- [ ] Test with very long session titles
- [ ] Test rapid switching between sessions
- [ ] Update CHANGELOG

---

## Future Enhancements (Post-MVP)

1. **Session Pinning:** Pin favorite sessions to always show
2. **Project Grouping:** Group sessions by project with sub-menu
3. **Keyboard Shortcuts:** Ctrl+1/2/3 to switch to recent sessions
4. **Session Preview:** Hover to see last message preview
5. **Drag to Reorder:** Manually organize recent sessions

---

## Final Recommendation

**Go with the simple pill-style approach:**
- **Always 2 recent sessions** (consistent across all screen sizes, excluding current)
- Text-only pills with smart truncation
- **Mobile included** - sessions flex to fill available space
- No complex features in v1

This provides immediate value with minimal complexity and follows established UX patterns.
