# Feature: AskUserQuestion Interactive Modal

## Status
✅ **Completed** - 2026-02-16

## Overview

Implemented interactive modal UI for Claude's `AskUserQuestion` tool, allowing users to answer questions during task execution through a clean, user-friendly interface.

## Implementation Summary

### Approach

Instead of complex tool_result injection and JSONL manipulation, we convert user answers to **natural language messages** that are sent as regular prompts. This is simpler, more reliable, and provides clear context to Claude.

### Architecture

1. **Question Detection** - Server detects `AskUserQuestion` tool_use in stream
2. **Frontend Display** - Modal shows questions with option cards
3. **Answer Collection** - User selects options or enters custom text
4. **Natural Message** - Answers formatted as: `"Here are my answers:\nFramework: Vue 3\nTesting: Integration Tests, E2E Tests"`
5. **Session Resume** - Message sent as regular prompt to continue conversation

### Key Components

#### Backend
- **server/events/prompt.js** - Detects AskUserQuestion and stores pending question
- **server/events/answer-question.js** - Converts answers to natural message and resumes session
- Uses `pendingQuestions` Map to track questions by toolUseId

#### Frontend
- **src/components/AskUserQuestionModal.vue** - Interactive modal with option cards
- **src/components/MessageItem.vue** - Displays AskUserQuestion tool_use with "Answer" button
- **src/composables/useWebSocket.js** - Handles ask_user_question and answer_question events

### Features

- **Single-select questions** - Radio button style (multiSelect: false)
- **Multi-select questions** - Checkbox style (multiSelect: true)
- **Custom text input** - "Other" option with textarea for any question
- **Keyboard shortcuts** - Cmd/Ctrl+Enter to submit, Escape to close
- **Session resumption** - Properly resumes session with answer context
- **Cleanup on cancel** - Pending questions removed when task cancelled

### Message Format

Questions display format:
```
❓ AskUserQuestion
  Which framework do you prefer for new projects?
  [Answer Button]
```

Modal displays:
- Question header chip (max 12 chars)
- Full question text
- 2-4 option cards with labels and descriptions
- Custom text input for "Other" option
- Submit/Cancel buttons

Answer format sent to Claude:
```
Here are my answers:
Framework: Vue 3
Testing: Integration Tests, E2E Tests
Database: SQLite
```

## Technical Details

### Natural Message Conversion

```javascript
const answerLines = Object.entries(answers).map(([header, answer]) => {
  if (Array.isArray(answer)) {
    return `${header}: ${answer.join(', ')}`;
  }
  return `${header}: ${answer}`;
});

const naturalMessage = `Here are my answers:\n${answerLines.join('\n')}`;
```

### Session Context Update

```javascript
// Update context to point to the session we're resuming
context.currentSessionId = pending.sessionId;

await promptHandler(ws, {
  type: 'prompt',
  prompt: naturalMessage,
}, context);
```

## Why Natural Messages Work

1. **Simple** - No complex JSONL manipulation or tool_result injection
2. **Reliable** - Works consistently for both new and resumed sessions
3. **Clear Context** - Claude sees answers as natural user input
4. **SDK Compatible** - No special SDK features required
5. **Debuggable** - Easy to see what was sent in logs

## Challenges Overcome

1. **Transport Timeout** - Initial approach using `streamInput()` failed due to "ProcessTransport is not ready for writing"
2. **JSONL Timing** - SDK doesn't write JSONL immediately for new sessions
3. **Session Resumption** - Fixed by setting `context.currentSessionId` before calling handler
4. **Empty Prompt Error** - Changed from `''` to `'continue'` to avoid cache_control API error
5. **Missing Logger** - Added logger import to prompt.js
6. **Session Mismatch** - Added sessionId to error messages for proper filtering

## Files Modified

### Backend
- `server/events/prompt.js` - Question detection and pending storage
- `server/events/answer-question.js` - Answer handling and session resume
- `server/events/cancel-task.js` - Cleanup pending questions on cancel

### Frontend
- `src/components/AskUserQuestionModal.vue` - NEW - Interactive modal
- `src/components/MessageItem.vue` - Display AskUserQuestion with Answer button
- `src/components/ChatMessages.vue` - Add to STANDALONE_TOOLS set
- `src/views/ChatView.vue` - Modal integration and event handling
- `src/composables/useWebSocket.js` - WebSocket event handling

## Known Behavior

Claude may add descriptions to answers (e.g., "SQLite: Lightweight embedded database") based on the option descriptions from the question context. This is expected behavior and shows Claude being thorough.

## Future Enhancements

- Option to hide/show answer descriptions in Claude's response
- Answer history/editing before submission
- Question chaining (ask follow-up questions based on previous answers)
- Pre-fill answers from user preferences/settings

## Related Documents

- Original planning doc: `docs/todo/FEATURE_CLAUDE_INTERACTIVE.md` (covers both permissions and questions)
- Plan display: `docs/completed/BUG_PLAN_NOT_DISPLAYED.md`
