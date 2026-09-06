<script setup lang="ts">
import { computed, ref } from 'vue';

import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/i18n';
import { copyText } from '@/lib/escape';
import { generateTraefikLabels } from '@/lib/traefikLabels';
import { ui } from '@/lib/ui';

const SAMPLE = {
  domain: 'app.example.com',
  http: true,
  https: true,
  certResolver: 'letsencrypt',
  port: '8080',
};

const { t } = useI18n();
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const domain = ref('');
const http = ref(false);
const https = ref(true);
const certResolver = ref('letsencrypt');
const port = ref('');
const outputMode = ref<'labels' | 'compose'>('compose');

const result = computed(() =>
  generateTraefikLabels({
    domain: domain.value,
    http: http.value,
    https: https.value,
    certResolver: certResolver.value,
    port: port.value,
  }),
);

const output = computed(() => {
  if (!result.value.ok) return '';
  return outputMode.value === 'labels' ? result.value.labels : result.value.compose;
});

const hintKey = computed(() => {
  if (result.value.ok) return '';
  if (result.value.error === 'domain') return 'traefikLabels.needDomain';
  if (result.value.error === 'entrypoint') return 'traefikLabels.needEntrypoint';
  if (result.value.error === 'port') return 'traefikLabels.badPort';
  return 'traefikLabels.empty';
});

function loadSample() {
  domain.value = SAMPLE.domain;
  http.value = SAMPLE.http;
  https.value = SAMPLE.https;
  certResolver.value = SAMPLE.certResolver;
  port.value = SAMPLE.port;
}

function clearForm() {
  domain.value = '';
  http.value = false;
  https.value = true;
  certResolver.value = 'letsencrypt';
  port.value = '';
}

async function copyOutput() {
  if (!output.value) return;
  const ok = await copyText(output.value);
  showToast(ok ? t('traefikLabels.copied') : t('common.copyFail'));
}
</script>

<template>
  <ToolLayout :title="t('tools.traefikLabels.title')" :description="t('traefikLabels.lead')">
    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('traefikLabels.input') }}</p>
      <div :class="ui.card">
        <div :class="ui.form">
          <div :class="ui.fieldFull">
            <label :class="ui.label" for="traefik-domain">{{ t('traefikLabels.domain') }}</label>
            <input
              id="traefik-domain"
              v-model="domain"
              type="text"
              :class="[ui.input, ui.inputMono]"
              :placeholder="t('traefikLabels.domainPlaceholder')"
              spellcheck="false"
              autocomplete="off"
            />
          </div>

          <div :class="ui.fieldFull">
            <span :class="ui.label">{{ t('traefikLabels.entrypoints') }}</span>
            <div :class="[ui.row, 'mt-1']">
              <label class="traefik-check">
                <input v-model="http" type="checkbox" />
                <span>HTTP</span>
              </label>
              <label class="traefik-check">
                <input v-model="https" type="checkbox" />
                <span>HTTPS</span>
              </label>
            </div>
            <p :class="ui.hint">{{ t('traefikLabels.entrypointsHint') }}</p>
          </div>

          <div v-if="https">
            <label :class="ui.label" for="traefik-resolver">{{ t('traefikLabels.certResolver') }}</label>
            <input
              id="traefik-resolver"
              v-model="certResolver"
              type="text"
              :class="[ui.input, ui.inputMono]"
              :placeholder="t('traefikLabels.certResolverPlaceholder')"
              spellcheck="false"
              autocomplete="off"
            />
          </div>

          <div>
            <label :class="ui.label" for="traefik-port">{{ t('traefikLabels.port') }}</label>
            <input
              id="traefik-port"
              v-model="port"
              type="text"
              inputmode="numeric"
              :class="[ui.input, ui.inputMono]"
              :placeholder="t('traefikLabels.portPlaceholder')"
              spellcheck="false"
              autocomplete="off"
            />
            <p :class="ui.hint">{{ t('traefikLabels.portHint') }}</p>
          </div>
        </div>

        <div :class="[ui.row, 'mt-5']">
          <button :class="ui.btnGhostSm" type="button" @click="loadSample">{{ t('common.loadSample') }}</button>
          <button :class="ui.btnGhostSm" type="button" @click="clearForm">{{ t('traefikLabels.clear') }}</button>
        </div>
      </div>
    </section>

    <section :class="[ui.panel, 'reveal']">
      <div :class="ui.rowBetween">
        <p :class="[ui.panelTitle, 'mb-0']">{{ t('traefikLabels.output') }}</p>
        <div :class="ui.choices">
          <button
            type="button"
            :class="outputMode === 'compose' ? ui.btnActive : ui.btnGhostSm"
            @click="outputMode = 'compose'"
          >
            {{ t('traefikLabels.modeCompose') }}
          </button>
          <button
            type="button"
            :class="outputMode === 'labels' ? ui.btnActive : ui.btnGhostSm"
            @click="outputMode = 'labels'"
          >
            {{ t('traefikLabels.modeLabels') }}
          </button>
        </div>
      </div>

      <div :class="ui.codeWrap">
        <div :class="ui.codeToolbar">
          <span :class="ui.filename">docker-compose.yml</span>
          <button :class="ui.btnGhostSm" type="button" :disabled="!output" @click="copyOutput">
            {{ t('common.copy') }}
          </button>
        </div>
        <pre v-if="output" :class="ui.codeBlock">{{ output }}</pre>
        <div v-else :class="ui.empty">{{ t(hintKey) }}</div>
      </div>

      <p v-if="result.ok" :class="ui.note">
        {{ t('traefikLabels.routerNote', { name: result.routerName }) }}
      </p>
    </section>

    <template #extras>
      <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.traefik-check {
  display: inline-flex;
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-ink);
}
.traefik-check input {
  width: 0.9375rem;
  height: 0.9375rem;
  accent-color: var(--color-ink);
}
</style>
