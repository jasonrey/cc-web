import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/main.css';
import 'highlight.js/styles/github-dark.css';

// Global components
import AppHeader from './components/AppHeader.vue';
import MessageItem from './components/MessageItem.vue';
import ToolGroup from './components/ToolGroup.vue';

// Global function for copying code blocks
window.copyCodeBlock = async (id) => {
  const el = document.getElementById(id);
  if (!el) return;

  const code = el.textContent || '';
  try {
    await navigator.clipboard.writeText(code);
    // Update button to show "Copied!"
    const btn = document.querySelector(`[data-code-id="${id}"]`);
    if (btn) {
      const textSpan = btn.querySelector('.copy-text');
      if (textSpan) {
        const originalText = textSpan.textContent;
        textSpan.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          textSpan.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      }
    }
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const app = createApp(App);

// Register global components
app.component('AppHeader', AppHeader);
app.component('MessageItem', MessageItem);
app.component('ToolGroup', ToolGroup);

app.use(router).mount('#app');
