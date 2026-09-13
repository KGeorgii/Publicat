// @ts-nocheck — the D3 code below is loosely typed.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';
import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';
import { useJournalData } from '../lib/useJournalData';
import { countryKey, matchesFeature } from '../lib/countryNames';

const decadeOf = (year: number) => (year > 0 ? `${Math.floor(year / 10) * 10}s` : '');
const WORLD_GEOJSON = '/data/world.geojson';
// Fallback if the local copy has not been committed. Prefer the local file:
// it keeps a clone self-contained and survives the upstream repo moving.
const WORLD_GEOJSON_FALLBACK =
  'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

const PALETTE = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
  '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab',
];

function tooltip(selector: string) {
  d3.select(selector).selectAll('div.tooltip').remove();
  return d3
    .select(selector)
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background-color', 'rgba(0,0,0,0.8)')
    .style('color', 'white')
    .style('padding', '5px 10px')
    .style('border-radius', '5px')
    .style('pointer-events', 'none')
    .style('font-size', '0.85rem')
    .style('z-index', '100');
}

export default function Visualizations() {
  const { rows, loading, error } = useJournalData();
  const [world, setWorld] = useState(null);
  const [worldError, setWorldError] = useState<string | null>(null);
  const [mapDecade, setMapDecade] = useState('all');
  const worldFetched = useRef(false);

  // --- derived data ---------------------------------------------------------
  const dated = useMemo(() => rows.filter((r) => r.journal_year > 0), [rows]);
  const decades = useMemo(
    () => Array.from(new Set(dated.map((r) => decadeOf(r.journal_year)))).sort(),
    [dated]
  );

  useEffect(() => {
    if (worldFetched.current) return;
    worldFetched.current = true;

    const load = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const json = await res.json();
      if (!json?.features?.length) throw new Error(`no features in ${url}`);
      return json;
    };

    load(WORLD_GEOJSON)
      .catch(() => load(WORLD_GEOJSON_FALLBACK))
      .then((json) => { setWorld(json); setWorldError(null); })
      .catch((e: Error) => setWorldError(e.message));
  }, []);

  // --- 1. unique authors per decade ----------------------------------------
  useEffect(() => {
    if (!dated.length) return;
    const container = '.chart-authors';
    d3.select(container).selectAll('*').remove();

    const byDecade = new Map<string, Set<string>>();
    dated.forEach((r) => {
      if (!r.author) return;
      const d = decadeOf(r.journal_year);
      if (!byDecade.has(d)) byDecade.set(d, new Set());
      byDecade.get(d)!.add(r.author);
    });
    const data = Array.from(byDecade, ([decade, set]) => ({ decade, count: set.size }))
      .sort((a, b) => a.decade.localeCompare(b.decade));

    const W = 800, H = 380, m = { top: 20, right: 20, bottom: 40, left: 55 };
    const cw = W - m.left - m.right, ch = H - m.top - m.bottom;
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const tip = tooltip(container);

    const x = d3.scaleBand().domain(data.map((d) => d.decade)).range([0, cw]).padding(0.12);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.count) || 0]).nice().range([ch, 0]);

    g.selectAll('rect').data(data).enter().append('rect')
      .attr('x', (d) => x(d.decade)).attr('y', (d) => y(d.count))
      .attr('width', x.bandwidth()).attr('height', (d) => ch - y(d.count))
      .attr('fill', '#4e79a7')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('fill', '#b98c54');
        tip.style('opacity', 0.95)
          .html(`<strong>${d.decade}</strong><br/>${d.count} distinct authors`)
          .style('left', `${event.offsetX + 15}px`).style('top', `${event.offsetY}px`);
      })
      .on('mouseout', function () { d3.select(this).attr('fill', '#4e79a7'); tip.style('opacity', 0); });

    g.append('g').attr('transform', `translate(0,${ch})`).call(d3.axisBottom(x)).selectAll('text').style('fill', 'white');
    g.append('g').call(d3.axisLeft(y)).selectAll('text').style('fill', 'white');
  }, [dated]);

  // --- 2. country share by decade ------------------------------------------
  useEffect(() => {
    if (!dated.length) return;
    const container = '.chart-countries';
    d3.select(container).selectAll('*').remove();

    const counts: Record<string, Record<string, number>> = {};
    dated.forEach((r) => {
      const c = r.country_latin;
      if (!c || c === '-') return;
      const d = decadeOf(r.journal_year);
      counts[d] ||= {};
      counts[d][c] = (counts[d][c] || 0) + 1;
    });
    Object.keys(counts).forEach((d) => {
      const total = Object.values(counts[d]).reduce((a, b) => a + b, 0);
      Object.keys(counts[d]).forEach((c) => { counts[d][c] = (counts[d][c] / total) * 100; });
    });

    const decs = Object.keys(counts).sort();
    const countries = Array.from(new Set(decs.flatMap((d) => Object.keys(counts[d]))));
    const W = 800, H = 520, m = { top: 20, right: 20, bottom: 40, left: 50 };
    const cw = W - m.left - m.right, ch = H - m.top - m.bottom;
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const tip = tooltip(container);

    const x = d3.scaleBand().domain(decs).range([0, cw]).paddingInner(0.1);
    const y = d3.scaleLinear().domain([0, 100]).range([ch, 0]);
    const colour = d3.scaleOrdinal(d3.schemeTableau10.concat(PALETTE)).domain(countries);

    decs.forEach((d) => {
      let offset = 0;
      Object.entries(counts[d]).sort((a, b) => b[1] - a[1]).forEach(([country, pct]) => {
        g.append('rect')
          .attr('x', x(d)).attr('y', y(offset + pct))
          .attr('width', x.bandwidth()).attr('height', y(offset) - y(offset + pct))
          .attr('fill', colour(country))
          .on('mousemove', function (event) {
            d3.select(this).attr('fill', 'white');
            tip.style('opacity', 0.95)
              .html(`<strong>${country}</strong><br/>${pct.toFixed(1)}% of ${d}`)
              .style('left', `${event.offsetX + 15}px`).style('top', `${event.offsetY}px`);
          })
          .on('mouseout', function () { d3.select(this).attr('fill', colour(country)); tip.style('opacity', 0); });
        offset += pct;
      });
    });

    g.append('g').attr('transform', `translate(0,${ch})`).call(d3.axisBottom(x)).selectAll('text').style('fill', 'white');
    g.append('g').call(d3.axisLeft(y).tickFormat((d) => `${d}%`)).selectAll('text').style('fill', 'white');
  }, [dated]);

  // --- 3. world map ---------------------------------------------------------
  const [unplaced, setUnplaced] = useState(0);
  const [unplacedNames, setUnplacedNames] = useState<string[]>([]);
  useEffect(() => {
    if (!world || !dated.length) return;
    const container = '.chart-map';
    d3.select(container).selectAll('*').remove();

    const subset = mapDecade === 'all' ? dated : dated.filter((r) => decadeOf(r.journal_year) === mapDecade);

    // Counting and matching reproduce the Vsesvit implementation exactly, so
    // the same corpus yields the same figures in either deployment.
    // country_latin is qualified by literature ("France. French Literature"),
    // so the country is the segment before the first separator. See
    // lib/countryNames.ts for the convention and the mapping decisions.
    const countryCounts: Record<string, number> = {};
    subset.forEach((r) => {
      const key = countryKey(r.country_latin);
      if (!key) return;
      countryCounts[key] = (countryCounts[key] || 0) + 1;
    });

    const W = 900, H = 460;
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');
    const tip = tooltip(container);

    // Explicit scale/centre/translate rather than fitSize: robust to GeoJSON
    // that includes Antarctica or stray antimeridian geometry, which can make
    // a fitted projection collapse to an unusable scale.
    const projection = d3
      .geoEquirectangular()
      .scale(W / 6.4)
      .center([0, 0])
      .translate([W / 2, H / 2]);
    const path = d3.geoPath().projection(projection);
    const maxCount = Math.max(...Object.values(countryCounts), 1);
    const NO_DATA = '#eaeaea';
    const colour = d3.scaleLinear<string>().domain([0, maxCount]).range(['#cfe2f3', '#0056b3']);

    // Count for a feature, or null when no corpus entry matches it.
    const countFor = (f: any): number | null => {
      for (const [name, count] of Object.entries(countryCounts)) {
        if (matchesFeature(name, f)) return count;
      }
      return null;
    };

    // Corpus entries that match no feature on this map — reported, not dropped.
    const unmatched = Object.entries(countryCounts).filter(
      ([name]) => !world.features.some((f: any) => matchesFeature(name, f))
    );
    setUnplaced(unmatched.reduce((a, [, n]) => a + n, 0));
    setUnplacedNames(unmatched.sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n));

    svg.append('g').selectAll('path').data(world.features).enter().append('path')
      .attr('d', path)
      .attr('fill', (f) => {
        const n = countFor(f);
        return n === null ? NO_DATA : colour(n);
      })
      .attr('stroke', '#8d959c').attr('stroke-width', 0.4)
      .on('mousemove', function (event, f) {
        const n = countFor(f) ?? 0;
        d3.select(this).attr('stroke', '#b98c54').attr('stroke-width', 1.2);
        tip.style('opacity', 0.95)
          .html(
            `<strong>${f.properties?.name ?? f.id}</strong><br/>` +
            (n ? `${n} ${n === 1 ? 'item' : 'items'}` : 'no items in this period')
          )
          .style('left', `${event.offsetX + 15}px`).style('top', `${event.offsetY}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', '#8d959c').attr('stroke-width', 0.4);
        tip.style('opacity', 0);
      });
  }, [world, dated, mapDecade]);

  // --- 4. top ten source languages -----------------------------------------
  useEffect(() => {
    if (!dated.length) return;
    const container = '.chart-languages';
    d3.select(container).selectAll('*').remove();

    const counts = new Map<string, number>();
    dated.forEach((r) => {
      const l = r.language_latin;
      if (!l || l === '-') return;
      counts.set(l, (counts.get(l) ?? 0) + 1);
    });
    const data = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!data.length) return;
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

    const W = 760, H = 440, r = Math.min(W, H) / 2 - 90;
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');
    const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);

    const pie = d3.pie().sort(null).value((d) => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(r);
    const outer = d3.arc().innerRadius(r * 1.12).outerRadius(r * 1.12);
    const colour = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map((d) => d[0]));

    const slices = pie(data);

    g.selectAll('path').data(slices).enter().append('path')
      .attr('d', arc).attr('fill', (d) => colour(d.data[0]))
      .attr('stroke', '#3A444E').attr('stroke-width', 1);

    g.selectAll('polyline').data(slices).enter().append('polyline')
      .attr('stroke', 'rgba(255,255,255,0.45)').attr('fill', 'none').attr('stroke-width', 1)
      .attr('points', (d) => {
        const a = arc.centroid(d);
        const b = outer.centroid(d);
        const c = [...outer.centroid(d)];
        c[0] = r * 1.24 * ((d.startAngle + d.endAngle) / 2 < Math.PI ? 1 : -1);
        return [a, b, c];
      });

    g.selectAll('text').data(slices).enter().append('text')
      .attr('transform', (d) => {
        const c = [...outer.centroid(d)];
        c[0] = r * 1.28 * ((d.startAngle + d.endAngle) / 2 < Math.PI ? 1 : -1);
        return `translate(${c})`;
      })
      .style('text-anchor', (d) => ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end'))
      .style('fill', 'white').style('font-size', '12px')
      .text((d) => `${d.data[0]} — ${((d.data[1] / total) * 100).toFixed(1)}%`);
  }, [dated]);

  // --- 5. language flow by decade (Sankey) ----------------------------------
  useEffect(() => {
    if (!dated.length) return;
    const container = '.chart-sankey';
    d3.select(container).selectAll('*').remove();

    const perDecade = new Map<string, Map<string, number>>();
    dated.forEach((r) => {
      const l = r.language_latin;
      if (!l || l === '-') return;
      const d = decadeOf(r.journal_year);
      if (!perDecade.has(d)) perDecade.set(d, new Map());
      const m = perDecade.get(d)!;
      m.set(l, (m.get(l) ?? 0) + 1);
    });

    const decs = Array.from(perDecade.keys()).sort();
    const flows: { decade: string; language: string; value: number }[] = [];
    decs.forEach((d) => {
      Array.from(perDecade.get(d)!.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .forEach(([language, value]) => flows.push({ decade: d, language, value }));
    });
    if (!flows.length) return;

    const languages = Array.from(new Set(flows.map((f) => f.language)));
    const nodes = [
      ...decs.map((d) => ({ name: d, kind: 'decade' })),
      ...languages.map((l) => ({ name: l, kind: 'language' })),
    ];
    const index = new Map(nodes.map((n, i) => [`${n.kind}:${n.name}`, i]));
    const links = flows.map((f) => ({
      source: index.get(`decade:${f.decade}`),
      target: index.get(`language:${f.language}`),
      value: f.value,
    }));

    const W = 860, H = Math.max(420, nodes.length * 16);
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');
    const tip = tooltip(container);

    const layout = d3Sankey()
      .nodeWidth(14).nodePadding(10)
      .extent([[6, 12], [W - 6, H - 12]]);
    const graph = layout({ nodes: nodes.map((d) => ({ ...d })), links: links.map((d) => ({ ...d })) });
    const colour = d3.scaleOrdinal(d3.schemeTableau10).domain(languages);
    const decadeTotals = new Map(decs.map((d) => [
      d, flows.filter((f) => f.decade === d).reduce((a, f) => a + f.value, 0),
    ]));

    svg.append('g').attr('fill', 'none').selectAll('path').data(graph.links).enter().append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => colour(d.target.name))
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', (d) => Math.max(1, d.width))
      .on('mousemove', function (event, d) {
        d3.select(this).attr('stroke-opacity', 0.8);
        const share = ((d.value / (decadeTotals.get(d.source.name) || 1)) * 100).toFixed(1);
        tip.style('opacity', 0.95)
          .html(`<strong>${d.source.name} → ${d.target.name}</strong><br/>${d.value} items (${share}% of decade top five)`)
          .style('left', `${event.offsetX + 15}px`).style('top', `${event.offsetY}px`);
      })
      .on('mouseout', function () { d3.select(this).attr('stroke-opacity', 0.35); tip.style('opacity', 0); });

    const node = svg.append('g').selectAll('g').data(graph.nodes).enter().append('g');
    node.append('rect')
      .attr('x', (d) => d.x0).attr('y', (d) => d.y0)
      .attr('width', (d) => d.x1 - d.x0).attr('height', (d) => Math.max(1, d.y1 - d.y0))
      .attr('fill', (d) => (d.kind === 'decade' ? '#b98c54' : colour(d.name)));
    node.append('text')
      .attr('x', (d) => (d.kind === 'decade' ? d.x1 + 6 : d.x0 - 6))
      .attr('y', (d) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => (d.kind === 'decade' ? 'start' : 'end'))
      .style('fill', 'white').style('font-size', '11px')
      .text((d) => d.name);
  }, [dated]);

  const panel = {
    width: '80%', maxWidth: '100%', backgroundColor: '#3A444E', padding: '1.5rem',
    borderRadius: '8px', color: 'white', boxSizing: 'border-box' as const,
  };
  const caption = { fontFamily: 'verdana', fontSize: '0.92rem', lineHeight: 1.5, opacity: 0.75 };

  return (
    <div className={styles.container}>
      <Nav title="Visualizations" />

      <main
        className={styles.main}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem',
          backgroundColor: '#303841', padding: '2rem', borderRadius: '8px', width: '100%', boxSizing: 'border-box',
        }}
      >
        {loading && <div style={{ ...panel, textAlign: 'center' }}>Loading data…</div>}
        {!loading && error && <div style={{ ...panel, textAlign: 'center' }}>Could not load the dataset: {error}</div>}

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>1. Unique authors per decade</h2>
          <p style={caption}>
            Distinct authors published in each decade, deduplicated by name.
          </p>
          <div className="chart-authors" style={{ position: 'relative', width: '100%' }} />
        </div>

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>2. Country distribution by decade</h2>
          <p style={caption}>
            Each decade&apos;s source countries as percentage shares summing to 100%, so decades can be
            compared independently of publication volume.
          </p>
          <div className="chart-countries" style={{ position: 'relative', width: '100%' }} />
        </div>

        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>3. World map of contributions</h2>
            <label style={{ fontSize: '0.85rem' }}>
              Decade{' '}
              <select
                value={mapDecade}
                onChange={(e) => setMapDecade(e.target.value)}
                style={{ backgroundColor: '#2C3440', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '0.3rem 0.5rem' }}
              >
                <option value="all">All</option>
                {decades.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <p style={caption}>
            Items by country of origin.
          </p>
          {worldError && (
            <p style={{ ...caption, color: '#ffb3b3' }}>
              The world map could not be loaded ({worldError}). Check that
              <code> public/data/world.geojson </code> exists.
            </p>
          )}
          {!world && !worldError && <p style={caption}>Loading map…</p>}
          <div className="chart-map" style={{ position: 'relative', width: '100%' }} />
        </div>

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>4. Top ten source languages</h2>
          <p style={caption}>
            The ten most frequent source languages across the whole corpus, as shares of all items with a
            recorded source language.
          </p>
          <div className="chart-languages" style={{ position: 'relative', width: '100%' }} />
        </div>

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>5. Language flow by decade</h2>
          <p style={caption}>
            Each decade is linked to its five most frequent source languages, with band width
            proportional to the number of items.
          </p>
          <div className="chart-sankey" style={{ position: 'relative', width: '100%' }} />
        </div>
      </main>
    </div>
  );
}
