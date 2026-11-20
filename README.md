[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bayusapta22/gta6-cover-art-01-r4/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bayusapta22/gta6-cover-art-01-r4/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Palms Cover Studio

Turn any photo into a Vice Coast poster — the multi-panel cover look with a
slanted title band, bold lettering and a sunset or neon colour grade — and
export it as a PNG to share. It runs entirely offline in a desktop browser
from its own static files: photos are read on your machine and never leave it.

## How it works

1. **Add a photo** — pick files, or drag and drop them onto the preview.
   The app opens with a built-in sample scene (a sunset boulevard with palms,
   a skyline and a convertible, all drawn in code) so you can try it at once.
2. **Pick a layout** — Duo (2 panels), Hero Trio (3), Four Corners (4) or
   Tall Stack (4). One photo can fill every panel, or each panel can use a
   different photo.
3. **Write the caption** — a big title, an italic subtitle and a small tag.
4. **Choose a grade** — Vice Sunset, Neon Night or Pastel Day.
5. **Tune each panel** — zoom and pan per panel, by slider or by dragging
   the photo right in the preview.
6. **Export PNG** — one click writes the cover at exactly 1080×1080,
   1080×1350 or 1920×1080, whichever size is selected.

Everything you see in the preview is exactly what the export writes: the
same renderer paints both.

## Running it

Serve `app/` with any static file server and open `index.html`, for example:

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network requests, no accounts.

## What is in this repo

- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with `buildDossier` from
  `vendor/makefun-app.ts`.
- `app/index.html`, `app/styles.css`, `app/cover.js` — the whole app. The
  cover engine (`renderCover`), the procedural sample scene
  (`paintSampleBoulevard`), the vector palms and skyline, the title band and
  the three colour grades all live in `cover.js`.
- `screenshots/` — four captures from a real browser session driving the app:
  `1-cover.jpg` is the exported 1920×1080 cover, `2-editor.jpg` is the editor
  with the sample photo loaded, `3-cover-portrait.jpg` the exported
  1080×1350 cover, and `4-cover-square.jpg` the exported 1080×1080 cover.
- `vendor/makefun-app.ts` — the kit's dossier library, copied unchanged.

## Verification evidence

Checked in a headless Chromium session driving the real app over a local
static server:

- App loads with the sample scene as photo 1; editing the caption updates
  the preview; switching layouts and grades re-renders without errors.
- All three exports are valid PNGs at exactly 1080×1080, 1080×1350 and
  1920×1080.
- 0 console errors, 0 page errors, 0 network requests outside the local
  server (3 local requests: the page, its stylesheet and its script).
- All four screenshots are within the gate limits (each under 256 KiB,
  long side at most 1280 px, short side at least 480 px).
- `main.ts` runs twice into a scratch output directory and writes identical
  bytes both times, with `app/`, `screenshots/` and `dossier.json` inside
  the gate limits.

## Originality

All art and lettering are drawn by this app's own code — the sunset
boulevard, palms, skyline, convertible, title band and grades. No Rockstar
Games logo, artwork, character or font is used anywhere; lettering uses
system fonts only. The sample scene is drawn, not photographed, so no real
person's photo is involved.
