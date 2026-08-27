(() => {
  const STORAGE_KEY = 'mgh-reading-font';

  function readMode(){
    try{return localStorage.getItem(STORAGE_KEY) === 'accessible' ? 'accessible' : 'default';}
    catch(_){return 'default';}
  }

  function applyMode(mode, persist = true){
    mode = mode === 'accessible' ? 'accessible' : 'default';
    document.documentElement.dataset.readingFont = mode;
    const button = document.querySelector('.reading-font-toggle');
    if(button){
      const active = mode === 'accessible';
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
    }
    if(persist){try{localStorage.setItem(STORAGE_KEY, mode);}catch(_){}}
  }

  function init(){
    const button = document.querySelector('.reading-font-toggle');
    if(button && !button.dataset.bound){
      button.dataset.bound = 'true';
      button.addEventListener('click', () => applyMode(readMode() === 'accessible' ? 'default' : 'accessible', true));
    }
    applyMode(readMode(), false);
  }

  document.documentElement.dataset.readingFont = readMode();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();