(() => {
  const PHONE_QUERY = '(max-width:600px)';
  let resizeTimer = null;

  function formatIndex(index) {
    if (!index) return;

    index.querySelectorAll('a').forEach(link => {
      if (!link.classList.contains('index-entry')) {
        const text = (link.textContent || '').trim();
        const match = text.match(/^(\d+)\s+(.*)$/);
        if (!match) return;

        const number = document.createElement('span');
        number.className = 'index-number';
        number.textContent = match[1];

        const title = document.createElement('span');
        title.className = 'index-title';
        title.textContent = match[2];
        title.dataset.fullTitle = match[2];

        link.textContent = '';
        link.classList.add('index-entry');
        link.append(number, title);
      }
    });

    fitVisibleTitles(index);
  }

  function fitVisibleTitles(index) {
    const isPhone = window.matchMedia(PHONE_QUERY).matches;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    index.querySelectorAll('.index-title').forEach(title => {
      const fullTitle = title.dataset.fullTitle || title.textContent || '';
      title.dataset.fullTitle = fullTitle;

      if (!isPhone) {
        title.textContent = fullTitle;
        return;
      }

      const available = title.clientWidth;
      if (!available || !context) {
        title.textContent = fullTitle;
        return;
      }

      const style = getComputedStyle(title);
      context.font = style.font;

      if (context.measureText(fullTitle).width <= available) {
        title.textContent = fullTitle;
        return;
      }

      const words = fullTitle.split(/\s+/).filter(Boolean);
      while (words.length > 1 && context.measureText(words.join(' ')).width > available) {
        words.pop();
      }
      title.textContent = words.join(' ');
    });
  }

  function refreshVisibleIndexes() {
    document.querySelectorAll('.index.show').forEach(formatIndex);
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#indexBtn')) return;
    setTimeout(refreshVisibleIndexes, 0);
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshVisibleIndexes, 120);
  });
})();
