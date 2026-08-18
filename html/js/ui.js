(function () {
  'use strict';
  var nodes = document.querySelectorAll('.reveal');
  if (!nodes.length) return;
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  nodes.forEach(function (el, i) {
    el.style.setProperty('--index', String(i));
    io.observe(el);
  });
})();
