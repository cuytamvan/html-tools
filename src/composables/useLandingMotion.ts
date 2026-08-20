import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onMounted, onUnmounted } from 'vue';

export function useLandingMotion(): void {
  onMounted(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);

    const blob = document.querySelector('.ambient-blob');
    const bar = document.querySelector('.landing-bar');
    const lines = document.querySelectorAll('.hero-line');
    const copy = document.querySelector('.hero-copy');
    const cta = document.querySelector('.hero-cta');
    const windowEl = document.querySelector('.os-window');
    const tools = document.querySelectorAll('.tool-item');
    const notes = document.querySelectorAll('.note-card, .howto-card');
    const sectionHeads = document.querySelectorAll('.landing-section-head');
    const ease = 'power3.out';

    gsap.set([bar, lines, copy, cta, windowEl], { opacity: 0, y: 12 });
    gsap.set(tools, { opacity: 0, y: 12 });
    gsap.set(notes, { opacity: 0, y: 12 });
    gsap.set(sectionHeads, { opacity: 0, y: 12 });

    const intro = gsap.timeline({ defaults: { ease, duration: 0.7 } });
    intro
      .to(bar, { opacity: 1, y: 0, duration: 0.5 })
      .to(lines, { opacity: 1, y: 0, stagger: 0.08 }, '-=0.15')
      .to(copy, { opacity: 1, y: 0 }, '-=0.45')
      .to(cta, { opacity: 1, y: 0 }, '-=0.5')
      .to(windowEl, { opacity: 1, y: 0, duration: 0.9 }, '-=0.55');

    if (blob) {
      gsap.to(blob, {
        xPercent: 16,
        yPercent: 12,
        duration: 26,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    gsap.to(tools, {
      opacity: 1,
      y: 0,
      stagger: 0.08,
      duration: 0.7,
      ease,
      scrollTrigger: {
        trigger: '.tool-grid',
        start: 'top 82%',
        once: true,
      },
    });

    sectionHeads.forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      });
    });

    gsap.to(notes, {
      opacity: 1,
      y: 0,
      stagger: 0.08,
      duration: 0.7,
      ease,
      scrollTrigger: {
        trigger: '.howto-grid',
        start: 'top 82%',
        once: true,
      },
    });

    if (windowEl) {
      gsap.to(windowEl, {
        y: -18,
        ease: 'none',
        scrollTrigger: {
          trigger: '.landing-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  });

  onUnmounted(() => {
    ScrollTrigger.getAll().forEach((st) => st.kill());
    gsap.killTweensOf('*');
  });
}
