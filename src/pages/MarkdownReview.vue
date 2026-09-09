<script setup lang="ts">
import { ref } from 'vue';

import MarkdownEditorCard from '@/components/MarkdownEditorCard.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/i18n';
import { copyText } from '@/lib/escape';
import { ui } from '@/lib/ui';

const SAMPLE = `# Markdown Review

Write markdown on the **Editor** tab, then open **Review** to preview the rendered output.

## Lists

- Item one
- Item two

## Code

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}\`;
}

console.log(greet('world'));
\`\`\`

> Blockquote stays readable in preview.
`;

const { t } = useI18n();
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();
const source = ref('');

function loadSample() {
  source.value = SAMPLE;
  showToast(t('common.sampleLoaded'));
}

function clearSource() {
  source.value = '';
}

async function copySource() {
  if (!source.value.trim()) return;
  const ok = await copyText(source.value);
  showToast(ok ? t('markdownReview.copied') : t('common.copyFail'));
}
</script>

<template>
  <ToolLayout compact :title="t('tools.markdownReview.title')" :description="t('markdownReview.lead')">
    <section class="md-page-section">
      <div :class="[ui.rowBetween, 'mb-3']">
        <p class="md-page-title">{{ t('markdownReview.source') }}</p>
        <div :class="ui.row">
          <button :class="ui.btnGhostSm" type="button" @click="loadSample">{{ t('common.loadSample') }}</button>
          <button :class="ui.btnGhostSm" type="button" @click="copySource">{{ t('common.copy') }}</button>
          <button :class="ui.btnGhostSm" type="button" @click="clearSource">{{ t('markdownReview.clear') }}</button>
        </div>
      </div>
      <MarkdownEditorCard
        v-model="source"
        :min-height="420"
        @exported="showToast(t('markdownEditor.exportPdfDone'))"
        @export-failed="showToast(t('markdownEditor.exportPdfFail'))"
        @pretty-printed="showToast(t('markdownEditor.prettyPrintDone'))"
      />
    </section>

    <template #extras>
      <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.md-page-section {
  padding-top: 0;
}
.md-page-title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
}
</style>
