<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import LocaleSelect from '@/components/LocaleSelect.vue';
import { useReveal } from '@/composables/useReveal';

defineProps<{
  title: string;
  description?: string;
}>();

const { t } = useI18n();
useReveal();
</script>

<template>
  <div class="ambient" aria-hidden="true"></div>
  <div class="wrap">
    <header class="reveal">
      <div class="page-bar">
        <router-link class="btn-ghost btn-sm nav-home" to="/">{{ t('common.back') }}</router-link>
        <LocaleSelect />
      </div>
      <h1>{{ title }}</h1>
      <p>
        <slot name="lead">{{ description }}</slot>
      </p>
    </header>
    <slot />
  </div>
  <slot name="extras" />
</template>
