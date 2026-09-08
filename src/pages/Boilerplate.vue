<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { copyText, pickFile } from '@/lib/escape';
import { forgetFileHandle, persistFileHandle, readFileHandle } from '@/lib/fileHandles';
import { highlight } from '@/lib/highlight';
import { ui } from '@/lib/ui';

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
const sampleHref = `${import.meta.env.BASE_URL}data/boilerplates.example.json`;

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
  const key = itemKey(item);
  currentCode.value = getCode(item);
  selectedKind.value = kind;
  selectedKey.value = key;
  itemTitle.value = String(item.label || item.id || '');
  itemDescription.value = item.description || '';
  itemFilename.value = item.filename || (kind === 'commands' ? 'command.sh' : '');
  codeHtml.value = highlight(currentCode.value, item.language);
  previewVisible.value = true;
  emptyVisible.value = false;
}

function isActive(kind: string, item: BoilerplateItem) {
  return selectedKind.value === kind && selectedKey.value === itemKey(item);
}

function sidebarLabel(item: BoilerplateItem, kind: string) {
  return String(item.label || item.id || (kind === 'commands' ? 'Command' : 'File'));
}

function iconKind(item: BoilerplateItem, kind: string) {
  if (kind === 'commands') return 'cmd';
  const name = (item.filename || '').toLowerCase();
  if (name.endsWith('.vue')) return 'vue';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'yaml';
  if (name.endsWith('.sh') || name.endsWith('.bash')) return 'sh';
  if (name.endsWith('.ts')) return 'ts';
  if (name.endsWith('.js')) return 'js';
  if (name.endsWith('.md')) return 'md';
  if (name.endsWith('.dockerfile') || name === 'dockerfile') return 'docker';
  return 'file';
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
          <a :class="ui.btnGhost" :href="sampleHref" download="boilerplates.json">{{ t('boilerplate.downloadSample') }}</a>
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

    <section v-show="!catalogHidden" :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('boilerplate.catalog') }}</p>
      <div class="bp-workspace">
        <aside class="bp-sidebar">
          <div v-if="fileItems.length" class="bp-group">
            <p class="bp-group-title">{{ t('boilerplate.files') }}</p>
            <ul class="bp-list">
              <li v-for="(item, i) in fileItems" :key="'files-' + itemKey(item) + '-' + i">
                <button
                  type="button"
                  class="bp-entry"
                  :class="isActive('files', item) && 'bp-entry-active'"
                  @click="showItem(item, 'files')"
                >
                  <span class="bp-icon" :class="'bp-icon-' + iconKind(item, 'files')" aria-hidden="true"></span>
                  <span class="bp-entry-name">{{ sidebarLabel(item, 'files') }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div v-if="commandItems.length" class="bp-group">
            <p class="bp-group-title">{{ t('boilerplate.commands') }}</p>
            <ul class="bp-list">
              <li v-for="(item, i) in commandItems" :key="'commands-' + itemKey(item) + '-' + i">
                <button
                  type="button"
                  class="bp-entry"
                  :class="isActive('commands', item) && 'bp-entry-active'"
                  @click="showItem(item, 'commands')"
                >
                  <span class="bp-icon" :class="'bp-icon-' + iconKind(item, 'commands')" aria-hidden="true"></span>
                  <span class="bp-entry-name">{{ sidebarLabel(item, 'commands') }}</span>
                </button>
              </li>
            </ul>
          </div>
        </aside>

        <div class="bp-preview">
          <template v-if="previewVisible">
            <div class="bp-preview-head">
              <div class="bp-preview-file">
                <span
                  class="bp-icon"
                  :class="'bp-icon-' + iconKind({ filename: itemFilename, label: itemTitle }, selectedKind)"
                  aria-hidden="true"
                ></span>
                <span class="bp-preview-filename">{{ itemFilename }}</span>
              </div>
              <button :class="ui.btnGhostSm" type="button" @click="copyCode">{{ t('common.copy') }}</button>
            </div>
            <div class="bp-preview-body">
              <p v-if="itemDescription" class="bp-preview-desc">{{ itemDescription }}</p>
              <pre class="bp-code" v-html="codeHtml"></pre>
            </div>
          </template>
          <div v-else :class="ui.empty">{{ t('boilerplate.emptyPick') }}</div>
        </div>
      </div>
    </section>

    <div v-show="emptyVisible && catalogHidden" :class="ui.empty">{{ t(emptyKey) }}</div>
  </ToolLayout>
  <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
</template>

<style scoped>
.bp-workspace {
  display: grid;
  grid-template-columns: minmax(11rem, 15rem) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-surface);
  min-height: 28rem;
}
.bp-sidebar {
  overflow: auto;
  border-right: 1px solid var(--color-line);
  background: var(--color-paper);
  padding: 0.75rem 0.5rem;
}
.bp-group + .bp-group {
  margin-top: 1rem;
}
.bp-group-title {
  margin: 0 0 0.375rem;
  padding: 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.bp-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.bp-entry {
  display: flex;
  width: 100%;
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 0.4375rem 0.5rem;
  text-align: left;
  transition: background-color 150ms ease;
}
.bp-entry:hover {
  background: rgba(0, 0, 0, 0.03);
}
.bp-entry-active {
  background: var(--color-pale-blue);
}
.bp-entry-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-ink);
}
.bp-entry-active .bp-entry-name {
  color: var(--color-pale-blue-ink);
}
.bp-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}
.bp-icon-vue {
  background-color: #edf3ec;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23346538' d='M8 1.5 1.5 3l6.5 11.5L14.5 3 8 1.5Z'/%3E%3Cpath fill='%235a8f5e' d='M8 1.5 4.5 3 8 8.5 11.5 3 8 1.5Z'/%3E%3C/svg%3E");
}
.bp-icon-json {
  background-color: #fbf3db;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext x='2' y='12' font-family='monospace' font-size='9' fill='%23956400'%7B%7D%3C/text%3E%3C/svg%3E");
}
.bp-icon-ts {
  background-color: #e1f3fe;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext x='2.5' y='12' font-family='monospace' font-size='9' font-weight='700' fill='%231f6c9f'%3ETS%3C/text%3E%3C/svg%3E");
}
.bp-icon-js {
  background-color: #fbf3db;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext x='3' y='12' font-family='monospace' font-size='9' font-weight='700' fill='%23956400'%3EJS%3C/text%3E%3C/svg%3E");
}
.bp-icon-yaml,
.bp-icon-md,
.bp-icon-file {
  background-color: var(--color-bone);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 2h5l3 3v9H4V2Z' fill='none' stroke='%23787774' stroke-width='1.1'/%3E%3C/svg%3E");
}
.bp-icon-sh,
.bp-icon-cmd {
  background-color: #f7f6f3;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 4.5 5.5 8 3 11.5M7 11.5h6' fill='none' stroke='%232f3437' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.bp-icon-docker {
  background-color: #e1f3fe;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='2' y='7' width='2' height='2' fill='%231f6c9f'/%3E%3Crect x='5' y='7' width='2' height='2' fill='%231f6c9f'/%3E%3Crect x='5' y='4' width='2' height='2' fill='%231f6c9f'/%3E%3Crect x='8' y='7' width='2' height='2' fill='%231f6c9f'/%3E%3C/svg%3E");
}
.bp-preview {
  display: flex;
  min-width: 0;
  flex-direction: column;
  background: var(--color-surface);
}
.bp-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--color-line);
  padding: 0.625rem 0.875rem;
}
.bp-preview-file {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}
.bp-preview-filename {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-ink);
}
.bp-preview-body {
  overflow: auto;
  flex: 1;
  padding: 0.875rem;
}
.bp-preview-desc {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--color-muted);
}
.bp-code {
  margin: 0;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.6;
  white-space: pre;
  color: var(--color-ink);
}
@media (max-width: 720px) {
  .bp-workspace {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .bp-sidebar {
    max-height: 12rem;
    border-right: 0;
    border-bottom: 1px solid var(--color-line);
  }
}
</style>
