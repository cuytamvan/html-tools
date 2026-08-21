<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import LocaleSelect from '@/components/LocaleSelect.vue';
import { useLandingMotion } from '@/composables/useLandingMotion';
import { tools } from '@/lib/tools';

const { t } = useI18n();

useLandingMotion();

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function tagClass(kind: string) {
  return kind ? `tag ${kind}` : 'tag';
}
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <div class="ambient-blob"></div>
  </div>

  <header class="landing-bar">
    <div class="wrap landing-bar-inner">
      <router-link class="landing-mark" to="/">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="13" height="13" stroke="currentColor" stroke-width="1.6" />
          <path d="M1.5 6h13M6 1.5v13" stroke="currentColor" stroke-width="1.6" />
        </svg>
        {{ t('app.brand') }}
      </router-link>
      <div class="landing-bar-actions">
        <span class="meta">{{ t('landing.meta', { n: tools.length }) }}</span>
        <LocaleSelect />
      </div>
    </div>
  </header>

  <div class="wrap">
    <section class="landing-hero">
      <div>
        <p class="panel-title landing-kicker">{{ t('landing.kicker') }}</p>
        <h1>
          <span class="hero-line">{{ t('landing.heroLine1') }}</span>
          <span class="hero-line"><em>{{ t('landing.heroLine2') }}</em></span>
        </h1>
        <p class="hero-copy">{{ t('landing.copy') }}</p>
        <div class="hero-cta">
          <a class="btn-primary" href="#tools" @click.prevent="scrollToId('tools')">{{ t('landing.viewTools') }}</a>
          <a class="btn-ghost" href="#cara-pakai" @click.prevent="scrollToId('cara-pakai')">{{ t('landing.howToInstall') }}</a>
        </div>
      </div>

      <div class="os-window" aria-hidden="true">
        <div class="os-bar">
          <div class="os-dots">
            <span class="os-dot"></span>
            <span class="os-dot"></span>
            <span class="os-dot"></span>
          </div>
          <span class="os-title">json-searcher.html</span>
        </div>
        <pre class="os-body">{
  <span class="tok-key">"nama"</span>: <span class="tok-string">"Budi Santoso"</span>,
  <span class="tok-key">"umur"</span>: <span class="tok-number">28</span>,
  <span class="tok-key">"kota"</span>: <span class="tok-string">"Jakarta"</span>,
  <span class="tok-key">"alamat"</span>: {
    <span class="tok-key">"jalan"</span>: <span class="tok-string">"Jl. Merdeka No. 1"</span>
  }
}</pre>
      </div>
    </section>

    <section class="landing-section" id="tools">
      <div class="landing-section-head">
        <h2>{{ t('landing.toolsTitle') }}</h2>
        <p>{{ t('landing.toolsLead') }}</p>
      </div>
      <div class="tool-grid">
        <router-link v-for="tool in tools" :key="tool.path" class="tool-item" :to="tool.path">
          <span>
            <span :class="tagClass(tool.tagClass)">{{ tool.tag }}</span>
          </span>
          <h2>{{ t(`tools.${tool.id}.title`) }}</h2>
          <p>{{ t(`tools.${tool.id}.blurb`) }}</p>
        </router-link>
      </div>
    </section>

    <section class="landing-section" id="cara-pakai">
      <div class="landing-section-head">
        <h2>{{ t('landing.howtoTitle') }}</h2>
        <p>{{ t('landing.howtoLead') }}</p>
      </div>
      <div class="howto-grid">
        <article class="howto-card">
          <h3>{{ t('landing.dockerTitle') }}</h3>
          <i18n-t keypath="landing.dockerBody" tag="p">
            <template #port>
              <kbd>8080</kbd>
            </template>
            <template #url>
              <span class="mono">http://localhost:8080</span>
            </template>
          </i18n-t>
          <pre class="howto-code"><span class="tok-cmd">docker</span> <span class="tok-sub">pull</span> <span class="tok-str">ghcr.io/cuytamvan/html-tools:latest</span>
<span class="tok-cmd">docker</span> <span class="tok-sub">run</span> <span class="tok-flag">--rm</span> <span class="tok-flag">-p</span> <span class="tok-num">8080</span>:<span class="tok-num">80</span> <span class="tok-str">ghcr.io/cuytamvan/html-tools:latest</span></pre>
        </article>
        <article class="howto-card">
          <h3>{{ t('landing.sourceTitle') }}</h3>
          <i18n-t keypath="landing.sourceBody" tag="p">
            <template #repo>
              <a href="https://github.com/cuytamvan/html-tools">https://github.com/cuytamvan/html-tools</a>
            </template>
            <template #url>
              <span class="mono">http://localhost:5173</span>
            </template>
            <template #cmd>
              <span class="mono">docker build -t html-tools .</span>
            </template>
          </i18n-t>
          <pre class="howto-code"><span class="tok-cmd">git</span> <span class="tok-sub">clone</span> <span class="tok-str">https://github.com/cuytamvan/html-tools.git</span>
<span class="tok-cmd">cd</span> <span class="tok-str">html-tools</span>
<span class="tok-cmd">bun</span> <span class="tok-sub">install</span>
<span class="tok-cmd">bun</span> <span class="tok-sub">run</span> <span class="tok-str">dev</span></pre>
        </article>
        <article class="howto-card howto-card-wide">
          <h3>{{ t('landing.pwaTitle') }}</h3>
          <p>{{ t('landing.pwaBody') }}</p>
          <ol class="howto-list">
            <li>
              <i18n-t keypath="landing.pwaChrome" tag="span">
                <template #browser>
                  <b>{{ t('landing.chromeEdge') }}</b>
                </template>
                <template #action>
                  <em>{{ t('landing.pwaInstall') }}</em>
                </template>
              </i18n-t>
            </li>
            <li>
              <i18n-t keypath="landing.pwaSafariIos" tag="span">
                <template #browser>
                  <b>{{ t('landing.safariIos') }}</b>
                </template>
                <template #action>
                  <em>{{ t('landing.pwaHome') }}</em>
                </template>
              </i18n-t>
            </li>
            <li>
              <i18n-t keypath="landing.pwaSafariMac" tag="span">
                <template #browser>
                  <b>{{ t('landing.safariMac') }}</b>
                </template>
                <template #action>
                  <em>{{ t('landing.pwaDock') }}</em>
                </template>
              </i18n-t>
            </li>
          </ol>
        </article>
      </div>
    </section>

    <footer class="landing-foot">
      <p>{{ t('landing.foot') }}</p>
      <a class="btn-ghost btn-sm" href="#tools" @click.prevent="scrollToId('tools')">{{ t('landing.toTools') }}</a>
    </footer>
  </div>
</template>
