# Bryan Morales — Portfolio

Personal portfolio site. Zero dependencies, zero build step: three static files
(`index.html`, `styles.css`, `script.js`) plus the `assets/` folder.

## Running locally

Any static server works — there is nothing to compile:

```bash
python -m http.server 5501
# or, with the VS Code Live Server extension, just "Go Live" (port 5501)
```

Then open <http://localhost:5501>.

## Structure

| Path                        | Purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `index.html`                | **Source of truth.** Each project is one `<article class="project-item">` |
| `styles.css`                | Design tokens in `:root`, then components, then theme overrides           |
| `detail.css`                | Extra layout for the maximized pages only                                 |
| `script.js`                 | Carousels, navigation, fullscreen viewer, theme toggle                    |
| `sections.js`               | _Generated._ Nav menu data shared by every page                           |
| `about.html`, `*.html`      | _Generated._ One maximized page per section                               |
| `thanks.html`               | _Generated._ Form landing page for visitors without JavaScript            |
| `sitemap.xml`, `robots.txt` | _Generated._                                                              |
| `tools/build-pages.mjs`     | Generator for the four rows above                                         |
| `assets/`                   | Images, icons, tech logos, background video                               |

## Maximized views

Every section has a full-page version: `about.html` plus one page per project
(`keeptive.html`, `qualitor.html`, …). Open one from `index.html` either with the
button in the card's top-left corner or by clicking the section title.

These pages give the carousel a larger hero at the images' native 16:9 (nothing
is cropped), split the text into separate Overview and Features cards, add a
side gallery of every project image — click one to open the fullscreen viewer —
and link to the previous/next section. About Me is part of that cycle, which
wraps around in both directions.

The side gallery follows the text: while the description leaves room, every
thumbnail is stacked in full. When it does not, the gallery holds at three
thumbnails and the rest is reachable by scrolling it, with a fade marking that
there is more. That cap cannot be expressed in CSS — the gallery sits in a `1fr`
row, so a `max-height: 100%` would just make the row grow — so
`initializeDetailGallery()` in `script.js` measures the text column and sets it.

They are **generated from `index.html`** so the content can never drift:

```bash
node tools/build-pages.mjs
```

> Re-run this after editing any project in `index.html`, and commit the result.
> Do not hand-edit the generated `*.html` files or `sections.js` — the next run
> overwrites them. Layout tweaks belong in `detail.css`, page structure in the
> generator's `page()` template.

The nav menu comes from `sections.js` on every page, so it always lists all
sections. On `index.html` a menu click scrolls to the section; on a detail page
it follows the link. The `href` is always the real page, so the menu still works
with JavaScript disabled.

### Themes

Two themes, persisted in `localStorage` under `portfolio-theme`:

- **`obsidian`** (default) — flat dark surfaces, background video hidden.
- **`glass`** — translucent surfaces over the `assets/back-oo.mp4` background.

An inline script in `<head>` applies the theme class before first paint so the
page never flashes the wrong theme. The background video uses `preload="none"`
and only downloads when the glass theme is active.

### Contact form

The last section of `index.html` (and `contact.html`) is a contact form wired to
**Netlify Forms** — no backend, no third-party service. Netlify detects it at
deploy time from the `data-netlify="true"` attribute and stores every submission.

**One-time setup after the first deploy:** Netlify → Forms → _Form notifications_
→ add an email notification to `bryan.a.morales@outlook.com`. Until you do that,
submissions are still captured, they just sit in the Netlify dashboard.

How it degrades:

- **With JavaScript** — validation shows messages next to each field and the form
  is sent with `fetch`, so the visitor never leaves the page.
- **Without JavaScript** — the browser's own `required` validation applies and the
  form does a normal POST, landing on `thanks.html`.
- **Netlify unreachable** — the status line points at the `mailto:` address, which
  is also printed under the form.

A honeypot field (`bot-field`) filters out bots; it is visually hidden but stays
in the DOM, since `display: none` stops some browsers from submitting it.

### Typography

Two families, loaded in one Google Fonts request:

- **Inter** — body copy and everything else.
- **Sekuya** — every section title: the profile name, the project names (card,
  hamburger menu, breadcrumb and previous/next links) and the contact heading.

Sekuya ships a single weight (400), so those titles set `font-weight: 400` rather
than the 900 the rest of the headings use — asking for a weight the family does
not have makes the browser synthesise a fake bold and smear the strokes.

Sekuya is noticeably wider than Inter, so the profile name wraps onto two lines.
That is why `.skills-title` is anchored with `align-self: end` in the ≥1200px
grid: it shares a row with the name and would otherwise drift far above its own
box.

If you change the font list, update it in **both** places: the `<link>` in
`index.html` and the `FONT_URL` constant in `tools/build-pages.mjs`.

### Adding a project

Copy an existing `<article class="project-item">` block and update:

- `id` (must start with `project-`) — the nav menu is generated from these.
- `data-project-title`, `data-project-category`, `data-project-description` —
  these populate the nav menu entry.
- The carousel slides, and one `.carousel-dot` per slide.
- Tech tags: plain text like `🐍 Python`. `script.js` maps the label to an icon
  in `assets/tech/` automatically (see `technologyIconMap`).

Carousel images should be 1920×1080 WebP with `loading="lazy"`, `decoding="async"`,
`width`/`height` and a descriptive `alt`.

Keep source images close to the size they are actually displayed at. The profile
photo, for instance, renders at ~100&nbsp;px and is stored at 640×640 — five times
over, which covers high-density screens and social previews without paying for a
3120×3120 original. Whenever you swap an image, update its `width`/`height`
attributes to the file's real dimensions.

Then run `node tools/build-pages.mjs` to create the project's maximized page and
add it to the nav menu.

## Before deploying

Replace the placeholder deployment URL in two places:

- `index.html` — the `<head>` meta tags (canonical, `og:url`, `og:image`,
  `twitter:image`).
- `tools/build-pages.mjs` — the `SITE_URL` constant, then regenerate: it feeds the
  canonical tags of every generated page plus `sitemap.xml` and `robots.txt`.

Then enable the form email notification (see **Contact form** above).
