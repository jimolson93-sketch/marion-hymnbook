(() => {
  const believersParts = [
    'data/believers-repair/01-01.txt',
    'data/believers-repair/01-02.txt',
    'data/believers-repair/01-03a.txt',
    'data/believers-repair/01-03b.txt',
    'data/believers-parts/part-02.txt',
    'data/believers-parts/part-03.txt',
    'data/believers-parts/part-04.txt',
    'data/believers-parts/part-05.txt',
    'data/believers-parts/part-06.txt',
    'data/believers-parts/part-07.txt',
    'data/believers-parts/part-08.txt',
    'data/believers-parts/part-09.txt',
    'data/believers-repair/10-a.txt',
    'data/believers-repair/11-01.txt',
    'data/believers-repair/11-02.txt',
    'data/believers-repair/11-03.txt',
    'data/believers-repair/11-04.txt',
    'data/believers-repair/11-05.txt'
  ];

  const books = [
    { id: 'section1', url: 'data/new-believers.html' },
    { id: 'section2', url: 'data/gospel.html' },
    { id: 'section3', parts: believersParts }
  ];

  function showLoadError(message) {
    document.querySelectorAll('.data-loading').forEach(el => {
      el.textContent = message;
      el.classList.add('data-load-error');
    });
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function loadCompressedBook(parts) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress the Believers hymn data.');
    }

    const responses = await Promise.all(parts.map(file => fetch(file, { cache: 'default' })));
    const failed = responses.find(response => !response.ok);
    if (failed) throw new Error(`Believers hymn data request failed: ${failed.status}`);

    const chunks = await Promise.all(responses.map(response => response.text()));
    const encoded = chunks.map(text => text.trim()).join('');
    const compressed = base64ToBytes(encoded);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  async function loadBook(book) {
    if (book.parts) return loadCompressedBook(book.parts);

    const response = await fetch(book.url, { cache: 'default' });
    if (!response.ok) throw new Error(`Hymn data request failed: ${response.status}`);
    return response.text();
  }

  async function loadHymnBooks() {
    try {
      const fragments = await Promise.all(books.map(loadBook));
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
