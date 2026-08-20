import { nextTick, onMounted, onUnmounted } from 'vue';

export function useReveal(): void {
  let io: IntersectionObserver | null = null;

  onMounted(() => {
    nextTick(() => {
      const nodes = document.querySelectorAll('.reveal');
      if (!nodes.length) return;
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            io?.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      nodes.forEach((el, i) => {
        (el as HTMLElement).style.setProperty('--index', String(i));
        io?.observe(el);
      });
    });
  });

  onUnmounted(() => {
    io?.disconnect();
    io = null;
  });
}
