<script setup lang="ts">
import { useI18n } from '@/i18n';

import LocaleSelect from '@/components/LocaleSelect.vue';
import { useReveal } from '@/composables/useReveal';
import { ui } from '@/lib/ui';

defineProps<{
  title: string;
  description?: string;
}>();

const { t } = useI18n();
useReveal();
</script>

<template>
  <div class="ambient" aria-hidden="true"></div>
  <div :class="ui.wrap">
    <header class="reveal mb-16">
      <div class="mb-5 flex items-center justify-between gap-3">
        <router-link :class="ui.btnGhostSm" to="/">{{ t('common.back') }}</router-link>
        <LocaleSelect />
      </div>
      <h1 :class="ui.pageTitle">{{ title }}</h1>
      <p :class="ui.lead">
        <slot name="lead">{{ description }}</slot>
      </p>
    </header>
    <slot />
  </div>
  <slot name="extras" />
</template>
