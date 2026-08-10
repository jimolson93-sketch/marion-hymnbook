(() => {
  document.addEventListener('mgh:data-ready', () => {
    const search = document.getElementById('searchInput');
    const navButtons = Array.from(document.querySelectorAll('.nav button[data-target]'));
    if (!search || !navButtons.length) return;

    let pendingQuery = '';
    let pulseTimer = null;

    function hasSelectedBook() {
      return navButtons.some(btn => btn.classList.contains('active'));
    }

    function stopPulse() {
      navButtons.forEach(btn => btn.classList.remove('needs-selection'));
      if (pulseTimer) {
        clearTimeout(pulseTimer);
        pulseTimer = null;
      }
    }

    function promptForBook() {
      stopPulse();
      navButtons.forEach(btn => btn.classList.add('needs-selection'));
      pulseTimer = setTimeout(stopPulse, 1400);
    }

    search.addEventListener('input', () => {
      const value = search.value.trim();
      if (hasSelectedBook() || !value) {
        if (hasSelectedBook()) pendingQuery = '';
        stopPulse();
        return;
      }

      pendingQuery = value;
      promptForBook();
    }, true);

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const query = pendingQuery || search.value.trim();
        stopPulse();
        if (!query) return;

        // Existing book-switch logic clears the search field shortly after selection.
        // Restore the number after that reset, then trigger the normal instant search.
        setTimeout(() => {
          search.value = query;
          search.dispatchEvent(new Event('input', { bubbles: true }));
          pendingQuery = '';
        }, 35);
      });
    });
  }, { once: true });
})();
