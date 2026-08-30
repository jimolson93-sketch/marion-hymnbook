# Marion Gospel Hall Hymn Books — Refactored PWA

This package is a split-file version of the existing single-file hymnbook. The hymn markup was extracted mechanically from the source file so the hymn text and structure are preserved.

## Structure

- `index.html` — small application shell
- `css/styles.css` — existing styling
- `js/app.js` — existing hymnbook behavior
- `js/bootstrap.js` — loads the hymn data files before starting the app
- `js/pwa.js` — registers the service worker and checks for deployed updates
- `data/new-believers.html` — New Believers hymn data
- `data/gospel.html` — Gospel hymn data
- `data/believers.html` — Old Believers hymn data
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — offline cache
- `version.json` — deployed application version
- `icons/` — install icons

## GitHub Pages

Upload **the contents of this folder** to the root of the GitHub repository, keeping the folder names intact. `index.html` is the page people should visit.

Because the split version loads hymn data with `fetch()`, preview it through a web server (GitHub Pages is fine). Opening `index.html` directly as a `file://` URL may be blocked by browser security rules.

## Updating and Versioning

Every application commit must increment the semantic patch version and keep all version references synchronized in the same commit. Before committing, verify that these values all match:

- `version.json` → `version`
- `service-worker.js` → `CACHE_VERSION`
- `index.html` → visible `.app-version`
- Any versioned asset URLs used for cache busting (for example `css/appearance.css?v=...`) in both `index.html` and `service-worker.js`

Do not commit an application change with only `version.json` updated. The synchronized version bump is part of the change and is required so installed PWAs reliably receive the new cache and display the correct version.
