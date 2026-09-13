import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';
import { useJournalData } from '../lib/useJournalData';
import type { Journal } from '../types/journal';

// Cosmograph is WebGL + DuckDB-Wasm and touches `window` on import, so it must
// not be server-rendered. This also keeps it out of the static export's HTML.
const Cosmograph = dynamic(
  () => import('@cosmograph/react').then((m) => ({ default: m.Cosmograph })),
  { ssr: false, loading: () => <p style={{ padding: '1.5rem', opacity: 0.6 }}>Loading graph…</p> }
);

/** Decade is derived from journal_year, the one date field in the schema. */
const decadeOf = (year: number) => (year > 0 ? `${Math.floor(year / 10) * 10}s` : '');

/**
 * Cosmograph v2 resolves links by ordinal index rather than by id, so every
 * point carries `idx` and every link carries `sourceidx` / `targetidx`.
 */
type Point = {
  id: string; idx: number; label: string;
  color: string; size: number;
  kind: 'decade' | 'author'; count: number; degree: number;
};
type Link = {
  source: string; sourceidx: number;
  target: string; targetidx: number;
  width: number; color: string;
};

const DECADE_COLOUR = '#b98c54';
const AUTHOR_COLOURS = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949',
  '#af7aa1', '#ff9da7', '#9c755f', '#86bcb6', '#d37295', '#a0cbe8',
];

/** Map a value into [lo, hi] on a square-root scale, so large degrees don't dwarf the rest. */
const scaleSqrt = (v: number, max: number, lo: number, hi: number) =>
  max <= 0 ? lo : lo + (hi - lo) * Math.sqrt(v / max);

export default function NetworkPage() {
  const { rows, loading, error } = useJournalData();
  const router = useRouter();
  const [minItems, setMinItems] = useState(5);
  const [selected, setSelected] = useState<Point | null>(null);
  const [paused, setPaused] = useState(false);
  const graphRef = useRef<any>(null);

  const { points, links, legend, shownAuthors, totalAuthors } = useMemo(() => {
    const pairs = new Map<string, number>();
    const authorTotals = new Map<string, number>();
    const decadeTotals = new Map<string, number>();

    for (const r of rows as Journal[]) {
      const decade = decadeOf(r.journal_year);
      if (!r.author || !decade) continue;
      const key = `${decade}\u0000${r.author}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
      authorTotals.set(r.author, (authorTotals.get(r.author) ?? 0) + 1);
      decadeTotals.set(decade, (decadeTotals.get(decade) ?? 0) + 1);
    }

    const kept = new Set(
      Array.from(authorTotals.entries()).filter(([, n]) => n >= minItems).map(([a]) => a)
    );

    const decadeList = Array.from(decadeTotals.keys()).sort();
    const colourOf = new Map(decadeList.map((d, i) => [d, AUTHOR_COLOURS[i % AUTHOR_COLOURS.length]]));

    // --- degree: how many edges each node ends up with -----------------------
    // A decade's degree is the number of distinct authors it published; an
    // author's degree is the number of decades they appear in. Size therefore
    // encodes reach across the corpus, not raw output.
    const degree = new Map<string, number>();
    const dominant = new Map<string, { decade: string; n: number }>();

    for (const [key, n] of Array.from(pairs.entries())) {
      const [decade, author] = key.split('\u0000');
      if (!kept.has(author)) continue;
      const d = `decade:${decade}`;
      const a = `author:${author}`;
      degree.set(d, (degree.get(d) ?? 0) + 1);
      degree.set(a, (degree.get(a) ?? 0) + 1);
      const cur = dominant.get(author);
      if (!cur || n > cur.n) dominant.set(author, { decade, n });
    }

    const maxDecadeDegree = Math.max(1, ...decadeList.map((d) => degree.get(`decade:${d}`) ?? 0));
    const maxAuthorDegree = Math.max(1, ...Array.from(kept, (a) => degree.get(`author:${a}`) ?? 0));

    // --- points --------------------------------------------------------------
    const pointList: Point[] = [];
    const indexOf = new Map<string, number>();

    decadeList.forEach((d) => {
      const id = `decade:${d}`;
      const deg = degree.get(id) ?? 0;
      indexOf.set(id, pointList.length);
      pointList.push({
        id, idx: pointList.length, label: d, color: DECADE_COLOUR,
        size: scaleSqrt(deg, maxDecadeDegree, 12, 34),
        kind: 'decade', count: decadeTotals.get(d) ?? 0, degree: deg,
      });
    });

    Array.from(kept).forEach((a) => {
      const id = `author:${a}`;
      const deg = degree.get(id) ?? 0;
      indexOf.set(id, pointList.length);
      pointList.push({
        id, idx: pointList.length, label: a,
        color: colourOf.get(dominant.get(a)?.decade ?? '') ?? '#8899a6',
        size: scaleSqrt(deg, maxAuthorDegree, 3, 13),
        kind: 'author', count: authorTotals.get(a) ?? 0, degree: deg,
      });
    });

    // --- links ---------------------------------------------------------------
    const linkList: Link[] = [];
    for (const [key, n] of Array.from(pairs.entries())) {
      const [decade, author] = key.split('\u0000');
      if (!kept.has(author)) continue;
      const source = `decade:${decade}`;
      const target = `author:${author}`;
      const sourceidx = indexOf.get(source);
      const targetidx = indexOf.get(target);
      if (sourceidx === undefined || targetidx === undefined) continue;
      linkList.push({
        source, sourceidx, target, targetidx,
        width: 0.3 + Math.min(2.5, n / 3),
        color: 'rgba(255,255,255,0.16)',
      });
    }

    return {
      points: pointList,
      links: linkList,
      legend: decadeList.map((d) => ({ decade: d, colour: colourOf.get(d) ?? '#8899a6' })),
      shownAuthors: kept.size,
      totalAuthors: authorTotals.size,
    };
  }, [rows, minItems]);

  // v2's click payload may be a point index or the point itself; handle both.
  const handleClick = (arg: unknown) => {
    if (typeof arg === 'number') { setSelected(points[arg] ?? null); return; }
    if (arg && typeof arg === 'object' && 'id' in (arg as Point)) { setSelected(arg as Point); return; }
    setSelected(null);
  };

  const togglePause = () => {
    const g = graphRef.current;
    if (!g) return;
    if (paused) {
      if (typeof g.start === 'function') g.start();
      else if (typeof g.restart === 'function') g.restart();
    } else if (typeof g.pause === 'function') {
      g.pause();
    }
    setPaused((p) => !p);
  };

  const openInSearch = (p: Point) =>
    p.kind === 'decade'
      ? router.push(`/search?decade=${encodeURIComponent(p.label)}`)
      : router.push(`/search?q=${encodeURIComponent(p.label)}`);

  return (
    <div className={styles.container}>
      <Nav title="Network" />

      <main
        className={styles.main}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          backgroundColor: '#303841', padding: '2rem', width: '100%', boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '85%', maxWidth: '100%', color: 'white', boxSizing: 'border-box',
            backgroundColor: '#3A444E', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          }}
        >
          <header style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>Authors by decade</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.65, lineHeight: 1.5 }}>
              Each gold node is a decade; each smaller node is an author, coloured by the decade they
              appear in most. Node size is degree — how many decades an author reaches, and how many
              authors a decade published — so size shows spread rather than volume. Link thickness is
              the number of items. Click any node to open it in search.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                Minimum items per author
                <input
                  type="range" min={1} max={25} value={minItems}
                  onChange={(e) => setMinItems(Number(e.target.value))}
                  style={{ accentColor: '#b98c54' }}
                />
                <strong style={{ minWidth: '1.5rem' }}>{minItems}</strong>
              </label>

              <button onClick={togglePause} style={buttonStyle}>
                {paused ? '▶  Resume layout' : '❚❚  Pause layout'}
              </button>

              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                {shownAuthors.toLocaleString()} of {totalAuthors.toLocaleString()} authors ·{' '}
                {links.length.toLocaleString()} links · {legend.length} decades
              </span>
            </div>
          </header>

          <div style={{ height: '62vh', minHeight: 420, position: 'relative', backgroundColor: '#262c33' }}>
            {loading && <p style={{ padding: '1.5rem', opacity: 0.6 }}>Loading data…</p>}
            {!loading && error && <p style={{ padding: '1.5rem' }}>Could not load the dataset: {error}</p>}
            {!loading && !error && points.length === 0 && (
              <p style={{ padding: '1.5rem', opacity: 0.6 }}>
                No authors meet the threshold. Lower the minimum above.
              </p>
            )}
            {!loading && !error && points.length > 0 && (
              <Cosmograph
                ref={graphRef}
                points={points}
                links={links}
                pointIdBy="id"
                pointIndexBy="idx"
                pointLabelBy="label"
                pointColorBy="color"
                pointSizeBy="size"
                pointIncludeColumns={['kind', 'count', 'degree', 'label']}
                linkSourceBy="source"
                linkSourceIndexBy="sourceidx"
                linkTargetBy="target"
                linkTargetIndexBy="targetidx"
                linkWidthBy="width"
                linkColorBy="color"
                curvedLinks
                curvedLinkSegments={19}
                curvedLinkWeight={0.8}
                curvedLinkControlPointDistance={0.5}
                backgroundColor="#262c33"
                simulationRepulsion={0.6}
                simulationLinkDistance={8}
                simulationGravity={0.22}
                onClick={handleClick}
              />
            )}

            {selected && (
              <div
                style={{
                  position: 'absolute', right: '1rem', bottom: '1rem', maxWidth: 280,
                  backgroundColor: 'rgba(58,68,78,0.96)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px', padding: '0.9rem 1rem', fontSize: '0.88rem',
                }}
              >
                <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selected.kind}
                </div>
                <strong style={{ display: 'block', margin: '0.2rem 0 0.4rem' }}>{selected.label}</strong>
                <div style={{ opacity: 0.75 }}>
                  {selected.count.toLocaleString()} items ·{' '}
                  {selected.kind === 'decade'
                    ? `${selected.degree.toLocaleString()} authors`
                    : `${selected.degree} ${selected.degree === 1 ? 'decade' : 'decades'}`}
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.7rem' }}>
                  <button onClick={() => openInSearch(selected)} style={linkStyle}>Open in search</button>
                  <button onClick={() => setSelected(null)} style={{ ...linkStyle, opacity: 0.6 }}>Dismiss</button>
                </div>
              </div>
            )}
          </div>

          <footer style={{
            padding: '0.9rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', flexWrap: 'wrap', gap: '0.9rem', fontSize: '0.78rem', opacity: 0.75,
          }}>
            {legend.map(({ decade, colour }) => (
              <span key={decade} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: colour, display: 'inline-block' }} />
                {decade}
              </span>
            ))}
          </footer>
        </div>
      </main>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#b98c54',
  cursor: 'pointer', padding: 0, fontSize: '0.82rem',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#303841', color: '#e8c89a',
  border: '1px solid rgba(185, 140, 84, 0.4)', borderRadius: '6px',
  padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.82rem',
};
