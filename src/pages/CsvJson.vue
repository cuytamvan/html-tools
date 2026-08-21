<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { copyText, downloadFile, pickFile } from '@/lib/escape';
import { useToast } from '@/composables/useToast';
import { cn, ui } from '@/lib/ui';

const SAMPLE_ROWS = [
  { nama: 'Budi Santoso', umur: 28, kota: 'Jakarta', aktif: true },
  { nama: 'Siti Rahma', umur: 31, kota: 'Bandung', aktif: false },
  { nama: 'Andi Wijaya', umur: 24, kota: 'Surabaya', aktif: true },
];

const { t } = useI18n();
const csvText = ref('');
const jsonText = ref('');
const delim = ref(',');
const hasHeader = ref(true);
const coerce = ref(true);
const errorMsg = ref('');
const status = ref<{ key: string; n?: number }>({ key: 'csvJson.noConversion' });
const statusMeta = computed(() => t(status.value.key, { n: status.value.n ?? 0 }));
const fileCsv = ref<HTMLInputElement | null>(null);
const fileJson = ref<HTMLInputElement | null>(null);
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

function showError(msg: string) {
  errorMsg.value = msg;
}

function clearError() {
  errorMsg.value = '';
}

function parseCsv(text: string, separator: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text.charAt(i);
    const next = i + 1 < n ? text.charAt(i + 1) : '';
    if (inQuotes) {
      if (c === '"' && next === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === separator) {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (c === '\n' || c === '\r') {
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      if (c === '\r' && next === '\n') i += 1;
      i += 1;
      continue;
    }
    cell += c;
    i += 1;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

function coerceValue(raw: string) {
  const t = String(raw).trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (/^-?\d+$/.test(t)) {
    const asInt = Number(t);
    if (String(asInt) === t && Number.isSafeInteger(asInt)) return asInt;
  }
  if (/^-?\d+\.\d+$/.test(t)) {
    const asNum = Number(t);
    if (!Number.isNaN(asNum)) return asNum;
  }
  return raw;
}

function rowsToObjects(rows: string[][], header: boolean, doCoerce: boolean) {
  if (!rows.length) return [];
  let headers: string[];
  let start = 0;
  if (header) {
    headers = rows[0].map((h, idx) => {
      const name = String(h || '').trim();
      return name || 'kolom_' + (idx + 1);
    });
    start = 1;
  } else {
    let width = 0;
    rows.forEach((r) => {
      if (r.length > width) width = r.length;
    });
    headers = [];
    for (let i = 0; i < width; i++) headers.push('kolom_' + (i + 1));
  }
  const out: Record<string, unknown>[] = [];
  for (let r = start; r < rows.length; r++) {
    const obj: Record<string, unknown> = {};
    let empty = true;
    for (let c = 0; c < headers.length; c++) {
      let val: unknown = rows[r][c] == null ? '' : rows[r][c];
      if (doCoerce && typeof val === 'string') val = coerceValue(val);
      obj[headers[c]] = val;
      if (val !== '' && val !== null) empty = false;
    }
    if (!empty) out.push(obj);
  }
  return out;
}

function csvEscape(value: unknown, separator: string) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (s.indexOf('"') !== -1 || s.indexOf(separator) !== -1 || /[\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function objectsToCsv(list: Record<string, unknown>[], separator: string) {
  const keys: string[] = [];
  const seen: Record<string, boolean> = {};
  list.forEach((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    Object.keys(item).forEach((k) => {
      if (!seen[k]) {
        seen[k] = true;
        keys.push(k);
      }
    });
  });
  if (!keys.length) throw new Error(t('csvJson.mustArray'));
  const lines = [keys.map((k) => csvEscape(k, separator)).join(separator)];
  list.forEach((item) => {
    lines.push(keys.map((k) => csvEscape(item ? item[k] : '', separator)).join(separator));
  });
  return lines.join('\n');
}

function jsonToList(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    if (!parsed.length) return [];
    if (parsed.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x))) {
      return parsed as Record<string, unknown>[];
    }
    return parsed.map((x, i) => {
      if (x !== null && typeof x === 'object' && !Array.isArray(x)) return x as Record<string, unknown>;
      return { nilai: x, indeks: i };
    });
  }
  if (parsed !== null && typeof parsed === 'object') return [parsed as Record<string, unknown>];
  throw new Error(t('csvJson.mustObjectOrArray'));
}

function csvToJson() {
  clearError();
  const rows = parseCsv(csvText.value, delim.value);
  if (!rows.length) {
    showError(t('csvJson.emptyCsv'));
    return;
  }
  const list = rowsToObjects(rows, hasHeader.value, coerce.value);
  if (!list.length) {
    showError(t('csvJson.noRows'));
    return;
  }
  jsonText.value = JSON.stringify(list, null, 2);
  status.value = { key: 'csvJson.rowsToJson', n: list.length };
  showToast(t('csvJson.csvConverted'));
}

function jsonToCsv() {
  clearError();
  const raw = jsonText.value.trim();
  if (!raw) {
    showError(t('csvJson.emptyJson'));
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    showError(t('common.jsonInvalid', { message: (err as Error).message }));
    return;
  }
  try {
    const list = jsonToList(parsed);
    if (!list.length) {
      showError(t('csvJson.emptyArray'));
      return;
    }
    csvText.value = objectsToCsv(list, delim.value);
    status.value = { key: 'csvJson.rowsToCsv', n: list.length };
    showToast(t('csvJson.jsonConverted'));
  } catch (err) {
    showError((err as Error).message || t('csvJson.csvFail'));
  }
}

function prettyJson() {
  clearError();
  const raw = jsonText.value.trim();
  if (!raw) {
    showError(t('csvJson.emptyJson'));
    return;
  }
  try {
    jsonText.value = JSON.stringify(JSON.parse(raw), null, 2);
    showToast(t('common.jsonPrettied'));
  } catch (err) {
    showError(t('common.jsonInvalid', { message: (err as Error).message }));
  }
}

function loadSample() {
  clearError();
  jsonText.value = JSON.stringify(SAMPLE_ROWS, null, 2);
  csvText.value = objectsToCsv(SAMPLE_ROWS, delim.value);
  status.value = { key: 'csvJson.sampleLoaded' };
}

function readFile(file: File | undefined, kind: 'csv' | 'json') {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    if (kind === 'csv') csvText.value = text;
    else jsonText.value = text;
    showToast(t('common.fileLoaded', { name: file.name }));
  };
  reader.onerror = () => showError(t('common.fileReadFail'));
  reader.readAsText(file);
}

async function copy(kind: 'csv' | 'json') {
  const text = kind === 'csv' ? csvText.value : jsonText.value;
  if (!text) {
    showError(t('csvJson.nothingToCopy'));
    return;
  }
  clearError();
  const ok = await copyText(text);
  showToast(ok ? (kind === 'csv' ? t('common.copiedCsv') : t('common.copiedJson')) : t('common.copyFail'));
}

function download(kind: 'csv' | 'json') {
  if (kind === 'csv') {
    if (!csvText.value) {
      showError(t('csvJson.emptyCsv'));
      return;
    }
    clearError();
    downloadFile('data.csv', csvText.value, 'text/csv;charset=utf-8');
    return;
  }
  if (!jsonText.value) {
    showError(t('csvJson.emptyJson'));
    return;
  }
  clearError();
  downloadFile('data.json', jsonText.value, 'application/json');
}

loadSample();
</script>

<template>
  <ToolLayout :title="t('tools.csvJson.title')" :description="t('csvJson.lead')">
    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('common.settings') }}</p>
      <div :class="ui.card">
        <div :class="ui.form">
          <div>
            <label :class="ui.label">{{ t('csvJson.delimiter') }}</label>
            <div :class="ui.choices">
              <button type="button" :class="cn(ui.btnGhostSm, delim === ',' && ui.btnActive)" @click="delim = ','">
                {{ t('csvJson.comma') }}
              </button>
              <button type="button" :class="cn(ui.btnGhostSm, delim === ';' && ui.btnActive)" @click="delim = ';'">
                {{ t('csvJson.semicolon') }}
              </button>
              <button type="button" :class="cn(ui.btnGhostSm, delim === '\t' && ui.btnActive)" @click="delim = '\t'">
                {{ t('csvJson.tab') }}
              </button>
            </div>
          </div>
          <div>
            <label :class="ui.label">{{ t('csvJson.options') }}</label>
            <div :class="ui.choices">
              <button type="button" :class="cn(ui.btnGhostSm, hasHeader && ui.btnActive)" @click="hasHeader = !hasHeader">
                {{ t('csvJson.headerRow') }}
              </button>
              <button type="button" :class="cn(ui.btnGhostSm, coerce && ui.btnActive)" @click="coerce = !coerce">
                {{ t('csvJson.guessTypes') }}
              </button>
            </div>
            <p :class="ui.hint">{{ t('csvJson.guessHint') }}</p>
          </div>
        </div>
      </div>
    </section>

    <div :class="ui.split">
      <section :class="[ui.card, 'reveal']">
        <div :class="[ui.rowBetween, 'mb-3']">
          <p :class="[ui.panelTitle, 'mb-0']">CSV</p>
          <button :class="ui.btnGhostSm" type="button" @click="fileCsv && pickFile(fileCsv)">{{ t('common.chooseFile') }}</button>
        </div>
        <textarea v-model="csvText" :class="[ui.textarea, ui.jsonPane]" spellcheck="false" placeholder="nama,umur,kota"></textarea>
        <input ref="fileCsv" type="file" :class="ui.srFile" accept=".csv,text/csv,text/plain" @change="readFile(($event.target as HTMLInputElement).files?.[0], 'csv')" />
      </section>
      <section :class="[ui.card, 'reveal']">
        <div :class="[ui.rowBetween, 'mb-3']">
          <p :class="[ui.panelTitle, 'mb-0']">JSON</p>
          <button :class="ui.btnGhostSm" type="button" @click="fileJson && pickFile(fileJson)">{{ t('common.chooseFile') }}</button>
        </div>
        <textarea v-model="jsonText" :class="[ui.textarea, ui.jsonPane]" spellcheck="false" placeholder='[{"nama":"Budi Santoso"}]'></textarea>
        <input ref="fileJson" type="file" :class="ui.srFile" accept=".json,application/json" @change="readFile(($event.target as HTMLInputElement).files?.[0], 'json')" />
      </section>
    </div>

    <section :class="[ui.panel, 'reveal']">
      <div :class="ui.row">
        <button :class="ui.btnPrimary" type="button" @click="csvToJson">{{ t('csvJson.csvToJson') }}</button>
        <button :class="ui.btnPrimary" type="button" @click="jsonToCsv">{{ t('csvJson.jsonToCsv') }}</button>
        <button :class="ui.btnGhost" type="button" @click="loadSample">{{ t('common.loadSample') }}</button>
        <button :class="ui.btnGhost" type="button" @click="prettyJson">{{ t('common.prettyJson') }}</button>
      </div>
      <div :class="[ui.row, 'mt-3']">
        <button :class="ui.btnGhostSm" type="button" @click="copy('csv')">{{ t('csvJson.copyCsv') }}</button>
        <button :class="ui.btnGhostSm" type="button" @click="copy('json')">{{ t('csvJson.copyJson') }}</button>
        <button :class="ui.btnGhostSm" type="button" @click="download('csv')">{{ t('csvJson.downloadCsv') }}</button>
        <button :class="ui.btnGhostSm" type="button" @click="download('json')">{{ t('csvJson.downloadJson') }}</button>
      </div>
      <div v-if="errorMsg" :class="ui.error">{{ errorMsg }}</div>
      <p :class="[ui.meta, 'mt-3.5']">{{ statusMeta }}</p>
    </section>
  </ToolLayout>
  <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
</template>
