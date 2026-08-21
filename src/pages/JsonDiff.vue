<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { isPlainObject } from '@/lib/escape';

type DiffKind = 'add' | 'del' | 'chg';
type DiffRow = { type: DiffKind; path: string; left: unknown; right: unknown };

const SAMPLE_A = {
  nama: 'Budi Santoso',
  umur: 28,
  kota: 'Jakarta',
  aktif: true,
  alamat: { jalan: 'Jl. Merdeka No. 1', kode: '10110' },
  tag: ['ops', 'backend'],
};
const SAMPLE_B = {
  nama: 'Budi Santoso',
  umur: 29,
  kota: 'Bandung',
  aktif: true,
  alamat: { jalan: 'Jl. Merdeka No. 1', kode: '40111' },
  tag: ['ops', 'backend', 'oncall'],
  email: 'budi.santoso@kontak.id',
};

const { t } = useI18n();

const jsonA = ref(JSON.stringify(SAMPLE_A, null, 2));
const jsonB = ref(JSON.stringify(SAMPLE_B, null, 2));
const errA = ref('');
const errB = ref('');
const rows = ref<DiffRow[]>([]);
const showTable = ref(false);
const phase = ref<'idle' | 'invalid' | 'same' | 'result'>('idle');
const counts = ref({ n: 0, chg: 0, add: 0, del: 0 });

const diffMeta = computed(() => {
  if (phase.value === 'invalid') return t('jsonDiff.cannotCompare');
  if (phase.value === 'same') return t('jsonDiff.noDiff');
  if (phase.value === 'result') return t('jsonDiff.summary', counts.value);
  return t('jsonDiff.fillBoth');
});

const emptyText = computed(() => {
  if (phase.value === 'invalid') return t('jsonDiff.fixInvalid');
  if (phase.value === 'same') return t('jsonDiff.same');
  return t('jsonDiff.empty');
});

function parseSideMessage(raw: string): { ok: false; message: string } | { ok: true; value: unknown } {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, message: t('jsonDiff.emptySide') };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, message: t('common.jsonInvalid', { message: (err as Error).message }) };
  }
}

function pathJoin(base: string, key: string | number) {
  if (typeof key === 'number') return (base || '$') + '[' + key + ']';
  if (/^[A-Za-z_][\w$]*$/.test(key)) return (base ? base + '.' : '') + key;
  return (base || '$') + '[' + JSON.stringify(key) + ']';
}

function shortJson(v: unknown) {
  if (v === undefined) return '—';
  try {
    const s = JSON.stringify(v);
    if (s.length > 140) return s.slice(0, 137) + '...';
    return s;
  } catch {
    return String(v);
  }
}

function walk(a: unknown, b: unknown, path: string, out: DiffRow[]) {
  if (Object.is(a, b)) return;
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a).concat(Object.keys(b).filter((k) => !Object.prototype.hasOwnProperty.call(a, k)));
    for (const k of keys) {
      const hasA = Object.prototype.hasOwnProperty.call(a, k);
      const hasB = Object.prototype.hasOwnProperty.call(b, k);
      const next = pathJoin(path, k);
      if (!hasA) out.push({ type: 'add', path: next, left: undefined, right: b[k] });
      else if (!hasB) out.push({ type: 'del', path: next, left: a[k], right: undefined });
      else walk(a[k], b[k], next, out);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const next = pathJoin(path, i);
      if (i >= a.length) out.push({ type: 'add', path: next, left: undefined, right: b[i] });
      else if (i >= b.length) out.push({ type: 'del', path: next, left: a[i], right: undefined });
      else walk(a[i], b[i], next, out);
    }
    return;
  }
  out.push({ type: 'chg', path: path || '$', left: a, right: b });
}

function typeLabel(type: DiffKind) {
  if (type === 'add') return t('jsonDiff.added');
  if (type === 'del') return t('jsonDiff.removed');
  return t('jsonDiff.changed');
}

function typeClass(type: DiffKind) {
  if (type === 'add') return 'tag green';
  if (type === 'del') return 'tag red';
  return 'tag';
}

function compare() {
  const left = parseSideMessage(jsonA.value);
  const right = parseSideMessage(jsonB.value);
  errA.value = left.ok ? '' : left.message;
  errB.value = right.ok ? '' : right.message;
  if (!left.ok || !right.ok) {
    showTable.value = false;
    phase.value = 'invalid';
    rows.value = [];
    return;
  }
  const next: DiffRow[] = [];
  walk(left.value, right.value, '', next);
  if (!next.length) {
    showTable.value = false;
    phase.value = 'same';
    rows.value = [];
    return;
  }
  let add = 0;
  let del = 0;
  let chg = 0;
  next.forEach((r) => {
    if (r.type === 'add') add++;
    else if (r.type === 'del') del++;
    else chg++;
  });
  counts.value = { n: next.length, chg, add, del };
  phase.value = 'result';
  rows.value = next;
  showTable.value = true;
}

function pretty() {
  const left = parseSideMessage(jsonA.value);
  const right = parseSideMessage(jsonB.value);
  if (left.ok) jsonA.value = JSON.stringify(left.value, null, 2);
  else errA.value = left.message;
  if (right.ok) jsonB.value = JSON.stringify(right.value, null, 2);
  else errB.value = right.message;
  compare();
}

function swap() {
  const tmp = jsonA.value;
  jsonA.value = jsonB.value;
  jsonB.value = tmp;
  compare();
}

function loadSample() {
  jsonA.value = JSON.stringify(SAMPLE_A, null, 2);
  jsonB.value = JSON.stringify(SAMPLE_B, null, 2);
  errA.value = '';
  errB.value = '';
  compare();
}

onMounted(compare);
</script>

<template>
  <ToolLayout :title="t('tools.jsonDiff.title')" :description="t('jsonDiff.lead')">
    <div class="split-grid">
      <section class="panel card reveal">
        <p class="panel-title">{{ t('jsonDiff.jsonA') }}</p>
        <textarea v-model="jsonA" spellcheck="false" class="json-pane"></textarea>
        <p class="hint">{{ errA }}</p>
      </section>
      <section class="panel card reveal">
        <p class="panel-title">{{ t('jsonDiff.jsonB') }}</p>
        <textarea v-model="jsonB" spellcheck="false" class="json-pane"></textarea>
        <p class="hint">{{ errB }}</p>
      </section>
    </div>

    <section class="panel reveal" style="margin-top: 12px">
      <div class="row">
        <button class="btn-primary" type="button" @click="compare">{{ t('jsonDiff.compare') }}</button>
        <button class="btn-ghost" type="button" @click="pretty">{{ t('common.pretty') }}</button>
        <button class="btn-ghost" type="button" @click="swap">{{ t('jsonDiff.swap') }}</button>
        <button class="btn-ghost" type="button" @click="loadSample">{{ t('common.loadSample') }}</button>
      </div>
    </section>

    <section class="panel reveal">
      <p class="panel-title">{{ t('jsonDiff.differences') }}</p>
      <div class="card">
        <p class="meta">{{ diffMeta }}</p>
        <div class="table-scroll" style="margin-top: 12px">
          <table v-if="showTable">
            <thead>
              <tr>
                <th></th>
                <th>{{ t('jsonDiff.path') }}</th>
                <th>{{ t('jsonDiff.jsonA') }}</th>
                <th>{{ t('jsonDiff.jsonB') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="i">
                <td><span :class="typeClass(r.type)">{{ typeLabel(r.type) }}</span></td>
                <td class="cell-json">{{ r.path }}</td>
                <td class="cell-json">{{ shortJson(r.left) }}</td>
                <td class="cell-json">{{ shortJson(r.right) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state" style="padding: 32px 8px">{{ emptyText }}</div>
        </div>
      </div>
    </section>
  </ToolLayout>
</template>
