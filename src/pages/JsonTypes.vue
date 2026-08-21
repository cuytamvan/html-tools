<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { copyText } from '@/lib/escape';
import { fileNameFor, generateTypes, highlightCode, SAMPLE, type TypeLang } from '@/lib/jsonToTypes';

const LANGS: { id: TypeLang; label: string }[] = [
  { id: 'go', label: 'Go' },
  { id: 'ts', label: 'TypeScript' },
  { id: 'py', label: 'Python' },
];

const { t } = useI18n();
const jsonInput = ref(JSON.stringify(SAMPLE, null, 2));
const rootName = ref('Root');
const lang = ref<TypeLang>('go');
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const view = computed(() => {
  const raw = String(jsonInput.value || '').trim();
  const hint = rootName.value;
  const filename = fileNameFor(hint, lang.value);
  const emptyHtml = '<span class="tok-comment">' + t('jsonTypes.pasteHint') + '</span>';
  const invalidHtml = '<span class="tok-comment">' + t('jsonTypes.fixHint') + '</span>';

  if (!raw) {
    return { jsonErr: '', code: '', filename, html: emptyHtml, status: t('jsonTypes.noJson') };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (err) {
    return {
      jsonErr: t('common.jsonInvalid', { message: (err as Error).message }),
      code: '',
      filename,
      html: invalidHtml,
      status: t('jsonTypes.invalid'),
    };
  }

  const generated = generateTypes(value, hint, lang.value);
  const statusKey = generated.typeCount ? 'jsonTypes.typesCount' : 'jsonTypes.aliasCount';
  const status =
    t(statusKey, { n: generated.typeCount || 1, lang: generated.langLabel }) +
    (generated.rootIsArray ? ' · ' + t('jsonTypes.rootArray') : '');
  return {
    jsonErr: '',
    code: generated.code,
    filename: generated.filename,
    html: highlightCode(generated.code, lang.value),
    status,
  };
});

function pretty() {
  const raw = String(jsonInput.value || '').trim();
  if (!raw) return;
  try {
    jsonInput.value = JSON.stringify(JSON.parse(raw), null, 2);
    showToast(t('common.jsonPrettied'));
  } catch {
    /* live generate already surfaces the parse error */
  }
}

function loadSample() {
  jsonInput.value = JSON.stringify(SAMPLE, null, 2);
  showToast(t('common.sampleLoaded'));
}

async function copyCode() {
  if (!view.value.code) return;
  const ok = await copyText(view.value.code);
  showToast(ok ? t('common.copiedCode') : t('common.copyFail'));
}
</script>

<template>
  <ToolLayout :title="t('tools.jsonTypes.title')" :description="t('jsonTypes.lead')">
    <section class="panel reveal">
      <p class="panel-title">{{ t('common.settings') }}</p>
      <div class="card">
        <div class="form-grid cols-2">
          <div class="field">
            <label for="rootName">{{ t('jsonTypes.typeName') }}</label>
            <input id="rootName" v-model="rootName" type="text" spellcheck="false" autocomplete="off" />
            <p class="hint">{{ t('jsonTypes.typeNameHint') }}</p>
          </div>
          <div class="field">
            <label>{{ t('jsonTypes.language') }}</label>
            <div class="choice-group">
              <button
                v-for="item in LANGS"
                :key="item.id"
                type="button"
                class="btn-ghost btn-sm"
                :class="{ 'is-active': lang === item.id }"
                @click="lang = item.id"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="split-grid">
      <section class="panel card reveal">
        <div class="row between" style="margin-bottom: 12px; margin-top: 0">
          <p class="panel-title" style="margin: 0">JSON</p>
          <div class="row">
            <button class="btn-ghost btn-sm" type="button" @click="pretty">{{ t('common.pretty') }}</button>
            <button class="btn-ghost btn-sm" type="button" @click="loadSample">{{ t('common.loadSample') }}</button>
          </div>
        </div>
        <textarea v-model="jsonInput" class="json-pane" spellcheck="false" placeholder="{ }"></textarea>
        <p class="hint">{{ view.jsonErr }}</p>
      </section>
      <section class="panel card reveal">
        <div class="code-wrap">
          <div class="code-toolbar">
            <span class="filename">{{ view.filename }}</span>
            <button class="btn-ghost btn-sm" type="button" @click="copyCode">{{ t('common.copy') }}</button>
          </div>
          <pre class="code-block" v-html="view.html"></pre>
        </div>
      </section>
    </div>

    <p class="meta" style="margin-top: 16px">{{ view.status }}</p>

    <template #extras>
      <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
