# UI/UX Styleguide

Comprehensive design system and conventions for tofucode based on existing codebase patterns.

---

## 1. Design Tokens

### Color Palette

```css
/* Primary Colors */
--bg-primary: #0a0a0a          /* Main background */
--bg-secondary: #141414        /* Cards, secondary surfaces */
--bg-tertiary: #1f1f1f         /* Tertiary surfaces, sections */
--bg-hover: #2a2a2a            /* Hover states */

/* Text Colors */
--text-primary: #f5f5f5        /* Main text */
--text-secondary: #a0a0a0      /* Secondary text */
--text-muted: #666666          /* Muted/disabled text */

/* Semantic Colors */
--success-color: #22c55e       /* Green - success states */
--error-color: #ef4444         /* Red - errors */
--warning-color: #f59e0b       /* Amber - warnings */

/* UI Elements */
--border-color: #2a2a2a        /* Borders */
--accent-color: #f5f5f5        /* Accent */
--accent-hover: #ffffff        /* Accent hover */
```

### Typography

```css
/* Font Families */
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
--font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace

/* Font Sizes */
15px  /* Headers, titles (weight: 600) */
14px  /* Body text (base) */
13px  /* Secondary text, compact areas */
12px  /* Small labels, toolbar items */
11px  /* Tiny text, badges, counts */
10px  /* Permission badges (uppercase, weight: 500) */

/* Line Heights */
1.6   /* Base */
1.7   /* Markdown content */
1.5   /* Monospace code */
```

### Spacing Scale

```css
/* Gap Values (flexbox) */
4px   /* Tight */
6px   /* Compact */
8px   /* Standard */
10px  /* Comfortable */
12px  /* Generous */
16px  /* Spacious */
20px  /* Large sections */
24px  /* Major sections */

/* Padding Values */
Horizontal: 2px, 4px, 6px, 8px, 10px, 12px, 16px
Vertical: 4px, 6px, 8px, 10px, 12px, 16px

/* Common Patterns */
6px 10px   /* Inputs, compact areas */
8px 12px   /* Standard areas */
10px 12px  /* Headers */
12px 16px  /* Larger sections */
16px       /* Main content areas */
```

### Sizing

```css
/* Border Radius */
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2)
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3)

/* Standard Heights */
32px   /* Buttons, inputs */
36px   /* Icon containers, larger buttons */
40px   /* Large icon containers */
57px   /* App header (min-height) */

/* Icon Sizes */
12px   /* Tiny (inline badges) */
14px   /* Extra small (compact UI) */
16px   /* Small (list items, toolbar) */
20px   /* Medium (headers, buttons) */
24px   /* Large (prominent UI) */
```

---

## 2. Component Patterns

### Buttons

#### Primary Button
```vue
<button class="primary-btn">Action</button>
```

```css
.primary-btn {
  padding: 8px 16px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.primary-btn:hover {
  background: var(--bg-hover);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### Icon Button
```vue
<button class="icon-btn">
  <svg width="20" height="20">...</svg>
</button>
```

```css
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

#### Danger Button
```css
.danger-btn {
  color: var(--error-color);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.danger-btn:hover {
  background: rgba(239, 68, 68, 0.15);
}
```

### Input Fields

#### Text Input
```vue
<input
  type="text"
  class="form-input"
  placeholder="Enter text..."
>
```

```css
.form-input {
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--text-muted);
}

.form-input::placeholder {
  color: var(--text-muted);
}
```

#### Path Input (Monospace)
```css
.path-input {
  font-family: var(--font-mono);
  font-size: 13px;
}
```

### List Items

#### Standard List Item
```vue
<li class="list-item" @click="handleClick">
  <div class="item-icon">
    <svg width="20" height="20">...</svg>
  </div>
  <span class="item-name">Item Name</span>
  <span class="item-meta">Metadata</span>
</li>
```

```css
.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s;
}

.list-item:hover {
  background: var(--bg-hover);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 12px;
  color: var(--text-muted);
}
```

### Badges & Indicators

#### Model Badge
```vue
<span class="model-badge">sonnet</span>
```

```css
.model-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
```

#### Count Badge
```vue
<span class="count-badge">5</span>
```

```css
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  font-size: 11px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border-radius: 10px;
  min-width: 20px;
}
```

#### Status Indicator
```vue
<span class="status-indicator" :class="status"></span>
```

```css
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.success {
  background: var(--success-color);
}

.status-indicator.error {
  background: var(--error-color);
}

.status-indicator.running {
  background: var(--warning-color);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

### Modals & Overlays

#### Modal Pattern
```vue
<div class="modal-overlay" @click="close">
  <div class="modal" @click.stop>
    <header class="modal-header">
      <h2>Title</h2>
      <button class="icon-btn" @click="close">×</button>
    </header>
    <div class="modal-content">
      <!-- Content -->
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  z-index: 1000;
}

.modal {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
```

### Messages & Chat

#### User Message
```vue
<div class="user-message" :class="permissionMode">
  <div class="message-content">{{ text }}</div>
</div>
```

```css
.user-message {
  margin-left: 20%;
  background: var(--bg-tertiary);
  padding: 12px 16px;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  border-right: 3px solid var(--border-color);
  word-break: break-word;
}

.user-message.plan {
  border-right-color: var(--success-color);
}

.user-message.bypassPermissions {
  border-right-color: var(--warning-color);
}

.user-message.skip {
  border-right-color: #f97316;
}

.message-content {
  line-height: 1.7;
}
```

#### Error Message
```vue
<div class="error-message">
  <svg width="16" height="16">⚠</svg>
  <span>{{ errorText }}</span>
</div>
```

```css
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: var(--error-color);
}
```

### Code Blocks

#### Code Block with Copy
```vue
<div class="code-block">
  <div class="code-header">
    <span class="language-label">{{ language }}</span>
    <button class="copy-btn" @click="copy">
      <svg width="14" height="14">📋</svg>
      <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
    </button>
  </div>
  <pre><code>{{ code }}</code></pre>
</div>
```

```css
.code-block {
  margin: 12px 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.language-label {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  text-transform: uppercase;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.copy-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.copy-btn.copied {
  color: var(--success-color);
}

.code-block pre {
  margin: 0;
  padding: 12px;
  background: var(--bg-secondary);
  overflow-x: auto;
}

.code-block code {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}
```

### Toolbars

#### Toolbar Pattern
```vue
<div class="toolbar">
  <div class="toolbar-left">
    <span class="toolbar-item">Item 1</span>
  </div>
  <div class="toolbar-right">
    <button>Action</button>
  </div>
</div>
```

```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 12px;
}

.toolbar-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
}
```

---

## 3. Layout Patterns

### Main App Layout
```css
.app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .app {
    display: block;
  }

  .sidebar {
    /* Becomes overlay */
  }
}
```

### Header Pattern
```css
.header {
  min-height: 57px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-center {
  flex: 1;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

### Content Area
```css
.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
```

### Flex Patterns

**Vertical flex container (most common)**:
```css
display: flex;
flex-direction: column;
gap: 8px;
```

**Horizontal flex with alignment**:
```css
display: flex;
align-items: center;
gap: 12px;
```

**Space between**:
```css
display: flex;
justify-content: space-between;
align-items: center;
```

**Flexible item with text overflow**:
```css
flex: 1;
min-width: 0;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

---

## 4. Interaction States

### Transitions

**Standard timing**: `0.15s`

```css
transition: background 0.15s;
transition: background 0.15s, color 0.15s;
transition: opacity 0.15s;
```

### Hover States

```css
.interactive:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

### Active/Selected States

```css
.item.active {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

### Disabled States

```css
.disabled,
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Focus States

```css
input:focus,
textarea:focus {
  outline: none;
  border-color: var(--text-muted);
}
```

---

## 5. Icons

### Standard SVG Pattern

```vue
<svg
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
>
  <!-- path data -->
</svg>
```

### Icon Sizing Guide

| Size | Usage |
|------|-------|
| 12px | Tiny badges, inline labels |
| 14px | Compact UI, small controls |
| 16px | List items, toolbar buttons |
| 20px | Headers, main buttons |
| 24px | Prominent UI elements |

### Icon Styling

```css
svg {
  stroke-width: 2;
  fill: none;
  stroke: currentColor;
  color: var(--text-secondary);
  flex-shrink: 0;
}
```

---

## 6. State Visualization

### Loading State

```vue
<svg class="spin" width="14" height="14">
  <circle ... />
</svg>
```

```css
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Empty State

```vue
<div class="empty-state">
  <p>No items found</p>
</div>
```

```css
.empty-state {
  padding: 32px 0;
  text-align: center;
  color: var(--text-secondary);
}
```

### Success State

```css
.success-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: var(--radius-md);
  color: var(--success-color);
}
```

---

## 7. Naming Conventions

### CSS Classes

BEM-inspired, descriptive:

```
.component-name
.component-header
.component-content
.component-item

/* State modifiers */
.component--active
.component--disabled
.component--expanded

/* Utility classes */
.truncate
.visually-hidden
.spin
```

### Vue Components

PascalCase:
```
AppHeader.vue
ChatMessages.vue
FileExplorer.vue
CommandPalette.vue
```

### Events

kebab-case, action-oriented:
```
@toggle-sidebar
@select-file
@close
@update:modelValue
```

### Props

camelCase:
```
:show
:messages
:currentPath
:hideHeader
```

---

## 8. Accessibility

### Screen Reader Only Content

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

### Semantic HTML

- Use `<button>` for actions
- Use `<a>` for navigation
- Use proper heading hierarchy
- Use `<input>` elements for forms
- Use `<ul>` and `<li>` for lists

### Keyboard Navigation

- Ensure all interactive elements are keyboard accessible
- Use proper focus indicators
- Support Escape key to close modals
- Support Enter key for form submission

---

## 9. Responsive Design

### Breakpoint

```css
@media (max-width: 768px) {
  /* Mobile adjustments */
}
```

### Mobile Patterns

- Sidebar becomes overlay on mobile
- Reduce padding on small screens
- Stack flex items vertically
- Increase touch target sizes

---

## 10. Common Measurements Reference

| Element | Height | Padding | Gap | Font Size |
|---------|--------|---------|-----|-----------|
| Button | 32-36px | 8px 16px | - | 14px |
| Icon Button | 36x36px | - | - | - |
| Input | auto | 6px 10px | - | 13px |
| Header | 57px | 10px 16px | 10px | 15px |
| List Item | auto | 10px 12px | 12px | 14px |
| Badge | auto | 2px 6px | - | 11px |
| Modal | auto | 20px | - | 14px |
| Toolbar | auto | 10px 16px | 12px | 12px |

---

## Usage Guidelines

### When Creating New Components

1. **Use existing color variables** - never hardcode colors
2. **Follow spacing scale** - use documented gap/padding values
3. **Match interaction patterns** - hover, focus, disabled states
4. **Use standard transitions** - 0.15s for most animations
5. **Size icons consistently** - 16px for standard, 20px for prominent
6. **Follow naming conventions** - BEM-inspired classes, camelCase props
7. **Ensure accessibility** - semantic HTML, keyboard navigation
8. **Test responsiveness** - check at mobile breakpoint (768px)

### When Modifying Existing Components

1. **Maintain consistency** - match existing patterns in the file
2. **Update related components** - keep similar components aligned
3. **Test all states** - hover, active, disabled, loading, error
4. **Check cross-browser** - ensure compatibility
5. **Consider dark theme** - all colors should work with dark background

### Design Checklist

- [ ] Uses design tokens (CSS variables)
- [ ] Follows spacing scale
- [ ] Has proper hover/focus states
- [ ] Works at mobile breakpoint
- [ ] Icons are sized consistently
- [ ] Text is readable (proper contrast)
- [ ] Transitions are smooth (0.15s)
- [ ] Component is keyboard accessible
- [ ] Naming follows conventions
- [ ] Empty/loading/error states handled
