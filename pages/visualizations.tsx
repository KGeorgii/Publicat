// @ts-nocheck — the D3 code below is loosely typed; see note in the fix plan.
import { useEffect } from 'react';
import * as d3 from 'd3';
import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';
import { useJournalData } from '../lib/useJournalData';

const getDecade = (year: number) => `${Math.floor(year / 10) * 10}s`;

export default function Visualizations() {
  const { rows, loading, error } = useJournalData();

  useEffect(() => {
    if (!rows.length) return;

    // Clear both containers so re-renders don't stack duplicate SVGs.
    d3.select('.unique-authors-chart-container').selectAll('*').remove();
    d3.select('.countries-chart-container').selectAll('*').remove();

    const dated = rows.filter((r) => r.journal_year > 0);

    // --- Country share per decade, normalised to 100% ---
    const decadeCounts: Record<string, Record<string, number>> = {};
    dated.forEach((r) => {
      const country = r.country_latin;
      if (!country || country === '-') return;
      const decade = getDecade(r.journal_year);
      decadeCounts[decade] ||= {};
      decadeCounts[decade][country] = (decadeCounts[decade][country] || 0) + 1;
    });
    Object.keys(decadeCounts).forEach((decade) => {
      const total = Object.values(decadeCounts[decade]).reduce((a, b) => a + b, 0);
      Object.keys(decadeCounts[decade]).forEach((c) => {
        decadeCounts[decade][c] = (decadeCounts[decade][c] / total) * 100;
      });
    });

    // --- Distinct authors per decade ---
    const authorsByDecade: Record<string, Set<string>> = {};
    dated.forEach((r) => {
      if (!r.author) return;
      const decade = getDecade(r.journal_year);
      authorsByDecade[decade] ||= new Set();
      authorsByDecade[decade].add(r.author);
    });
    const uniqueAuthorsPerDecade = Object.keys(authorsByDecade)
      .map((decade) => ({ decade, count: authorsByDecade[decade].size }))
      .sort((a, b) => parseInt(a.decade) - parseInt(b.decade));

    createUniqueAuthorsChart(uniqueAuthorsPerDecade);
    createCountryShareChart(decadeCounts);
  }, [rows]);

  function tooltipFor(selector: string) {
    return d3
      .select(selector)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'rgba(0, 0, 0, 0.7)')
      .style('color', 'white')
      .style('padding', '5px 10px')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('z-index', '100');
  }

  function createUniqueAuthorsChart(data: { decade: string; count: number }[]) {
    const svgWidth = 800;
    const svgHeight = 400;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    const svg = d3
      .select('.unique-authors-chart-container')
      .append('svg')
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
      .attr('width', '100%');

    const chart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
    const tip = tooltipFor('.unique-authors-chart-container');

    const xScale = d3.scaleBand().domain(data.map((d) => d.decade)).range([0, chartWidth]).padding(0.1);
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count) || 0])
      .range([chartHeight, 0]);

    chart
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.decade) || 0)
      .attr('y', (d) => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => chartHeight - yScale(d.count))
      .attr('fill', '#3498db')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill', 'white');
        tip.transition().duration(200).style('opacity', 0.9);
        tip
          .html(`<strong>${d.decade}</strong><br/>Unique authors: ${d.count}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', '#3498db');
        tip.transition().duration(500).style('opacity', 0);
      });

    chart
      .append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', 'white');

    chart.append('g').call(d3.axisLeft(yScale)).selectAll('text').style('fill', 'white');
  }

  function createCountryShareChart(decadeCounts: Record<string, Record<string, number>>) {
    const svgWidth = 800;
    const svgHeight = 600;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    const svg = d3
      .select('.countries-chart-container')
      .append('svg')
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
      .attr('width', '100%');

    const chart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
    const tip = tooltipFor('.countries-chart-container');

    const decades = Object.keys(decadeCounts).sort((a, b) => parseInt(a) - parseInt(b));
    const countries = Array.from(
      new Set(decades.flatMap((decade) => Object.keys(decadeCounts[decade])))
    );

    const xScale = d3.scaleBand().domain(decades).range([0, chartWidth]).paddingInner(0.1).paddingOuter(0);
    const yScale = d3.scaleLinear().domain([0, 100]).range([chartHeight, 0]);

    const palette = [
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
      '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab',
      '#1f77b4', '#ff7f0e', '#d62728', '#17becf', '#2ca02c',
      '#bcbd22', '#9467bd', '#e377c2', '#8c564b', '#7f7f7f',
      '#aec7e8', '#ffbb78', '#ff9896', '#98df8a', '#c5b0d5',
      '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
    ];
    const colorScale = d3.scaleOrdinal(palette).domain(countries);

    decades.forEach((decade) => {
      let yOffset = 0;
      Object.entries(decadeCounts[decade])
        .sort((a, b) => b[1] - a[1])
        .forEach(([country, percentage]) => {
          chart
            .append('rect')
            .attr('x', xScale(decade))
            .attr('y', yScale(yOffset + percentage))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale(yOffset) - yScale(yOffset + percentage))
            .attr('fill', colorScale(country))
            .on('mouseover', function (event) {
              d3.select(this).attr('fill', 'white');
              tip.transition().duration(200).style('opacity', 0.9);
              tip
                .html(`<strong>${country}</strong><br/>${percentage.toFixed(2)}% of ${decade}`)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', function () {
              d3.select(this).attr('fill', colorScale(country));
              tip.transition().duration(500).style('opacity', 0);
            });
          yOffset += percentage;
        });
    });

    chart
      .append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', 'white');

    chart
      .append('g')
      .call(d3.axisLeft(yScale).tickFormat((d) => `${d}%`))
      .selectAll('text')
      .style('fill', 'white');
  }

  const panel = {
    width: '70%',
    backgroundColor: '#3A444E',
    padding: '1.5rem',
    borderRadius: '8px',
    color: 'white',
    boxSizing: 'border-box' as const,
  };

  return (
    <div className={styles.container}>
      <Nav title="Visualizations" />

      <main
        className={styles.main}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3rem',
          backgroundColor: '#303841',
          padding: '2rem',
          borderRadius: '8px',
        }}
      >
        {loading && <div style={{ ...panel, textAlign: 'center' }}>Loading data…</div>}
        {!loading && error && (
          <div style={{ ...panel, textAlign: 'center' }}>Could not load the dataset: {error}</div>
        )}

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>1. Unique authors per decade</h2>
          <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5' }}>
            The number of distinct authors published in each decade. Hover a bar for the exact count.
          </p>
          <div className="unique-authors-chart-container" style={{ width: '100%' }} />
        </div>

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>2. Country distribution by decade</h2>
          <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5' }}>
            Each decade&apos;s source countries as percentage shares summing to 100%, so decades can be
            compared independently of publication volume. Hover a band for the country and its share.
          </p>
          <div className="countries-chart-container" style={{ width: '100%', position: 'relative' }} />
        </div>
      </main>
    </div>
  );
}
