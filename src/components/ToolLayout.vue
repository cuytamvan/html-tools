<script setup lang="ts">
import { useReveal } from '@/composables/useReveal';

defineProps<{
  title: string;
  description?: string;
}>();

useReveal();
</script>

<template>
  <div class="ambient" aria-hidden="true"></div>
  <div class="wrap">
    <header class="reveal">
      <router-link class="btn-ghost btn-sm nav-home" to="/">Kembali</router-link>
      <h1>{{ title }}</h1>
      <p>
        <slot name="lead">{{ description }}</slot>
      </p>
    </header>
    <slot />
  </div>
  <slot name="extras" />
</template>
