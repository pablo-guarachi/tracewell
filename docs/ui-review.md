# UI review — portfolio pass (2026-10)

Goal: turn a personal "PNG → SVG" utility into a project a recruiter understands in 30 seconds
(screenshots in the README, a live demo on GitHub Pages), **without touching the tracing engine**.

Branch: `portfolio-ui` (baseline of the original code is the first commit on `main`).

---

## Phase 0 — What exists

**Stack.** Static site, no build step: `index.html` (572 lines), `style.css` (1802), `app.js` (2600, one IIFE).
Tracing engine: [`potrace-wasm@1.0.4`](https://github.com/IguteChung/potrace-wasm) imported at runtime from
`esm.sh` in an inline `<script type="module">`, which sets `window.loadFromCanvas` and fires a `potraceReady` event.
GitHub Pages workflow already present (`.github/workflows/deploy.yml`, publishes the repo root).

**Design system.** Tokens in `:root` of `style.css` (`--bg`, `--bg-elevated`, `--text`, `--text-muted`,
`--text-subtle`, `--accent` indigo `#6366f1`, semantic success/warning/error, radii, shadow).
Dark by default, light via `[data-theme="light"]` (saved in `localStorage`). Fonts: `system-ui` for UI,
Fira Code / Cascadia / JetBrains Mono for numbers and code. No Inter anywhere.

**Data flow.**
1. File arrives via click (`#fileInput`), keyboard (Enter/Space on `#uploadZone`) or drag-and-drop → `handleFile(file)`.
2. `handleFile` checks `file.type === 'image/png'`, loads it into an `<img>`, fills the thumbnail, reveals `#controlsSection`,
   shows `#warningBanner` if either side is > 3000 px.
3. Presets (Icon/Logo · Illustration · Sketch/Photo) set the Detail / Smoothing sliders and colour mode.
4. `#btnConvert` → `convertColor()` (median-cut palette → one potrace pass per colour mask) or a single B&W pass →
   `displayResult(svgString)` → `#previewSection` (original vs result, size in KB).
5. Result actions: Download, Optimize (regex clean-up of tiny paths), Inspect (full-screen viewer with zoom/pan, and a
   Code tab that is a full mini-editor: path selection, flat/gradient fill, background layers, filter effects), Copy, Convert another.

**Screens and states.**

| State | Element(s) | Notes |
|---|---|---|
| Engine loading | `#btnConvert` disabled, label "Loading engine…" | Only visible after a file is chosen |
| Empty | `#uploadIdle` inside `#uploadZone` | Drop zone + tips |
| Wrong file type | `#errorBanner` | "Only PNG files are supported…" |
| File loaded | `#uploadPreview`, `#controlsSection` | Presets, advanced panel, Convert |
| Large file (> 3000 px) | `#warningBanner` | Below the Convert button |
| Tracing | `.btn-spinner` inside Convert | No other feedback |
| Result | `#previewSection` | Side-by-side cards + 5 actions |
| Optimize done | `#optimizeResult` | Green banner |
| Inspector — preview | `#viewerOverlay` | Zoom, pan, background toggle |
| Inspector — code editor | `#viewerCodePanel` | 3 columns: tools · code · PNG sampler + live SVG |
| Conversion failed | `#errorBanner` | "Conversion failed: …" |

**Must not change.** Everything inside the conversion path (`buildCanvas`, `medianCut`, `mergeSimilarColors`,
`buildColorMaskCanvas`, `applyBlurToCanvas`, `convertColor`, `assembleSVG`, optimizer, editor operations),
preset values, element IDs used by `app.js`, the potrace-wasm version, download/copy behaviour.

---

## Phase 1 — Problems found (Playwright, 1440 / 768 / 390 px)

Screenshots: `docs/screenshots/before/` (`<width>-<nn>-<state>.png`, 11 states × 3 widths).

**Identity and first impression**
1. No name or story. The header says "PNG → SVG", the tab says "PNG → SVG — Free Browser Converter". A visitor cannot tell what is special (in-browser, private, real vector paths) without reading small grey text.
2. The first viewport is 60 % empty at 1440 px: one dashed box in a 760 px column, nothing showing what the output looks like.
3. No way to try the tool without having a PNG at hand — recruiters will not go looking for one.

**Hierarchy and primary action**
4. After a file is loaded the drop zone keeps its 220 px height and becomes a big empty box around a 64 px thumbnail.
5. After conversion there are two primary buttons on screen (full-width "Convert to SVG" and "Download SVG"); the obvious next step is ambiguous.
6. "Convert another" is a ghost button that wraps alone on a second line at 1440 px.

**Feedback and states**
7. Engine-loading state is invisible until a file is chosen; if the CDN fails the button stays on "Loading engine…" forever with no error.
8. A corrupt / unreadable `.png` produces **no feedback at all** (`before/*-04-corrupt-png-no-feedback.png`) — `img.onerror` is not handled.
9. Tracing feedback is a spinner inside a button; nothing is announced to assistive tech; on big images the main thread blocks before the spinner paints.
10. Wrong-type error copy says what is wrong but not how to fix it.
11. "Copy code" turns into "Copy SVG code" after the first copy (label inconsistency).

**Accessibility**
12. `--text-subtle` (#4a4a60) on the dark background is **2.26 : 1** (fails AA). It is used for the privacy hint, preset descriptions, slider labels, footer, SVG size meta. Light theme `--text-subtle` (#b0b0c8 on white) is 2.12 : 1.
13. White on the indigo accent is 4.47 : 1 (just under AA for the 15 px button labels); accent-coloured text on the dark bg is 4.35 : 1.
14. The hidden file input is a **second, invisible tab stop** after the drop zone (focus lands on nothing visible).
15. Touch targets under 44 px: theme toggle 40, remove-file 32, info "i" buttons 16, Color/B&W toggle ≈ 34, inspector buttons 34, code-zoom 28, editor tool buttons ≈ 24.
16. `<label for="colorMode">` points to an id that does not exist.
17. Results are not announced (no live region).

**Mobile (390 px)**
18. The inspector's code editor keeps its three-column desktop layout: the code column is ~90 px wide and the PNG sampler ~60 px — unusable (`before/390-10-viewer-code-editor.png`).
19. Footer wraps into a ragged two-column block.
20. Presets stack into three 100 px-tall buttons, pushing Convert below the fold.

**Not a UI problem, but visible in the result** — the default "Illustration" preset shifts some colours
(the orange sun of the sample comes out olive). That is the median-cut palette in the tracing logic; out of scope, noted for later.

**Repository hygiene**
- `manora_logo.png`, `vanta-logo.svg` (other brands) and `Screenshot 2026-04-14 030039.png` (a full-desktop capture showing
  personal browser tabs and bookmarks) sat in the root. They were **not committed** (not even in the baseline) and were moved to
  `_local/` (git-ignored). Neutral, self-made samples replace them in `examples/`.

---

## Design engine

The user's global rules route all web UI work through the `design-router` skill. For "portfolio polish of an existing
page" the router's default is **impeccable**; the user was away, so the recommended option was taken without asking.
Impeccable reported no `PRODUCT.md` / `DESIGN.md` and allowed a **scoped refinement on the incumbent system**
(`polish` command): keep the dark indigo product UI and its tokens, fix states/a11y/mobile, and add a Persuade-mode
hero above the Operate-mode tool. A full redesign (new visual world) was deliberately not done: the tool already has a
coherent look and the brief was polish + identity. Running `/impeccable init` later would record product context.

---

## Phase 2 — Changes

**Structure (desktop)**: header (logo + name, "How it works" link, 44 px theme toggle) → hero, two columns:
headline + one-line value + three facts, and an interactive before/after comparison (drag to wipe from
raster pixels to traced vector) → the tool (drop zone + **sample files you can click**) → controls → results →
"How it works" (three steps, plain list) → footer with engine credit and licence.

**Mobile**: hero stacks (copy, then comparison), the tool follows directly; presets become a compact
3-column segmented row; result actions become a 2-column grid with Download full-width; the inspector's code editor
stacks vertically (tools collapsible → code → previews).

**Components / states**
- Name + SVG logo (pixel staircase turning into a smooth curve).
- Drop zone compacts once a file is loaded.
- Engine status line (loading / ready / failed with Retry).
- Readable-PNG check (`img.onerror`) with a fix-oriented message.
- Convert button yields one frame before tracing so the spinner paints; status announced through a live region.
- After a result, Convert becomes a secondary "Re-trace" action; Download is the only primary.
- Tokens: `--text-subtle` raised to AA, accent split into fill (`--accent`) and text (`--accent-text`) shades.
- Focus: invisible file input removed from tab order; focus rings themed; touch targets ≥ 44 px on coarse pointers.
- Display face for headings only: **Bricolage Grotesque** (OFL, self-hosted woff2, no third-party font request).

**What stays identical**: all tracing/optimizer/editor logic, element IDs, presets, potrace-wasm version, download filenames.

---

## Naming

Chosen: **Tracewell** — "trace it well"; short, descriptive, not tied to the PNG/SVG pair so it can grow.

Alternatives (quick web search on 2026-10-28 found no software product with these exact names — this is **not** a trademark search):
1. **Inkpath**
2. **Pathmint**
3. **Traceform**

**How to rename**: the UI reads the name from one place — `<meta name="application-name">` in `index.html`
(header, hero, footer and the tab title are filled from it by `ui.js`). Also update `og:title` in `index.html`, the README title,
and `assets/logo.svg`'s `<title>`.

---

## Licence finding

- `LICENSE` is **MIT**, and the old footer said "MIT License".
- `potrace-wasm@1.0.4` is published under **GPL-2.0** (npm metadata); Potrace itself is GPL-2.0-or-later.
- The repo does **not** contain or bundle any potrace code: the browser downloads it from `esm.sh` at runtime.
  Distributing your own MIT code that calls a GPL library loaded separately at runtime is generally considered acceptable,
  but whether the combined web app is a "derivative work" is a grey area for client-side JavaScript.
- **Conclusion**: the repo licence does **not have to** change as long as potrace-wasm is not vendored/bundled into the repo.
  If you ever self-host the `.wasm`/JS (e.g. for offline use), switch the project to **GPL-2.0-or-later** (or GPL-3.0).
  The footer and README now credit Potrace and its GPL licence explicitly. The LICENSE file was not changed.

---

## Phase 3 — Result

Screenshots: `docs/screenshots/after/` (same widths and states as *before*, plus `1440-13-engine-unavailable`
and `1440-14-light-theme`) and `docs/screenshots/portfolio/` (3 README shots).

| # | Problem | Status |
|---|---|---|
| 1–3 | No identity, empty first viewport, nothing to try | Fixed: name + logo, hero with draggable before/after, 3 clickable samples |
| 4 | Oversized drop zone after upload | Fixed: compact file row with "Click or drop to replace" |
| 5–6 | Two primaries after a result; orphan ghost button | Fixed: Convert becomes secondary "Re-trace with these settings"; Download is the only primary |
| 7 | Engine load invisible / silent failure | Fixed: status line (loading → ready / error + Retry = reload) |
| 8 | Corrupt PNG: no feedback | Fixed: `img.onerror` message |
| 9 | Spinner may not paint; nothing announced | Fixed: one-frame yield before tracing, `aria-busy`, live region |
| 10–11 | Error copy, Copy label | Fixed |
| 12–13 | Contrast below AA | Fixed: new token values (5.4:1 subtle, 7.1:1 muted, 6.3:1 white-on-accent, light theme too) |
| 14 | Invisible tab stop | Fixed: file input `tabindex="-1"`; skip link added |
| 15 | Small targets | Fixed on the main page (44 px); inspector controls reach 44 px on touch devices (`pointer: coarse`) |
| 16–17 | Broken label, no announcements | Fixed |
| 18 | Code editor unusable on mobile | Improved: stacked layout, tools collapsed by default |
| 19–20 | Ragged footer, tall presets | Fixed |

**Not fixed (deliberately out of scope)**
- Colour shifts from the median-cut palette (tracing logic).
- Main-thread tracing on very large images (would need a Web Worker = engine change).
- Inspector tool buttons still use Unicode glyphs (↓ ✕ ◎ …) instead of drawn icons, and the inspector's
  tools panel animates `width`; both pre-existing and confined to the expert editor.
- `Canvas2D: willReadFrequently` console warnings come from `getImageData` in the tracing code.

**Verification**: Playwright on `file://` at 1440/768/390 — no horizontal overflow, no console errors
(only the pre-existing Canvas2D warnings); sample load, file-input upload, trace, download of a valid SVG
(`sample-icon.svg`, 2 paths), inspector preview/code, error and large-file states all exercised.
Impeccable detector run once; real findings fixed (white-on-light hover fills, empty `src`, border+wide shadow).
