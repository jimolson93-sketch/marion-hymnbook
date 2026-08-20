(() => {
  function formatIndex(index) {
    if (!index) return;

    index.querySelectorAll('a').forEach(link => {
      if (link.classList.contains('index-entry')) return;

      const text = (link.textContent || '').trim();
      const match = text.match(/^(\d+)\s+(.*)$/);
      if (!match) return;

      const number = document.createElement('span');
      number.className = 'index-number';
      number.textContent = match[1];

      const title = document.createElement('span');
      title.className = 'index-title';
      title.textContent = match[2];

      link.textContent = '';
      link.classList.add('index-entry');
      link.append(number, title);
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#indexBtn')) return;
    setTimeout(() => {
      document.querySelectorAll('.index.show').forEach(formatIndex);
    }, 0);
  });
})();
