<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { LOCALES, setLocale, type LocaleCode } from '@/i18n';

const { t, locale } = useI18n();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

const current = computed(() => LOCALES.find((item) => item.code === locale.value) ?? LOCALES[0]);

function toggle() {
  open.value = !open.value;
}

function choose(code: LocaleCode) {
  setLocale(code);
  open.value = false;
}

function onPointerDown(event: PointerEvent) {
  if (!open.value || !root.value) return;
  if (!root.value.contains(event.target as Node)) open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div ref="root" class="locale-dropdown" :class="{ 'is-open': open }">
    <button
      type="button"
      class="locale-trigger"
      :aria-label="t('common.language')"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
    >
      <span>{{ current.label }}</span>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" />
      </svg>
    </button>
    <div v-if="open" class="locale-menu" role="listbox" :aria-label="t('common.language')">
      <button
        v-for="item in LOCALES"
        :key="item.code"
        type="button"
        class="locale-option"
        :class="{ 'is-active': item.code === locale }"
        role="option"
        :aria-selected="item.code === locale"
        @click="choose(item.code)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
