<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { copyText } from '@/lib/escape';
import { highlightUA, pair, parseUA, SAMPLE_UA, typeClass } from '@/lib/parseUa';
import { ui } from '@/lib/ui';

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

const { t } = useI18n();
const uaInput = ref(navigator.userAgent || SAMPLE_UA);
const hintsVisible = ref(false);
const hintRows = ref<HintRow[]>([]);
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const info = computed(() => parseUA(uaInput.value));
const lastParsed = computed(() => ({ ua: uaInput.value, parsed: info.value }));
const highlightHtml = computed(() => {
  if (!uaInput.value) return '<span class="meta">' + t('ua.pasteToParse') + '</span>';
  return highlightUA(uaInput.value, info.value);
});
function deviceTypeLabel(type: string) {
  if (type === 'phone' || type === 'tablet' || type === 'bot') return t(`ua.types.${type}`);
  return t('ua.types.desktop');
}
function displayPair(name: string, version: string) {
  return pair(name || t('common.unknown'), version);
}
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
  rows.push({ label: t('ua.language'), value: hintValue(nav.language) });
  rows.push({ label: t('ua.platform'), value: hintValue(nav.platform) });
  rows.push({ label: t('ua.online'), value: nav.onLine ? t('common.yes') : t('common.no') });
  if (nav.hardwareConcurrency) rows.push({ label: t('ua.cpu'), value: hintValue(nav.hardwareConcurrency) });
  if (nav.deviceMemory) rows.push({ label: t('ua.memory'), value: hintValue(nav.deviceMemory) });
  if (nav.maxTouchPoints) rows.push({ label: t('ua.touch'), value: hintValue(nav.maxTouchPoints) });
  if (extra) {
    if (extra.platform) rows.push({ label: t('ua.chPlatform'), value: extra.platform });
    if (extra.platformVersion) rows.push({ label: t('ua.chOs'), value: extra.platformVersion });
    if (extra.model) rows.push({ label: t('ua.chModel'), value: extra.model });
    if (extra.architecture) rows.push({ label: t('ua.chArch'), value: extra.architecture });
    if (extra.bitness) rows.push({ label: t('ua.chBit'), value: extra.bitness });
    if (extra.fullVersionList && extra.fullVersionList.length) {
      rows.push({
        label: t('ua.chBrands'),
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
  if (!silent) showToast(t('ua.usedThis'));
}

async function copyJson() {
  const ok = await copyText(JSON.stringify(lastParsed.value, null, 2));
  showToast(ok ? t('common.copiedJson') : t('common.copyFail'));
}

function loadSample() {
  uaInput.value = SAMPLE_UA;
  hideHints();
  showToast(t('common.sampleLoaded'));
}

onMounted(() => applyCurrent(true));
</script>

<template>
  <ToolLayout :title="t('tools.userAgent.title')" :description="t('ua.lead')">
    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">User-Agent</p>
      <div :class="ui.card">
        <textarea v-model="uaInput" spellcheck="false" placeholder="Mozilla/5.0 ..." :class="ui.textarea" @input="hideHints"></textarea>
        <div :class="[ui.row, 'mt-3.5']">
          <button :class="ui.btnPrimary" type="button" @click="applyCurrent(false)">{{ t('ua.useThis') }}</button>
          <button :class="ui.btnGhost" type="button" @click="loadSample">{{ t('common.loadSample') }}</button>
          <button :class="ui.btnGhost" type="button" @click="copyJson">{{ t('ua.copyJson') }}</button>
        </div>
        <p :class="[ui.hint, 'mt-3']">
          <i18n-t scope="global" keypath="ua.hint" tag="span">
            <template #header><span class="font-mono">User-Agent</span></template>
          </i18n-t>
        </p>
      </div>
    </section>

    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('common.result') }}</p>
      <div :class="ui.card">
        <div :class="[ui.row, 'mb-4']">
          <span :class="typeClass(info.device.type)">{{ deviceTypeLabel(info.device.type) }}</span>
        </div>
        <div :class="ui.resultList">
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('ua.browser') }}</span>
            <span :class="ui.resultValue">{{ displayPair(info.browser.name, info.browser.version) }}</span>
          </div>
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('ua.engine') }}</span>
            <span :class="ui.resultValue">{{ displayPair(info.engine.name, info.engine.version) }}</span>
          </div>
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('ua.os') }}</span>
            <span :class="ui.resultValue">{{ displayPair(info.os.name, info.os.version) }}</span>
          </div>
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('ua.device') }}</span>
            <span :class="ui.resultValue">{{ deviceText }}</span>
          </div>
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('ua.type') }}</span>
            <span :class="ui.resultValue">{{ deviceTypeLabel(info.device.type) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('ua.string') }}</p>
      <div :class="ui.card">
        <pre :class="ui.regexPreview" v-html="highlightHtml"></pre>
      </div>
    </section>

    <section v-show="hintsVisible" :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('ua.hints') }}</p>
      <div :class="ui.card">
        <p :class="ui.meta">{{ t('ua.hintsMeta') }}</p>
        <div :class="ui.resultList">
          <div v-for="row in hintRows" :key="row.label" :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ row.label }}</span>
            <span :class="ui.resultValue">{{ row.value }}</span>
          </div>
        </div>
      </div>
    </section>

    <template #extras>
      <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
