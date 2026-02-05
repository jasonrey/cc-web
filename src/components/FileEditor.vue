<script setup>
import { Editor as TinyMDE } from 'tiny-markdown-editor';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  filePath: String,
  content: String,
  loading: Boolean,
});

const emit = defineEmits(['save', 'close']);

const editorContent = ref(props.content || '');
const isDirty = ref(false);
const isSaving = ref(false);
const textareaRef = ref(null);
const mdEditorRef = ref(null);
let tinyMdeInstance = null;

// Detect file type
const fileType = computed(() => {
  if (!props.filePath) return 'text';
  const ext = props.filePath.split('.').pop()?.toLowerCase();

  if (ext === 'md') return 'markdown';
  if (
    [
      'js',
      'ts',
      'jsx',
      'tsx',
      'vue',
      'json',
      'css',
      'html',
      'py',
      'go',
      'rs',
      'java',
      'c',
      'cpp',
      'sh',
    ].includes(ext)
  ) {
    return 'code';
  }
  return 'text';
});

const fileName = computed(() => {
  if (!props.filePath) return '';
  return props.filePath.split('/').pop();
});

// Watch for content changes from parent (new file loaded)
watch(
  () => props.content,
  (newContent) => {
    editorContent.value = newContent || '';
    isDirty.value = false;

    // Reinitialize TinyMDE with new content
    if (tinyMdeInstance) {
      tinyMdeInstance.setContent(editorContent.value);
    }
  },
);

// Initialize/cleanup markdown editor based on file type
watch(
  [fileType, () => props.loading],
  async ([type, loading]) => {
    // Clean up old instance first
    if (tinyMdeInstance) {
      tinyMdeInstance = null;
    }

    // Only init if markdown and not loading
    if (type === 'markdown' && !loading) {
      await nextTick();
      if (mdEditorRef.value) {
        tinyMdeInstance = new TinyMDE({
          element: mdEditorRef.value,
          content: editorContent.value,
        });

        tinyMdeInstance.addEventListener('change', () => {
          const newContent = tinyMdeInstance.getContent();
          if (newContent !== editorContent.value) {
            editorContent.value = newContent;
            isDirty.value = true;
          }
        });
      }
    }
  },
  { immediate: true },
);

// Handle textarea input for non-markdown files
function handleTextareaInput(event) {
  editorContent.value = event.target.value;
  isDirty.value = true;
}

// Save file
function handleSave() {
  if (isSaving.value || !isDirty.value) return;

  isSaving.value = true;
  emit('save', {
    path: props.filePath,
    content: editorContent.value,
  });
  isDirty.value = false;
  isSaving.value = false;
}

// Revert changes
function handleRevert() {
  if (!isDirty.value) return;

  const confirmed = confirm('Discard unsaved changes?');
  if (confirmed) {
    editorContent.value = props.content || '';
    isDirty.value = false;

    if (tinyMdeInstance) {
      tinyMdeInstance.setContent(editorContent.value);
    }
  }
}

// Close editor
function handleClose() {
  if (isDirty.value) {
    const confirmed = confirm('You have unsaved changes. Close anyway?');
    if (!confirmed) return;
  }
  emit('close');
}

// Keyboard shortcuts
function handleKeydown(event) {
  // Cmd/Ctrl+S to save
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault();
    handleSave();
  }
  // Escape to close (if no unsaved changes)
  if (event.key === 'Escape' && !isDirty.value) {
    handleClose();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  tinyMdeInstance = null;
});
</script>

<template>
  <div class="file-editor">
    <!-- Editor header -->
    <div class="editor-header">
      <div class="editor-info">
        <button class="back-btn" @click="handleClose" title="Back to explorer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="file-name">{{ fileName }}</span>
        <span v-if="isDirty" class="dirty-indicator" title="Unsaved changes">*</span>
      </div>
      <div class="editor-actions">
        <button
          v-if="isDirty"
          class="action-btn revert"
          @click="handleRevert"
          title="Revert changes"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Revert
        </button>
        <button
          class="action-btn save"
          @click="handleSave"
          :disabled="!isDirty || isSaving"
          title="Save (Cmd+S)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Editor content -->
    <div class="editor-content">
      <div v-if="loading" class="editor-loading">Loading...</div>
      <template v-else>
        <!-- Markdown editor (TinyMDE) -->
        <div
          v-if="fileType === 'markdown'"
          ref="mdEditorRef"
          class="markdown-editor"
        ></div>

        <!-- Plain text / code editor -->
        <textarea
          v-else
          ref="textareaRef"
          class="text-editor"
          :class="{ code: fileType === 'code' }"
          :value="editorContent"
          @input="handleTextareaInput"
          spellcheck="false"
          placeholder="Start typing..."
        ></textarea>
      </template>
    </div>
  </div>
</template>

<style scoped>
@import 'tiny-markdown-editor/dist/tiny-mde.min.css';

.file-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.editor-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: var(--text-secondary);
  background: transparent;
  border-radius: var(--radius-sm);
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dirty-indicator {
  color: var(--warning-color);
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
  flex-shrink: 0;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}

.action-btn.revert {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.action-btn.revert:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn.save {
  color: #fff;
  background: var(--accent-color);
}

.action-btn.save:hover:not(:disabled) {
  background: var(--accent-hover);
}

.action-btn.save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 13px;
}

/* Markdown editor */
.markdown-editor {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Text / code editor */
.text-editor {
  flex: 1;
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  background: transparent;
  border: none;
  resize: none;
  outline: none;
  overflow-y: auto;
}

.text-editor.code {
  font-family: var(--font-mono);
  line-height: 1.5;
  tab-size: 2;
}

.text-editor::placeholder {
  color: var(--text-muted);
}

/* TinyMDE dark theme overrides */
.TinyMDE {
  background: transparent;
  color: var(--text-primary);
  border: none;
}

.TinyMDE.TinyMDE_empty::before {
  color: var(--text-muted);
}
</style>
