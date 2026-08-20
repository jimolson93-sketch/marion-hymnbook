(() => {
  const input = document.getElementById('searchInput');
  if (!input) return;

  function scrollVisibleHymnToTop(){
    const section = document.querySelector('.section:not(.hidden)');
    if (!section) return;
    const hymn = Array.from(section.querySelectorAll('.hymn.show'))
      .find(item => getComputedStyle(item).display !== 'none' && item.offsetParent !== null);
    if (!hymn) return;
    const title = hymn.querySelector('h3') || hymn;
    const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function afterKeyboardCloses(callback){
    let finished = false;
    const run = () => {
      if (finished) return;
      finished = true;
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', run);
      requestAnimationFrame(() => requestAnimationFrame(callback));
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', run, { once:true });
    }

    setTimeout(run, 320);
  }

  document.addEventListener('keydown', event => {
    if (event.target !== input || event.key !== 'Enter') return;
    if (input.getAttribute('inputmode') !== 'numeric') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    input.blur();
    afterKeyboardCloses(scrollVisibleHymnToTop);
  }, true);
})();
