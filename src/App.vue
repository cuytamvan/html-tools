<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const route = useRoute();
const { locale, t } = useI18n();

watch(
  [() => route.meta, locale],
  () => {
    document.body.classList.toggle('landing', route.meta.landing === true);
    const titleKey = typeof route.meta.titleKey === 'string' ? route.meta.titleKey : 'app.title';
    document.title = t(titleKey);
  },
  { immediate: true },
);
</script>

<template>
  <router-view />
</template>
