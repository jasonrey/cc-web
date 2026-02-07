<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import MessageItem from './MessageItem.vue';
import ToolGroup from './ToolGroup.vue';

const props = defineProps({
  messages: {
    type: Array,
    required: true,
  },
  isRunning: {
    type: Boolean,
    default: false,
  },
  isNewSession: {
    type: Boolean,
    default: false,
  },
  hasOlderMessages: {
    type: Boolean,
    default: false,
  },
  summaryCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['load-full-history']);

const messagesEl = ref(null);
const userScrolledUp = ref(false);

// Group consecutive tool_use and tool_result messages together
const groupedMessages = computed(() => {
  const result = [];
  let currentToolGroup = null;

  for (const msg of props.messages) {
    if (msg.type === 'tool_use') {
      // Start or continue a tool group
      if (!currentToolGroup) {
        currentToolGroup = { type: 'tool_group', items: [] };
      }
      currentToolGroup.items.push(msg);
    } else if (msg.type === 'tool_result') {
      // Add to existing tool group
      if (currentToolGroup) {
        currentToolGroup.items.push(msg);
      } else {
        // Orphan tool_result, show as-is
        result.push(msg);
      }
    } else {
      // Non-tool message: flush any pending tool group
      if (currentToolGroup) {
        result.push(currentToolGroup);
        currentToolGroup = null;
      }
      result.push(msg);
    }
  }

  // Flush any remaining tool group
  if (currentToolGroup) {
    result.push(currentToolGroup);
  }

  return result;
});

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

function checkScrollPosition() {
  if (!messagesEl.value) return;

  const { scrollTop, scrollHeight, clientHeight } = messagesEl.value;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

  // Consider "scrolled up" if more than 100px from bottom
  if (distanceFromBottom > 100) {
    userScrolledUp.value = true;
  } else {
    userScrolledUp.value = false;
  }
}

function handleScroll() {
  checkScrollPosition();
}

// Auto-scroll on new messages
watch(
  () => props.messages.length,
  (newLength, oldLength) => {
    // If messages just loaded (0 to N), always scroll to bottom
    if (oldLength === 0 && newLength > 0) {
      userScrolledUp.value = false;
      nextTick(() => {
        scrollToBottom();
        // Double-check after a short delay to ensure DOM is fully rendered
        setTimeout(scrollToBottom, 100);
      });
    }
    // Otherwise only scroll if user hasn't scrolled up
    else if (!userScrolledUp.value) {
      nextTick(scrollToBottom);
    }
  },
);

// Auto-scroll when task starts running (typing indicator appears)
watch(
  () => props.isRunning,
  (running) => {
    if (running && !userScrolledUp.value) {
      // Wait for typing indicator to render, then scroll
      nextTick(() => {
        setTimeout(scrollToBottom, 50);
      });
    }
  },
);

// Expose scrollToBottom for parent to call
defineExpose({ scrollToBottom });
</script>

<template>
  <div class="messages-container">
    <main class="messages" ref="messagesEl" @scroll="handleScroll">
      <div class="messages-inner" v-if="messages.length > 0">
        <!-- Load older messages button -->
        <div class="older-messages" v-if="hasOlderMessages">
          <button class="load-older-btn" @click="emit('load-full-history')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            Load older messages
            <span class="summary-badge" v-if="summaryCount > 0">{{ summaryCount }} compaction{{ summaryCount > 1 ? 's' : '' }}</span>
          </button>
        </div>
        <template v-for="(msg, index) in groupedMessages" :key="index">
          <ToolGroup v-if="msg.type === 'tool_group'" :items="msg.items" />
          <MessageItem v-else :message="msg" />
        </template>
      </div>
      <div class="empty" v-else-if="!isRunning && isNewSession">
        <p>Start a conversation</p>
        <p class="empty-hint">Type a message below to begin.</p>
      </div>
      <div class="loading" v-else-if="!isRunning && !isNewSession">
        <p>Loading...</p>
      </div>
      <div class="typing" v-if="isRunning">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </main>

    <!-- Jump to bottom button (floats within chat area) -->
    <button
      v-if="userScrolledUp"
      class="jump-to-bottom"
      @click="scrollToBottom"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
      Jump to bottom
    </button>
  </div>
</template>

<style scoped>
.messages-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.messages {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
}

.messages-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 100%;
  overflow-x: hidden;
  padding-bottom: 16px;
}

.older-messages {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
  border-bottom: 1px dashed var(--border-color);
  margin-bottom: 8px;
}

.load-older-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  transition: background 0.15s, color 0.15s;
}

.load-older-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.summary-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: 10px;
  color: var(--text-muted);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.empty-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.typing {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  width: fit-content;
  margin: 16px 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typing 1.4s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.jump-to-bottom {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  z-index: 10;
  box-shadow: var(--shadow-md);
  transition: background 0.15s, color 0.15s;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.jump-to-bottom:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
