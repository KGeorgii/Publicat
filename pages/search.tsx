import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';
import { useJournalData } from '../lib/useJournalData';
import { encodeId } from '../lib/loadCsv';
import type { Journal } from '../types/journal';

/** Facet definitions. Adding a facet is one entry here. */
const FACETS = [
  { key: 'decade', label: 'Decade', of: (r: Journal) => (r.journal_year > 0 ? `${Math.floor(r.journal_year / 10) * 10}s` : '') },
  { key: 'lang', label: 'Source language', of: (r: Journal) => r.language_latin },
  { key: 'country', label: 'Country', of: (r: Journal) => (r.country_latin === '-' ? '' : r.country_latin) },
  { key: 'journal', label: 'Journal', of: (r: Journal) => r.journal_name },
] as const;

type FacetKey = (typeof FACETS)[number]['key'];
type Selections = Record<FacetKey, string[]>;

const parseList = (v: unknown): string[] =>
  typeof v === 'string' && v ? v.split('|').filter(Boolean) : [];

const VALUES_SHOWN = 8;

export default function SearchPage() {
  const { rows, loading, error } = useJournalData();
  const router = useRouter();

  // The query string is the source of truth: every search and every facet
  // combination is a URL that can be linked, bookmarked and cited.
  const urlTerm = typeof router.query.q === 'string' ? router.query.q : '';
  const [input, setInput] = useState(urlTerm);
  const typing = useRef(false);

  const selections = useMemo(() => {
    const s = {} as Selections;
    FACETS.forEach((f) => { s[f.key] = parseList(router.query[f.key]); });
    return s;
  }, [router.query]);

  useEffect(() => { if (!typing.current) setInput(urlTerm); }, [urlTerm]);

  useEffect(() => {
    if (input === urlTerm) return;
    const id = setTimeout(() => {
      const query = { ...router.query };
      if (input) query.q = input; else delete query.q;
      router.replace({ query }, undefined, { shallow: true });
      typing.current = false;
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const setFacet = (key: FacetKey, values: string[]) => {
    const query = { ...router.query };
    if (values.length) query[key] = values.join('|'); else delete query[key];
    router.replace({ query }, undefined, { shallow: true });
  };

  const toggle = (key: FacetKey, value: string) => {
    const current = selections[key];
    setFacet(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  };

  const clearAll = () => router.replace({ query: {} }, undefined, { shallow: true });

  const term = input.trim().toLowerCase();
  const activeCount = FACETS.reduce((n, f) => n + selections[f.key].length, 0);

  const matchesText = (r: Journal) =>
    !term ||
    r.author.toLowerCase().includes(term) ||
    r.article_name.toLowerCase().includes(term) ||
    r.translator.toLowerCase().includes(term);

  const matchesFacet = (r: Journal, key: FacetKey) => {
    const chosen = selections[key];
    if (!chosen.length) return true;
    const f = FACETS.find((x) => x.key === key)!;
    return chosen.includes(f.of(r));
  };

  // Rows passing the text term and every facet.
  const filtered = useMemo(
    () => rows.filter((r) => matchesText(r) && FACETS.every((f) => matchesFacet(r, f.key))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, term, selections]
  );

  /**
   * Counts for one facet are computed over the set filtered by the text term
   * and by every *other* facet — so selecting "1960s" narrows the language
   * counts, but the decade list still shows the other decades you could add.
   */
  const facetCounts = useMemo(() => {
    const out = {} as Record<FacetKey, [string, number][]>;
    FACETS.forEach((f) => {
      const base = rows.filter(
        (r) => matchesText(r) && FACETS.every((o) => o.key === f.key || matchesFacet(r, o.key))
      );
      const counts = new Map<string, number>();
      base.forEach((r) => {
        const v = f.of(r);
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      });
      out[f.key] = Array.from(counts.entries()).sort((a, b) =>
        f.key === 'decade' ? a[0].localeCompare(b[0]) : b[1] - a[1]
      );
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, term, selections]);

  // The three-block grouping records *why* a row matched, which is the access
  // pattern the interface is built around. It only applies to a text search.
  const blocks: Record<string, Journal[]> = {};
  if (term) {
    const sorted = [...filtered].sort((a, b) => a.journal_id.localeCompare(b.journal_id));
    const push = (k: string, j: Journal) => { (blocks[k] ||= []).push(j); };
    sorted.forEach((j) => {
      if (j.author.toLowerCase().includes(term)) push('Author', j);
      if (j.article_name.toLowerCase().includes(term)) push('Article Name', j);
      if (j.translator.toLowerCase().includes(term)) push('Translator', j);
    });
  } else if (activeCount) {
    blocks['Matching items'] = [...filtered].sort((a, b) => a.journal_id.localeCompare(b.journal_id));
  }

  const panel = { backgroundColor: '#4A5964', borderRadius: '4px', padding: '1rem', boxSizing: 'border-box' as const };

  return (
    <div className={styles.container}>
      <Nav title="Search" />

      <main
        className={styles.main}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem',
          backgroundColor: '#303841', padding: '2rem', borderRadius: '8px',
          width: '100%', boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '80%', maxWidth: '100%', backgroundColor: '#3A444E', padding: '1.5rem',
            borderRadius: '8px', boxSizing: 'border-box', color: 'white',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Journal Search</h2>
          <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
            Search by author, article title, or translator, and narrow by decade, language,
            country, or journal. The address bar tracks the full query, so any result set can
            be linked or cited.
          </p>

          <input
            type="text"
            placeholder="Search…"
            value={input}
            onChange={(e) => { typing.current = true; setInput(e.target.value); }}
            style={{
              width: '100%', padding: '0.75rem 1rem', backgroundColor: '#2C3440', color: 'white',
              border: 'none', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box',
              marginBottom: '1rem',
            }}
          />

          {loading && <p style={{ textAlign: 'center' }}>Loading data…</p>}
          {!loading && error && <p style={{ textAlign: 'center' }}>Could not load the dataset: {error}</p>}

          {!loading && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) 1fr', gap: '1.5rem', alignItems: 'start' }}>

              {/* ---- Facets ---- */}
              <aside style={{ ...panel, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>Filters</strong>
                  {(activeCount > 0 || term) && (
                    <button
                      onClick={clearAll}
                      style={{ background: 'none', border: 'none', color: '#b98c54', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
                    >
                      clear all
                    </button>
                  )}
                </div>

                {FACETS.map((f) => (
                  <FacetBlock
                    key={f.key}
                    label={f.label}
                    values={facetCounts[f.key]}
                    selected={selections[f.key]}
                    onToggle={(v) => toggle(f.key, v)}
                  />
                ))}
              </aside>

              {/* ---- Results ---- */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  {term || activeCount
                    ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} items`
                    : 'Enter a search term or pick a filter to begin.'}
                </p>

                {(term || activeCount) && filtered.length === 0 && <p>No results.</p>}

                {Object.entries(blocks).map(([blockName, items]) => (
                  <div key={blockName} style={{ ...panel, overflow: 'auto' }}>
                    <h3 style={{ marginTop: 0 }}>
                      {blockName} <span style={{ opacity: 0.7, fontWeight: 'normal' }}>({items.length})</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {items.slice(0, 100).map((journal, index) => (
                        <div
                          key={`${journal.journal_id}-${index}`}
                          style={{
                            backgroundColor: '#303841', borderRadius: '4px', padding: '1rem',
                            wordWrap: 'break-word', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                          }}
                        >
                          <Link
                            href={`/journals/${encodeId(journal.journal_id)}`}
                            style={{ color: '#b98c54', textDecoration: 'none', fontWeight: 'bold' }}
                          >
                            {journal.journal_name} ({journal.journal_year}, №{journal.journal_number})
                          </Link>
                          <div style={{ fontSize: '0.9rem' }}>
                            <p style={{ margin: '0.2rem 0' }}><strong>Article:</strong> {journal.article_name}</p>
                            {journal.author && <p style={{ margin: '0.2rem 0' }}><strong>Author:</strong> {journal.author}</p>}
                            {journal.translator && <p style={{ margin: '0.2rem 0' }}><strong>Translator:</strong> {journal.translator}</p>}
                            {journal.language_latin && <p style={{ margin: '0.2rem 0' }}><strong>Language:</strong> {journal.language_latin}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {items.length > 100 && (
                      <p style={{ marginBottom: 0, opacity: 0.7 }}>
                        Showing the first 100 of {items.length} matches. Narrow with a filter to see the rest.
                      </p>
                    )}
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FacetBlock({
  label, values, selected, onToggle,
}: {
  label: string;
  values: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!values.length && !selected.length) return null;

  // Anything already selected stays visible even if it falls below the cut.
  const head = values.slice(0, expanded ? values.length : VALUES_SHOWN);
  const shown = [...head, ...values.filter(([v]) => selected.includes(v) && !head.some(([h]) => h === v))];

  return (
    <div>
      <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '0.4rem' }}>
        {label}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {shown.map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <li key={value}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={on} onChange={() => onToggle(value)} style={{ cursor: 'pointer' }} />
                <span style={{ flex: 1, color: on ? '#b98c54' : 'white' }}>{value}</span>
                <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>{count.toLocaleString()}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {values.length > VALUES_SHOWN && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: '#b98c54', cursor: 'pointer', padding: '0.3rem 0 0', fontSize: '0.8rem' }}
        >
          {expanded ? 'show fewer' : `show all ${values.length}`}
        </button>
      )}
    </div>
  );
}
