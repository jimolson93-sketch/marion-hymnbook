(() => {
  const STORAGE_KEY = 'mghLastHymnBook';
  const DEFAULT_BOOK = 'section1';
  const VALID_BOOKS = new Set(['section1', 'section2', 'section3']);

  function getSavedBook() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return VALID_BOOKS.has(value) ? value : DEFAULT_BOOK;
    } catch (e) {
      return DEFAULT_BOOK;
    }
  }

  function saveBook(sectionId) {
    try { localStorage.setItem(STORAGE_KEY, sectionId); } catch (e) {}
  }

  document.addEventListener('mgh:data-ready', () => {
    const search = document.getElementById('searchInput');
    const searchRow = document.querySelector('.search-row');
    const navButtons = Array.from(document.querySelectorAll('.nav button[data-target]'));
    if (!search || !searchRow || !navButtons.length) return;

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => saveBook(btn.dataset.target));
    });

    // New installs start in New Believers. Returning users resume their last book.
    const selectedBook = getSavedBook();
    const selectedButton = navButtons.find(btn => btn.dataset.target === selectedBook)
      || navButtons.find(btn => btn.dataset.target === DEFAULT_BOOK)
      || navButtons[0];

    if (selectedButton) setTimeout(() => selectedButton.click(), 0);
  }, { once: true });
})();
