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
      toggle.textContent = sourceButton.textContent.trim();
      picker.classList.add('has-selection');
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

    const GESTURE_START_PX = 8;
    const VERTICAL_RATIO = 1.15;
    const SCROLL_END_MS = 180;
    let scrollEndTimer = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let gestureMode = null;
    let fingerDown = false;
    let userScrollSession = false;

    function hide() {
      topFade.classList.remove('visible');
      bottomFade.classList.remove('visible');
    }

    function cancelScrollSession() {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = null;
      gestureMode = null;
      fingerDown = false;
      userScrollSession = false;
      hide();
    }

    function endScrollSessionSoon() {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        userScrollSession = false;
        gestureMode = null;
        hide();
      }, SCROLL_END_MS);
    }

    function showForUserScroll() {
      if (!userScrollSession || !window.matchMedia(PHONE_QUERY).matches) {
        hide();
        return;
      }

      const root = document.documentElement;
      const y = window.scrollY || root.scrollTop || 0;
      const max = Math.max(0, root.scrollHeight - window.innerHeight);

      topFade.classList.toggle('visible', y > 6);
      bottomFade.classList.toggle('visible', max - y > 6);

      if (!fingerDown) endScrollSessionSoon();
    }

    document.addEventListener('touchstart', event => {
      if (event.touches.length !== 1 || !window.matchMedia(PHONE_QUERY).matches) {
        cancelScrollSession();
        return;
      }

      clearTimeout(scrollEndTimer);
      scrollEndTimer = null;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      gestureMode = null;
      fingerDown = true;
      userScrollSession = false;
      hide();
    }, { passive: true });

    document.addEventListener('touchmove', event => {
      if (!fingerDown || event.touches.length !== 1 || !window.matchMedia(PHONE_QUERY).matches) return;

      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (!gestureMode) {
        if (Math.max(absX, absY) < GESTURE_START_PX) return;
        gestureMode = absY > absX * VERTICAL_RATIO ? 'vertical' : 'other';
        userScrollSession = gestureMode === 'vertical';
        if (!userScrollSession) {
          hide();
          return;
        }
      }

      if (userScrollSession) showForUserScroll();
    }, { passive: true });

    document.addEventListener('touchend', () => {
      fingerDown = false;
      if (userScrollSession) endScrollSessionSoon();
      else {
        gestureMode = null;
        hide();
      }
    }, { passive: true });

    document.addEventListener('touchcancel', cancelScrollSession, { passive: true });

    window.addEventListener('scroll', () => {
      if (!userScrollSession) return;
      showForUserScroll();
    }, { passive: true });

    window.addEventListener('resize', cancelScrollSession, { passive: true });
    window.addEventListener('blur', cancelScrollSession, { passive: true });
    window.addEventListener('pagehide', cancelScrollSession, { passive: true });
    window.addEventListener('pageshow', cancelScrollSession, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') cancelScrollSession();
      else hide();
    });
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
