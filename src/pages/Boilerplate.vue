<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { copyText, pickFile } from '@/lib/escape';
import { forgetFileHandle, persistFileHandle, readFileHandle } from '@/lib/fileHandles';
import { highlight } from '@/lib/highlight';
import { cn, ui } from '@/lib/ui';

type BoilerplateItem = {
  id?: string;
  label?: string;
  description?: string;
  filename?: string;
  language?: string;
  code?: string | string[];
};

const STORAGE_KEY = 'boilerplate:source';
const IDB_KEY = 'boilerplate';
const WATCH_MS = 800;

const { t } = useI18n();
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const fileSource = ref<HTMLInputElement | null>(null);
const isDrop = ref(false);
const catalogHidden = ref(true);
const clearSourceHidden = ref(true);
const previewVisible = ref(false);
const emptyVisible = ref(true);
const emptyKey = ref('boilerplate.emptyNeedFile');
const sourceLabel = ref('');
const sourceWatching = ref(false);
const sourcePending = ref(false);
const fileItems = ref<BoilerplateItem[]>([]);
const commandItems = ref<BoilerplateItem[]>([]);
const currentCode = ref('');
const selectedKind = ref('');
const selectedKey = ref('');
const itemTitle = ref('');
const itemDescription = ref('');
const itemFilename = ref('');
const codeHtml = ref('');

let dirHandle: any = null;
let watchedName = '';
let watchTimer: ReturnType<typeof setInterval> | null = null;
let fsObserver: any = null;
let lastText = '';
let ingestBusy = false;

function itemKey(item: BoilerplateItem) {
  return String(item.id || item.label || '');
}

function getCode(item: BoilerplateItem) {
  if (Array.isArray(item.code)) return item.code.join('\n');
  return String(item.code || '');
}

function showItem(item: BoilerplateItem, kind: string) {
  currentCode.value = getCode(item);
  selectedKind.value = kind;
  selectedKey.value = itemKey(item);
  itemTitle.value = String(item.label || item.id || '');
  itemDescription.value = item.description || '';
  itemFilename.value = item.filename || (kind === 'commands' ? 'command.sh' : '');
  codeHtml.value = highlight(currentCode.value, item.language);
  previewVisible.value = true;
  emptyVisible.value = false;
}

function validateData(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(t('boilerplate.mustObject'));
  }
  const rec = data as Record<string, unknown>;
  const files = Array.isArray(rec.files) ? (rec.files as BoilerplateItem[]) : [];
  const commands = Array.isArray(rec.commands) ? (rec.commands as BoilerplateItem[]) : [];
  if (!files.length && !commands.length) {
    throw new Error(t('boilerplate.emptyCatalog'));
  }
  return { files: files, commands: commands };
}

function resetPreview() {
  currentCode.value = '';
  previewVisible.value = false;
  fileItems.value = [];
  commandItems.value = [];
}

function applyData(data: unknown, filename: string | undefined, opts?: { live?: boolean; watching?: boolean }) {
  opts = opts || {};
  const parsed = validateData(data);
  fileItems.value = parsed.files;
  commandItems.value = parsed.commands;
  catalogHidden.value = false;
  clearSourceHidden.value = false;
  sourceLabel.value = filename || 'boilerplates.json';
  sourceWatching.value = !!opts.watching;
  sourcePending.value = false;
  emptyVisible.value = !(parsed.files.length || parsed.commands.length);
  emptyKey.value = 'boilerplate.emptyPick';

  if (opts.live && selectedKey.value) {
    const list = selectedKind.value === 'commands' ? parsed.commands : parsed.files;
    const item = list.find((entry) => itemKey(entry) === selectedKey.value);
    if (item) {
      showItem(item, selectedKind.value);
      return;
    }
  }

  if (parsed.files.length) {
    showItem(parsed.files[0], 'files');
  } else if (parsed.commands.length) {
    showItem(parsed.commands[0], 'commands');
  }
}

function stopWatch() {
  if (watchTimer != null) clearInterval(watchTimer);
  watchTimer = null;
  if (fsObserver) {
    try {
      fsObserver.disconnect();
    } catch {
      /* ignore */
    }
    fsObserver = null;
  }
  dirHandle = null;
  watchedName = '';
  lastText = '';
}

function persistSource(dir: any, fileName: string) {
  return persistFileHandle(IDB_KEY, dir, fileName);
}

function readPersistedHandle() {
  return readFileHandle(IDB_KEY);
}

function forgetHandle() {
  return forgetFileHandle(IDB_KEY);
}

async function resolveJsonName(dir: any) {
  const names: string[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file' && /\.json$/i.test(name)) names.push(name);
  }
  const preferred = names.find((name) => name.toLowerCase() === 'boilerplates.json');
  if (preferred) return preferred;
  if (names.length === 1) return names[0];
  if (!names.length) throw new Error(t('boilerplate.noJsonInFolder'));
  throw new Error(t('boilerplate.saveAsName'));
}

function startWatch(dir: any, fileName: string) {
  if (watchTimer != null) clearInterval(watchTimer);
  if (fsObserver) {
    try {
      fsObserver.disconnect();
    } catch {
      /* ignore */
    }
    fsObserver = null;
  }
  dirHandle = dir;
  watchedName = fileName;
  watchTimer = setInterval(() => ingestFromDir({ live: true }), WATCH_MS);
  const FileSystemObserverCtor = (window as any).FileSystemObserver;
  if (typeof FileSystemObserverCtor === 'function') {
    try {
      fsObserver = new FileSystemObserverCtor(() => ingestFromDir({ live: true }));
      Promise.resolve(fsObserver.observe(dir)).catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

async function ingestFromDir(opts?: { live?: boolean; toast?: boolean }) {
  if (!dirHandle || !watchedName || ingestBusy) return;
  opts = opts || {};
  ingestBusy = true;
  try {
    const handle = await dirHandle.getFileHandle(watchedName);
    const file = await handle.getFile();
    const text = await file.text();
    if (opts.live && text === lastText) return;
    loadFromText(text, file.name, { live: !!opts.live, watching: true });
    lastText = text;
    if (opts.toast) showToast(t('common.fileLoaded', { name: file.name }));
    else if (opts.live) showToast(t('boilerplate.updated'));
  } catch (err: any) {
    const invalid = err && err.code === 'JSON_INVALID';
    if (opts.live && invalid) {
      sourceLabel.value = watchedName;
      sourcePending.value = true;
      return;
    }
    if (!opts.live) showToast((err && err.message) || t('common.jsonReadFail'));
  } finally {
    ingestBusy = false;
  }
}

async function useDirectory(dir: any, fileName: string, toast: boolean) {
  await persistSource(dir, fileName);
  dirHandle = dir;
  watchedName = fileName;
  await ingestFromDir({ toast: !!toast });
  startWatch(dir, fileName);
}

function clearSource() {
  stopWatch();
  forgetHandle();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  resetPreview();
  catalogHidden.value = true;
  clearSourceHidden.value = true;
  sourceLabel.value = '';
  sourceWatching.value = false;
  sourcePending.value = false;
  emptyVisible.value = true;
  emptyKey.value = 'boilerplate.emptyNeedFile';
  if (fileSource.value) fileSource.value.value = '';
  selectedKind.value = '';
  selectedKey.value = '';
}

function loadFromText(text: string, filename: string, opts?: { live?: boolean; watching?: boolean }) {
  opts = opts || {};
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err: any) {
    const error = new Error(t('common.jsonInvalid', { message: err.message })) as Error & { code: string };
    error.code = 'JSON_INVALID';
    throw error;
  }
  applyData(data, filename, opts);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ filename: filename, data: data }));
  } catch {
    /* ignore */
  }
}

async function copyCode() {
  if (!currentCode.value) return;
  const ok = await copyText(currentCode.value);
  showToast(ok ? t('common.copiedCode') : t('common.copyFailCode'));
}

function onClearSource() {
  clearSource();
  showToast(t('boilerplate.sourceCleared'));
}

function readLocalFile(file: File | undefined) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      loadFromText(String(reader.result || ''), file.name, { watching: false });
      showToast(t('common.fileLoaded', { name: file.name }));
    } catch (err: any) {
      showToast(err.message || t('common.jsonReadFail'));
    }
  };
  reader.onerror = () => showToast(t('common.fileReadFail'));
  reader.readAsText(file);
}

async function openFilePicker() {
  const showDirectoryPicker = (window as any).showDirectoryPicker;
  if (showDirectoryPicker) {
    try {
      const dir = await showDirectoryPicker({ mode: 'read' });
      const name = await resolveJsonName(dir);
      await useDirectory(dir, name, true);
      return;
    } catch (err: any) {
      if (err && err.name === 'AbortError') return;
      showToast((err && err.message) || t('boilerplate.folderFail'));
      return;
    }
  }
  if (fileSource.value) pickFile(fileSource.value);
}

function onFileChange() {
  stopWatch();
  forgetHandle();
  readLocalFile(fileSource.value?.files?.[0]);
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDrop.value = true;
}

async function onDrop(event: DragEvent) {
  event.preventDefault();
  isDrop.value = false;
  const item = event.dataTransfer && event.dataTransfer.items && (event.dataTransfer.items[0] as any);
  if (item && typeof item.getAsFileSystemHandle === 'function') {
    try {
      const handle = await item.getAsFileSystemHandle();
      if (handle && handle.kind === 'directory') {
        const name = await resolveJsonName(handle);
        await useDirectory(handle, name, true);
        return;
      }
      readLocalFile(event.dataTransfer?.files?.[0]);
    } catch (err: any) {
      if (err && err.name === 'AbortError') return;
      if (err && err.message) showToast(err.message);
      else readLocalFile(event.dataTransfer?.files?.[0]);
    }
    return;
  }
  readLocalFile(event.dataTransfer?.files?.[0]);
}

function onVisibility() {
  if (document.visibilityState === 'visible') ingestFromDir({ live: true });
}

function restoreSavedData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && saved.data) applyData(saved.data, saved.filename, { watching: false });
  } catch {
    /* ignore */
  }
}

async function restorePersistedHandle() {
  try {
    const record = await readPersistedHandle();
    const dir = record && record.version === 2 ? record.dir : record && record.kind === 'directory' ? record : null;
    const fileName = record && record.fileName;
    if (!dir || typeof dir.queryPermission !== 'function') {
      restoreSavedData();
      return;
    }
    const perm = await dir.queryPermission({ mode: 'read' });
    if (perm !== 'granted') {
      restoreSavedData();
      return;
    }
    const name = fileName || (await resolveJsonName(dir));
    await useDirectory(dir, name, false);
  } catch {
    restoreSavedData();
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility);
  restorePersistedHandle();
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibility);
  stopWatch();
});
</script>

<template>
  <ToolLayout :title="t('tools.boilerplate.title')">
    <template #lead>
      {{ t('boilerplate.leadBefore') }}
      <span class="font-mono">boilerplates.json</span>
      {{ t('boilerplate.leadAfter') }}
    </template>

    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('boilerplate.source') }}</p>
      <div
        :class="[ui.card, isDrop && 'outline outline-dashed outline-ink outline-offset-2']"
        @dragover="onDragOver"
        @dragleave="isDrop = false"
        @drop="onDrop"
      >
        <p :class="ui.meta">
          <template v-if="!sourceLabel">{{ t('boilerplate.none') }}</template>
          <i18n-t scope="global" v-else-if="sourcePending" keypath="boilerplate.usingPending" tag="span">
            <template #name><b>{{ sourceLabel }}</b></template>
          </i18n-t>
          <i18n-t scope="global" v-else-if="sourceWatching" keypath="boilerplate.usingWatch" tag="span">
            <template #name><b>{{ sourceLabel }}</b></template>
          </i18n-t>
          <i18n-t scope="global" v-else keypath="boilerplate.usingStatic" tag="span">
            <template #name><b>{{ sourceLabel }}</b></template>
          </i18n-t>
        </p>
        <div :class="[ui.row, 'mt-3.5']">
          <button :class="ui.btnPrimary" type="button" @click="openFilePicker">{{ t('boilerplate.chooseFolder') }}</button>
          <a :class="ui.btnGhost" href="/data/boilerplates.example.json" download="boilerplates.json">{{ t('boilerplate.downloadSample') }}</a>
          <button :class="ui.btnGhost" type="button" :hidden="clearSourceHidden" @click="onClearSource">{{ t('boilerplate.clearSource') }}</button>
        </div>
        <input ref="fileSource" type="file" :class="ui.srFile" accept=".json" @change="onFileChange" />
        <p :class="ui.note">
          <i18n-t scope="global" keypath="boilerplate.note" tag="span">
            <template #file><span class="font-mono">boilerplates.json</span></template>
            <template #format><span class="font-mono">{ "commands": [], "files": [] }</span></template>
          </i18n-t>
        </p>
      </div>
    </section>

    <div v-show="!catalogHidden">
      <section :class="[ui.panel, 'reveal']">
        <p :class="ui.panelTitle">{{ t('boilerplate.files') }}</p>
        <div :class="ui.card">
          <div :class="ui.choices">
            <button
              v-for="(item, i) in fileItems"
              :key="'files-' + itemKey(item) + '-' + i"
              type="button"
              :class="cn(ui.btnGhostSm, selectedKind === 'files' && selectedKey === itemKey(item) && ui.btnActive)"
              @click="showItem(item, 'files')"
            >
              {{ item.label || item.id }}
            </button>
          </div>
        </div>
      </section>

      <section :class="[ui.panel, 'reveal']">
        <p :class="ui.panelTitle">{{ t('boilerplate.commands') }}</p>
        <div :class="ui.card">
          <div :class="ui.choices">
            <button
              v-for="(item, i) in commandItems"
              :key="'commands-' + itemKey(item) + '-' + i"
              type="button"
              :class="cn(ui.btnGhostSm, selectedKind === 'commands' && selectedKey === itemKey(item) && ui.btnActive)"
              @click="showItem(item, 'commands')"
            >
              {{ item.label || item.id }}
            </button>
          </div>
        </div>
      </section>

      <section v-show="previewVisible" :class="[ui.panel, 'reveal']">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 :class="[ui.cardTitle, 'mb-1.5']">{{ itemTitle }}</h2>
            <p :class="ui.meta">{{ itemDescription }}</p>
          </div>
        </div>
        <div :class="ui.codeWrap">
          <div :class="ui.codeToolbar">
            <span :class="ui.filename">{{ itemFilename }}</span>
            <button :class="ui.btnGhostSm" type="button" @click="copyCode">{{ t('common.copy') }}</button>
          </div>
          <pre :class="ui.codeBlock" v-html="codeHtml"></pre>
        </div>
      </section>
    </div>

    <div v-show="emptyVisible" :class="ui.empty">{{ t(emptyKey) }}</div>
  </ToolLayout>
  <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
</template>
