# ovarlak.games

Ovarlak Games studio one-pager. Games live on subdomains (e.g. `lotophagoi.ovarlak.games`).

Static site for GitHub Pages, no build step. Three.js r187 comes from jsDelivr via the import map in `index.html`.

- `index.html`: one `<section data-stop="…">` per game island; the order is the camera route.
- `js/world.js`: scroll-driven camera voyage (stops, framing, phone/desktop handling).
- `js/islands.js`: one procedural island per game. `js/sea.js`: sky, sea, soft points.
- `js/site.js`: chapter reveal, island rail, progress bar; falls back to a static gradient
  when WebGL fails or the visitor prefers reduced motion.

Adding a game: add an island builder in `js/islands.js`, a position and camera stop in
`js/world.js`, a `<section data-stop>` in `index.html` and a row in the "Tüm oyunlar" list.

Local preview: serve the folder root (paths are absolute), e.g. `python3 -m http.server 4180`.

## SEO and search

- `index.html` head: title, description, canonical, Open Graph/Twitter card (`og-cover.jpg`, 1200x630),
  icons, manifest and JSON-LD (`Organization`, `WebSite`, `WebPage`, `ItemList` of the live games).
  When a game's status or copy changes, update the section, the JSON-LD item and `llms.txt` together.
- `robots.txt` allows everything and points to `sitemap.xml`. Bump `<lastmod>` in `sitemap.xml` when the page changes.
- `llms.txt`: plain summary for AI assistants.
- `404.html`: GitHub Pages serves it for missing paths (`noindex`).
- IndexNow key file: `b54f22b3beaceb34b066b9d158b80461.txt` (Bing, Yandex and others). After a deploy:
  `curl "https://api.indexnow.org/indexnow?url=https://ovarlak.games/&key=b54f22b3beaceb34b066b9d158b80461"`
- Card art is served as WebP (`games/*.webp`); the PNGs are the sources.
- Icons come from `favicon.svg` (rendered to PNG with headless Chrome).
