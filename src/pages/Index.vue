<script setup lang="ts">
import { tools } from '@/lib/tools';
import { useLandingMotion } from '@/composables/useLandingMotion';

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
        HTML Tools
      </router-link>
      <span class="meta">{{ tools.length }} tools · browser</span>
    </div>
  </header>

  <div class="wrap">
    <section class="landing-hero">
      <div>
        <p class="panel-title landing-kicker">Utilitas lokal</p>
        <h1>
          <span class="hero-line">Alat kecil untuk</span>
          <span class="hero-line"><em>kerja sehari-hari.</em></span>
        </h1>
        <p class="hero-copy">
          JSON, CSV, regex, tipe, user-agent, gaji, hash, dan boilerplate. Semua berjalan di browser. Tidak ada akun,
          tidak ada backend.
        </p>
        <div class="hero-cta">
          <a class="btn-primary" href="#tools" @click.prevent="scrollToId('tools')">Lihat tools</a>
          <a class="btn-ghost" href="#cara-pakai" @click.prevent="scrollToId('cara-pakai')">Cara install</a>
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
        <h2>Tools</h2>
        <p>Sembilan halaman, masing-masing satu pekerjaan. Buka, pakai, tutup.</p>
      </div>
      <div class="tool-grid">
        <router-link v-for="tool in tools" :key="tool.path" class="tool-item" :to="tool.path">
          <span>
            <span :class="tagClass(tool.tagClass)">{{ tool.tag }}</span>
          </span>
          <h2>{{ tool.title }}</h2>
          <p>{{ tool.blurb }}</p>
        </router-link>
      </div>
    </section>

    <section class="landing-section" id="cara-pakai">
      <div class="landing-section-head">
        <h2>Cara pakai</h2>
        <p>Dari install sampai jalan. Pilih image Docker, clone repo, atau pasang sebagai aplikasi.</p>
      </div>
      <div class="howto-grid">
        <article class="howto-card">
          <h3>01 docker</h3>
          <p>
            Pull image lalu jalankan. Port <kbd>8080</kbd> di host mengarah ke nginx di dalam container. Buka
            <span class="mono">http://localhost:8080</span>.
          </p>
          <pre class="howto-code"><span class="tok-cmd">docker</span> <span class="tok-sub">pull</span> <span class="tok-str">ghcr.io/cuytamvan/html-tools:latest</span>
<span class="tok-cmd">docker</span> <span class="tok-sub">run</span> <span class="tok-flag">--rm</span> <span class="tok-flag">-p</span> <span class="tok-num">8080</span>:<span class="tok-num">80</span> <span class="tok-str">ghcr.io/cuytamvan/html-tools:latest</span></pre>
        </article>
        <article class="howto-card">
          <h3>02 source</h3>
          <p>
            Ambil source dari
            <a href="https://github.com/cuytamvan/html-tools">https://github.com/cuytamvan/html-tools</a>, install, lalu
            jalankan Vite. Buka <span class="mono">http://localhost:5173</span>. Image sendiri: <span class="mono">docker build -t html-tools .</span>
          </p>
          <pre class="howto-code"><span class="tok-cmd">git</span> <span class="tok-sub">clone</span> <span class="tok-str">https://github.com/cuytamvan/html-tools.git</span>
<span class="tok-cmd">cd</span> <span class="tok-str">html-tools</span>
<span class="tok-cmd">bun</span> <span class="tok-sub">install</span>
<span class="tok-cmd">bun</span> <span class="tok-sub">run</span> <span class="tok-str">dev</span></pre>
        </article>
        <article class="howto-card howto-card-wide">
          <h3>03 pwa</h3>
          <p>
            Setelah halaman terbuka di browser (localhost atau HTTPS), HTML Tools bisa dipasang ke layar utama. Tidak
            perlu Docker lagi untuk pemakaian sehari-hari.
          </p>
          <ol class="howto-list">
            <li>
              <b>Chrome / Edge.</b> Di address bar, pilih ikon install, atau menu lalu <em>Install HTML Tools</em>.
            </li>
            <li><b>Safari di iPhone.</b> Tombol Bagikan, lalu <em>Add to Home Screen</em>.</li>
            <li><b>Safari di Mac.</b> File, lalu <em>Add to Dock</em>.</li>
          </ol>
        </article>
      </div>
    </section>

    <footer class="landing-foot">
      <p>HTML Tools. Static, lokal, tanpa akun.</p>
      <a class="btn-ghost btn-sm" href="#tools" @click.prevent="scrollToId('tools')">Ke daftar tools</a>
    </footer>
  </div>
</template>
