<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/i18n';
import {
  clearNotesFolder,
  connectNotesFolder,
  createCategory,
  createNote,
  deleteCategory,
  getNotesFolderLabel,
  hasNotesFolder,
  listCategories,
  listNotes,
  onNotesFolderChange,
  pickNotesFolder,
  restoreNotesFolder,
  updateCategory,
  type Note,
  type NoteCategory,
} from '@/lib/notesFs';
import { ui } from '@/lib/ui';

const { t } = useI18n();
const router = useRouter();
const sampleHref = `${import.meta.env.BASE_URL}data/categories.example.json`;
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const notes = ref<Note[]>([]);
const categories = ref<NoteCategory[]>([]);
const query = ref('');
const categoryFilter = ref('');
const loading = ref(true);
const folderReady = ref(false);
const folderLabel = ref('');
const isDrop = ref(false);
const showCategoryModal = ref(false);
const newCategoryName = ref('');
const editingCategoryId = ref('');
const editingCategoryName = ref('');

const categoryMap = computed(() => new Map(categories.value.map((item) => [item.id, item.name])));

const filteredNotes = computed(() => {
  const q = query.value.trim().toLowerCase();
  return notes.value.filter((note) => {
    if (categoryFilter.value && note.category !== categoryFilter.value) return false;
    if (!q) return true;
    const cat = categoryMap.value.get(note.category)?.toLowerCase() ?? '';
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.filename.toLowerCase().includes(q) ||
      cat.includes(q)
    );
  });
});

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function categoryLabel(id: string) {
  if (!id) return t('notes.uncategorized');
  return categoryMap.value.get(id) ?? t('notes.uncategorized');
}

function preview(content: string) {
  const line = content.trim().split('\n').find(Boolean) ?? '';
  return line.slice(0, 120);
}

function noteHref(filename: string) {
  return `/notes/${encodeURIComponent(filename)}`;
}

async function refresh(showLoading = true) {
  if (!folderReady.value) {
    notes.value = [];
    categories.value = [];
    loading.value = false;
    return;
  }
  if (showLoading) loading.value = true;
  try {
    const [nextNotes, nextCategories] = await Promise.all([listNotes(), listCategories()]);
    notes.value = nextNotes;
    categories.value = nextCategories;
    folderLabel.value = getNotesFolderLabel();
  } finally {
    if (showLoading) loading.value = false;
  }
}

function onVisibility() {
  if (document.visibilityState === 'visible') void refresh(false);
}

async function connectFolder() {
  try {
    await pickNotesFolder();
    folderReady.value = true;
    folderLabel.value = getNotesFolderLabel();
    await refresh();
    showToast(t('notes.folderConnected', { name: folderLabel.value }));
  } catch (err) {
    const error = err as DOMException;
    if (error?.name === 'AbortError') return;
    showToast((error?.message as string) || t('notes.folderFail'));
  }
}

async function onClearFolder() {
  await clearNotesFolder();
  folderReady.value = false;
  folderLabel.value = '';
  await refresh();
  showToast(t('notes.folderCleared'));
}

async function onNewNote() {
  if (!folderReady.value) {
    await connectFolder();
    if (!folderReady.value) return;
  }
  try {
    const note = await createNote();
    router.push(noteHref(note.filename));
  } catch {
    showToast(t('notes.failCreate'));
  }
}

function openCategoryModal() {
  showCategoryModal.value = true;
  newCategoryName.value = '';
  editingCategoryId.value = '';
  editingCategoryName.value = '';
}

function closeCategoryModal() {
  showCategoryModal.value = false;
  editingCategoryId.value = '';
  editingCategoryName.value = '';
}

function startEditCategory(item: NoteCategory) {
  editingCategoryId.value = item.id;
  editingCategoryName.value = item.name;
}

function cancelEditCategory() {
  editingCategoryId.value = '';
  editingCategoryName.value = '';
}

async function onAddCategory() {
  const name = newCategoryName.value.trim();
  if (!name) return;
  try {
    await createCategory(name);
    newCategoryName.value = '';
    await refresh();
    showToast(t('notes.categoryAdded'));
  } catch {
    showToast(t('notes.categoryFail'));
  }
}

async function onSaveCategory() {
  const name = editingCategoryName.value.trim();
  if (!name || !editingCategoryId.value) return;
  try {
    await updateCategory(editingCategoryId.value, name);
    cancelEditCategory();
    await refresh();
    showToast(t('notes.categoryUpdated'));
  } catch {
    showToast(t('notes.categoryFail'));
  }
}

async function onDeleteCategory(id: string) {
  try {
    await deleteCategory(id);
    if (categoryFilter.value === id) categoryFilter.value = '';
    await refresh();
    showToast(t('notes.categoryDeleted'));
  } catch {
    showToast(t('notes.categoryFail'));
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDrop.value = true;
}

async function onDrop(event: DragEvent) {
  event.preventDefault();
  isDrop.value = false;
  const item = event.dataTransfer?.items?.[0] as DataTransferItem & {
    getAsFileSystemHandle?: () => Promise<FileSystemHandle>;
  };
  if (item && typeof item.getAsFileSystemHandle === 'function') {
    try {
      const handle = await item.getAsFileSystemHandle();
      if (handle?.kind === 'directory') {
        await connectNotesFolder(handle as FileSystemDirectoryHandle);
        folderReady.value = true;
        folderLabel.value = getNotesFolderLabel();
        await refresh();
        showToast(t('notes.folderConnected', { name: folderLabel.value }));
      }
    } catch (err) {
      const error = err as DOMException;
      if (error?.name === 'AbortError') return;
      showToast((error?.message as string) || t('notes.folderFail'));
    }
  }
}

let stopWatch: (() => void) | null = null;

onMounted(async () => {
  folderReady.value = (await restoreNotesFolder()) || hasNotesFolder();
  if (folderReady.value) folderLabel.value = getNotesFolderLabel();
  await refresh();
  stopWatch = onNotesFolderChange(() => {
    void refresh(false);
  });
  document.addEventListener('visibilitychange', onVisibility);
});

onUnmounted(() => {
  stopWatch?.();
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <ToolLayout :title="t('tools.notes.title')" :description="t('notes.lead')">
    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('notes.source') }}</p>
      <div
        :class="[ui.card, isDrop && 'outline outline-dashed outline-ink outline-offset-2']"
        @dragover="onDragOver"
        @dragleave="isDrop = false"
        @drop="onDrop"
      >
        <p :class="ui.meta">
          <template v-if="!folderReady">{{ t('notes.noFolder') }}</template>
          <i18n-t v-else scope="global" keypath="notes.usingFolder" tag="span">
            <template #name><b>{{ folderLabel }}</b></template>
          </i18n-t>
        </p>
        <div :class="[ui.row, 'mt-3.5']">
          <button :class="ui.btnPrimary" type="button" @click="onNewNote">{{ t('notes.newNote') }}</button>
          <button :class="ui.btnGhost" type="button" @click="connectFolder">{{ t('notes.chooseFolder') }}</button>
          <a :class="ui.btnGhost" :href="sampleHref" download="categories.json">
            {{ t('notes.downloadSample') }}
          </a>
          <button v-if="folderReady" :class="ui.btnGhost" type="button" @click="onClearFolder">
            {{ t('notes.clearFolder') }}
          </button>
        </div>
        <p :class="ui.note">
          <i18n-t scope="global" keypath="notes.note" tag="span">
            <template #categories><span class="font-mono">categories.json</span></template>
            <template #notes><span class="font-mono">*.md</span></template>
          </i18n-t>
        </p>
      </div>
    </section>

    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('notes.list') }}</p>
      <div :class="ui.card">
        <div v-if="folderReady" :class="[ui.rowBetween, 'mb-4']">
          <div :class="[ui.row, 'min-w-0 flex-1']">
            <input
              v-model="query"
              type="search"
              :class="ui.search"
              :placeholder="t('notes.searchPlaceholder')"
              autocomplete="off"
              spellcheck="false"
            />
            <select v-model="categoryFilter" :class="ui.select">
              <option value="">{{ t('notes.allCategories') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
            <span :class="ui.badge">{{ filteredNotes.length }} / {{ notes.length }}</span>
          </div>
          <div :class="ui.row">
            <button :class="ui.btnGhost" type="button" @click="openCategoryModal">
              {{ t('notes.manageCategories') }}
            </button>
            <button :class="ui.btnPrimary" type="button" @click="onNewNote">{{ t('notes.newNote') }}</button>
          </div>
        </div>

        <div v-if="!folderReady" :class="ui.empty">{{ t('notes.emptyNeedFolder') }}</div>
        <div v-else-if="loading" :class="ui.empty">{{ t('notes.loading') }}</div>
        <div v-else-if="!filteredNotes.length" :class="ui.empty">
          {{ notes.length ? t('notes.emptySearch') : t('notes.emptyStart') }}
        </div>
        <div v-else :class="ui.resultList">
          <router-link
            v-for="note in filteredNotes"
            :key="note.filename"
            :to="noteHref(note.filename)"
            class="block border-b border-line py-4 text-inherit no-underline transition-colors last:border-b-0 hover:bg-paper"
          >
            <div :class="ui.rowBetween">
              <div class="min-w-0 flex-1">
                <p class="m-0 truncate font-medium text-ink">
                  {{ note.title.trim() || t('notes.untitled') }}
                </p>
                <p class="m-0 mt-1 truncate font-mono text-2xs text-muted">{{ note.filename }}</p>
                <p class="m-0 mt-1 truncate text-sm text-muted">
                  {{ preview(note.content) || t('notes.noContent') }}
                </p>
              </div>
              <div class="shrink-0 pl-4 text-right">
                <p class="m-0 text-xs text-muted">{{ categoryLabel(note.category) }}</p>
                <p class="m-0 mt-1 font-mono text-2xs text-muted">{{ formatDate(note.modifiedAt) }}</p>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <template #extras>
      <div :class="[ui.overlay, showCategoryModal ? 'flex' : 'hidden']" @click.self="closeCategoryModal">
        <div :class="ui.modalWide">
          <h3 :class="ui.modalTitle">{{ t('notes.categoriesTitle') }}</h3>
          <p :class="ui.modalCopy">{{ t('notes.categoriesBody') }}</p>

          <div :class="[ui.row, 'mb-4']">
            <input
              v-model="newCategoryName"
              type="text"
              :class="[ui.input, 'min-w-0 flex-1']"
              :placeholder="t('notes.categoryName')"
              @keydown.enter.prevent="onAddCategory"
            />
            <button :class="ui.btnPrimarySm" type="button" @click="onAddCategory">{{ t('notes.addCategory') }}</button>
          </div>

          <div :class="[ui.tableScroll, 'max-h-[42vh]']">
            <table v-if="categories.length" :class="ui.table">
              <thead>
                <tr>
                  <th :class="ui.th">{{ t('notes.categoryName') }}</th>
                  <th :class="ui.th">{{ t('notes.created') }}</th>
                  <th :class="ui.th"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in categories" :key="cat.id">
                  <td :class="ui.td">
                    <input
                      v-if="editingCategoryId === cat.id"
                      v-model="editingCategoryName"
                      type="text"
                      :class="ui.input"
                      @keydown.enter.prevent="onSaveCategory"
                    />
                    <span v-else>{{ cat.name }}</span>
                  </td>
                  <td :class="[ui.td, ui.tdIdx]">{{ formatDate(cat.createdAt) }}</td>
                  <td :class="ui.td">
                    <div :class="ui.row">
                      <template v-if="editingCategoryId === cat.id">
                        <button :class="ui.btnPrimarySm" type="button" @click="onSaveCategory">
                          {{ t('notes.save') }}
                        </button>
                        <button :class="ui.btnGhostSm" type="button" @click="cancelEditCategory">
                          {{ t('common.cancel') }}
                        </button>
                      </template>
                      <template v-else>
                        <button :class="ui.btnGhostSm" type="button" @click="startEditCategory(cat)">
                          {{ t('notes.edit') }}
                        </button>
                        <button :class="ui.btnDangerSm" type="button" @click="onDeleteCategory(cat.id)">
                          {{ t('notes.delete') }}
                        </button>
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else :class="ui.empty">{{ t('notes.noCategories') }}</div>
          </div>

          <div :class="[ui.modalActions, 'mt-5']">
            <button :class="ui.btnPrimarySm" type="button" @click="closeCategoryModal">{{ t('common.close') }}</button>
          </div>
        </div>
      </div>

      <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>
