<script setup lang="ts">
import JSZip from 'jszip';
import { computed, onUnmounted, ref } from 'vue';

import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/i18n';
import { copyText, downloadBlob, pickFile } from '@/lib/escape';
import { tagClass, ui } from '@/lib/ui';

type ZipKind = 'folder' | 'text' | 'image' | 'binary';
type ZipEntry = {
  path: string;
  name: string;
  dir: boolean;
  size: number | null;
  kind: ZipKind;
};
type TreeNode = ZipEntry & { children: TreeNode[] };
type TreeRow = { node: TreeNode; depth: number; guide: string };

type Preview =
  | { kind: 'text'; path: string; text: string }
  | { kind: 'image'; path: string; url: string }
  | { kind: 'binary'; path: string; size: number };

const TEXT_EXT = new Set([
  'txt',
  'md',
  'json',
  'csv',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'py',
  'go',
  'rs',
  'rb',
  'php',
  'sh',
  'yml',
  'yaml',
  'toml',
  'ini',
  'log',
  'svg',
  'env',
  'lock',
  'map',
]);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico']);
const PREVIEW_LIMIT = 512 * 1024;

const { t } = useI18n();
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const fileInput = ref<HTMLInputElement | null>(null);
const isDrop = ref(false);
const zipFile = ref<JSZip | null>(null);
const zipName = ref('');
const zipBytes = ref(0);
const entries = ref<ZipEntry[]>([]);
const expanded = ref<Set<string>>(new Set());
const errorMsg = ref('');
const query = ref('');
const selectedPath = ref('');
const preview = ref<Preview | null>(null);
const previewBusy = ref(false);

function extOf(path: string) {
  const base = path.split('/').pop() || path;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

function kindOf(path: string, dir: boolean): ZipKind {
  if (dir) return 'folder';
  const ext = extOf(path);
  if (TEXT_EXT.has(ext)) return 'text';
  if (IMAGE_EXT.has(ext)) return 'image';
  return 'binary';
}

function entrySize(file: JSZip.JSZipObject): number | null {
  const data = (file as unknown as { _data?: { uncompressedSize?: number } })._data;
  const n = data?.uncompressedSize;
  return typeof n === 'number' ? n : null;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function displayName(path: string, dir: boolean) {
  const trimmed = path.replace(/\/+$/, '');
  const parts = trimmed.split('/');
  return (parts[parts.length - 1] || path) + (dir ? '/' : '');
}

function looksLikeZip(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

function revokePreview() {
  if (preview.value?.kind === 'image') URL.revokeObjectURL(preview.value.url);
  preview.value = null;
  selectedPath.value = '';
}

function clearZip() {
  zipFile.value = null;
  zipName.value = '';
  zipBytes.value = 0;
  entries.value = [];
  expanded.value = new Set();
  errorMsg.value = '';
  query.value = '';
  revokePreview();
  if (fileInput.value) fileInput.value.value = '';
}

function sortNodes(list: TreeNode[]) {
  list.sort((a, b) => {
    if (a.dir !== b.dir) return a.dir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  list.forEach((node) => sortNodes(node.children));
}

function buildTree(list: ZipEntry[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  function keyOf(path: string, dir: boolean) {
    const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
    return dir ? `${trimmed}/` : trimmed;
  }

  function ensure(path: string, dir: boolean, extra?: ZipEntry): TreeNode {
    const key = keyOf(path, dir);
    let node = nodes.get(key);
    if (!node) {
      node = {
        path: extra?.path ?? key,
        name: displayName(extra?.path ?? key, dir),
        dir,
        size: extra?.size ?? null,
        kind: extra?.kind ?? kindOf(extra?.path ?? key, dir),
        children: [],
      };
      nodes.set(key, node);
    } else if (extra && !dir) {
      node.path = extra.path;
      node.name = extra.name;
      node.size = extra.size;
      node.kind = extra.kind;
    }
    return node;
  }

  for (const entry of list) {
    const trimmed = entry.path.replace(/^\/+/, '').replace(/\/+$/, '');
    const parts = trimmed.split('/').filter(Boolean);
    if (!parts.length) continue;

    let parent: TreeNode | null = null;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const dir = !isLast || entry.dir;
      const path = parts.slice(0, i + 1).join('/') + (dir ? '/' : '');
      const node = isLast ? ensure(path, dir, entry) : ensure(path, true);
      if (parent) {
        if (!parent.children.includes(node)) parent.children.push(node);
      } else if (!roots.includes(node)) {
        roots.push(node);
      }
      parent = node;
    }
  }

  sortNodes(roots);
  return roots;
}

function folderPaths(nodes: TreeNode[], into: string[] = []) {
  for (const node of nodes) {
    if (!node.dir) continue;
    into.push(node.path);
    folderPaths(node.children, into);
  }
  return into;
}

function countKind(nodes: TreeNode[], dir: boolean): number {
  return nodes.reduce((sum, node) => {
    const self = node.dir === dir ? 1 : 0;
    return sum + self + countKind(node.children, dir);
  }, 0);
}

function nodeMatches(node: TreeNode, q: string): boolean {
  if (node.path.toLowerCase().includes(q) || node.name.toLowerCase().includes(q)) return true;
  return node.children.some((child) => nodeMatches(child, q));
}

function defaultExpanded(roots: TreeNode[]) {
  const set = new Set<string>();
  if (roots.length === 1 && roots[0].dir) set.add(roots[0].path);
  return set;
}

const tree = computed(() => buildTree(entries.value));
const searching = computed(() => Boolean(query.value.trim()));
const fileCount = computed(() => countKind(tree.value, false));
const folderCount = computed(() => countKind(tree.value, true));

function isOpen(path: string) {
  return searching.value || expanded.value.has(path);
}

function toggleFolder(path: string) {
  if (searching.value) return;
  const next = new Set(expanded.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  expanded.value = next;
}

function expandAll() {
  expanded.value = new Set(folderPaths(tree.value));
}

function collapseAll() {
  expanded.value = new Set();
}

function onRowClick(node: TreeNode) {
  if (node.dir) toggleFolder(node.path);
  else openEntry(node);
}

const visibleRows = computed(() => {
  const q = query.value.trim().toLowerCase();
  const rows: TreeRow[] = [];

  function walk(nodes: TreeNode[], depth: number, ancestorCont: boolean[]) {
    const shown = q ? nodes.filter((node) => nodeMatches(node, q)) : nodes;
    shown.forEach((node, index) => {
      const last = index === shown.length - 1;
      let guide = '';
      for (const cont of ancestorCont) guide += cont ? '│  ' : '   ';
      if (depth > 0) guide += last ? '└─ ' : '├─ ';
      rows.push({ node, depth, guide });
      if (node.dir && node.children.length && isOpen(node.path)) {
        walk(node.children, depth + 1, [...ancestorCont, !last]);
      }
    });
  }

  walk(tree.value, 0, []);
  return rows;
});

async function loadZip(file: File | undefined) {
  if (!file) return;
  if (!looksLikeZip(file)) {
    errorMsg.value = t('zipViewer.notZip');
    showToast(t('zipViewer.notZip'));
    return;
  }
  errorMsg.value = '';
  revokePreview();
  try {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const next: ZipEntry[] = [];
    zip.forEach((path, item) => {
      next.push({
        path,
        name: displayName(path, item.dir),
        dir: item.dir,
        size: item.dir ? null : entrySize(item),
        kind: kindOf(path, item.dir),
      });
    });
    zipFile.value = zip;
    zipName.value = file.name;
    zipBytes.value = file.size;
    entries.value = next;
    expanded.value = defaultExpanded(buildTree(next));
    showToast(t('zipViewer.loaded', { name: file.name, n: next.filter((item) => !item.dir).length }));
  } catch (err) {
    clearZip();
    errorMsg.value = (err as Error).message || t('zipViewer.fail');
    showToast(t('zipViewer.fail'));
  }
}

function onFileChange() {
  loadZip(fileInput.value?.files?.[0]);
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDrop.value = true;
}

function onDragLeave(event: DragEvent) {
  const el = event.currentTarget as HTMLElement;
  if (!el.contains(event.relatedTarget as Node)) isDrop.value = false;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDrop.value = false;
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  const zip = Array.from(files).find(looksLikeZip) ?? files[0];
  loadZip(zip);
}

async function openEntry(entry: ZipEntry) {
  if (entry.dir || !zipFile.value) return;
  const file = zipFile.value.file(entry.path);
  if (!file) return;
  previewBusy.value = true;
  revokePreview();
  selectedPath.value = entry.path;
  try {
    if (entry.kind === 'image') {
      const blob = await file.async('blob');
      preview.value = { kind: 'image', path: entry.path, url: URL.createObjectURL(blob) };
      return;
    }
    if (entry.kind === 'text') {
      const bytes = await file.async('uint8array');
      if (bytes.length > PREVIEW_LIMIT) {
        preview.value = { kind: 'binary', path: entry.path, size: bytes.length };
        return;
      }
      if (bytes.includes(0)) {
        preview.value = { kind: 'binary', path: entry.path, size: bytes.length };
        return;
      }
      preview.value = { kind: 'text', path: entry.path, text: new TextDecoder().decode(bytes) };
      return;
    }
    const size = entry.size ?? (await file.async('uint8array')).length;
    preview.value = { kind: 'binary', path: entry.path, size };
  } catch (err) {
    errorMsg.value = (err as Error).message || t('zipViewer.previewFail');
    selectedPath.value = '';
  } finally {
    previewBusy.value = false;
  }
}

async function downloadEntry(entry: ZipEntry) {
  if (entry.dir || !zipFile.value) return;
  const file = zipFile.value.file(entry.path);
  if (!file) return;
  const blob = await file.async('blob');
  downloadBlob(entry.name.replace(/\/+$/, '') || 'file', blob);
}

async function copyPreview() {
  if (preview.value?.kind !== 'text') return;
  const ok = await copyText(preview.value.text);
  showToast(ok ? t('common.copiedCode') : t('common.copyFail'));
}

onUnmounted(revokePreview);
</script>

<template>
  <ToolLayout :title="t('tools.zipViewer.title')" :description="t('zipViewer.lead')">
    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('zipViewer.source') }}</p>
      <div
        :class="[ui.card, 'min-h-48', isDrop && 'outline outline-dashed outline-offset-2 outline-ink']"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <p class="m-0 font-serif text-card tracking-display">{{ t('zipViewer.dropTitle') }}</p>
        <p :class="[ui.meta, 'mt-2 max-w-[36em]']">{{ t('zipViewer.dropHint') }}</p>
        <div :class="[ui.row, 'mt-5']">
          <button :class="ui.btnPrimary" type="button" @click="fileInput && pickFile(fileInput)">
            {{ t('zipViewer.chooseFile') }}
          </button>
          <button v-if="zipFile" :class="ui.btnGhost" type="button" @click="clearZip">
            {{ t('zipViewer.clear') }}
          </button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          :class="ui.srFile"
          @change="onFileChange"
        />
        <p v-if="zipName" :class="[ui.note, 'mt-4']">
          <span class="font-mono text-ink">{{ zipName }}</span>
          · {{ formatBytes(zipBytes) }} ·
          {{ t('zipViewer.counts', { files: fileCount, folders: folderCount }) }}
        </p>
        <div v-if="errorMsg" :class="ui.error">{{ errorMsg }}</div>
      </div>
    </section>

    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('zipViewer.contents') }}</p>
      <div :class="ui.card">
        <div v-if="zipFile" :class="[ui.row, 'mb-2.5']">
          <input
            v-model="query"
            type="search"
            :class="ui.search"
            :placeholder="t('zipViewer.searchPlaceholder')"
            autocomplete="off"
            spellcheck="false"
          />
          <button :class="ui.btnGhostSm" type="button" :disabled="searching" @click="expandAll">
            {{ t('zipViewer.expandAll') }}
          </button>
          <button :class="ui.btnGhostSm" type="button" :disabled="searching" @click="collapseAll">
            {{ t('zipViewer.collapseAll') }}
          </button>
          <span :class="ui.badge">{{ visibleRows.length }}</span>
        </div>
        <div :class="[ui.tableScroll, zipFile ? 'mt-3' : 'mt-0']">
          <div v-if="visibleRows.length" class="min-w-max">
            <div
              v-for="row in visibleRows"
              :key="row.node.path"
              class="flex cursor-pointer items-center gap-2 border-b border-line px-3 py-1.5 last:border-b-0 hover:bg-paper"
              :class="selectedPath === row.node.path && 'bg-paper'"
              :aria-selected="selectedPath === row.node.path"
              @click="onRowClick(row.node)"
            >
              <button
                v-if="row.node.dir && row.node.children.length"
                class="inline-flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs text-muted hover:text-ink"
                type="button"
                :aria-expanded="isOpen(row.node.path)"
                @click.stop="toggleFolder(row.node.path)"
              >
                {{ isOpen(row.node.path) ? '−' : '+' }}
              </button>
              <span v-else class="inline-block h-6 w-6 shrink-0" />
              <span
                class="min-w-0 flex-1 font-mono text-xs leading-[1.55] whitespace-pre text-ink"
                :title="row.node.path"
              >
                <span class="select-none text-muted">{{ row.guide }}</span>{{ row.node.name }}
              </span>
              <span :class="tagClass(row.node.dir ? 'green' : row.node.kind === 'text' ? 'blue' : '', true)">
                {{
                  row.node.dir
                    ? t('zipViewer.folder')
                    : row.node.kind === 'text'
                      ? t('zipViewer.text')
                      : row.node.kind === 'image'
                        ? t('zipViewer.image')
                        : t('zipViewer.file')
                }}
              </span>
              <span class="w-20 shrink-0 text-right font-mono text-xs text-muted tabular-nums">
                {{ row.node.size === null ? '—' : formatBytes(row.node.size) }}
              </span>
              <span class="w-20 shrink-0 text-right">
                <button
                  v-if="!row.node.dir"
                  :class="ui.btnGhostSm"
                  type="button"
                  @click.stop="downloadEntry(row.node)"
                >
                  {{ t('zipViewer.download') }}
                </button>
              </span>
            </div>
          </div>
          <div v-else :class="ui.empty">
            {{ zipFile ? t('zipViewer.emptySearch') : t('zipViewer.emptyStart') }}
          </div>
        </div>
      </div>
    </section>

    <section v-if="preview || previewBusy" :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('zipViewer.preview') }}</p>
      <div :class="ui.codeWrap">
        <div :class="ui.codeToolbar">
          <span :class="ui.filename">{{ preview?.path || selectedPath }}</span>
          <div :class="ui.row">
            <button
              v-if="preview?.kind === 'text'"
              :class="ui.btnGhostSm"
              type="button"
              @click="copyPreview"
            >
              {{ t('common.copy') }}
            </button>
          </div>
        </div>
        <p v-if="previewBusy" :class="[ui.empty, 'py-10']">{{ t('zipViewer.reading') }}</p>
        <pre v-else-if="preview?.kind === 'text'" :class="ui.codeBlock">{{ preview.text }}</pre>
        <div v-else-if="preview?.kind === 'image'" class="flex justify-center bg-bone p-6">
          <img :src="preview.url" :alt="preview.path" class="max-h-[62vh] max-w-full" />
        </div>
        <p v-else-if="preview?.kind === 'binary'" :class="[ui.empty, 'py-10']">
          {{ t('zipViewer.binary', { size: formatBytes(preview.size) }) }}
        </p>
      </div>
    </section>

    <template #extras>
      <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
