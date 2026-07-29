import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const SITE_URL = "https://bryan-morales-portfolio.netlify.app";
const AUTHOR = "Bryan Morales";

const FONT_URL =
    "https://fonts.googleapis.com/css2" +
    "?family=Inter:wght@400;500;700;900" +
    "&family=Sekuya" +
    "&display=swap";

const index = read("index.html");

function extractElement(html, tag, from) {
    const open = html.indexOf(`<${tag}`, from);
    if (open === -1) return null;

    const re = new RegExp(`<${tag}\\b|</${tag}>`, "g");
    re.lastIndex = open;
    let depth = 0;
    let m;
    while ((m = re.exec(html))) {
        depth += m[0][1] === "/" ? -1 : 1;
        if (depth === 0) {
            return {
                html: html.slice(open, m.index + m[0].length),
                start: open,
                end: re.lastIndex,
            };
        }
    }
    throw new Error(`<${tag}> sin cerrar a partir del offset ${open}`);
}

function reindent(block, spaces) {
    const lines = block.split("\n");
    const base = lines[0].match(/^\s*/)[0].length;
    const pad = " ".repeat(spaces);
    return lines
        .map((l, i) =>
            i === 0
                ? pad + l.trim()
                : l.startsWith(" ".repeat(base))
                  ? pad + l.slice(base)
                  : pad + l.trimStart(),
        )
        .join("\n");
}

const escapeAttr = (s) =>
    s.replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, "&amp;").replace(/"/g, "&quot;");

const plain = (title) => title.replace(/^\S+\s+/u, "").trim();

const videoBlock = extractElement(
    index,
    "div",
    index.indexOf('<div class="background-video"'),
).html;
const themeBtn = extractElement(
    index,
    "button",
    index.indexOf('<button\n                class="theme-toggle-button"'),
).html;
const menuBtn = extractElement(
    index,
    "button",
    index.indexOf('<button class="menu-button"'),
).html;
const navBlock = extractElement(
    index,
    "nav",
    index.indexOf('<nav class="nav-menu"'),
).html;
const topBtn = extractElement(
    index,
    "button",
    index.indexOf('<button\n            class="scroll-top-button"'),
).html;

const profile = extractElement(
    index,
    "section",
    index.indexOf('id="profile-section"') - 40,
).html;

const contact = extractElement(
    index,
    "section",
    index.indexOf('id="contact-section"') - 40,
).html;

const projects = [];
let cursor = 0;
for (;;) {
    const at = index.indexOf("<article", cursor);
    if (at === -1) break;
    const el = extractElement(index, "article", at);
    cursor = el.end;

    const id = el.html.match(/id="(project-[^"]+)"/)?.[1];
    if (!id) continue;

    const slug = id.replace(/^project-/, "");
    projects.push({
        id,
        slug,
        title: el.html.match(/data-project-title="([^"]*)"/)?.[1] ?? "",
        category: el.html.match(/data-project-category="([^"]*)"/)?.[1] ?? "",
        description:
            el.html.match(/data-project-description="([^"]*)"/)?.[1] ?? "",
        date:
            el.html.match(/<span class="project-date">([^<]*)</)?.[1]?.trim() ??
            "",

        images: [
            ...el.html.matchAll(
                /<img\n\s+src="(assets\/projects\/[^"]+)"\n\s+alt="([^"]*)"/g,
            ),
        ].map((m) => ({ src: m[1], alt: m[2] })),
        html: el.html,
    });
}

if (projects.length === 0)
    throw new Error("No se encontró ningún <article class='project-item'>");

function forDetailPage(block) {
    return block
        .replace(/\n\s*<a\n\s+class="section-maximize[\s\S]*?<\/a>/g, "")
        .replace(/\s*style="opacity: 0; transform: translateY\(30px\)"/g, "")
        .replace(/ scroll-pending(?=["\s])/g, "")
        .replace(
            /<h2>\s*<a href="[^"]*"\s*>([\s\S]*?)<\/a\s*>\s*<\/h2>/g,
            "<h1>$1</h1>",
        )
        .replace(
            /<h2 class="contact-title">\s*<a href="[^"]*"\s*>([\s\S]*?)<\/a\s*>\s*<\/h2>/,
            '<h1 class="contact-title">$1</h1>',
        )
        .replace(
            /<h1 class="profile-name">\s*<a href="[^"]*">([\s\S]*?)<\/a>\s*<\/h1>/,
            '<h1 class="profile-name">$1</h1>',
        );
}

function splitDescription(articleHtml) {
    const box = articleHtml.match(
        /<div class="project-description glass-container">[\s\S]*?<div class="description-content">\s*<p>([\s\S]*?)<\/p>\s*<\/div>/,
    );
    if (!box) return null;

    const inner = box[1];
    const marker = inner.indexOf('<span class="bold-text">Features</span>');
    if (marker === -1) return null;

    const SEP = "<br /><br />";
    const cut = inner.lastIndexOf(SEP, marker);
    if (cut === -1) return null;

    const overview = inner.slice(0, cut).trim();
    const features = inner.slice(cut + SEP.length).trim();
    if (!overview || !features) return null;

    const card = (body) =>
        `                    <div class="project-description glass-container">
                        <div class="description-content">
                            <p>
${body
    .split("\n")
    .map((l) => "                                " + l.trim())
    .join("\n")}
                            </p>
                        </div>
                    </div>`;

    return `                <div class="detail-desc-stack">
${card(overview)}
${card(features)}
                </div>`;
}

function gallery(project) {
    if (project.images.length === 0) return "";

    const items = project.images
        .map(
            (img, i) => `                        <button
                            class="detail-gallery-item"
                            type="button"
                            data-index="${i}"
                            aria-label="View image ${i + 1} of ${project.images.length} fullscreen"
                        >
                            <img
                                src="${img.src}"
                                alt="${escapeAttr(img.alt)}"
                                width="1920"
                                height="1080"
                                loading="lazy"
                                decoding="async"
                            />
                        </button>`,
        )
        .join("\n");

    return `                <div class="detail-gallery glass-container">
                    <div class="detail-gallery-scroll" aria-label="Project gallery">
${items}
                    </div>
                    <div class="scroll-indicator">
                        <div class="scroll-track">
                            <div class="scroll-thumb"></div>
                        </div>
                    </div>
                </div>`;
}

const sections = [
    {
        id: "profile-section",
        page: "about.html",
        title: "🪄 About Me",
        category: null,
        description: "",
    },
    ...projects.map((p) => ({
        id: p.id,
        page: `${p.slug}.html`,
        title: p.title,
        category: p.category,
        description: p.description,
    })),
    {
        id: "contact-section",
        page: "contact.html",
        title: "✉️ Contact",
        category: null,
        description: "",
    },
];

writeFileSync(
    join(ROOT, "sections.js"),
    `/* Generated by tools/build-pages.mjs. Edit index.html instead. */
window.PORTFOLIO_SECTIONS = ${JSON.stringify(sections, null, 4)};
`,
);

function page({
    title,
    description,
    canonical,
    bodyClass,
    dataPage,
    main,
    noindex = false,
}) {
    return `<!doctype html>
<!-- Generated by tools/build-pages.mjs. Edit index.html instead. -->
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeAttr(title)}</title>
        <meta name="description" content="${escapeAttr(description)}" />
        <meta name="author" content="${AUTHOR}" />
        <meta name="theme-color" content="#1e1e1e" />
        <meta name="color-scheme" content="dark" />${noindex ? '\n        <meta name="robots" content="noindex" />' : ""}

        <link rel="canonical" href="${canonical}" />

        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="${AUTHOR} Portfolio" />
        <meta property="og:title" content="${escapeAttr(title)}" />
        <meta property="og:description" content="${escapeAttr(description)}" />
        <meta property="og:url" content="${canonical}" />
        <meta property="og:image" content="${SITE_URL}/assets/profile.webp" />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escapeAttr(title)}" />
        <meta name="twitter:description" content="${escapeAttr(description)}" />
        <meta name="twitter:image" content="${SITE_URL}/assets/profile.webp" />

        <link rel="icon" type="image/png" href="assets/favicon.png" />
        <link rel="apple-touch-icon" href="assets/favicon.png" />

        <link rel="stylesheet" href="styles.css" />
        <link rel="stylesheet" href="detail.css" />
        <script>
            (function () {
                var theme = null;
                try {
                    theme = localStorage.getItem("portfolio-theme");
                } catch (e) {}
                if (theme !== "glass") {
                    document.documentElement.classList.add(
                        "obsidian-theme-loading",
                    );
                }
            })();
        </script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="${FONT_URL}" rel="stylesheet" />
    </head>
    <body class="${bodyClass}" data-page="${dataPage}">
${reindent(videoBlock, 8)}
        <div class="portfolio-container">
${reindent(themeBtn, 12)}

${reindent(menuBtn, 12)}

${reindent(navBlock, 12)}

${main}
        </div>

${reindent(topBtn, 8)}

        <script src="sections.js"></script>
        <script src="script.js"></script>
    </body>
</html>
`;
}

const topbar = (label) => `            <div class="detail-topbar">
                <a class="detail-back" href="index.html">
                    <span class="detail-back-arrow" aria-hidden="true">←</span>
                    <span>Portfolio</span>
                </a>
                <span class="detail-breadcrumb">${escapeAttr(label)}</span>
            </div>`;

const cycle = [
    { title: "🪄 About Me", page: "about.html" },
    ...projects.map((p) => ({ title: p.title, page: `${p.slug}.html` })),
    { title: "✉️ Contact", page: "contact.html" },
];

function prevNext(i) {
    const prev = cycle[(i - 1 + cycle.length) % cycle.length];
    const next = cycle[(i + 1) % cycle.length];

    const link = (p, dir, cls) =>
        `                <a class="detail-nav-link${cls}" href="${p.page}">
                    <span class="detail-nav-dir">${dir}</span>
                    <span class="detail-nav-title">${escapeAttr(p.title)}</span>
                </a>`;

    return `
            <nav class="detail-nav" aria-label="Section navigation">
${link(prev, "← Previous", "")}
${link(next, "Next →", " is-next")}
            </nav>`;
}

const written = [];

writeFileSync(
    join(ROOT, "about.html"),
    page({
        title: `About ${AUTHOR} | Full-Stack Developer & UX/UI Designer`,
        description:
            "AI Engineering student and freelance full-stack developer from Mexico. Skills, languages, certifications and contact details.",
        canonical: `${SITE_URL}/about`,
        bodyClass: "detail-page detail-about",
        dataPage: "about.html",
        main: `${topbar("About Me")}

            <main class="portfolio-main">
${reindent(forDetailPage(profile), 16)}
${prevNext(0)}
            </main>`,
    }),
);
written.push("about.html");

projects.forEach((p, i) => {
    const name = plain(p.title);
    const desc = [p.category, p.description].filter(Boolean).join(" · ");

    let article = forDetailPage(p.html);

    const split = splitDescription(article);
    if (split) {
        const original = extractElement(
            article,
            "div",
            article.indexOf(
                '<div class="project-description glass-container">',
            ),
        );
        article =
            article.slice(0, original.start) +
            split.trimStart() +
            article.slice(original.end);
    } else {
        console.warn(
            `  ! ${p.slug}: no se pudo dividir Overview/Features, se deja la caja única`,
        );
    }

    if (p.images.length === 0) {
        throw new Error(
            `${p.slug}: no se extrajo ninguna imagen del carrusel. ` +
                `Revisa el formato de los <img> en index.html.`,
        );
    }

    const gal = gallery(p);
    if (gal) {
        article = article.replace(
            /\n(\s*)<\/article>$/,
            `\n${gal}\n$1</article>`,
        );
    }

    writeFileSync(
        join(ROOT, `${p.slug}.html`),
        page({
            title: `${name} | ${AUTHOR}`,
            description: `${desc}${p.date ? ` (${p.date})` : ""}. A project by ${AUTHOR}.`,
            canonical: `${SITE_URL}/${p.slug}`,
            bodyClass: "detail-page detail-project",
            dataPage: `${p.slug}.html`,
            main: `${topbar(name)}

            <main class="portfolio-main">
                <section class="projects-section">
${reindent(article, 20)}
                </section>
${prevNext(i + 1)}
            </main>`,
        }),
    );
    written.push(`${p.slug}.html`);
});

const contactDetail = forDetailPage(contact);
if (!contactDetail.includes('<h1 class="contact-title">')) {
    throw new Error(
        "contact-section: el título no se promovió a <h1>. " +
            'Revisa el formato del <h2 class="contact-title"> en index.html.',
    );
}

writeFileSync(
    join(ROOT, "contact.html"),
    page({
        title: `Contact ${AUTHOR}`,
        description: `Send a message to ${AUTHOR}, freelance full-stack developer and UX/UI designer.`,
        canonical: `${SITE_URL}/contact`,
        bodyClass: "detail-page detail-contact",
        dataPage: "contact.html",
        main: `${topbar("Contact")}

            <main class="portfolio-main">
${reindent(contactDetail, 16)}
${prevNext(cycle.length - 1)}
            </main>`,
    }),
);
written.push("contact.html");

writeFileSync(
    join(ROOT, "thanks.html"),
    page({
        title: `Message sent | ${AUTHOR}`,
        description: `Thanks for getting in touch with ${AUTHOR}.`,
        canonical: `${SITE_URL}/thanks`,
        bodyClass: "detail-page detail-thanks",
        dataPage: "thanks.html",
        noindex: true,
        main: `            <div class="detail-topbar">
                <a class="detail-back" href="index.html">
                    <span class="detail-back-arrow" aria-hidden="true">←</span>
                    <span>Portfolio</span>
                </a>
            </div>

            <main class="portfolio-main">
                <section class="thanks-card glass-card">
                    <span class="thanks-mark" aria-hidden="true">✉️</span>
                    <h1 class="contact-title">Message sent</h1>
                    <p class="contact-intro">
                        Thanks for reaching out. I'll get back to you as soon as
                        I can.
                    </p>
                </section>
            </main>`,
    }),
);
written.push("thanks.html");

const indexable = [
    "",
    ...written
        .filter((f) => f !== "thanks.html")
        .map((f) => f.replace(/\.html$/, "")),
];
writeFileSync(
    join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((f) => `    <url><loc>${SITE_URL}/${f}</loc></url>`).join("\n")}
</urlset>
`,
);
writeFileSync(
    join(ROOT, "robots.txt"),
    `User-agent: *
Allow: /
Disallow: /thanks

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

console.log(`sections.js  (${sections.length} entradas de menú)`);
for (const f of written) console.log(`  ${f}`);
console.log(`\n${written.length} páginas generadas.`);
