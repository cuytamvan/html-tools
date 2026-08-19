(function () {
  'use strict';

  if (typeof gsap === 'undefined') return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var blob = document.querySelector('.ambient-blob');
  var bar = document.querySelector('.landing-bar');
  var lines = document.querySelectorAll('.hero-line');
  var copy = document.querySelector('.hero-copy');
  var cta = document.querySelector('.hero-cta');
  var windowEl = document.querySelector('.os-window');
  var tools = document.querySelectorAll('.tool-item');
  var notes = document.querySelectorAll('.note-card, .howto-card');
  var sectionHeads = document.querySelectorAll('.landing-section-head');

  if (reduce) return;

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  var ease = 'power3.out';

  gsap.set([bar, lines, copy, cta, windowEl], { opacity: 0, y: 12 });
  gsap.set(tools, { opacity: 0, y: 12 });
  gsap.set(notes, { opacity: 0, y: 12 });
  gsap.set(sectionHeads, { opacity: 0, y: 12 });

  var intro = gsap.timeline({ defaults: { ease: ease, duration: 0.7 } });
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

  if (typeof ScrollTrigger === 'undefined') return;

  gsap.to(tools, {
    opacity: 1,
    y: 0,
    stagger: 0.08,
    duration: 0.7,
    ease: ease,
    scrollTrigger: {
      trigger: '.tool-grid',
      start: 'top 82%',
      once: true,
    },
  });

  sectionHeads.forEach(function (el) {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: ease,
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
    ease: ease,
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
})();
