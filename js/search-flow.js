(() => {
  function activeSection() {
    return Array.from(document.querySelectorAll('.section')).find(section =>
      !section.classList.contains('hidden') && getComputedStyle(section).display !== 'none'
    ) || null;
  }

  function isNumberMode(input) {
    return input?.getAttribute('inputmode') === 'numeric';
  }

  function hymnNumber(hymn) {
    return hymn?.querySelector('h3')?.textContent?.trim().match(/^\d+/)?.[0] || '';
  }

  function clearSection(section) {
    if (!section) return;
    section.querySelectorAll('.hymn.show').forEach(hymn => hymn.classList.remove('show'));
    section.querySelectorAll('.index.show').forEach(index => index.classList.remove('show'));
    document.body.classList.remove('show-all-mode');
    const indexBtn = document.getElementById('indexBtn');
    const showAllBtn = document.getElementById('showAllBtn');
    indexBtn?.classList.remove('active');
    showAllBtn?.classList.remove('active');
    indexBtn?.setAttribute('aria-pressed', 'false');
    showAllBtn?.setAttribute('aria-pressed', 'false');
  }

  function showNumber(value) {
    const input = document.getElementById('searchInput');
    if (!input || !isNumberMode(input)) return;

    const query = String(value).trim();
    const section = activeSection();
    if (!section) return;

    clearSection(section);
    if (!/^\d+$/.test(query)) return;

    const hymn = Array.from(section.querySelectorAll('.hymn'))
      .find(item => hymnNumber(item) === query);
    if (hymn) hymn.classList.add('show');
  }

  function selectCurrentNumber(input) {
    if (!input || !isNumberMode(input) || !/^\d+$/.test(input.value.trim())) return;
    requestAnimationFrame(() => {
      if (document.activeElement === input) input.select();
    });
  }

  document.addEventListener('mgh:data-ready', () => {
    const input = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (!input || !searchBtn) return;

    input.addEventListener('focus', () => selectCurrentNumber(input));
    input.addEventListener('click', () => selectCurrentNumber(input));

    searchBtn.addEventListener('click', () => {
      if (!isNumberMode(input)) return;
      showNumber(input.value);
    });

    document.querySelectorAll('.nav button[data-target]').forEach(button => {
      button.addEventListener('click', () => {
        if (!isNumberMode(input)) return;
        const preservedValue = input.value;
        setTimeout(() => {
          input.value = preservedValue;
          clearSection(activeSection());
        }, 0);
      });
    });
  }, { once: true });
})();
