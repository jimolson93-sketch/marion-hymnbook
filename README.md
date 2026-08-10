# Marion Gospel Hall Hymn Books — Refactored PWA

This package is a split-file version of the existing single-file hymnbook. The hymn markup was extracted mechanically from the source file so the hymn text and structure are preserved.

## Structure

- `index.html` — small application shell
- `css/styles.css` — existing styling
- `js/app.js` — existing hymnbook behavior
- `js/bootstrap.js` — loads the two hymn data files before starting the app
- `js/pwa.js` — registers the service worker
- `data/new-believers.html` — New Believers hymn data (700 hymns)
- `data/gospel.html` — Gospel hymn data (407 hymns)
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — offline cache
- `icons/` — install icons

## GitHub Pages

Upload **the contents of this folder** to the root of the GitHub repository, keeping the folder names intact. `index.html` is the page people should visit.

Because the split version loads hymn data with `fetch()`, preview it through a web server (GitHub Pages is fine). Opening `index.html` directly as a `file://` URL may be blocked by browser security rules.

## Updating

When changing cached files later, increment `CACHE_NAME` in `service-worker.js` (for example, `mgh-hymnbook-v2`) so installed copies receive the update promptly.
