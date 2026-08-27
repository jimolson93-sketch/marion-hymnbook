(() => {
  const STORAGE_KEY = 'mgh-reading-font';

  function readMode(){
    try{
      return localStorage.getItem(STORAGE_KEY) === 'accessible' ? 'accessible' : 'default';
    }catch(_){
      return 'default';
    }
  }

  function applyMode(mode, persist = true){
    mode = mode === 'accessible' ? 'accessible' : 'default';
    document.documentElement.dataset.readingFont = mode;
    const button = document.querySelector('.reading-font-toggle');
    if(button){
      const active = mode === 'accessible';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if(persist){
      try{ localStorage.setItem(STORAGE_KEY, mode); }catch(_){}
    }
  }

  function buildControls(){
    const appearance = document.querySelector('.appearance-controls');
    if(!appearance || document.querySelector('.reading-font-controls')) return;

    const wrap = document.createElement('div');
    wrap.className = 'reading-font-controls';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reading-font-toggle';
    button.textContent = 'Aa Clarity';
    button.setAttribute('aria-label','Use clarity reading font');
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click', () => {
      applyMode(readMode() === 'accessible' ? 'default' : 'accessible', true);
    });

    wrap.appendChild(button);
    appearance.insertBefore(wrap, appearance.firstChild);
    applyMode(readMode(), false);
  }

  const initial = readMode();
  document.documentElement.dataset.readingFont = initial;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildControls, {once:true});
  else buildControls();
})();
