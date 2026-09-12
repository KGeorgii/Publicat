/**
 * Publicat query engine.
 *
 * Deterministic, rule-based, and dependency-free: no language model, no API
 * call, no sampling. Every answer is computed by direct aggregation over the
 * parsed CSV, so the same question against the same dataset always returns the
 * same result.
 *
 * The registry below is the single source of truth. The interface renders its
 * capability list from QUERY_SPECS, and dispatch reads from QUERY_SPECS, so
 * what the assistant advertises and what it can actually do cannot diverge.
 *
 * This module is pure TypeScript with no React import, so it can be tested
 * directly.
 */
import type { Journal } from '../types/journal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Chart = {
  type: 'bar' | 'pie' | 'line';
  labels: string[];
  values: number[];
  label: string;
};

/** What the engine computed, shown alongside every answer. */
export type Provenance = {
  handler: string;
  filter: string;
  rowsConsidered: number;
};

export type QueryResult = {
  ok: true;
  title: string;
  prose: string;
  list?: string[];
  chart?: Chart;
  provenance: Provenance;
};

export type QueryFailure = {
  ok: false;
  reason: string;
  suggestions: string[];
};

export type Params = {
  decade?: string;
  year?: number;
  /** Display label for the country, e.g. "USA". */
  country?: string;
  /**
   * The country_latin values that count as that country. Resolved against the
   * loaded data, so compound entries ("USA, Great Britain") are included and a
   * filter can never silently match nothing.
   */
  countryValues?: string[];
  language?: string;
  person?: string;
  keywords: string[];
};

export type QuerySpec = {
  id: string;
  /** Shown in the capability list. */
  label: string;
  /** One concrete phrasing a user can click to run. */
  example: string;
  /** Which parameters this query can take. Shown in the capability list. */
  takes?: string;
  /** Lowercased substrings; any match selects this spec. */
  patterns: string[];
  run: (rows: Journal[], p: Params) => QueryResult | QueryFailure;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const decadeOf = (y: number) => (y > 0 ? `${Math.floor(y / 10) * 10}s` : '');

const tally = (rows: Journal[], of: (r: Journal) => string) => {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = of(r);
    if (v && v !== '-') counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
};

const distinct = (rows: Journal[], of: (r: Journal) => string) => {
  const s = new Set<string>();
  for (const r of rows) {
    const v = of(r);
    if (v && v !== '-') s.add(v);
  }
  return s;
};

const bar = (pairs: [string, number][], label: string): Chart => ({
  type: 'bar',
  labels: pairs.map((p) => p[0]),
  values: pairs.map((p) => p[1]),
  label,
});

const pie = (pairs: [string, number][], label: string): Chart => ({
  type: 'pie',
  labels: pairs.map((p) => p[0]),
  values: pairs.map((p) => p[1]),
  label,
});

const line = (pairs: [string, number][], label: string): Chart => ({
  type: 'line',
  labels: pairs.map((p) => p[0]),
  values: pairs.map((p) => p[1]),
  label,
});

/** Narrow the corpus by whichever parameters were recognised. */
function scope(rows: Journal[], p: Params) {
  let out = rows;
  const parts: string[] = [];
  if (p.decade) {
    out = out.filter((r) => decadeOf(r.journal_year) === p.decade);
    parts.push(`decade = ${p.decade}`);
  }
  if (p.year) {
    out = out.filter((r) => r.journal_year === p.year);
    parts.push(`year = ${p.year}`);
  }
  if (p.country) {
    const allowed = new Set(p.countryValues ?? [p.country]);
    out = out.filter((r) => allowed.has(r.country_latin));
    parts.push(
      `country = ${p.country}` +
        (p.countryValues && p.countryValues.length > 1 ? ` (${p.countryValues.length} spellings)` : '')
    );
  }
  if (p.language) {
    out = out.filter((r) => r.language_latin === p.language);
    parts.push(`language = ${p.language}`);
  }
  return { rows: out, label: parts.length ? parts.join(', ') : 'whole dataset' };
}

const scopeText = (p: Params) => {
  const bits: string[] = [];
  if (p.decade) bits.push(`in the ${p.decade}`);
  if (p.year) bits.push(`in ${p.year}`);
  if (p.country) bits.push(`from ${p.country}`);
  if (p.language) bits.push(`translated from ${p.language}`);
  return bits.length ? ` ${bits.join(' ')}` : '';
};

const empty = (what: string, p: Params): QueryFailure => ({
  ok: false,
  reason: `No ${what} found${scopeText(p)}. The filter may be spelled differently in the data, or the dataset may not cover it.`,
  suggestions: ['What does this dataset cover?'],
});

const ok = (
  title: string,
  prose: string,
  handler: string,
  filter: string,
  rowsConsidered: number,
  extra: { list?: string[]; chart?: Chart } = {}
): QueryResult => ({ ok: true, title, prose, provenance: { handler, filter, rowsConsidered }, ...extra });

// ---------------------------------------------------------------------------
// Parameter extraction — values come from the dataset, never hardcoded
// ---------------------------------------------------------------------------

/**
 * Readers type demonyms ("American author"); the corpus stores country names
 * ("USA"). Each demonym lists candidate spellings — the first one that exists
 * in the loaded dataset wins, so this works whether a corpus says "USA" or
 * "United States". Demonyms that are also source-language values (French,
 * Polish, German…) are deliberately absent: there the language reading is the
 * useful one for a translation journal, and it is matched literally already.
 *
 * This table is inspectable and extensible, like the country-to-ISO lookup
 * behind the world map.
 */
export const DEMONYMS: Record<string, string[]> = {
  american: ['USA', 'United States', 'United States of America', 'US'],
  british: ['Great Britain', 'United Kingdom', 'UK', 'England'],
  scottish: ['Scotland'],
  irish: ['Ireland'],
  welsh: ['Wales'],
  australian: ['Australia'],
  canadian: ['Canada'],
  austrian: ['Austria'],
  swiss: ['Switzerland'],
  belgian: ['Belgium'],
  dutch: ['Netherlands', 'Holland'],
  dane: ['Denmark'],
  danish: ['Denmark'],
  swede: ['Sweden'],
  swedish: ['Sweden'],
  norwegian: ['Norway'],
  finnish: ['Finland'],
  greek: ['Greece'],
  turkish: ['Turkey'],
  hungarian: ['Hungary'],
  romanian: ['Romania'],
  bulgarian: ['Bulgaria'],
  yugoslav: ['Yugoslavia'],
  serbian: ['Serbia', 'Yugoslavia'],
  croatian: ['Croatia', 'Yugoslavia'],
  slovak: ['Slovakia', 'Czechoslovakia'],
  soviet: ['USSR', 'Soviet Union'],
  ukrainian: ['Ukraine'],
  japanese: ['Japan'],
  chinese: ['China'],
  korean: ['Korea', 'South Korea', 'North Korea'],
  vietnamese: ['Vietnam'],
  indian: ['India'],
  israeli: ['Israel'],
  iranian: ['Iran'],
  egyptian: ['Egypt'],
  nigerian: ['Nigeria'],
  argentine: ['Argentina'],
  argentinian: ['Argentina'],
  brazilian: ['Brazil'],
  mexican: ['Mexico'],
  chilean: ['Chile'],
  colombian: ['Colombia'],
  cuban: ['Cuba'],
  peruvian: ['Peru'],
};

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STOP = new Set([
  'what', 'which', 'who', 'how', 'many', 'much', 'the', 'and', 'for', 'from', 'was',
  'were', 'are', 'did', 'does', 'show', 'list', 'give', 'tell', 'find', 'most',
  'this', 'that', 'with', 'about', 'into', 'over', 'time', 'all', 'any', 'published',
  'translated', 'articles', 'article', 'authors', 'author', 'translators', 'translator',
  'journal', 'journals', 'issue', 'issues', 'dataset', 'data', 'popular', 'common',
]);

export function extract(input: string, rows: Journal[]): Params {
  const q = input.toLowerCase();

  const decadeMatch = q.match(/\b((?:18|19|20)\d0)s\b/);
  const yearMatch = q.match(/\b((?:18|19|20)\d{2})\b/);

  const decade = decadeMatch ? `${decadeMatch[1]}s` : undefined;
  const year = !decade && yearMatch ? Number(yearMatch[1]) : undefined;

  // Longest literal match against values actually present in the corpus.
  const longest = (values: Set<string>) => {
    let best: string | undefined;
    for (const v of values) {
      const lower = v.toLowerCase();
      if (lower.length > 2 && q.includes(lower) && (!best || v.length > best.length)) best = v;
    }
    return best;
  };

  const allCountries = distinct(rows, (r) => r.country_latin);
  const languageValues = distinct(rows, (r) => r.language_latin);

  const language = longest(languageValues);

  /** Every stored value that names this country, including compound entries. */
  const valuesNaming = (candidate: string) => {
    const re = new RegExp(`\\b${escapeRe(candidate.toLowerCase())}\\b`);
    return Array.from(allCountries).filter((v) => re.test(v.toLowerCase()));
  };

  let country: string | undefined;
  let countryValues: string[] | undefined;

  // (a) a country named literally in the question
  const literal = longest(allCountries);
  if (literal) {
    country = literal;
    countryValues = valuesNaming(literal);
  }

  // (b) otherwise a demonym — but not one that is also a source-language value
  //     in this corpus, where the language reading is the useful one.
  if (!country) {
    const lowerLanguages = new Set(Array.from(languageValues, (v) => v.toLowerCase()));
    for (const [demonym, candidates] of Object.entries(DEMONYMS)) {
      if (lowerLanguages.has(demonym)) continue;
      if (!new RegExp(`\\b${demonym}`, 'i').test(q)) continue;
      for (const candidate of candidates) {
        const hits = valuesNaming(candidate);
        if (hits.length) { country = candidate; countryValues = hits; break; }
      }
      if (country) break;
    }
  }

  // People: match the full stored name, or its surname (text before the comma).
  let person: string | undefined;
  const names = new Set<string>([
    ...distinct(rows, (r) => r.author),
    ...distinct(rows, (r) => r.translator),
  ]);
  for (const name of names) {
    const full = name.toLowerCase();
    const surname = full.split(',')[0].trim();
    if ((q.includes(full) || (surname.length > 3 && q.includes(surname))) &&
        (!person || name.length > person.length)) {
      person = name;
    }
  }

  const keywords = q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));

  return { decade, year, country, countryValues, language, person, keywords };
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

export const QUERY_SPECS: QuerySpec[] = [
  // --- Rankings -----------------------------------------------------------
  {
    id: 'top-authors',
    label: 'Most frequently published authors',
    example: 'Which authors were published most often in the 1960s?',
    takes: 'decade, year, country, language',
    patterns: ['most published author', 'most prolific author', 'most frequent author',
      'most translated author', 'most published', 'top authors', 'which authors',
      'who was published most', 'who published most', 'leading authors'],
    run: (rows, p) => {
      const s = scope(rows, p);
      const top = tally(s.rows, (r) => r.author).slice(0, 10);
      if (!top.length) return empty('authors', p);
      return ok(
        'Most frequently published authors',
        `${top[0][0]} appears most often${scopeText(p)}, with ${top[0][1]} items. The top ten account for ` +
          `${top.reduce((n, t) => n + t[1], 0)} of ${s.rows.length} items in scope.`,
        'topAuthors', s.label, s.rows.length,
        { chart: bar(top, 'Items'), list: top.map(([n, c]) => `${n} — ${c}`) }
      );
    },
  },
  {
    id: 'top-translators',
    label: 'Most active translators',
    example: 'Who were the most active translators from Polish?',
    takes: 'decade, year, country, language',
    patterns: ['most active translator', 'most prolific translator', 'top translators',
      'which translators', 'who translated most', 'busiest translator',
      'leading translators', 'most translations'],
    run: (rows, p) => {
      const s = scope(rows, p);
      const top = tally(s.rows, (r) => r.translator).slice(0, 10);
      if (!top.length) return empty('translators', p);
      return ok(
        'Most active translators',
        `${top[0][0]} has the most translation credits${scopeText(p)}, with ${top[0][1]}. ` +
          `${distinct(s.rows, (r) => r.translator).size} distinct translators appear in scope.`,
        'topTranslators', s.label, s.rows.length,
        { chart: bar(top, 'Translations'), list: top.map(([n, c]) => `${n} — ${c}`) }
      );
    },
  },
  {
    id: 'top-languages',
    label: 'Most common source languages',
    example: 'What was the most popular source language in the 1970s?',
    takes: 'decade, year, country',
    patterns: ['popular language', 'common language', 'top languages', 'which languages',
      'most translated language', 'source language', 'languages translated',
      'language distribution'],
    run: (rows, p) => {
      const s = scope(rows, { ...p, language: undefined });
      const top = tally(s.rows, (r) => r.language_latin).slice(0, 10);
      if (!top.length) return empty('languages', p);
      const total = s.rows.length;
      return ok(
        'Most common source languages',
        `${top[0][0]} leads${scopeText({ ...p, language: undefined })} with ${top[0][1]} items ` +
          `(${((top[0][1] / total) * 100).toFixed(1)}% of ${total}). ` +
          `${distinct(s.rows, (r) => r.language_latin).size} distinct source languages appear in scope.`,
        'topLanguages', s.label, total,
        { chart: pie(top, 'Items'), list: top.map(([n, c]) => `${n} — ${c}`) }
      );
    },
  },
  {
    id: 'top-countries',
    label: 'Most represented countries',
    example: 'Which countries are most represented?',
    takes: 'decade, year, language',
    patterns: ['most represented countr', 'top countries', 'which countries',
      'countries represented', 'country distribution'],
    run: (rows, p) => {
      const s = scope(rows, { ...p, country: undefined });
      const top = tally(s.rows, (r) => r.country_latin).slice(0, 12);
      if (!top.length) return empty('countries', p);
      return ok(
        'Most represented countries',
        `${top[0][0]} is the most represented${scopeText({ ...p, country: undefined })} with ${top[0][1]} items. ` +
          `${distinct(s.rows, (r) => r.country_latin).size} countries appear in scope.`,
        'topCountries', s.label, s.rows.length,
        { chart: bar(top, 'Items'), list: top.map(([n, c]) => `${n} — ${c}`) }
      );
    },
  },

  // --- Time ----------------------------------------------------------------
  {
    id: 'busiest-decade',
    label: 'Busiest decade or year',
    example: 'Which decade published the most?',
    patterns: ['most active decade', 'busiest decade', 'which decade', 'peak decade',
      'most productive decade', 'busiest year', 'which year had the most'],
    run: (rows, p) => {
      const s = scope(rows, p);
      const byDecade = tally(s.rows, (r) => decadeOf(r.journal_year));
      if (!byDecade.length) return empty('dated items', p);
      const chrono = [...byDecade].sort((a, b) => a[0].localeCompare(b[0]));
      return ok(
        'Publication volume by decade',
        `The ${byDecade[0][0]} is the busiest decade with ${byDecade[0][1]} items, ` +
          `out of ${s.rows.length} dated items across ${byDecade.length} decades.`,
        'busiestDecade', s.label, s.rows.length,
        { chart: line(chrono, 'Items'), list: chrono.map(([d, c]) => `${d} — ${c}`) }
      );
    },
  },
  {
    id: 'over-time',
    label: 'A language or country over time',
    example: 'How did translation from French change over time?',
    takes: 'country, language',
    patterns: ['over time', 'change over', 'trend', 'across decades', 'by decade', 'per decade'],
    run: (rows, p) => {
      if (!p.country && !p.language) {
        return {
          ok: false,
          reason: 'Name a country or a source language to see it over time.',
          suggestions: ['How did translation from French change over time?',
            'Show publications from Poland by decade'],
        };
      }
      const s = scope(rows, p);
      const chrono = tally(s.rows, (r) => decadeOf(r.journal_year)).sort((a, b) => a[0].localeCompare(b[0]));
      if (!chrono.length) return empty('items', p);
      const peak = [...chrono].sort((a, b) => b[1] - a[1])[0];
      return ok(
        `${p.language ?? p.country} by decade`,
        `${s.rows.length} items${scopeText(p)}, spread across ${chrono.length} decades. ` +
          `The peak is the ${peak[0]} with ${peak[1]}.`,
        'overTime', s.label, s.rows.length,
        { chart: line(chrono, 'Items'), list: chrono.map(([d, c]) => `${d} — ${c}`) }
      );
    },
  },

  // --- Lookups -------------------------------------------------------------
  {
    id: 'person-works',
    label: 'Everything by one author or translator',
    example: 'What did Jack London publish here?',
    takes: 'a name as spelled in the dataset',
    patterns: ['what did', 'works by', 'published by', 'translated by', 'items by',
      'show me everything by', 'articles by'],
    run: (rows, p) => {
      if (!p.person) {
        return {
          ok: false,
          reason: 'I could not match a name in that question to a name in the dataset. Names must be spelled as the dataset records them.',
          suggestions: ['Which authors were published most often?', 'Who were the most active translators?'],
        };
      }
      const asAuthor = rows.filter((r) => r.author === p.person);
      const asTranslator = rows.filter((r) => r.translator === p.person);
      const all = [...asAuthor, ...asTranslator];
      if (!all.length) return empty('items', p);
      const parts: string[] = [];
      if (asAuthor.length) parts.push(`${asAuthor.length} as author`);
      if (asTranslator.length) parts.push(`${asTranslator.length} as translator`);
      const chrono = tally(all, (r) => decadeOf(r.journal_year)).sort((a, b) => a[0].localeCompare(b[0]));
      return ok(
        p.person,
        `${all.length} items — ${parts.join(', ')}. Earliest ${Math.min(...all.map((r) => r.journal_year).filter(Boolean))}, ` +
          `latest ${Math.max(...all.map((r) => r.journal_year))}.`,
        'personWorks', `person = ${p.person}`, rows.length,
        {
          chart: chrono.length > 1 ? line(chrono, 'Items') : undefined,
          list: all.slice(0, 40).map((r) =>
            `${r.article_name || 'Untitled'} — ${r.journal_name} ${r.journal_year}, №${r.journal_number}` +
            (r.author && r.author !== p.person ? ` (author: ${r.author})` : '') +
            (r.translator && r.translator !== p.person ? ` (trans. ${r.translator})` : '')),
        }
      );
    },
  },
  {
    id: 'authors-from',
    label: 'Authors from a country',
    example: 'Show me all authors from Japan',
    takes: 'country, decade, year',
    patterns: ['authors from', 'writers from', 'authors in', 'who was published from'],
    run: (rows, p) => {
      if (!p.country) {
        return {
          ok: false,
          reason: 'Name a country as the dataset spells it.',
          suggestions: ['Which countries are most represented?'],
        };
      }
      const s = scope(rows, p);
      const top = tally(s.rows, (r) => r.author);
      if (!top.length) return empty('authors', p);
      return ok(
        `Authors from ${p.country}`,
        `${top.length} distinct authors from ${p.country}${p.decade ? ` in the ${p.decade}` : ''}, ` +
          `across ${s.rows.length} items.`,
        'authorsFromCountry', s.label, s.rows.length,
        { chart: bar(top.slice(0, 10), 'Items'), list: top.slice(0, 40).map(([n, c]) => `${n} — ${c}`) }
      );
    },
  },
  {
    id: 'translators-for-language',
    label: 'Who translated from a given language',
    example: 'Who translated from German?',
    takes: 'language, decade, year',
    patterns: ['who translated from', 'translators from', 'translators of'],
    run: (rows, p) => {
      if (!p.language) {
        return {
          ok: false,
          reason: 'Name a source language as the dataset spells it.',
          suggestions: ['What were the most common source languages?'],
        };
      }
      const s = scope(rows, p);
      const top = tally(s.rows, (r) => r.translator);
      if (!top.length) return empty('translators', p);
      return ok(
        `Translators from ${p.language}`,
        `${top.length} distinct translators worked from ${p.language}${p.decade ? ` in the ${p.decade}` : ''}, ` +
          `across ${s.rows.length} items. ${top[0][0]} has the most, with ${top[0][1]}.`,
        'translatorsForLanguage', s.label, s.rows.length,
        { chart: bar(top.slice(0, 10), 'Translations'), list: top.slice(0, 40).map(([n, c]) => `${n} — ${c}`) }
      );
    },
  },
  {
    id: 'issues-in',
    label: 'Issues in a year or decade',
    example: 'Which issues came out in 1968?',
    takes: 'year, decade',
    patterns: ['which issues', 'what issues', 'issues in', 'issues published', 'list issues'],
    run: (rows, p) => {
      if (!p.year && !p.decade) {
        return { ok: false, reason: 'Name a year or a decade.', suggestions: ['Which issues came out in 1968?'] };
      }
      const s = scope(rows, p);
      const ids = Array.from(new Set(s.rows.map((r) => r.journal_id))).sort();
      if (!ids.length) return empty('issues', p);
      return ok(
        `Issues${scopeText(p)}`,
        `${ids.length} issues${scopeText(p)}, containing ${s.rows.length} items.`,
        'issuesIn', s.label, s.rows.length,
        { list: ids }
      );
    },
  },

  // --- Counts --------------------------------------------------------------
  {
    id: 'count-items',
    label: 'How many items, issues, authors, translators',
    example: 'How many articles were published in 1968?',
    takes: 'decade, year, country, language',
    patterns: ['how many', 'number of', 'count of', 'total number'],
    run: (rows, p) => {
      const s = scope(rows, p);
      if (!s.rows.length) return empty('items', p);
      const issues = new Set(s.rows.map((r) => r.journal_id)).size;
      const authors = distinct(s.rows, (r) => r.author).size;
      const translators = distinct(s.rows, (r) => r.translator).size;
      const languages = distinct(s.rows, (r) => r.language_latin).size;
      const countries = distinct(s.rows, (r) => r.country_latin).size;
      return ok(
        `Counts${scopeText(p)}`,
        `${s.rows.length} items across ${issues} issues${scopeText(p)}: ` +
          `${authors} distinct authors, ${translators} translators, ${languages} source languages, ${countries} countries.`,
        'counts', s.label, s.rows.length,
        {
          chart: bar(
            [['Items', s.rows.length], ['Issues', issues], ['Authors', authors],
             ['Translators', translators], ['Languages', languages], ['Countries', countries]],
            'Count'
          ),
        }
      );
    },
  },

  // --- Corpus --------------------------------------------------------------
  {
    id: 'coverage',
    label: 'What the dataset covers',
    example: 'What does this dataset cover?',
    patterns: ['what does this dataset', 'dataset cover', 'what data', 'coverage',
      'date range', 'what is in this', 'overview', 'summary of the data'],
    run: (rows) => {
      const dated = rows.filter((r) => r.journal_year > 0);
      if (!dated.length) return empty('dated items', { keywords: [] });
      const years = dated.map((r) => r.journal_year);
      const byDecade = tally(dated, (r) => decadeOf(r.journal_year)).sort((a, b) => a[0].localeCompare(b[0]));
      return ok(
        'Dataset coverage',
        `${rows.length} items across ${new Set(rows.map((r) => r.journal_id)).size} issues, ` +
          `${Math.min(...years)}–${Math.max(...years)}. ` +
          `${distinct(rows, (r) => r.author).size} distinct authors, ` +
          `${distinct(rows, (r) => r.translator).size} translators, ` +
          `${distinct(rows, (r) => r.language_latin).size} source languages, ` +
          `${distinct(rows, (r) => r.country_latin).size} countries.`,
        'coverage', 'whole dataset', rows.length,
        { chart: line(byDecade, 'Items') }
      );
    },
  },
  {
    id: 'search-titles',
    label: 'Search article titles for a word',
    example: 'Find articles about war',
    takes: 'any keyword',
    patterns: ['articles about', 'find articles', 'titles containing', 'search for',
      'articles mentioning', 'anything about'],
    run: (rows, p) => {
      if (!p.keywords.length) {
        return { ok: false, reason: 'Give me a word to look for in article titles.', suggestions: ['Find articles about war'] };
      }
      const hits = rows.filter((r) => {
        const t = r.article_name.toLowerCase();
        return p.keywords.some((k) => t.includes(k));
      });
      if (!hits.length) {
        return {
          ok: false,
          reason: `No article titles contain ${p.keywords.map((k) => `"${k}"`).join(' or ')}. ` +
            `Titles are matched literally, in the language the dataset records them.`,
          suggestions: ['What does this dataset cover?'],
        };
      }
      return ok(
        `Titles matching ${p.keywords.map((k) => `"${k}"`).join(', ')}`,
        `${hits.length} article titles match.`,
        'searchTitles', `title contains ${p.keywords.join(' | ')}`, rows.length,
        {
          list: hits.slice(0, 40).map((r) =>
            `${r.article_name} — ${r.author || 'Unknown'} (${r.journal_name} ${r.journal_year}, №${r.journal_number})`),
        }
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/** True when every word of `pattern` appears in `q`, in order, at a word boundary. */
export function patternMatches(pattern: string, q: string): boolean {
  const words = pattern.split(/\s+/).filter(Boolean).map(escapeRe);
  if (!words.length) return false;
  return new RegExp(words.map((w) => `\\b${w}`).join('[\\s\\S]*?'), 'i').test(q);
}

export function runQuery(input: string, rows: Journal[]): QueryResult | QueryFailure {
  const q = input.toLowerCase().trim();
  if (!q) {
    return { ok: false, reason: 'Ask a question about the dataset.', suggestions: QUERY_SPECS.slice(0, 4).map((s) => s.example) };
  }
  if (!rows.length) {
    return { ok: false, reason: 'The dataset has not loaded.', suggestions: [] };
  }

  // Patterns match as ordered word sequences, not contiguous substrings, so
  // modifiers between the keywords ("most published AMERICAN author") do not
  // break the match. Still fully deterministic: the regex is derived from the
  // pattern, nothing is inferred.
  let spec: QuerySpec | undefined;
  let bestScore = 0;
  for (const candidate of QUERY_SPECS) {
    for (const pat of candidate.patterns) {
      if (!patternMatches(pat, q)) continue;
      const score = pat.split(/\s+/).length;       // longer pattern = more specific
      if (score > bestScore) { bestScore = score; spec = candidate; }
    }
  }
  if (!spec) {
    return {
      ok: false,
      reason:
        'That phrasing does not match any of the questions this assistant computes. ' +
        'It matches wording, not meaning, so rephrasing closer to one of these will work.',
      suggestions: QUERY_SPECS.slice(0, 6).map((s) => s.example),
    };
  }
  return spec.run(rows, extract(input, rows));
}

/**
 * What the assistant cannot do. Written by hand, because limits are not
 * derivable from the registry the way capabilities are.
 */
export const LIMITATIONS = [
  'It matches wording, not meaning. A question phrased outside the patterns above will not be understood, however clear it is.',
  'It only knows the eleven columns of the CSV. Nothing about biography, plot, reception, historical context, or why something was published.',
  'Names, countries and languages must be spelled as the dataset spells them. There is no fuzzy matching or transliteration.',
  'Each question is answered independently. There is no memory of the previous one, so follow-ups like "and in the 1970s?" will not work.',
  'It counts and ranks. It does not interpret, compare against other datasets, or draw conclusions.',
  'Counts reflect what the curators recorded, including their decisions about pseudonyms, anonymous items, and name variants.',
];
