<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { copyText } from '@/lib/escape';
import { DEFAULT_ALPHABET, Hashids, type HashidsNumber } from '@/lib/hashids';

const { t } = useI18n();
const salt = ref('');
const minLength = ref('6');
const alphabet = ref(DEFAULT_ALPHABET);
const numbersInput = ref('');
const hashInput = ref('');

const encodeCopyNote = ref('');
const decodeCopyNote = ref('');

watch([numbersInput, salt, minLength, alphabet], () => {
  encodeCopyNote.value = '';
});

watch([hashInput, salt, minLength, alphabet], () => {
  decodeCopyNote.value = '';
});

function stringifyNumber(n: HashidsNumber) {
  return typeof n === 'bigint' ? n.toString() : String(n);
}

function createHashids() {
  const parsedMin = parseInt(minLength.value, 10);
  const alpha = alphabet.value.trim() || DEFAULT_ALPHABET;
  return new Hashids(salt.value, Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 0, alpha);
}

function parseNumbers(raw: string): { empty?: boolean; error?: string; numbers: HashidsNumber[] } {
  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0) return { empty: true, numbers: [] };
  const numbers: HashidsNumber[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!/^\+?\d+$/.test(part)) {
      return { error: t('hashids.badNumbers'), numbers: [] };
    }
    const asNumber = Number.parseInt(part, 10);
    if (Number.isSafeInteger(asNumber)) numbers.push(asNumber);
    else numbers.push(BigInt(part));
  }
  return { numbers };
}

const encodeState = computed(() => {
  const raw = numbersInput.value.trim();
  if (!raw) {
    return { hash: '', display: '—', note: t('hashids.enterNumbers') };
  }

  const parsed = parseNumbers(raw);
  if (parsed.error) {
    return { hash: '', display: '—', note: parsed.error };
  }

  try {
    const hash = createHashids().encode(parsed.numbers);
    if (!hash) {
      return { hash: '', display: '—', note: t('hashids.cannotEncode') };
    }
    const note =
      parsed.numbers.length === 1
        ? t('hashids.encodedOne')
        : t('hashids.encodedMany', { n: parsed.numbers.length });
    return { hash, display: hash, note };
  } catch (err) {
    return { hash: '', display: '—', note: (err as Error).message || t('hashids.encodeFail') };
  }
});

const decodeState = computed(() => {
  const hash = hashInput.value.trim();
  if (!hash) {
    return { json: '', numbers: '—', jsonDisplay: '—', note: t('hashids.enterHash') };
  }

  try {
    const numbers = createHashids().decode(hash);
    if (numbers.length === 0) {
      return {
        json: '',
        numbers: '—',
        jsonDisplay: '—',
        note: t('hashids.cannotDecode'),
      };
    }
    const json = '[' + numbers.map(stringifyNumber).join(', ') + ']';
    const note =
      numbers.length === 1 ? t('hashids.decodedOne') : t('hashids.decodedMany', { n: numbers.length });
    return {
      json,
      numbers: numbers.map(stringifyNumber).join(', '),
      jsonDisplay: json,
      note,
    };
  } catch (err) {
    return {
      json: '',
      numbers: '—',
      jsonDisplay: '—',
      note: (err as Error).message || t('hashids.decodeFail'),
    };
  }
});

async function copyHash() {
  if (!encodeState.value.hash) return;
  const ok = await copyText(encodeState.value.hash);
  encodeCopyNote.value = ok ? t('common.copiedHash') : t('common.copyFailHash');
}

async function copyJson() {
  if (!decodeState.value.json) return;
  const ok = await copyText(decodeState.value.json);
  decodeCopyNote.value = ok ? t('jsonSearcher.copiedClipboard') : t('common.copyFailJson');
}
</script>

<template>
  <ToolLayout :title="t('tools.hashids.title')" :description="t('hashids.lead')">
    <div class="split-grid">
      <section class="panel split-span-2 reveal">
        <details class="collapse">
          <summary>{{ t('common.settings') }}</summary>
          <div class="form-grid cols-2">
            <div class="field">
              <label for="salt">Salt</label>
              <input
                id="salt"
                v-model="salt"
                type="text"
                :placeholder="t('hashids.emptyPlaceholder')"
                autocomplete="off"
                spellcheck="false"
              />
              <p class="hint">{{ t('hashids.saltHint') }}</p>
            </div>
            <div class="field">
              <label for="minLength">{{ t('hashids.minLength') }}</label>
              <input id="minLength" v-model="minLength" type="number" min="0" step="1" />
              <p class="hint">{{ t('hashids.minLengthHint') }}</p>
            </div>
            <div class="field field-full">
              <label for="alphabet">Alphabet</label>
              <input
                id="alphabet"
                v-model="alphabet"
                type="text"
                autocomplete="off"
                spellcheck="false"
              />
              <p class="hint">{{ t('hashids.alphabetHint') }}</p>
            </div>
          </div>
        </details>
      </section>

      <section class="panel card reveal">
        <p class="panel-title">Encode</p>
        <div class="form-grid">
          <div class="field field-full">
            <label for="numbersInput">{{ t('hashids.numbers') }}</label>
            <input
              id="numbersInput"
              v-model="numbersInput"
              type="text"
              placeholder="1, 2, 3"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="hint">{{ t('hashids.numbersHint') }}</p>
          </div>
        </div>
        <div class="result-list" style="margin-top: 16px">
          <div class="result-row">
            <span class="label">Hash</span>
            <span class="value mono">{{ encodeState.display }}</span>
          </div>
        </div>
        <div class="row" style="margin-top: 14px">
          <button class="btn-ghost btn-sm" type="button" @click="copyHash">{{ t('hashids.copyHash') }}</button>
        </div>
        <p class="result-note">{{ encodeCopyNote || encodeState.note }}</p>
      </section>

      <section class="panel card reveal">
        <p class="panel-title">Decode</p>
        <div class="form-grid">
          <div class="field field-full">
            <label for="hashInput">Hash</label>
            <input
              id="hashInput"
              v-model="hashInput"
              type="text"
              placeholder="o2fXhV"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="hint">{{ t('hashids.hashHint') }}</p>
          </div>
        </div>
        <div class="result-list" style="margin-top: 16px">
          <div class="result-row">
            <span class="label">{{ t('hashids.numbers') }}</span>
            <span class="value mono">{{ decodeState.numbers }}</span>
          </div>
          <div class="result-row">
            <span class="label">JSON</span>
            <span class="value mono">{{ decodeState.jsonDisplay }}</span>
          </div>
        </div>
        <div class="row" style="margin-top: 14px">
          <button class="btn-ghost btn-sm" type="button" @click="copyJson">{{ t('csvJson.copyJson') }}</button>
        </div>
        <p class="result-note">{{ decodeCopyNote || decodeState.note }}</p>
      </section>
    </div>
  </ToolLayout>
</template>
