<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { escapeHtml } from '@/lib/escape';

const { t } = useI18n();
const MAX_MATCHES = 400;
const FLAGS = ['g', 'i', 'm', 's', 'u', 'y'] as const;

const pattern = ref('\\b[A-Z][a-z]+\\b');
const haystack = ref(`Budi Santoso tinggal di Jakarta.
Nomornya 0812-3456-7890, email budi.santoso@kontak.id.
Pesanan #A-2041 dikirim 19 Agustus 2026.`);
const replacement = ref('[$&]');
const activeFlags = ref<string[]>(['g']);

type MatchRow = { text: string; index: number; groups: string };

function toggleFlag(flag: string) {
  if (activeFlags.value.includes(flag)) {
    activeFlags.value = activeFlags.value.filter((f) => f !== flag);
  } else {
    activeFlags.value = [...activeFlags.value, flag];
  }
}

function collectMatches(re: RegExp, text: string) {
  const matches: RegExpExecArray[] = [];
  if (re.global || re.sticky) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      matches.push(m);
      if (m[0].length === 0) re.lastIndex += 1;
      if (matches.length >= MAX_MATCHES) break;
    }
  } else {
    const m = re.exec(text);
    if (m) matches.push(m);
  }
  return matches;
}

function highlight(text: string, matches: RegExpExecArray[]) {
  if (!text) return '<span class="meta">' + t('regex.emptyTest') + '</span>';
  if (!matches.length) return escapeHtml(text);
  let html = '';
  let last = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index;
    const end = start + m[0].length;
    if (start < last) continue;
    html += escapeHtml(text.slice(last, start));
    if (end > start) {
      const cls = i % 2 === 1 ? 'mark-alt' : '';
      html += '<mark' + (cls ? ' class="' + cls + '"' : '') + '>' + escapeHtml(text.slice(start, end)) + '</mark>';
    }
    last = Math.max(last, end);
  }
  html += escapeHtml(text.slice(last));
  return html;
}

function groupsText(m: RegExpExecArray) {
  const parts: string[] = [];
  for (let i = 1; i < m.length; i++) {
    if (m[i] === undefined) continue;
    parts.push('$' + i + ' ' + m[i]);
  }
  if (m.groups) {
    Object.keys(m.groups).forEach((name) => {
      if (m.groups && m.groups[name] !== undefined) parts.push(name + ' ' + m.groups[name]);
    });
  }
  return parts.length ? parts.join(' · ') : '—';
}

const result = computed(() => {
  const text = haystack.value;
  if (!pattern.value) {
    return {
      error: '',
      preview: escapeHtml(text) || '<span class="meta">' + t('regex.fillPattern') + '</span>',
      previewEmpty: !text,
      replaceOut: text,
      meta: t('regex.zeroMatches'),
      rows: [] as MatchRow[],
      empty: t('regex.enterPattern'),
    };
  }
  let re: RegExp;
  try {
    re = new RegExp(pattern.value, activeFlags.value.join(''));
  } catch (err) {
    return {
      error: t('regex.invalidPattern', { message: (err as Error).message }),
      preview: escapeHtml(text),
      previewEmpty: false,
      replaceOut: text,
      meta: t('regex.patternError'),
      rows: [] as MatchRow[],
      empty: t('regex.fixPattern'),
    };
  }
  const matches = collectMatches(re, text);
  let replaceOut = text;
  try {
    re.lastIndex = 0;
    replaceOut = text.replace(re, replacement.value);
  } catch {
    replaceOut = text;
  }
  const capped = matches.length >= MAX_MATCHES;
  return {
    error: '',
    preview: highlight(text, matches),
    previewEmpty: false,
    replaceOut,
    meta: capped
      ? t('regex.matchCapped', { n: matches.length, max: MAX_MATCHES })
      : t('regex.matchCount', { n: matches.length }),
    rows: matches.map((m) => ({ text: m[0], index: m.index, groups: groupsText(m) })),
    empty: t('regex.noMatch'),
  };
});

</script>

<template>
  <ToolLayout :title="t('tools.regexTester.title')" :description="t('regex.lead')">
    <section class="panel reveal">
      <p class="panel-title">{{ t('regex.pattern') }}</p>
      <div class="card">
        <div class="field">
          <label for="pattern">Regular expression</label>
          <div class="pattern-wrap">
            <span class="slash" aria-hidden="true">/</span>
            <input
              id="pattern"
              v-model="pattern"
              type="text"
              class="input-mono"
              autocomplete="off"
              spellcheck="false"
              :placeholder="t('regex.patternPlaceholder')"
            />
            <span class="slash" aria-hidden="true">/</span>
          </div>
        </div>
        <div class="field" style="margin-top: 16px">
          <label>{{ t('regex.flags') }}</label>
          <div class="choice-group">
            <button
              v-for="flag in FLAGS"
              :key="flag"
              type="button"
              class="btn-ghost btn-sm"
              :class="{ 'is-active': activeFlags.includes(flag) }"
              :title="flag"
              @click="toggleFlag(flag)"
            >
              {{ flag }}
            </button>
          </div>
          <p class="hint">{{ t('regex.flagsHint') }}</p>
        </div>
        <div class="error-box" :style="{ display: result.error ? 'block' : 'none' }">{{ result.error }}</div>
      </div>
    </section>

    <div class="split-grid">
      <section class="panel card reveal">
        <p class="panel-title">{{ t('regex.testText') }}</p>
        <textarea v-model="haystack" spellcheck="false"></textarea>
      </section>
      <section class="panel card reveal">
        <p class="panel-title">{{ t('regex.preview') }}</p>
        <pre class="regex-preview" :class="{ 'is-empty': result.previewEmpty }" v-html="result.preview"></pre>
      </section>
    </div>

    <section class="panel reveal">
      <p class="panel-title">{{ t('regex.matches') }}</p>
      <div class="card">
        <p class="meta">{{ result.meta }}</p>
        <div class="table-scroll" style="margin-top: 12px">
          <table v-if="result.rows.length">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t('regex.text') }}</th>
                <th>{{ t('regex.index') }}</th>
                <th>{{ t('regex.groups') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in result.rows" :key="i">
                <td class="idx-col">{{ i + 1 }}</td>
                <td class="cell-value">{{ row.text }}</td>
                <td class="idx-col">{{ row.index }}</td>
                <td class="cell-json">{{ row.groups }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state" style="padding: 32px 8px">{{ result.empty }}</div>
        </div>
      </div>
    </section>

    <section class="panel reveal">
      <p class="panel-title">{{ t('regex.replace') }}</p>
      <div class="card">
        <div class="field">
          <label for="replacement">{{ t('regex.replacement') }}</label>
          <input
            id="replacement"
            v-model="replacement"
            type="text"
            class="input-mono"
            autocomplete="off"
            spellcheck="false"
            placeholder="$& atau $1"
          />
          <p class="hint">
            <i18n-t keypath="regex.replaceHint" tag="span">
              <template #all><span class="mono">$&amp;</span></template>
              <template #group><span class="mono">$1</span></template>
            </i18n-t>
          </p>
        </div>
        <pre class="regex-preview" style="margin-top: 16px">{{ result.replaceOut }}</pre>
      </div>
    </section>
  </ToolLayout>
</template>
