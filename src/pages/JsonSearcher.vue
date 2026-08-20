<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { copyText, escapeHtml, escapeRegExp, isPlainObject } from '@/lib/escape';

type JsonObject = Record<string, unknown>;
type FilterLevel = { keys: string[]; value: string; basePath: string[] };
type TableCell = { html: string; isObj: boolean; title: string };
type TableRow = { idx: number; cells: TableCell[] };

const STORAGE_KEY = 'json-searcher:dataset';
const SAMPLE: JsonObject[] = [
  {
    id: 1,
    nama: 'Budi Santoso',
    umur: 28,
    kota: 'Jakarta',
    alamat: { jalan: 'Jl. Merdeka No. 1', provinsi: 'DKI Jakarta' },
    hobi: ['membaca', 'sepak bola'],
  },
  {
    id: 2,
    nama: 'Siti Aminah',
    umur: 34,
    kota: 'Bandung',
    alamat: { jalan: 'Jl. Asia Afrika No. 10', provinsi: 'Jawa Barat' },
    hobi: ['memasak'],
  },
  {
    id: 3,
    nama: 'Andi Wijaya',
    umur: 41,
    kota: 'Surabaya',
    alamat: { jalan: 'Jl. Pemuda No. 5', provinsi: 'Jawa Timur' },
    hobi: ['fotografi', 'traveling'],
  },
];

const dataset = ref<JsonObject[]>([]);
const pendingArray = ref<JsonObject[] | null>(null);
const filterPath = ref<string[]>([]);
const filterLevels = ref<FilterLevel[]>([]);
const jsonInput = ref('');
const searchQuery = ref('');
const errorMsg = ref('');
const showReplaceModal = ref(false);
const showClearModal = ref(false);
const showJsonModal = ref(false);
const jsonModalRaw = ref('');
const jsonModalMeta = ref('Baris #1');
const jsonModalPre = ref<HTMLElement | null>(null);

const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

function collectValues(obj: unknown, path: string[]): unknown[] {
  if (path.length === 0) return [obj];
  if (obj === undefined || obj === null) return [];
  const key = path[0];
  const rest = path.slice(1);
  if (Array.isArray(obj)) {
    let out: unknown[] = [];
    for (const item of obj) out = out.concat(collectValues(item, path));
    return out;
  }
  if (typeof obj !== 'object') return [];
  const val = (obj as JsonObject)[key];
  if (val === undefined) return [];
  if (Array.isArray(val)) {
    let out: unknown[] = [];
    for (const item of val) out = out.concat(collectValues(item, rest));
    return out;
  }
  return collectValues(val, rest);
}

function unionKeys(ds: JsonObject[], path: string[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of ds) {
    const vals = collectValues(item, path);
    for (const v of vals) {
      if (isPlainObject(v)) {
        for (const k of Object.keys(v)) {
          if (!seen.has(k)) {
            seen.add(k);
            keys.push(k);
          }
        }
      }
    }
  }
  return keys;
}

function keyKind(ds: JsonObject[], path: string[], key: string): 'nested' | 'leaf' {
  const fullPath = path.concat([key]);
  for (const item of ds) {
    const vals = collectValues(item, fullPath);
    for (const v of vals) {
      if (isPlainObject(v)) return 'nested';
    }
  }
  return 'leaf';
}

function showError(msg: string) {
  errorMsg.value = msg;
}

function clearError() {
  errorMsg.value = '';
}

function saveCache() {
  try {
    if (dataset.value.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset.value));
  } catch (e) {
    const err = e as { name?: string; code?: number };
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      showToast('Data terlalu besar untuk disimpan di browser.');
    }
  }
}

function loadCache(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((x) => !isPlainObject(x))) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    dataset.value = parsed;
    return parsed.length > 0;
  } catch {
    return false;
  }
}

function scanJsonValue(str: string, start: number): { value: unknown; end: number } | null {
  let i = start;
  const n = str.length;
  while (i < n && /[\s,]/.test(str[i])) i++;
  if (i >= n) return null;
  const first = str[i];
  if (first !== '{' && first !== '[') {
    throw new SyntaxError('Expected { or [ at position ' + i);
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let j = i; j < n; j++) {
    const ch = str[j];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        return { value: JSON.parse(str.slice(i, j + 1)), end: j + 1 };
      }
    }
  }
  throw new SyntaxError('JSON tidak lengkap.');
}

function parseConcatenated(raw: string): JsonObject[] | null {
  const values: unknown[] = [];
  let i = 0;
  while (i < raw.length) {
    while (i < raw.length && /[\s,]/.test(raw[i])) i++;
    if (i >= raw.length) break;
    const scanned = scanJsonValue(raw, i);
    if (!scanned) break;
    values.push(scanned.value);
    i = scanned.end;
  }
  if (!values.length) return null;
  const objects: JsonObject[] = [];
  for (let k = 0; k < values.length; k++) {
    const item = values[k];
    if (isPlainObject(item)) objects.push(item);
    else if (Array.isArray(item) && item.every(isPlainObject)) objects.push.apply(objects, item);
    else return null;
  }
  return objects;
}

function parseJsonInput(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (firstErr) {
    const candidates = [raw, raw.replace(/,\s*$/, '')];
    for (const candidate of candidates) {
      try {
        return JSON.parse('[' + candidate + ']');
      } catch {
        /* try next */
      }
    }
    try {
      const many = parseConcatenated(raw);
      if (many && many.length) return many;
    } catch {
      /* fall through */
    }
    throw firstErr;
  }
}

function rebuildFilterChain() {
  filterPath.value = [];
  if (dataset.value.length === 0) {
    filterLevels.value = [];
    return;
  }
  const keys = unionKeys(dataset.value, []);
  if (keys.length === 0) {
    filterLevels.value = [];
    return;
  }
  filterLevels.value = [{ keys, value: '__STOP__', basePath: [] }];
}

function afterDataChange() {
  saveCache();
  rebuildFilterChain();
}

function handleLoad() {
  clearError();
  const raw = jsonInput.value.trim();
  if (!raw) {
    showError('Masukkan JSON terlebih dahulu.');
    return;
  }
  let parsed: unknown;
  try {
    parsed = parseJsonInput(raw);
  } catch (e) {
    showError('JSON tidak valid: ' + (e as Error).message);
    return;
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      showError('Array kosong, tidak ada data untuk dimuat.');
      return;
    }
    if (!parsed.every(isPlainObject)) {
      showError('Array harus berisi Object di setiap elemennya.');
      return;
    }
    if (dataset.value.length === 0) {
      dataset.value = parsed;
      afterDataChange();
      jsonInput.value = '';
      showToast('Data dimuat (' + parsed.length + ' baris).');
    } else {
      pendingArray.value = parsed;
      showReplaceModal.value = true;
    }
  } else if (isPlainObject(parsed)) {
    dataset.value.push(parsed);
    afterDataChange();
    jsonInput.value = '';
    showToast('Object ditambahkan ke data.');
  } else {
    showError('JSON harus berupa Object, Array of Object, Object dipisah koma, atau satu Object per baris.');
  }
}

function cancelReplace() {
  pendingArray.value = null;
  showReplaceModal.value = false;
}

function confirmReplace() {
  if (!pendingArray.value) return;
  dataset.value = pendingArray.value;
  pendingArray.value = null;
  showReplaceModal.value = false;
  jsonInput.value = '';
  afterDataChange();
  showToast('Data lama diganti dengan data baru.');
}

function confirmMerge() {
  if (!pendingArray.value) return;
  dataset.value = dataset.value.concat(pendingArray.value);
  pendingArray.value = null;
  showReplaceModal.value = false;
  jsonInput.value = '';
  afterDataChange();
  showToast('Data baru digabung dengan data lama.');
}

function requestClear() {
  if (dataset.value.length === 0) {
    showToast('Tidak ada data untuk dihapus.');
    return;
  }
  showClearModal.value = true;
}

function cancelClear() {
  showClearModal.value = false;
}

function confirmClear() {
  dataset.value = [];
  showClearModal.value = false;
  afterDataChange();
  showToast('Semua data dihapus.');
}

function loadSample() {
  jsonInput.value = JSON.stringify(SAMPLE, null, 2);
}

function onFilterChange(level: number, value: string) {
  const current = filterLevels.value[level];
  if (!current) return;
  const basePath = current.basePath;
  const nextLevels = filterLevels.value.slice(0, level).concat([{ ...current, value }]);
  if (value === '__STOP__') {
    filterPath.value = [...basePath];
    filterLevels.value = nextLevels;
    return;
  }
  const newPath = basePath.concat([value]);
  filterPath.value = newPath;
  if (keyKind(dataset.value, basePath, value) === 'nested') {
    const keys = unionKeys(dataset.value, newPath);
    if (keys.length > 0) {
      nextLevels.push({ keys, value: '__STOP__', basePath: newPath });
    }
  }
  filterLevels.value = nextLevels;
}

function highlight(escapedText: string, query: string) {
  if (!query) return escapedText;
  const re = new RegExp(escapeRegExp(escapeHtml(query)), 'gi');
  return escapedText.replace(re, (m) => '<mark>' + m + '</mark>');
}

function valueToText(v: unknown) {
  if (v === undefined) return '';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function rowMatches(item: JsonObject, query: string) {
  if (!query) return true;
  const values = collectValues(item, filterPath.value);
  const haystack = (
    filterPath.value.length === 0 && values.length === 1
      ? JSON.stringify(values[0])
      : values.map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))).join(' ')
  ).toLowerCase();
  return haystack.includes(query.toLowerCase());
}

const tableView = computed(() => {
  const query = searchQuery.value.trim();
  const columns = unionKeys(dataset.value, []);
  if (dataset.value.length === 0) {
    return {
      empty: true,
      emptyText: 'Belum ada data. Paste JSON di atas untuk mulai.',
      matched: 0,
      total: 0,
      columns,
      rows: [] as TableRow[],
    };
  }
  const rows: TableRow[] = [];
  dataset.value.forEach((item, idx) => {
    if (!rowMatches(item, query)) return;
    const cells: TableCell[] = columns.map((col) => {
      const raw = item[col];
      const isObj = raw !== null && typeof raw === 'object';
      const text = valueToText(raw);
      const escaped = escapeHtml(text);
      return {
        html: query ? highlight(escaped, query) : escaped,
        isObj,
        title: text,
      };
    });
    rows.push({ idx, cells });
  });
  return {
    empty: rows.length === 0,
    emptyText: rows.length === 0 ? 'Tidak ada baris yang cocok dengan pencarian.' : '',
    matched: rows.length,
    total: dataset.value.length,
    columns,
    rows,
  };
});

const jsonModalHtml = computed(() => {
  const query = searchQuery.value.trim();
  const escaped = escapeHtml(jsonModalRaw.value);
  return query ? highlight(escaped, query) : escaped;
});

function openJsonModal(idx: number) {
  const item = dataset.value[idx];
  if (!item) return;
  jsonModalRaw.value = JSON.stringify(item, null, 2);
  jsonModalMeta.value = 'Baris #' + (idx + 1);
  showJsonModal.value = true;
}

function closeJsonModal() {
  showJsonModal.value = false;
}

function onJsonOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) closeJsonModal();
}

async function copyJson() {
  if (!jsonModalRaw.value) return;
  const ok = await copyText(jsonModalRaw.value);
  showToast(ok ? 'JSON disalin ke clipboard.' : 'Gagal menyalin JSON.');
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showJsonModal.value) closeJsonModal();
}

watch([searchQuery, showJsonModal, jsonModalRaw], () => {
  if (!showJsonModal.value) return;
  nextTick(() => {
    jsonModalPre.value?.querySelector('mark')?.scrollIntoView({ block: 'nearest' });
  });
});

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});

const restored = loadCache();
afterDataChange();
if (restored) {
  showToast('Data sebelumnya dipulihkan (' + dataset.value.length + ' baris).');
}
</script>

<template>
  <ToolLayout
    title="JSON Searcher"
    description="Paste JSON (Object, Array of Object, beberapa Object dipisah koma, atau satu Object per baris), cari, filter, dan lihat hasilnya dalam tabel."
  >
    <section class="panel reveal">
      <p class="panel-title">Input JSON</p>
      <div class="card">
        <textarea
          v-model="jsonInput"
          placeholder='Paste JSON di sini. Contoh: [{"nama":"Budi"}] atau {"nama":"Budi"} atau {"nama":"Budi"}{"nama":"Siti"}'
        ></textarea>
        <div class="row between">
          <div class="row">
            <button class="btn-primary" type="button" @click="handleLoad">Proses JSON</button>
            <button class="btn-ghost" type="button" @click="loadSample">Muat Contoh</button>
          </div>
          <div class="row">
            <span class="meta"><b>{{ dataset.length }}</b> baris data tersimpan</span>
            <button class="btn-danger btn-sm" type="button" @click="requestClear">Hapus Semua Data</button>
          </div>
        </div>
        <div class="error-box" :style="{ display: errorMsg ? 'block' : 'none' }">{{ errorMsg }}</div>
      </div>
    </section>

    <section class="panel reveal">
      <p class="panel-title">Pencarian &amp; Filter</p>
      <div class="card">
        <div class="row" style="margin-bottom: 10px">
          <input v-model="searchQuery" type="text" class="search-input" placeholder="Ketik untuk mencari..." />
          <span class="count-badge">{{ tableView.matched }} / {{ tableView.total }} baris cocok</span>
        </div>
        <div class="row">
          <span class="meta" style="margin-right: 2px">Cari dalam field:</span>
          <div id="filterChain">
            <template v-for="(level, i) in filterLevels" :key="i">
              <span v-if="i > 0" class="filter-arrow">›</span>
              <select
                class="filter-select"
                :value="level.value"
                @change="onFilterChange(i, ($event.target as HTMLSelectElement).value)"
              >
                <option value="__STOP__">{{ i === 0 ? 'Semua Field' : '— cari semua di sini —' }}</option>
                <option v-for="k in level.keys" :key="k" :value="k">{{ k }}</option>
              </select>
            </template>
          </div>
        </div>
      </div>
    </section>

    <div class="table-scroll reveal">
      <table v-if="!tableView.empty">
        <thead>
          <tr>
            <th>#</th>
            <th v-for="col in tableView.columns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in tableView.rows"
            :key="row.idx"
            title="Klik untuk lihat JSON lengkap"
            @click="openJsonModal(row.idx)"
          >
            <td class="idx-col">{{ row.idx + 1 }}</td>
            <td
              v-for="(cell, ci) in row.cells"
              :key="ci"
              :class="cell.isObj ? 'cell-json' : 'cell-value'"
              :title="cell.isObj ? undefined : cell.title"
              v-html="cell.html"
            ></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">{{ tableView.emptyText }}</div>
    </div>

    <template #extras>
      <div class="modal-overlay" :class="{ show: showReplaceModal }">
        <div class="modal-box">
          <h3>Data sudah ada</h3>
          <p>
            Kamu sudah punya data yang tersimpan. Array JSON baru ini mau di-<b>replace</b> (ganti semua) atau
            di-<b>merge</b> (gabung dengan data lama)?
          </p>
          <div class="modal-actions">
            <button class="btn-ghost btn-sm" type="button" @click="cancelReplace">Batal</button>
            <button class="btn-danger btn-sm" type="button" @click="confirmReplace">Replace</button>
            <button class="btn-primary btn-sm" type="button" @click="confirmMerge">Merge</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" :class="{ show: showClearModal }">
        <div class="modal-box">
          <h3>Hapus semua data?</h3>
          <p>Semua baris data yang tersimpan akan dihapus dan tidak bisa dikembalikan.</p>
          <div class="modal-actions">
            <button class="btn-ghost btn-sm" type="button" @click="cancelClear">Batal</button>
            <button class="btn-danger btn-sm" type="button" @click="confirmClear">Hapus Semua</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" :class="{ show: showJsonModal }" @click="onJsonOverlayClick">
        <div class="modal-box modal-json">
          <h3>Detail JSON</h3>
          <p>{{ jsonModalMeta }}</p>
          <pre ref="jsonModalPre" class="modal-json-pre" v-html="jsonModalHtml"></pre>
          <div class="modal-actions">
            <button class="btn-ghost btn-sm" type="button" @click="copyJson">Salin</button>
            <button class="btn-primary btn-sm" type="button" @click="closeJsonModal">Tutup</button>
          </div>
        </div>
      </div>

      <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
