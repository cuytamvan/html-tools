<script setup lang="ts">
import { useI18n } from '@/i18n';

import LocaleSelect from '@/components/LocaleSelect.vue';
import { useReveal } from '@/composables/useReveal';
import { isExtPopup } from '@/lib/extension';
import { ui } from '@/lib/ui';

defineProps<{
  title: string;
  description?: string;
  compact?: boolean;
}>();

const { t } = useI18n();
useReveal();
</script>

<template>
  <div class="ambient" aria-hidden="true"></div>
  <div :class="[ui.wrap, isExtPopup && 'ext-popup-wrap', compact && 'py-10 tool:py-14 tool:pb-20']">
    <header :class="['reveal', compact ? 'mb-8' : 'mb-16']">
      <div :class="['flex items-center justify-between gap-3', compact ? 'mb-3' : 'mb-5']">
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
