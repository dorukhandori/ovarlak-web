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
