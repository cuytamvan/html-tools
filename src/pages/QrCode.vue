<script setup lang="ts">
import QRCode from 'qrcode';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { downloadFile } from '@/lib/escape';

type EccLevel = 'L' | 'M' | 'Q' | 'H';

const SAMPLE = 'https://github.com/cuytamvan/html-tools';
const ECC_LEVELS: EccLevel[] = ['L', 'M', 'Q', 'H'];
const SIZES = [256, 384, 512];
const MARGINS = [1, 2, 4];

const { t } = useI18n();
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const text = ref(SAMPLE);
const ecc = ref<EccLevel>('M');
const size = ref(384);
const margin = ref(2);
const dataUrl = ref('');
const svgMarkup = ref('');
const errorMsg = ref('');

const qrOptions = () => ({
  errorCorrectionLevel: ecc.value,
  margin: margin.value,
  width: size.value,
  color: { dark: '#111111', light: '#ffffff' },
});

async function generate() {
  const raw = text.value.trim();
  if (!raw) {
    dataUrl.value = '';
    svgMarkup.value = '';
    errorMsg.value = '';
    return;
  }
  try {
    const opts = qrOptions();
    dataUrl.value = await QRCode.toDataURL(raw, opts);
    svgMarkup.value = await QRCode.toString(raw, { ...opts, type: 'svg' });
    errorMsg.value = '';
  } catch (err) {
    dataUrl.value = '';
    svgMarkup.value = '';
    errorMsg.value = (err as Error).message || t('qrCode.fail');
  }
}

watch([text, ecc, size, margin], generate, { immediate: true });

function loadSample() {
  text.value = SAMPLE;
  showToast(t('common.sampleLoaded'));
}

function downloadPng() {
  if (!dataUrl.value) return;
  const a = document.createElement('a');
  a.href = dataUrl.value;
  a.download = 'qrcode.png';
  a.click();
}

function downloadSvg() {
  if (!svgMarkup.value) return;
  downloadFile('qrcode.svg', svgMarkup.value, 'image/svg+xml');
}

async function copyPng() {
  if (!dataUrl.value) return;
  try {
    const blob = await (await fetch(dataUrl.value)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    showToast(t('qrCode.copied'));
  } catch {
    showToast(t('common.copyFail'));
  }
}
</script>

<template>
  <ToolLayout :title="t('tools.qrCode.title')" :description="t('qrCode.lead')">
    <div class="split-grid">
      <section class="panel reveal">
        <p class="panel-title">{{ t('common.input') }}</p>
        <div class="card">
          <div class="field">
            <label for="qrText">{{ t('qrCode.content') }}</label>
            <textarea
              id="qrText"
              v-model="text"
              class="json-pane"
              spellcheck="false"
              :placeholder="t('qrCode.placeholder')"
            ></textarea>
            <p class="hint">{{ t('qrCode.contentHint') }}</p>
          </div>
          <div class="form-grid cols-2" style="margin-top: 20px">
            <div class="field">
              <label>{{ t('qrCode.ecc') }}</label>
              <div class="choice-group">
                <button
                  v-for="level in ECC_LEVELS"
                  :key="level"
                  type="button"
                  class="btn-ghost btn-sm"
                  :class="{ 'is-active': ecc === level }"
                  @click="ecc = level"
                >
                  {{ level }}
                </button>
              </div>
              <p class="hint">{{ t('qrCode.eccHint') }}</p>
            </div>
            <div class="field">
              <label>{{ t('qrCode.size') }}</label>
              <div class="choice-group">
                <button
                  v-for="px in SIZES"
                  :key="px"
                  type="button"
                  class="btn-ghost btn-sm"
                  :class="{ 'is-active': size === px }"
                  @click="size = px"
                >
                  {{ px }}
                </button>
              </div>
              <p class="hint">{{ t('qrCode.sizeHint') }}</p>
            </div>
            <div class="field field-full">
              <label>{{ t('qrCode.margin') }}</label>
              <div class="choice-group">
                <button
                  v-for="m in MARGINS"
                  :key="m"
                  type="button"
                  class="btn-ghost btn-sm"
                  :class="{ 'is-active': margin === m }"
                  @click="margin = m"
                >
                  {{ m }}
                </button>
              </div>
              <p class="hint">{{ t('qrCode.marginHint') }}</p>
            </div>
          </div>
          <div class="row" style="margin-top: 16px">
            <button class="btn-ghost" type="button" @click="loadSample">{{ t('common.loadSample') }}</button>
          </div>
        </div>
      </section>

      <section class="panel reveal">
        <p class="panel-title">{{ t('common.result') }}</p>
        <div class="card">
          <div class="qr-frame">
            <img v-if="dataUrl" :src="dataUrl" :alt="t('tools.qrCode.title')" width="240" height="240" />
            <p v-else class="meta">{{ errorMsg || t('qrCode.empty') }}</p>
          </div>
          <p class="meta" style="margin-top: 14px">{{ t('qrCode.chars', { n: text.trim().length }) }}</p>
          <div class="error-box" :style="{ display: errorMsg ? 'block' : 'none' }">{{ errorMsg }}</div>
          <div class="row" style="margin-top: 16px">
            <button class="btn-primary" type="button" :disabled="!dataUrl" @click="downloadPng">
              {{ t('qrCode.downloadPng') }}
            </button>
            <button class="btn-ghost" type="button" :disabled="!dataUrl" @click="downloadSvg">
              {{ t('qrCode.downloadSvg') }}
            </button>
            <button class="btn-ghost" type="button" :disabled="!dataUrl" @click="copyPng">
              {{ t('qrCode.copyImage') }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <template #extras>
      <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
