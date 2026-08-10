(() => {
  const books = [
    { id: 'section1', url: 'data/new-believers.html' },
    { id: 'section2', url: 'data/gospel.html' }
  ];

  function showLoadError(message) {
    document.querySelectorAll('.data-loading').forEach(el => {
      el.textContent = message;
      el.classList.add('data-load-error');
    });
  }

  async function loadHymnBooks() {
    try {
      const responses = await Promise.all(books.map(book => fetch(book.url, { cache: 'default' })));
      const failed = responses.find(response => !response.ok);
      if (failed) throw new Error(`Hymn data request failed: ${failed.status}`);

      const fragments = await Promise.all(responses.map(response => response.text()));
      books.forEach((book, index) => {
        const section = document.getElementById(book.id);
        if (!section) throw new Error(`Missing section: ${book.id}`);
        section.innerHTML = fragments[index];
      });

      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'js/app.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load app logic.'));
        document.body.appendChild(script);
      });

      // Run only the handlers that originally waited for DOMContentLoaded.
      document.dispatchEvent(new Event('mgh:data-ready'));
    } catch (error) {
      console.error(error);
      showLoadError('Unable to load hymns. Please refresh the page.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHymnBooks, { once: true });
  } else {
    loadHymnBooks();
  }
})();
