(() => {
  const PHONE_QUERY = '(max-width:700px)';

  function buildBookPicker() {
    const nav = document.querySelector('.nav[role="tablist"]');
    if (!nav || document.querySelector('.mobile-book-picker')) return;

    const picker = document.createElement('div');
    picker.className = 'mobile-book-picker';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-book-picker-toggle';
    toggle.textContent = 'Choose Hymn Book';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');

    const drawer = document.createElement('div');
    drawer.className = 'mobile-book-picker-drawer';
    drawer.setAttribute('aria-hidden', 'true');

    const sourceButtons = Array.from(nav.querySelectorAll('button[data-target]'));

    function closePicker() {
      picker.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
    }

    function syncSelection(sourceButton) {
      if (!sourceButton) return;
      const selectedIndex = Math.max(0, sourceButtons.indexOf(sourceButton));
      toggle.textContent = sourceButton.textContent.trim();
      picker.classList.add('has-selection');
      picker.style.setProperty('--selected-index', selectedIndex);
      drawer.querySelectorAll('.mobile-book-picker-option').forEach(option => {
        const active = option.dataset.target === sourceButton.dataset.target;
        option.classList.toggle('active', active);
        option.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }

    sourceButtons.forEach(sourceButton => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'mobile-book-picker-option';
      option.dataset.target = sourceButton.dataset.target;
      option.textContent = sourceButton.textContent.trim();
      option.addEventListener('click', () => {
        sourceButton.click();
        syncSelection(sourceButton);
        closePicker();
      });
      drawer.appendChild(option);

      sourceButton.addEventListener('click', () => {
        syncSelection(sourceButton);
        closePicker();
      });
    });

    toggle.addEventListener('click', () => {
      const open = !picker.classList.contains('open');
      picker.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    });

    document.addEventListener('click', event => {
      if (!picker.contains(event.target)) closePicker();
    });

    picker.append(toggle, drawer);
    nav.parentNode.insertBefore(picker, nav);
  }

  function buildScrollFades() {
    if (document.querySelector('.mobile-scroll-fade')) return;

    const topFade = document.createElement('div');
    topFade.className = 'mobile-scroll-fade top';
    topFade.setAttribute('aria-hidden', 'true');

    const bottomFade = document.createElement('div');
    bottomFade.className = 'mobile-scroll-fade bottom';
    bottomFade.setAttribute('aria-hidden', 'true');

    document.body.append(topFade, bottomFade);

    let hideTimer = null;

    function hide() {
      topFade.classList.remove('visible');
      bottomFade.classList.remove('visible');
    }

    function showForScroll() {
      if (!window.matchMedia(PHONE_QUERY).matches) {
        hide();
        return;
      }

      const root = document.documentElement;
      const y = window.scrollY || root.scrollTop || 0;
      const max = Math.max(0, root.scrollHeight - window.innerHeight);

      topFade.classList.toggle('visible', y > 6);
      bottomFade.classList.toggle('visible', max - y > 6);

      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 220);
    }

    window.addEventListener('scroll', showForScroll, { passive: true });
    window.addEventListener('resize', hide, { passive: true });
  }

  function init() {
    buildBookPicker();
    buildScrollFades();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
