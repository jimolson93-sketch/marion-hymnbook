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

  function normalizeGospel136Chorus(section) {
    const hymn = section.querySelector('article.hymn[id="136"], article.hymn[id="hymn-136"]');
    if (!hymn) return;

    const verseStarts = Array.from(hymn.querySelectorAll('p.verse.main'));
    if (verseStarts.length < 2) return;

    const chorus = [];
    let node = verseStarts[0].nextElementSibling;
    while (node && node !== verseStarts[1]) {
      if (node.matches('p.verse.indent-2')) chorus.push(node);
      node = node.nextElementSibling;
    }
    if (!chorus.length) return;

    // Gospel 136 currently stores the chorus only after verse 1. Repeat it
    // after later verses, but remain a no-op if the source data is corrected.
    for (let i = 1; i < verseStarts.length; i += 1) {
      const nextStart = verseStarts[i + 1] || null;
      let cursor = verseStarts[i].nextElementSibling;
      let last = verseStarts[i];
      let hasChorus = false;

      while (cursor && cursor !== nextStart) {
        if (cursor.matches('p.verse.indent-2')) hasChorus = true;
        last = cursor;
        cursor = cursor.nextElementSibling;
      }

      if (hasChorus) continue;

      chorus.forEach((line) => {
        const clone = line.cloneNode(true);
        last.insertAdjacentElement('afterend', clone);
        last = clone;
      });
    }
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
      if (book.id === 'section2') normalizeGospel136Chorus(section);
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
