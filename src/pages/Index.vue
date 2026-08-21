<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/i18n';

import LocaleSelect from '@/components/LocaleSelect.vue';
import { useLandingMotion } from '@/composables/useLandingMotion';
import { tools } from '@/lib/tools';
import { tagClass, ui } from '@/lib/ui';

const { t } = useI18n();
const query = ref('');

useLandingMotion();

const filteredTools = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((tool) => {
    const title = t(`tools.${tool.id}.title`).toLowerCase();
    const blurb = t(`tools.${tool.id}.blurb`).toLowerCase();
    return title.includes(q) || blurb.includes(q) || tool.tag.toLowerCase().includes(q);
  });
});

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <div class="ambient-blob"></div>
  </div>

  <header class="landing-bar sticky top-0 z-20 border-b border-line bg-bone/84 backdrop-blur-md">
    <div :class="[ui.wrapLanding, 'flex flex-wrap items-center justify-between gap-4 py-5']">
      <router-link
        class="landing-mark inline-flex items-center gap-2.5 text-ui font-medium tracking-tight text-ink no-underline"
        to="/"
      >
        <svg class="block" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="13" height="13" stroke="currentColor" stroke-width="1.6" />
          <path d="M1.5 6h13M6 1.5v13" stroke="currentColor" stroke-width="1.6" />
        </svg>
        {{ t('app.brand') }}
      </router-link>
      <div class="flex items-center gap-4">
        <span class="font-mono text-2xs tracking-tag text-muted uppercase">{{
          t('landing.meta', { n: tools.length })
        }}</span>
        <LocaleSelect />
      </div>
    </div>
  </header>

  <div :class="ui.wrapLanding">
    <section
      class="landing-hero grid min-h-auto grid-cols-1 items-center gap-10 py-16 hero:min-h-[calc(100vh-72px)] hero:grid-cols-[1.15fr_0.85fr] hero:gap-16 hero:py-32"
    >
      <div>
        <p :class="[ui.panelTitle, 'mb-5']">{{ t('landing.kicker') }}</p>
        <h1 class="mb-6 font-serif text-hero font-normal tracking-hero">
          <span class="hero-line block">{{ t('landing.heroLine1') }}</span>
          <span class="hero-line block">
            <em class="font-normal italic">{{ t('landing.heroLine2') }}</em>
          </span>
        </h1>
        <p class="hero-copy mb-8 max-w-[28em] text-base leading-[1.6] text-muted">{{ t('landing.copy') }}</p>
        <div class="hero-cta flex flex-wrap items-center gap-3.5">
          <a :class="ui.btnPrimary" href="#tools" @click.prevent="scrollToId('tools')">{{ t('landing.viewTools') }}</a>
          <a :class="ui.btnGhost" href="#cara-pakai" @click.prevent="scrollToId('cara-pakai')">{{
            t('landing.howToInstall')
          }}</a>
        </div>
      </div>

      <div class="os-window overflow-hidden rounded-md border border-line bg-surface">
        <div class="flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
          <div class="flex gap-1.5">
            <span class="size-2 rounded-full bg-line-strong"></span>
            <span class="size-2 rounded-full bg-line-strong"></span>
            <span class="size-2 rounded-full bg-line-strong"></span>
          </div>
          <span class="font-mono text-2xs text-muted">json-searcher.html</span>
        </div>
        <pre class="m-0 overflow-auto bg-surface px-5 py-6 font-mono text-xs leading-[1.65] text-ink">{
  <span class="tok-key">"nama"</span>: <span class="tok-string">"Budi Santoso"</span>,
  <span class="tok-key">"umur"</span>: <span class="tok-number">28</span>,
  <span class="tok-key">"kota"</span>: <span class="tok-string">"Jakarta"</span>,
  <span class="tok-key">"alamat"</span>: {
    <span class="tok-key">"jalan"</span>: <span class="tok-string">"Jl. Merdeka No. 1"</span>
  }
}</pre>
      </div>
    </section>
  </div>

  <section class="w-full max-w-7xl mx-auto border-y border-line px-5 py-24 tool:px-8 hero:px-10 hero:py-32" id="tools">
    <div class="landing-section-head" :class="ui.sectionHead">
      <div>
        <h2 :class="ui.sectionTitle">{{ t('landing.toolsTitle') }}</h2>
        <p class="mt-3 max-w-[28em] text-sm leading-[1.6] text-muted">
          {{ t('landing.toolsLead', { n: tools.length }) }}
        </p>
      </div>
      <div class="flex w-full min-w-0 max-w-md items-baseline gap-4 hero:w-96 hero:max-w-none">
        <input
          v-model="query"
          type="search"
          :class="[ui.search, 'min-w-0 flex-1']"
          :placeholder="t('landing.toolsSearch')"
          :aria-label="t('landing.toolsSearch')"
          autocomplete="off"
          spellcheck="false"
        />
        <span :class="ui.badge">{{ filteredTools.length }} / {{ tools.length }}</span>
      </div>
    </div>
    <div class="tool-grid grid w-full grid-cols-1 gap-4 tool:grid-cols-2 lg:grid-cols-4">
      <router-link
        v-for="tool in filteredTools"
        :key="tool.path"
        class="tool-item"
        :class="ui.toolCard"
        :to="tool.path"
      >
        <span>
          <span :class="tagClass(tool.tagClass)">{{ tool.tag }}</span>
        </span>
        <h2 :class="[ui.cardTitle, 'mb-2']">{{ t(`tools.${tool.id}.title`) }}</h2>
        <p class="m-0 text-sm leading-[1.6] text-muted">{{ t(`tools.${tool.id}.blurb`) }}</p>
      </router-link>
    </div>
    <p v-if="!filteredTools.length" :class="ui.empty">{{ t('landing.toolsEmpty') }}</p>
  </section>

  <div :class="ui.wrapLanding">
    <section class="py-24 hero:py-32" id="cara-pakai">
      <div class="landing-section-head" :class="ui.sectionHead">
        <h2 :class="ui.sectionTitle">{{ t('landing.howtoTitle') }}</h2>
        <p class="m-0 max-w-[28em] text-sm leading-[1.6] text-muted">{{ t('landing.howtoLead') }}</p>
      </div>
      <div class="howto-grid grid grid-cols-1 gap-4 hero:grid-cols-[1.15fr_0.85fr]">
        <article class="howto-card bg-paper" :class="ui.howtoCard">
          <h3 :class="[ui.cardTitle, 'mb-2.5']">{{ t('landing.dockerTitle') }}</h3>
          <i18n-t scope="global" keypath="landing.dockerBody" tag="p" class="m-0 max-w-[42em] text-sm leading-[1.6] text-muted">
            <template #port>
              <kbd>8080</kbd>
            </template>
            <template #url>
              <span class="font-mono">http://localhost:8080</span>
            </template>
          </i18n-t>
          <pre
            :class="ui.codeSnippet"
          ><span class="tok-cmd">docker</span> <span class="tok-sub">pull</span> <span class="tok-str">ghcr.io/cuytamvan/html-tools:latest</span>
<span class="tok-cmd">docker</span> <span class="tok-sub">run</span> <span class="tok-flag">--rm</span> <span class="tok-flag">-p</span> <span class="tok-num">8080</span>:<span class="tok-num">80</span> <span class="tok-str">ghcr.io/cuytamvan/html-tools:latest</span></pre>
        </article>
        <article class="howto-card bg-surface" :class="ui.howtoCard">
          <h3 :class="[ui.cardTitle, 'mb-2.5']">{{ t('landing.sourceTitle') }}</h3>
          <i18n-t
            scope="global"
            keypath="landing.sourceBody"
            tag="p"
            class="m-0 max-w-[42em] text-sm leading-[1.6] text-muted [&_a]:text-ink [&_a]:underline-offset-[3px]"
          >
            <template #repo>
              <a href="https://github.com/cuytamvan/html-tools">https://github.com/cuytamvan/html-tools</a>
            </template>
            <template #url>
              <span class="font-mono">http://localhost:5173</span>
            </template>
            <template #cmd>
              <span class="font-mono">docker build -t html-tools .</span>
            </template>
          </i18n-t>
          <pre
            :class="ui.codeSnippet"
          ><span class="tok-cmd">git</span> <span class="tok-sub">clone</span> <span class="tok-str">https://github.com/cuytamvan/html-tools.git</span>
<span class="tok-cmd">cd</span> <span class="tok-str">html-tools</span>
<span class="tok-cmd">bun</span> <span class="tok-sub">install</span>
<span class="tok-cmd">bun</span> <span class="tok-sub">run</span> <span class="tok-str">dev</span></pre>
        </article>
        <article class="howto-card col-span-1 bg-surface hero:col-span-full" :class="ui.howtoCard">
          <h3 :class="[ui.cardTitle, 'mb-2.5']">{{ t('landing.pwaTitle') }}</h3>
          <p class="m-0 max-w-[42em] text-sm leading-[1.6] text-muted">{{ t('landing.pwaBody') }}</p>
          <ol class="mt-5 list-none p-0">
            <li class="border-t border-line py-3.5 text-sm leading-[1.55] text-muted last:pb-0">
              <i18n-t scope="global" keypath="landing.pwaChrome" tag="span">
                <template #browser>
                  <b class="font-semibold text-ink">{{ t('landing.chromeEdge') }}</b>
                </template>
                <template #action>
                  <em class="font-serif text-ink italic">{{ t('landing.pwaInstall') }}</em>
                </template>
              </i18n-t>
            </li>
            <li class="border-t border-line py-3.5 text-sm leading-[1.55] text-muted last:pb-0">
              <i18n-t scope="global" keypath="landing.pwaSafariIos" tag="span">
                <template #browser>
                  <b class="font-semibold text-ink">{{ t('landing.safariIos') }}</b>
                </template>
                <template #action>
                  <em class="font-serif text-ink italic">{{ t('landing.pwaHome') }}</em>
                </template>
              </i18n-t>
            </li>
            <li class="border-t border-line py-3.5 text-sm leading-[1.55] text-muted last:pb-0">
              <i18n-t scope="global" keypath="landing.pwaSafariMac" tag="span">
                <template #browser>
                  <b class="font-semibold text-ink">{{ t('landing.safariMac') }}</b>
                </template>
                <template #action>
                  <em class="font-serif text-ink italic">{{ t('landing.pwaDock') }}</em>
                </template>
              </i18n-t>
            </li>
          </ol>
        </article>
      </div>
    </section>

    <footer class="flex flex-wrap items-center justify-between gap-4 border-t border-line py-8 pb-16">
      <p class="m-0 text-ui text-muted">{{ t('landing.foot') }}</p>
      <a :class="ui.btnGhostSm" href="#tools" @click.prevent="scrollToId('tools')">{{ t('landing.toTools') }}</a>
    </footer>
  </div>
</template>
