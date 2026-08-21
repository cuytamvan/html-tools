<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { LOCALES, setLocale, useI18n, type LocaleCode } from '@/i18n';

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
  <div ref="root" class="relative z-30">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium tracking-tight text-ink focus:border-ink focus:outline-none"
      :aria-label="t('common.language')"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
    >
      <span>{{ current.label }}</span>
      <svg
        class="block text-muted transition-transform duration-200 ease-editorial"
        :class="open && 'rotate-180'"
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        aria-hidden="true"
      >
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" />
      </svg>
    </button>
    <div
      v-if="open"
      class="absolute top-[calc(100%+6px)] right-0 w-max min-w-[calc(100%+24px)] rounded-md border border-line bg-surface p-1.5"
      role="listbox"
      :aria-label="t('common.language')"
    >
      <button
        v-for="item in LOCALES"
        :key="item.code"
        type="button"
        class="block w-full rounded-sm border border-transparent px-3 py-2 text-left text-ui font-medium tracking-tight"
        :class="
          item.code === locale
            ? 'border-ink bg-ink text-white hover:bg-ink hover:text-white'
            : 'text-ink hover:bg-paper'
        "
        role="option"
        :aria-selected="item.code === locale"
        @click="choose(item.code)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
