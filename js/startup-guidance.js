(() => {
  const STORAGE_KEY = 'mghLastHymnBook';

  function getSavedBook() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'section1' || value === 'section2' ? value : '';
    } catch (e) {
      return '';
    }
  }

  function saveBook(sectionId) {
    try { localStorage.setItem(STORAGE_KEY, sectionId); } catch (e) {}
  }

  document.addEventListener('mgh:data-ready', () => {
    const body = document.body;
    const search = document.getElementById('searchInput');
    const searchRow = document.querySelector('.search-row');
    const navButtons = Array.from(document.querySelectorAll('.nav button[data-target]'));
    if (!body || !search || !searchRow || !navButtons.length) return;

    let leavingCover = false;

    function enterCover() {
      body.classList.add('hymnbook-cover');
      navButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.section').forEach(section => section.classList.add('hidden'));
      searchRow.style.display = 'none';
      document.getElementById('settingsDrawer')?.classList.remove('open');
    }

    function leaveCover(selectedButton, focusSearch) {
      if (!body.classList.contains('hymnbook-cover') || leavingCover) return;
      leavingCover = true;

      saveBook(selectedButton.dataset.target);
      body.classList.add('hymnbook-cover-opening');
      body.classList.remove('hymnbook-cover');

      // The normal hymn-book click handler has already revealed the controls.
      // Focus during the same user gesture where possible so iOS can show the keyboard.
      if (focusSearch) {
        requestAnimationFrame(() => {
          try { search.focus({ preventScroll: true }); } catch (e) { search.focus(); }
        });
      }

      setTimeout(() => {
        body.classList.remove('hymnbook-cover-opening');
        leavingCover = false;
      }, 260);
    }

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        saveBook(btn.dataset.target);
        if (body.classList.contains('hymnbook-cover')) {
          leaveCover(btn, true);
        }
      });
    });

    const savedBook = getSavedBook();

    if (!savedBook) {
      enterCover();
      return;
    }

    // Returning users go straight to their last-used hymn book.
    const savedButton = navButtons.find(btn => btn.dataset.target === savedBook);
    if (savedButton) {
      setTimeout(() => savedButton.click(), 0);
    } else {
      enterCover();
    }
  }, { once: true });
})();
