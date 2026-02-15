<script setup>
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['close']);

function handleEscape(e) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});

const shortcuts = [
  {
    category: 'Global',
    items: [
      { keys: ['Ctrl/Cmd', 'K'], description: 'Open command palette' },
      { keys: ['Ctrl/Cmd', 'B'], description: 'Toggle sidebar' },
      { keys: ['Ctrl/Cmd', ','], description: 'Open settings' },
      {
        keys: ['Ctrl/Cmd', '?'],
        description: 'Show keyboard shortcuts (this dialog)',
      },
    ],
  },
  {
    category: 'Chat View',
    items: [
      { keys: ['Ctrl/Cmd', '1'], description: 'Switch to Chat tab' },
      { keys: ['Ctrl/Cmd', '2'], description: 'Switch to Terminal tab' },
      { keys: ['Ctrl/Cmd', '3'], description: 'Switch to Files tab' },
      { keys: ['Ctrl/Cmd', 'L'], description: 'Scroll to bottom (clear view)' },
      { keys: ['Ctrl/Cmd', '↑'], description: 'Navigate to previous turn' },
      { keys: ['Ctrl/Cmd', '↓'], description: 'Navigate to next turn' },
      { keys: ['Escape'], description: 'Close modals / blur input' },
    ],
  },
  {
    category: 'Chat Input',
    items: [
      { keys: ['Enter'], description: 'Send message' },
      { keys: ['Shift', 'Enter'], description: 'New line in message' },
      { keys: ['Ctrl/Cmd', 'Enter'], description: 'Send message (alternate)' },
    ],
  },
  {
    category: 'Terminal',
    items: [
      { keys: ['Enter'], description: 'Execute command' },
      { keys: ['\\'], description: 'Start multiline mode' },
    ],
  },
  {
    category: 'File Editor',
    items: [
      { keys: ['Ctrl/Cmd', 'S'], description: 'Save file' },
      { keys: ['Escape'], description: 'Close editor' },
    ],
  },
];
</script>

<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="close-btn" @click="$emit('close')" title="Close (Esc)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="shortcuts-container">
        <div v-for="section in shortcuts" :key="section.category" class="shortcuts-section">
          <h3 class="section-title">{{ section.category }}</h3>
          <div class="shortcuts-list">
            <div v-for="(shortcut, index) in section.items" :key="index" class="shortcut-row">
              <div class="shortcut-keys">
                <kbd v-for="(key, i) in shortcut.keys" :key="i" class="key">
                  {{ key }}
                </kbd>
              </div>
              <div class="shortcut-description">{{ shortcut.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <p class="footer-note">
          Press <kbd class="key">?</kbd> to toggle this dialog
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  max-width: 700px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.shortcuts-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.shortcuts-section {
  margin-bottom: 32px;
}

.shortcuts-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  gap: 16px;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 140px;
  flex-shrink: 0;
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shortcut-description {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.footer-note {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.footer-note .key {
  margin: 0 4px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .modal-content {
    max-width: 100%;
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
  }

  .shortcut-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .shortcut-keys {
    min-width: auto;
  }
}

/* Scrollbar styling */
.shortcuts-container::-webkit-scrollbar {
  width: 8px;
}

.shortcuts-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.shortcuts-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.shortcuts-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
