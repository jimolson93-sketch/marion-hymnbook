(() => {
  const books = [
    { id: 'section1', url: 'data/new-believers.html' },
    { id: 'section2', url: 'data/gospel.html' },
    { id: 'section3', url: 'data/believers.html', idPrefix: 'believers-' }
  ];

  function showBookLoadError(section, error) {
    console.error(error);
    if (!section) return;
    const loading = section.querySelector('.data-loading') || section;
    loading.textContent = 'Unable to load this hymn book. Please refresh the page.';
    loading.classList.add('data-load-error');
  }

  async function loadBook(book) {
    const section = document.getElementById(book.id);
    if (!section) {
      console.error(`Missing section: ${book.id}`);
      return;
    }

    try {
      const response = await fetch(book.url, { cache: 'default' });
      if (!response.ok) throw new Error(`Hymn data request failed: ${response.status}`);

      let fragment = await response.text();

      // The three books share hymn numbers. Give Believers unique DOM ids so
      // index links always stay inside the selected book.
      if (book.idPrefix) {
        fragment = fragment.replace(/id="hymn-/g, `id="${book.idPrefix}hymn-`);
      }

      section.innerHTML = fragment;
    } catch (error) {
      showBookLoadError(section, error);
    }
  }

  async function loadHymnBooks() {
    // Each book handles its own failure so one bad data file can never prevent
    // the other hymn books from loading.
    await Promise.all(books.map(loadBook));

    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'js/app.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load app logic.'));
        document.body.appendChild(script);
      });

      document.dispatchEvent(new Event('mgh:data-ready'));
    } catch (error) {
      console.error(error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHymnBooks, { once: true });
  } else {
    loadHymnBooks();
  }
})();
