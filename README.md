# Publicat

An open-source framework for publishing periodical bibliography data as an
interactive archive. Supply a CSV; get a deployable site with faceted search,
per-issue pages, five visualisations, a network view, and a rule-based query
assistant. No database, no server administration.

Live deployments: [Vsesvit](https://vsesvit.vercel.app) ·
[InterLit](https://interlit.vercel.app) ·
[Zhanga Adebiet](https://zhangaadebiet.vercel.app)

---

## What it does

- **Timeline browser** — issues grouped by decade, with article-level drill-down.
- **Faceted search** — free text across authors, titles and translators, plus
  facets for decade, source language, country and journal. Counts recompute
  against the current selection. The full query state lives in the URL, so any
  result set is a link you can cite.
- **Per-issue pages** — one static HTML document per issue, generated at build
  time. Real URLs: linkable, reloadable, crawlable, archivable.
- **Visualisations** — unique authors per decade; country distribution by decade;
  a world map with a decade filter; top ten source languages; language flow by
  decade as a Sankey diagram.
- **Network view** — a force-directed bipartite graph linking decades to the
  authors published in them, sized by degree.
- **AI assistant** — thirteen question types answered by direct computation
  over the data. See the note below.

Visualisation elements link into the faceted search, so a pattern in a chart
resolves to the records that produced it.


---

## Quick start

### 1. Prepare your CSV

One row per article per issue. Eleven fields:

| Field | Type | Notes |
|---|---|---|
| `journal_id` | string | Unique per issue. May contain `/` for combined issues. |
| `journal_name` | string | |
| `journal_year` | number | |
| `journal_number` | string | Not numeric — issues are numbered `5/6` too. |
| `article_name` | string | |
| `author` | string | |
| `translator` | string | Blank where not applicable. |
| `country` | string | Source country, original script. |
| `country_latin` | string | Latin-script variant. Falls back to `country`. |
| `language` | string | Source language, original script. |
| `language_latin` | string | Latin-script variant. Falls back to `language`. |

Extra columns are ignored without error, so your CSV can carry richer metadata
than the framework reads.

The `_latin` fields exist for non-Latin-script corpora. If your values are
already in Latin script, leave those columns out entirely — each falls back to
its base field.

Place the file at `public/data/your-corpus.csv`.

### 2. Configure

Edit `publicat.config.ts`. This is the only file a new deployment needs to touch:

```ts
export const config = {
  csvPath: 'data/your-corpus.csv',   // under /public, or a full https:// URL
  siteTitle: 'Your Archive',
  siteDescription: 'Interactive periodical bibliography',
  nav: [
    { href: '/', label: 'Main' },
    { href: '/search', label: 'Search' },
    { href: '/visualizations', label: 'Visualizations' },
    { href: '/network', label: 'Network' },
    { href: '/ai_chat', label: 'Query assistant' },
    { href: '/about', label: 'About' },
  ],
};
```

If you point `csvPath` at a remote URL, pin it to a commit SHA rather than a
branch: a mutable pointer means a given deployment changes when the
file is edited.

### 3. Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # generates one static page per issue
```

### 4. Deploy

**Vercel** — import the repository, accept the defaults. The free tier covers a
typical journal archive.

**Anywhere else** — set `output: 'export'` in `next.config.js` and `npm run
build` writes a static site to `out/`, deployable to GitHub Pages, Netlify, a
departmental server, or anything that serves files.

---

## Project structure

```
publicat.config.ts      the only file a deployment needs to edit
types/journal.ts        the eleven-field schema and row normalisation
lib/
  loadCsv.ts            browser-side parsing; URL-safe id encoding
  loadCsvServer.ts      build-time loading, indexed by issue
  useJournalData.tsx    one fetch per session, on first use
  queries.ts            the query registry — add question types here
  countryNames.ts       country resolution and its documented decisions
components/Nav.tsx      shared navigation, rendered from config
pages/
  index.tsx             timeline browser
  search.tsx            faceted search
  visualizations.tsx    five D3 charts
  network.tsx           Cosmograph network view
  ai_chat.tsx           query assistant
  journals/[journal_id].tsx   statically generated issue pages
public/data/            your CSV, and world.geojson for the map
```

## Extending it

**Add a facet** — one entry in the `FACETS` array in `pages/search.tsx`.

**Add a question type** — one entry in `QUERY_SPECS` in `lib/queries.ts`, with its recognised phrasings and a handler. The interface picks it up automatically, including the capability list.

**Adjust country mapping** — `lib/countryNames.ts`. Each historical mapping is recorded with its reasoning.


---

## Archiving

A deployment can be captured as a WACZ file with
[Browsertrix](https://browsertrix.com), replaying with search and visualisations
intact and no live server. Seed at the site root, scope Same Domain. Because
issue pages are now linked static documents, no Autoclick selector is needed.

---

## Licence

MIT.
