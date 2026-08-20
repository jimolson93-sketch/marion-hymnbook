(() => {
  const input = document.getElementById('searchInput');
  if (!input) return;

  document.addEventListener('keydown', event => {
    if (event.target !== input || event.key !== 'Enter') return;
    if (input.getAttribute('inputmode') !== 'numeric') return;

    event.preventDefault();
    event.stopPropagation();
    input.blur();

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const section = document.querySelector('.section:not(.hidden)');
      if (!section) return;
      const hymn = Array.from(section.querySelectorAll('.hymn.show'))
        .find(item => getComputedStyle(item).display !== 'none');
      if (!hymn) return;
      const title = hymn.querySelector('h3') || hymn;
      const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }));
  }, true);
})();
