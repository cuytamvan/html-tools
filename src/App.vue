<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

watch(
  () => route.meta.landing === true,
  (landing) => {
    document.body.classList.toggle('landing', landing);
  },
  { immediate: true },
);
</script>

<template>
  <router-view />
</template>
