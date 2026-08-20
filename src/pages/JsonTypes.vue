<script setup lang="ts">
import { computed, ref } from 'vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { copyText } from '@/lib/escape';
import { fileNameFor, generateTypes, highlightCode, SAMPLE, type TypeLang } from '@/lib/jsonToTypes';

const LANGS: { id: TypeLang; label: string }[] = [
  { id: 'go', label: 'Go' },
  { id: 'ts', label: 'TypeScript' },
  { id: 'py', label: 'Python' },
];

const jsonInput = ref(JSON.stringify(SAMPLE, null, 2));
const rootName = ref('Root');
const lang = ref<TypeLang>('go');
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const EMPTY_HTML = '<span class="tok-comment">Tempel JSON untuk menghasilkan tipe.</span>';
const INVALID_HTML = '<span class="tok-comment">Perbaiki JSON terlebih dahulu.</span>';

const view = computed(() => {
  const raw = String(jsonInput.value || '').trim();
  const hint = rootName.value;
  const filename = fileNameFor(hint, lang.value);

  if (!raw) {
    return { jsonErr: '', code: '', filename, html: EMPTY_HTML, status: 'Belum ada JSON.' };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (err) {
    return {
      jsonErr: 'JSON tidak valid: ' + (err as Error).message,
      code: '',
      filename,
      html: INVALID_HTML,
      status: 'JSON tidak valid.',
    };
  }

  const generated = generateTypes(value, hint, lang.value);
  return {
    jsonErr: '',
    code: generated.code,
    filename: generated.filename,
    html: highlightCode(generated.code, lang.value),
    status: generated.status,
  };
});

function pretty() {
  const raw = String(jsonInput.value || '').trim();
  if (!raw) return;
  try {
    jsonInput.value = JSON.stringify(JSON.parse(raw), null, 2);
    showToast('JSON dirapikan.');
  } catch {
    /* live generate already surfaces the parse error */
  }
}

function loadSample() {
  jsonInput.value = JSON.stringify(SAMPLE, null, 2);
  showToast('Contoh dimuat.');
}

async function copyCode() {
  if (!view.value.code) return;
  const ok = await copyText(view.value.code);
  showToast(ok ? 'Kode disalin.' : 'Gagal menyalin.');
}
</script>

<template>
  <ToolLayout
    title="JSON ke Tipe"
    description="Ubah JSON menjadi struct Go, interface TypeScript, atau dataclass Python. Berjalan di browser."
  >
    <section class="panel reveal">
      <p class="panel-title">Pengaturan</p>
      <div class="card">
        <div class="form-grid cols-2">
          <div class="field">
            <label for="rootName">Nama tipe</label>
            <input id="rootName" v-model="rootName" type="text" spellcheck="false" autocomplete="off" />
            <p class="hint">Dipakai untuk objek akar, atau elemen jika akar berupa array.</p>
          </div>
          <div class="field">
            <label>Bahasa</label>
            <div class="choice-group">
              <button
                v-for="item in LANGS"
                :key="item.id"
                type="button"
                class="btn-ghost btn-sm"
                :class="{ 'is-active': lang === item.id }"
                @click="lang = item.id"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="split-grid">
      <section class="panel card reveal">
        <div class="row between" style="margin-bottom: 12px; margin-top: 0">
          <p class="panel-title" style="margin: 0">JSON</p>
          <div class="row">
            <button class="btn-ghost btn-sm" type="button" @click="pretty">Rapihkan</button>
            <button class="btn-ghost btn-sm" type="button" @click="loadSample">Muat contoh</button>
          </div>
        </div>
        <textarea v-model="jsonInput" class="json-pane" spellcheck="false" placeholder="{ }"></textarea>
        <p class="hint">{{ view.jsonErr }}</p>
      </section>
      <section class="panel card reveal">
        <div class="code-wrap">
          <div class="code-toolbar">
            <span class="filename">{{ view.filename }}</span>
            <button class="btn-ghost btn-sm" type="button" @click="copyCode">Salin</button>
          </div>
          <pre class="code-block" v-html="view.html"></pre>
        </div>
      </section>
    </div>

    <p class="meta" style="margin-top: 16px">{{ view.status }}</p>

    <template #extras>
      <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
