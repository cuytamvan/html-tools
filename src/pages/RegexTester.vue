<script setup lang="ts">
import { computed, ref } from 'vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { escapeHtml } from '@/lib/escape';

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
  if (!text) return '<span class="meta">Teks uji kosong.</span>';
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
      preview: escapeHtml(text) || '<span class="meta">Isi pola untuk mulai.</span>',
      previewEmpty: !text,
      replaceOut: text,
      meta: '0 cocokan',
      rows: [] as MatchRow[],
      empty: 'Isi pola regular expression.',
    };
  }
  let re: RegExp;
  try {
    re = new RegExp(pattern.value, activeFlags.value.join(''));
  } catch (err) {
    return {
      error: 'Pola tidak valid: ' + (err as Error).message,
      preview: escapeHtml(text),
      previewEmpty: false,
      replaceOut: text,
      meta: 'Pola error',
      rows: [] as MatchRow[],
      empty: 'Perbaiki pola terlebih dahulu.',
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
    meta: matches.length + ' cocokan' + (capped ? ' (dibatasi ' + MAX_MATCHES + ')' : ''),
    rows: matches.map((m) => ({ text: m[0], index: m.index, groups: groupsText(m) })),
    empty: 'Tidak ada yang cocok.',
  };
});

</script>

<template>
  <ToolLayout title="Regex Tester" description="Uji pola JavaScript terhadap teks, lihat semua kecocokan, grup, dan hasil ganti.">
    <section class="panel reveal">
      <p class="panel-title">Pola</p>
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
              placeholder="pola"
            />
            <span class="slash" aria-hidden="true">/</span>
          </div>
        </div>
        <div class="field" style="margin-top: 16px">
          <label>Bendera</label>
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
          <p class="hint">g global, i ignore case, m multiline, s dotAll, u unicode, y sticky</p>
        </div>
        <div class="error-box" :style="{ display: result.error ? 'block' : 'none' }">{{ result.error }}</div>
      </div>
    </section>

    <div class="split-grid">
      <section class="panel card reveal">
        <p class="panel-title">Teks uji</p>
        <textarea v-model="haystack" spellcheck="false"></textarea>
      </section>
      <section class="panel card reveal">
        <p class="panel-title">Pratinjau</p>
        <pre class="regex-preview" :class="{ 'is-empty': result.previewEmpty }" v-html="result.preview"></pre>
      </section>
    </div>

    <section class="panel reveal">
      <p class="panel-title">Kecocokan</p>
      <div class="card">
        <p class="meta">{{ result.meta }}</p>
        <div class="table-scroll" style="margin-top: 12px">
          <table v-if="result.rows.length">
            <thead>
              <tr>
                <th>#</th>
                <th>Teks</th>
                <th>Indeks</th>
                <th>Grup</th>
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
      <p class="panel-title">Ganti</p>
      <div class="card">
        <div class="field">
          <label for="replacement">String pengganti</label>
          <input
            id="replacement"
            v-model="replacement"
            type="text"
            class="input-mono"
            autocomplete="off"
            spellcheck="false"
            placeholder="$& atau $1"
          />
          <p class="hint"><span class="mono">$&amp;</span> seluruh cocokan, <span class="mono">$1</span> grup pertama</p>
        </div>
        <pre class="regex-preview" style="margin-top: 16px">{{ result.replaceOut }}</pre>
      </div>
    </section>
  </ToolLayout>
</template>
