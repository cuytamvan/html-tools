<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { copyText } from '@/lib/escape';
import { DEFAULT_ALPHABET, Hashids, type HashidsNumber } from '@/lib/hashids';

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
      return { error: 'Angka harus bilangan bulat non-negatif, dipisah koma atau spasi.', numbers: [] };
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
    return { hash: '', display: '—', note: 'Masukkan angka untuk encode.' };
  }

  const parsed = parseNumbers(raw);
  if (parsed.error) {
    return { hash: '', display: '—', note: parsed.error };
  }

  try {
    const hash = createHashids().encode(parsed.numbers);
    if (!hash) {
      return { hash: '', display: '—', note: 'Tidak bisa encode angka tersebut.' };
    }
    const note =
      parsed.numbers.length === 1
        ? '1 angka berhasil di-encode.'
        : parsed.numbers.length + ' angka berhasil di-encode.';
    return { hash, display: hash, note };
  } catch (err) {
    return { hash: '', display: '—', note: (err as Error).message || 'Gagal encode angka.' };
  }
});

const decodeState = computed(() => {
  const hash = hashInput.value.trim();
  if (!hash) {
    return { json: '', numbers: '—', jsonDisplay: '—', note: 'Masukkan hash untuk decode.' };
  }

  try {
    const numbers = createHashids().decode(hash);
    if (numbers.length === 0) {
      return {
        json: '',
        numbers: '—',
        jsonDisplay: '—',
        note: 'Tidak bisa di-decode. Periksa hash, salt, panjang minimum, dan alphabet.',
      };
    }
    const json = '[' + numbers.map(stringifyNumber).join(', ') + ']';
    const note =
      numbers.length === 1 ? '1 angka berhasil di-decode.' : numbers.length + ' angka berhasil di-decode.';
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
      note: (err as Error).message || 'Gagal decode hash.',
    };
  }
});

async function copyHash() {
  if (!encodeState.value.hash) return;
  const ok = await copyText(encodeState.value.hash);
  encodeCopyNote.value = ok ? 'Hash disalin ke clipboard.' : 'Gagal menyalin hash.';
}

async function copyJson() {
  if (!decodeState.value.json) return;
  const ok = await copyText(decodeState.value.json);
  decodeCopyNote.value = ok ? 'JSON disalin ke clipboard.' : 'Gagal menyalin JSON.';
}
</script>

<template>
  <ToolLayout
    title="Hashids"
    description="Encode angka menjadi hash, atau decode hash menjadi angka. Salt, panjang minimum, dan alphabet harus sama di kedua sisi."
  >
    <div class="split-grid">
      <section class="panel split-span-2 reveal">
        <details class="collapse">
          <summary>Pengaturan</summary>
          <div class="form-grid cols-2">
            <div class="field">
              <label for="salt">Salt</label>
              <input
                id="salt"
                v-model="salt"
                type="text"
                placeholder="(kosong)"
                autocomplete="off"
                spellcheck="false"
              />
              <p class="hint">Harus sama saat encode dan decode</p>
            </div>
            <div class="field">
              <label for="minLength">Panjang minimum</label>
              <input id="minLength" v-model="minLength" type="number" min="0" step="1" />
              <p class="hint">minLength hash hasil encode</p>
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
              <p class="hint">Minimal 16 karakter unik. Default: a-z A-Z 1-9 0</p>
            </div>
          </div>
        </details>
      </section>

      <section class="panel card reveal">
        <p class="panel-title">Encode</p>
        <div class="form-grid">
          <div class="field field-full">
            <label for="numbersInput">Angka</label>
            <input
              id="numbersInput"
              v-model="numbersInput"
              type="text"
              placeholder="1, 2, 3"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="hint">Satu atau beberapa angka, dipisah koma atau spasi</p>
          </div>
        </div>
        <div class="result-list" style="margin-top: 16px">
          <div class="result-row">
            <span class="label">Hash</span>
            <span class="value mono">{{ encodeState.display }}</span>
          </div>
        </div>
        <div class="row" style="margin-top: 14px">
          <button class="btn-ghost btn-sm" type="button" @click="copyHash">Salin hash</button>
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
            <p class="hint">String hasil encode Hashids</p>
          </div>
        </div>
        <div class="result-list" style="margin-top: 16px">
          <div class="result-row">
            <span class="label">Angka</span>
            <span class="value mono">{{ decodeState.numbers }}</span>
          </div>
          <div class="result-row">
            <span class="label">JSON</span>
            <span class="value mono">{{ decodeState.jsonDisplay }}</span>
          </div>
        </div>
        <div class="row" style="margin-top: 14px">
          <button class="btn-ghost btn-sm" type="button" @click="copyJson">Salin JSON</button>
        </div>
        <p class="result-note">{{ decodeCopyNote || decodeState.note }}</p>
      </section>
    </div>
  </ToolLayout>
</template>
