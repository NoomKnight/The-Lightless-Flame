# The Lightless Flame — Campaign Archive

A static website that presents a D&D campaign archive (the Duchy of Greenwatch).
No build step, no framework: plain HTML + CSS + vanilla JS, with all campaign
content stored as YAML and loaded at runtime.

## File map

| File         | What it holds                                                            |
|--------------|--------------------------------------------------------------------------|
| `index.html` | Page shell: nav, the seven `section.view` panels, and inline SVG art.    |
| `styles.css` | All styling. Organized into numbered sections (see below).               |
| `main.js`    | Data loading, rendering, search, nav, the cover, the slider, map logic.  |
| `data.yml`   | **All campaign content** — sessions, NPCs, items, clues, map markers.    |
| `img/vault/` | Photos for Vault/Reliquary items, named by slug (`<slug>.jpg`).          |

Third-party libs are loaded from CDNs in `<head>`: **js-yaml** (parses
`data.yml`) and **Fuse.js** (fuzzy search). Fonts come from Google Fonts.

## Running / previewing locally

**You must serve over HTTP — do not open `index.html` as a `file://` URL.**
`main.js` does `fetch('data.yml')`, and browsers block `fetch()` of local files
under `file://`. Opening the file directly makes every data-driven view
(Chronicle, Compendium, Vault, Clues, map markers, slider) come up empty, even
though the shell and the cover still render. This is the #1 "why is the page
broken" gotcha.

Serve from the project root, e.g.:

```sh
npx -y serve@latest . # then open the printed http://localhost:PORT
# or: python3 -m http.server 8000
```

(Plain `<img src="...">` and CSS assets work fine under `file://` — only the
`fetch` of `data.yml` breaks. So the images are safe; the data is not.)

## Updating the DATA (`data.yml`)

This is where almost all content changes happen. Top-level keys, each a list:

- `acts` — story acts. Fields: `id`, `name`, `range`, `color` (thread color).
- `sessions` — the Chronicle timeline. Fields: `id` (number, used for sort +
  the temporal slider), `act` (matches an act `id`), `title`, `date`,
  `description`.
- `npcs` — the Compendium. Fields: `name`, `role`, `where` (used to bucket into
  a location filter — see `npcBucket()` in `main.js`), `status` (`alive` etc.,
  drives the status dot color), `description`.
- `vault` / `reliquary` — item plaques. Fields: `name`, `img` (slug, optional),
  `acqAt` (session number the item was acquired — ties into the slider),
  `prov`, `holder`, `description`.
- `clues` — the Clue Board.
- `mapspots` — hotspot markers on the continent map (`#mapwrap`).
- `deepnodes` — nodes on Despona's deep-roads SVG map (`#deepwrap`).

Rules of thumb:
- Keep `session.id` values contiguous and correct — they drive sort order and
  the temporal slider's range/labels.
- `act` on a session must match an existing `acts[].id` or the session won't
  render under any band.
- After editing, reload the served page; no build/restart needed.

## Updating IMAGES

### Vault / Reliquary item photos
Put the file at `img/vault/<slug>.jpg` and set `img: "<slug>"` on the item in
`data.yml`. `main.js` builds the `src` as `img/vault/<slug>.jpg` and, on load
error, automatically retries `.png`, then hides the image. So `.jpg` is
preferred; `.png` works as a fallback. Omit `img` entirely for a text-only
plaque.

### The four big pictures (cover + maps) — see the base64 warning below
The book cover, the continent map, and the two keep floor plans are currently
embedded as base64 (bad — see next section). When adding/replacing any of them,
use a real file in `img/`, not base64.

## AVOID base64-embedded images (important)

`index.html` currently inlines **four** large raster images as
`data:image/jpeg;base64,...` strings. They are the biggest maintenance problem
in this repo. Locate them by their `alt` text:

| `alt`                            | Where            | Purpose               |
|----------------------------------|------------------|-----------------------|
| `Greenwatch Keep at dusk`        | `#bookcover`     | the library cover     |
| `Map of the continent of Stormbaum` | `#mapwrap`    | continent map         |
| `Greenwatch Keep, ground floor`  | `#keepmap-ground`| keep floor plan       |
| `Greenwatch Keep, upper floor`   | `#keepmap-upper` | keep floor plan       |

Why this is bad:
- They add ~400KB+ of base64 to `index.html`, so the HTML re-downloads on every
  visit and can't be cached separately.
- The lines are hundreds of thousands of characters long, which **breaks the
  Read tool** (it errors on the file size). To inspect `index.html` you must use
  line-ranged shell reads, e.g. `awk 'NR>=34 && NR<=48' index.html | cut -c1-120`.
- Editing around them is fragile.

**Do NOT add new base64 images. When you touch one of these, extract it to a
file instead:**

```sh
# Example: pull the cover out to img/cover.jpg
# 1. Find the line number (alt text is unique):
grep -n 'alt="Greenwatch Keep at dusk"' index.html
# 2. Extract the base64 payload from that line and decode it:
awk 'NR==<LINE>' index.html \
  | grep -oE 'base64,[A-Za-z0-9+/=]+' | sed 's/^base64,//' \
  | base64 -d > img/cover.jpg
# 3. Replace the giant data: URI in the <img src="..."> with the file path:
#    src="img/cover.jpg"   (the inline SVG favicon on line ~7 is fine to leave)
```

Suggested destinations: `img/cover.jpg`, `img/map-stormbaum.jpg`,
`img/keep-ground.jpg`, `img/keep-upper.jpg`. Relative `<img src>` paths load fine
even under `file://`, so this also keeps local previews working.

(The small inline **SVG** data URIs — the favicon and the body noise texture in
`styles.css` — are fine. The rule is specifically about large base64 **rasters**.)

## Updating the SCRIPTS (`main.js`)

Load flow: `fetch('data.yml')` → parse with `jsyaml` → assign the global arrays
(`ACTS`, `SESSIONS`, `NPCS`, `VAULT`, `RELIQUARY`, `CLUES`, `MAPSPOTS`,
`DEEPNODES`) → call `init()`. Nav wiring and the cover run at top level.

Key pieces:
- **Navigation** — `nav button[data-view]` toggles the matching `section.view`
  active. Adding a page = add a `<button data-view="x">` and a
  `<section id="x" class="view">`.
- **Search** — both the Chronicle and the Compendium use **Fuse.js** fuzzy
  search (`chronicleFuse` over `title`/`description`; `npcFuse` over
  `name`/`role`/`description`/`where`), tuned with `threshold: 0.35,
  ignoreLocation: true`. Keep the two in sync if you change search behavior.
- **The library cover** — `initBookCover()` shows the fixed `#bookcover`
  overlay, locks scroll (`body.cover-locked`), and dismisses it (page-turn
  animation) on click / Enter / Space.
- **Temporal slider** — `initTemporalSlider()` uses session `id`s to let the
  reader scrub back through history; it filters map spots and item plaques by
  `acqAt` / visited state.
- **Maps** — three map wrappers: `#mapwrap` (continent, raster + `.spot`
  hotspots from `mapspots`), `#keepwrap` (keep floor plans, raster + tabs), and
  `#deepwrap` (Despona's deep roads, an inline SVG node graph from `deepnodes`).
  All share the fullscreen-toggle button logic.

## Updating the STYLES (`styles.css`)

One stylesheet, split into numbered, commented sections. Find the right one by
its header comment (`grep -nE '^   [0-9]+[a-z]?\.' styles.css`):

```
1. Design Tokens & Variables        12. Duchy Block Component
2. Base & Global Styles             13. Cartography & Interactive Maps
3. Layout Framework                 14. Subterranean SVG Node Map System
4. Typography & Headers             15. Timescope (Historical Slider) Widget
5. Navigation Component             16. Modals (VK Modal System)
6. View Navigation (Tabs)           17. Greenwatch Scene Animated SVG
7. Common Panel / Card Layouts      18. Hero Cover (Showcase Header)
8. Chronicle / Timeline System      18b. Library Cover (book intro)
9. NPC Compendium Component         19. Keep Floor Plan Component
10. Plaque Records Component         20. Keyframe Animations
11. Clue Board Component             21. Responsive Media Queries
```

Conventions:
- Colors come from the CSS custom properties in section 1 (`--gilt`, `--vellum`,
  `--panel-edge`, etc.). Use those tokens, don't hardcode hex.
- The three map wrappers (`.mapwrap`, `.keepwrap`, `.deepwrap`) should share the
  same in-flow layout (`position: relative`) so they render at matching width;
  only the `.fullscreen` state uses fixed positioning.
- Watch out for CSS animations with `fill: both` on elements that also get a
  `transform` from a state class — the filled animation value wins and silently
  overrides the state transform (this bit the book-cover open animation once).
- Responsive rules live in section 21; put media-query overrides there.

## Quick gotchas checklist

- Serve over HTTP, never `file://` (the `fetch('data.yml')` rule above).
- Don't add base64 raster images; extract to `img/` files.
- `index.html` has multi-hundred-thousand-char lines — read it with
  `awk 'NR>=A && NR<=B'`, not the Read tool.
- Session `id`s and `act` references must stay consistent (sort + slider depend
  on them).
