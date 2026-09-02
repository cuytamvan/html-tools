<script setup lang="ts">
import { MarkdownDocument } from '@comark/vue';
import type { MarkdownDocument as MarkdownDocumentType } from 'comark';
import { computed, nextTick, ref, watch } from 'vue';

import { useI18n } from '@/i18n';
import { parseNoteMarkdown } from '@/lib/noteMarkdown';

const content = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    minHeight?: number;
    exportFilename?: string;
    showExport?: boolean;
  }>(),
  {
    minHeight: 360,
    exportFilename: 'markdown.pdf',
    showExport: true,
  },
);

const emit = defineEmits<{
  exported: [];
  exportFailed: [];
}>();

const { t } = useI18n();
const activeTab = ref<'editor' | 'review'>('editor');
const parsedReview = ref<MarkdownDocumentType | null>(null);
const parsingReview = ref(false);
const exportingPdf = ref(false);
const exportDoc = ref<MarkdownDocumentType | null>(null);
const exportHostRef = ref<HTMLElement | null>(null);

const reviewContent = computed(() => content.value);
const panelStyle = computed(() => ({ minHeight: `${props.minHeight}px` }));
const canExport = computed(() => Boolean(content.value.trim()) && !exportingPdf.value);

let parseSeq = 0;

watch(
  [reviewContent, activeTab],
  async ([source, tab]) => {
    if (tab !== 'review') return;
    const trimmed = source.trim();
    if (!trimmed) {
      parsedReview.value = null;
      parsingReview.value = false;
      return;
    }
    const seq = ++parseSeq;
    parsingReview.value = true;
    parsedReview.value = null;
    try {
      const doc = await parseNoteMarkdown(trimmed);
      if (seq === parseSeq) parsedReview.value = doc;
    } finally {
      if (seq === parseSeq) parsingReview.value = false;
    }
  },
  { immediate: true },
);

async function waitForExportRender(host: HTMLElement, timeoutMs = 10000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await nextTick();
    if (host.querySelector('.comark-content')) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error('export render timeout');
}

async function exportPdf() {
  const trimmed = content.value.trim();
  if (!trimmed || exportingPdf.value) return;

  exportingPdf.value = true;
  exportDoc.value = null;

  try {
    exportDoc.value = await parseNoteMarkdown(trimmed);
    await nextTick();
    const host = exportHostRef.value;
    if (!host) throw new Error('missing export host');
    await waitForExportRender(host);
    const { exportElementToPdf } = await import('@/lib/markdownPdf');
    await exportElementToPdf(host, props.exportFilename);
    emit('exported');
  } catch {
    emit('exportFailed');
  } finally {
    exportingPdf.value = false;
    exportDoc.value = null;
  }
}
</script>

<template>
  <div class="md-card overflow-hidden rounded-md border border-line bg-surface">
    <div class="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="md-tab"
          :class="activeTab === 'editor' && 'md-tab-active'"
          @click="activeTab = 'editor'"
        >
          {{ t('markdownEditor.tabEditor') }}
        </button>
        <button
          type="button"
          class="md-tab"
          :class="activeTab === 'review' && 'md-tab-active'"
          @click="activeTab = 'review'"
        >
          {{ t('markdownEditor.tabReview') }}
        </button>
      </div>
      <button v-if="showExport" type="button" class="md-export" :disabled="!canExport" @click="exportPdf">
        {{ exportingPdf ? t('markdownEditor.exportingPdf') : t('markdownEditor.exportPdf') }}
      </button>
    </div>

    <textarea
      v-if="activeTab === 'editor'"
      v-model="content"
      spellcheck="false"
      class="md-editor"
      :style="panelStyle"
      :placeholder="placeholder ?? t('markdownEditor.placeholder')"
    />

    <div v-else class="md-markdown md-preview" :style="panelStyle">
      <p v-if="!reviewContent.trim()" class="m-0 text-muted">{{ t('markdownEditor.reviewEmpty') }}</p>
      <p v-else-if="parsingReview || !parsedReview" class="m-0 text-muted">{{ t('markdownEditor.parsing') }}</p>
      <Suspense v-else>
        <MarkdownDocument :key="reviewContent" :value="parsedReview" />
        <template #fallback>
          <p class="m-0 text-muted">{{ t('markdownEditor.parsing') }}</p>
        </template>
      </Suspense>
    </div>
  </div>

  <div ref="exportHostRef" class="md-export-host md-markdown" aria-hidden="true">
    <Suspense v-if="exportDoc">
      <MarkdownDocument :value="exportDoc" />
    </Suspense>
  </div>
</template>

<style scoped>
.md-tab {
  cursor: pointer;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 0.25rem 0.625rem;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-muted);
  transition:
    color 150ms ease,
    background-color 150ms ease;
}
.md-tab:hover {
  color: var(--color-ink);
}
.md-tab-active {
  background: var(--color-paper);
  color: var(--color-ink);
}
.md-export {
  cursor: pointer;
  border: 1px solid var(--color-line);
  border-radius: 6px;
  background: var(--color-surface);
  padding: 0.25rem 0.625rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-ink);
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    transform 150ms ease;
}
.md-export:hover:not(:disabled) {
  border-color: var(--color-line-strong);
}
.md-export:active:not(:disabled) {
  transform: scale(0.98);
}
.md-export:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.md-editor {
  display: block;
  width: 100%;
  resize: vertical;
  border: 0;
  background: var(--color-surface);
  padding: 0.75rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--color-ink);
  outline: none;
}
.md-editor::placeholder {
  color: var(--color-muted);
}
.md-preview {
  overflow: auto;
  background: var(--color-surface);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-ink);
}
.md-export-host {
  position: fixed;
  left: -10000px;
  top: 0;
  z-index: -1;
  width: 720px;
  background: #ffffff;
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-ink);
  pointer-events: none;
}
.md-markdown :deep(.comark-content > :first-child),
.md-markdown :deep(h1:first-child),
.md-markdown :deep(h2:first-child),
.md-markdown :deep(h3:first-child),
.md-markdown :deep(p:first-child) {
  margin-top: 0;
}
.md-markdown :deep(h1),
.md-markdown :deep(h2),
.md-markdown :deep(h3),
.md-markdown :deep(h4) {
  margin: 0.75rem 0 0.375rem;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: var(--color-ink);
}
.md-markdown :deep(h1) {
  font-size: 1.5rem;
}
.md-markdown :deep(h2) {
  font-size: 1.25rem;
}
.md-markdown :deep(h3) {
  font-size: 1.0625rem;
}
.md-markdown :deep(p),
.md-markdown :deep(ul),
.md-markdown :deep(ol),
.md-markdown :deep(pre),
.md-markdown :deep(blockquote) {
  margin: 0 0 0.5rem;
}
.md-markdown :deep(ul),
.md-markdown :deep(ol) {
  padding-left: 1rem;
}

.md-markdown :deep(ul) {
  list-style-type: disc;
}
.md-markdown :deep(ol) {
  list-style-type: decimal;
}

.md-markdown :deep(code) {
  border-radius: 4px;
  background: var(--color-bone);
  padding: 0.1rem 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.md-markdown :deep(pre) {
  overflow: auto;
  border: 1px solid var(--color-line);
  border-radius: 6px;
  margin: 0 0 0.5rem;
}
.md-markdown :deep(pre:not(.shiki)) {
  background: var(--color-bone);
  padding: 0.625rem 0.75rem;
}
.md-markdown :deep(pre.shiki) {
  padding: 0.625rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.55;
}
.md-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}
.md-markdown :deep(blockquote) {
  border-left: 3px solid var(--color-line-strong);
  padding-left: 0.625rem;
  color: var(--color-muted);
}
.md-markdown :deep(a) {
  color: var(--color-ink);
}
</style>
