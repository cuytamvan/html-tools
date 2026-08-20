<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { copyText } from '@/lib/escape';
import { highlightUA, pair, parseUA, SAMPLE_UA, typeClass, typeLabel } from '@/lib/parseUa';

type UaBrand = { brand: string; version: string };
type HighEntropyValues = {
  platform?: string;
  platformVersion?: string;
  model?: string;
  architecture?: string;
  bitness?: string;
  fullVersionList?: UaBrand[];
};
type NavigatorUAData = {
  getHighEntropyValues: (hints: string[]) => Promise<HighEntropyValues>;
};
type NavigatorWithHints = Navigator & {
  userAgentData?: NavigatorUAData;
  deviceMemory?: number;
};

type HintRow = { label: string; value: string };

const uaInput = ref(navigator.userAgent || SAMPLE_UA);
const hintsVisible = ref(false);
const hintRows = ref<HintRow[]>([]);
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const info = computed(() => parseUA(uaInput.value));
const lastParsed = computed(() => ({ ua: uaInput.value, parsed: info.value }));
const highlightHtml = computed(() => highlightUA(uaInput.value, info.value));
const deviceText = computed(() => {
  const bits = [info.value.device.vendor, info.value.device.model].filter(Boolean);
  return bits.length ? bits.join(' · ') : '—';
});

function hintValue(value: unknown) {
  if (value == null || value === '') return '—';
  return String(value);
}

function showLocalHints(extra: HighEntropyValues | null) {
  const nav = navigator as NavigatorWithHints;
  const rows: HintRow[] = [];
  rows.push({ label: 'Bahasa', value: hintValue(nav.language) });
  rows.push({ label: 'Platform', value: hintValue(nav.platform) });
  rows.push({ label: 'Online', value: nav.onLine ? 'Ya' : 'Tidak' });
  if (nav.hardwareConcurrency) rows.push({ label: 'CPU (inti)', value: hintValue(nav.hardwareConcurrency) });
  if (nav.deviceMemory) rows.push({ label: 'Memori (GB)', value: hintValue(nav.deviceMemory) });
  if (nav.maxTouchPoints) rows.push({ label: 'Titik sentuh', value: hintValue(nav.maxTouchPoints) });
  if (extra) {
    if (extra.platform) rows.push({ label: 'UA-CH platform', value: extra.platform });
    if (extra.platformVersion) rows.push({ label: 'UA-CH versi OS', value: extra.platformVersion });
    if (extra.model) rows.push({ label: 'UA-CH model', value: extra.model });
    if (extra.architecture) rows.push({ label: 'UA-CH arsitektur', value: extra.architecture });
    if (extra.bitness) rows.push({ label: 'UA-CH bit', value: extra.bitness });
    if (extra.fullVersionList && extra.fullVersionList.length) {
      rows.push({
        label: 'UA-CH brands',
        value: extra.fullVersionList.map((b) => b.brand + ' ' + b.version).join(' · '),
      });
    }
  }
  hintRows.value = rows;
  hintsVisible.value = true;
}

function hideHints() {
  hintsVisible.value = false;
  hintRows.value = [];
}

function applyCurrent(silent: boolean) {
  uaInput.value = navigator.userAgent || SAMPLE_UA;
  const uaData = (navigator as NavigatorWithHints).userAgentData;
  if (uaData && uaData.getHighEntropyValues) {
    uaData
      .getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList', 'platform'])
      .then((hints) => {
        showLocalHints(hints);
      })
      .catch(() => {
        showLocalHints(null);
      });
  } else {
    showLocalHints(null);
  }
  if (!silent) showToast('User-Agent browser ini dipakai.');
}

async function copyJson() {
  const ok = await copyText(JSON.stringify(lastParsed.value, null, 2));
  showToast(ok ? 'JSON disalin.' : 'Gagal menyalin.');
}

function loadSample() {
  uaInput.value = SAMPLE_UA;
  hideHints();
  showToast('Contoh dimuat.');
}

onMounted(() => applyCurrent(true));
</script>

<template>
  <ToolLayout
    title="User Agent Parser"
    description="Urai string User-Agent menjadi peramban, mesin, sistem operasi, dan tipe perangkat."
  >
    <section class="panel reveal">
      <p class="panel-title">User-Agent</p>
      <div class="card">
        <textarea v-model="uaInput" spellcheck="false" placeholder="Mozilla/5.0 ..." @input="hideHints"></textarea>
        <div class="row" style="margin-top: 14px">
          <button class="btn-primary" type="button" @click="applyCurrent(false)">Pakai browser ini</button>
          <button class="btn-ghost" type="button" @click="loadSample">Muat contoh</button>
          <button class="btn-ghost" type="button" @click="copyJson">Salin JSON</button>
        </div>
        <p class="hint" style="margin-top: 12px">
          Tempel UA dari log atau header <span class="mono">User-Agent</span>. Hasil diurai di klien, tidak dikirim ke
          server.
        </p>
      </div>
    </section>

    <section class="panel reveal">
      <p class="panel-title">Hasil</p>
      <div class="card">
        <div class="row" style="margin-bottom: 16px">
          <span :class="typeClass(info.device.type)">{{ typeLabel(info.device.type) }}</span>
        </div>
        <div class="result-list">
          <div class="result-row">
            <span class="label">Peramban</span>
            <span class="value">{{ pair(info.browser.name, info.browser.version) }}</span>
          </div>
          <div class="result-row">
            <span class="label">Mesin</span>
            <span class="value">{{ pair(info.engine.name, info.engine.version) }}</span>
          </div>
          <div class="result-row">
            <span class="label">Sistem operasi</span>
            <span class="value">{{ pair(info.os.name, info.os.version) }}</span>
          </div>
          <div class="result-row">
            <span class="label">Perangkat</span>
            <span class="value">{{ deviceText }}</span>
          </div>
          <div class="result-row">
            <span class="label">Tipe</span>
            <span class="value">{{ typeLabel(info.device.type) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="panel reveal">
      <p class="panel-title">String</p>
      <div class="card">
        <pre class="regex-preview" v-html="highlightHtml"></pre>
      </div>
    </section>

    <section class="panel reveal" :hidden="!hintsVisible">
      <p class="panel-title">Client hints</p>
      <div class="card">
        <p class="meta">Data tambahan dari browser ini.</p>
        <div class="result-list">
          <div v-for="row in hintRows" :key="row.label" class="result-row">
            <span class="label">{{ row.label }}</span>
            <span class="value">{{ row.value }}</span>
          </div>
        </div>
      </div>
    </section>

    <template #extras>
      <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
