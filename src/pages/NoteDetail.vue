<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import MarkdownEditorCard from '@/components/MarkdownEditorCard.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/i18n';
import {
  deleteNote,
  getNote,
  hasNotesFolder,
  listCategories,
  restoreNotesFolder,
  updateNote,
  type NoteCategory,
  type NoteInput,
} from '@/lib/notesFs';
import { ui } from '@/lib/ui';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { message: toastMsg, visible: toastVisible, show: showToast } = useToast();

const noteFilename = computed(() => decodeURIComponent(String(route.params.id ?? '')));
const categories = ref<NoteCategory[]>([]);
const loading = ref(true);
const saving = ref(false);
const showDeleteModal = ref(false);

const draft = ref<NoteInput>({ title: '', content: '', category: '' });
const saved = ref<NoteInput>({ title: '', content: '', category: '' });
const modifiedAt = ref(0);

const dirty = computed(
  () =>
    draft.value.title !== saved.value.title ||
    draft.value.content !== saved.value.content ||
    draft.value.category !== saved.value.category,
);

const saveLabel = computed(() => {
  if (saving.value) return t('notes.saving');
  if (dirty.value) return t('notes.unsaved');
  return t('notes.saved');
});

function snapshot(input: NoteInput): NoteInput {
  return { title: input.title, content: input.content, category: input.category };
}

function applyNote(note: { title: string; content: string; category: string; modifiedAt: number }) {
  const next = snapshot(note);
  draft.value = { ...next };
  saved.value = { ...next };
  modifiedAt.value = note.modifiedAt;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function ensureFolder() {
  if (hasNotesFolder()) return true;
  return restoreNotesFolder();
}

async function loadCategories() {
  categories.value = await listCategories();
}

async function loadNote() {
  loading.value = true;
  try {
    const ready = await ensureFolder();
    if (!ready) {
      router.replace('/notes');
      return;
    }
    const note = await getNote(noteFilename.value);
    if (!note) {
      router.replace('/notes');
      return;
    }
    applyNote(note);
    document.title = note.title.trim() || t('notes.untitled');
  } finally {
    loading.value = false;
  }
}

async function persist(manual = false) {
  if (!dirty.value || saving.value) return false;
  saving.value = true;
  try {
    const updated = await updateNote(noteFilename.value, draft.value);
    saved.value = snapshot(updated);
    modifiedAt.value = updated.modifiedAt;
    document.title = updated.title.trim() || t('notes.untitled');
    if (manual) showToast(t('notes.saved'));
    return true;
  } catch {
    showToast(t('notes.saveFail'));
    return false;
  } finally {
    saving.value = false;
  }
}

async function saveNow() {
  await persist(true);
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    void saveNow();
  }
}

async function onDelete() {
  try {
    await deleteNote(noteFilename.value);
    router.push('/notes');
  } catch {
    showToast(t('notes.deleteFail'));
  }
}

onBeforeRouteLeave(async () => {
  if (dirty.value) await persist(false);
});

onMounted(async () => {
  await Promise.all([loadCategories(), loadNote()]);
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});

watch(noteFilename, async () => {
  await loadNote();
});

watch(
  () => draft.value.title,
  (title) => {
    if (!loading.value) document.title = title.trim() || t('notes.untitled');
  },
);
</script>

<template>
  <ToolLayout compact :title="draft.title.trim() || t('notes.untitled')" :description="t('notes.detailLead')">
    <template #lead>
      <span>{{ t('notes.detailLead') }}</span>
      <span class="ml-3 font-mono text-2xs text-muted">{{ noteFilename }}</span>
      <span class="ml-3 font-mono text-2xs text-muted">{{ saveLabel }}</span>
      <span class="mt-1 block text-2xs text-muted">{{ t('notes.saveHint') }}</span>
    </template>

    <section v-if="loading" class="note-section">
      <div :class="ui.empty">{{ t('notes.loading') }}</div>
    </section>

    <template v-else>
      <section class="note-section">
        <p class="note-section-title">{{ t('notes.meta') }}</p>
        <div class="note-meta-card">
          <div>
            <label :class="ui.label" for="note-title">{{ t('notes.title') }}</label>
            <input
              id="note-title"
              v-model="draft.title"
              type="text"
              :class="ui.input"
              :placeholder="t('notes.titlePlaceholder')"
            />
          </div>
          <div>
            <label :class="ui.label" for="note-category">{{ t('notes.category') }}</label>
            <select id="note-category" v-model="draft.category" :class="ui.select">
              <option value="">{{ t('notes.uncategorized') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label :class="ui.label">{{ t('notes.modified') }}</label>
            <p class="m-0 font-mono text-ui text-muted">{{ formatDate(modifiedAt) }}</p>
          </div>
        </div>
      </section>

      <section class="note-section">
        <MarkdownEditorCard
          v-model="draft.content"
          :placeholder="t('notes.contentPlaceholder')"
          :export-filename="`${draft.title.trim() || noteFilename.replace(/\.md$/i, '')}.pdf`"
          :default-tab="draft.content.trim() ? 'review' : 'editor'"
          @exported="showToast(t('markdownEditor.exportPdfDone'))"
          @export-failed="showToast(t('markdownEditor.exportPdfFail'))"
          @pretty-printed="showToast(t('markdownEditor.prettyPrintDone'))"
        />
      </section>

      <section class="note-section note-section-actions">
        <div :class="ui.row">
          <router-link :class="ui.btnGhost" to="/notes">{{ t('notes.backToList') }}</router-link>
          <button :class="ui.btnPrimary" type="button" :disabled="!dirty || saving" @click="saveNow">
            {{ saving ? t('notes.saving') : t('notes.save') }}
          </button>
          <button :class="ui.btnDanger" type="button" @click="showDeleteModal = true">
            {{ t('notes.deleteNote') }}
          </button>
        </div>
      </section>
    </template>

    <template #extras>
      <div :class="[ui.overlay, showDeleteModal ? 'flex' : 'hidden']">
        <div :class="ui.modal">
          <h3 :class="ui.modalTitle">{{ t('notes.deleteTitle') }}</h3>
          <p :class="ui.modalCopy">{{ t('notes.deleteBody') }}</p>
          <div :class="ui.modalActions">
            <button :class="ui.btnGhostSm" type="button" @click="showDeleteModal = false">
              {{ t('common.cancel') }}
            </button>
            <button :class="ui.btnDangerSm" type="button" @click="onDelete">{{ t('notes.delete') }}</button>
          </div>
        </div>
      </div>

      <div v-show="toastVisible" :class="ui.toast">{{ toastMsg }}</div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.note-section {
  border-top: 1px solid var(--color-line);
  padding: 1.25rem 0;
}
.note-section:first-of-type {
  border-top: 0;
  padding-top: 0;
}
.note-section-actions {
  padding-bottom: 0;
}
.note-section-title {
  margin: 0 0 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.note-meta-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.875rem 1.25rem;
  border-radius: 6px;
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  padding: 1rem;
}
</style>
