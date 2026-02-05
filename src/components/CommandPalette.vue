<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { formatRelativeTime } from '../utils/format.js';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  sessions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close']);

const router = useRouter();
const searchQuery = ref('');
const selectedIndex = ref(0);
const inputRef = ref(null);

// Filter sessions by search query
const filteredSessions = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return props.sessions.slice(0, 20);

  return props.sessions
    .filter((session) => {
      const title = (session.title || 'Untitled').toLowerCase();
      const project = (session.projectName || '').toLowerCase();
      return title.includes(query) || project.includes(query);
    })
    .slice(0, 20);
});

// Reset state when palette opens
watch(
  () => props.show,
  (isVisible) => {
    if (isVisible) {
      searchQuery.value = '';
      selectedIndex.value = 0;
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  },
);

// Reset selected index when results change
watch(filteredSessions, () => {
  selectedIndex.value = 0;
});

function handleKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (selectedIndex.value < filteredSessions.value.length - 1) {
      selectedIndex.value++;
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (selectedIndex.value > 0) {
      selectedIndex.value--;
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    selectSession(filteredSessions.value[selectedIndex.value]);
    return;
  }
}

function selectSession(session) {
  if (!session) return;
  emit('close');
  router.push({
    name: 'chat',
    params: {
      project: session.projectSlug,
      session: session.sessionId,
    },
  });
}

// Use shared formatRelativeTime utility
const formatTime = formatRelativeTime;
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="palette-overlay" @click="$emit('close')">
      <div class="palette" @click.stop>
        <div class="palette-input-wrapper">
          <svg class="palette-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            class="palette-input"
            placeholder="Search sessions..."
            @keydown="handleKeydown"
          />
          <kbd class="palette-hint">esc</kbd>
        </div>

        <div class="palette-results" v-if="filteredSessions.length > 0">
          <div
            v-for="(session, index) in filteredSessions"
            :key="session.sessionId"
            class="palette-item"
            :class="{ selected: index === selectedIndex }"
            @click="selectSession(session)"
            @mouseenter="selectedIndex = index"
          >
            <div class="palette-item-content">
              <span class="palette-item-title">{{ session.title || 'Untitled' }}</span>
              <span class="palette-item-project">{{ session.projectName }}</span>
            </div>
            <span class="palette-item-time">{{ formatTime(session.modified) }}</span>
          </div>
        </div>

        <div class="palette-empty" v-else-if="searchQuery">
          <p>No sessions found</p>
        </div>

        <div class="palette-empty" v-else>
          <p>No recent sessions</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  padding-top: 15vh;
  z-index: 1000;
}

.palette {
  width: 100%;
  max-width: 500px;
  max-height: 400px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.palette-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.palette-input {
  flex: 1;
  font-size: 14px;
  background: transparent;
  color: var(--text-primary);
}

.palette-input::placeholder {
  color: var(--text-muted);
}

.palette-hint {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.palette-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.palette-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.1s;
}

.palette-item:hover,
.palette-item.selected {
  background: var(--bg-hover);
}

.palette-item.selected {
  background: var(--bg-tertiary);
}

.palette-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.palette-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.palette-item-project {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.palette-item-time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.palette-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
