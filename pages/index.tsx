import { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';
import { useJournalData } from '../lib/useJournalData';
import { encodeId } from '../lib/loadCsv';
import type { Journal } from '../types/journal';

const getDecade = (year: number) => `${Math.floor(year / 10) * 10}s`;

function uniqueIssues(rows: Journal[]) {
  const map = new Map<string, Journal>();
  rows.forEach((r) => map.set(r.journal_id, r));
  return Array.from(map.values());
}

export default function Home() {
  const { rows, loading, error } = useJournalData();
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);
  const [hoveredDecade, setHoveredDecade] = useState<string | null>(null);
  const [hoveredJournal, setHoveredJournal] = useState<string | null>(null);

  const sortedDecades = Array.from(
    new Set(rows.filter((r) => r.journal_year > 0).map((r) => getDecade(r.journal_year)))
  ).sort();

  const handleClickDecade = (decade: string) =>
    setSelectedDecade(selectedDecade === decade ? null : decade);

  const panel = {
    width: '70%',
    backgroundColor: '#3A444E',
    padding: '1.5rem',
    borderRadius: '8px',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    color: 'white',
  };

  return (
    <div className={styles.container}>
      <Nav />

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
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {loading && (
          <div style={{ ...panel, textAlign: 'center' }}>
            <p style={{ fontFamily: 'verdana', fontSize: '1rem', margin: 0 }}>Loading data…</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ ...panel, textAlign: 'center' }}>
            <p style={{ margin: 0 }}>Could not load the dataset: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ ...panel, overflow: 'hidden' }}>
            <h2 style={{ marginTop: 0 }}>Journal Collection by Decade</h2>
            <p
              style={{
                fontFamily: 'verdana',
                fontSize: '1rem',
                lineHeight: '1.5',
                margin: '0 0 1.5rem 0',
              }}
            >
              Browse issues by decade. Click a decade to see everything published in that period.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {sortedDecades.map((decade) => (
                <div key={decade} style={{ width: '100%', boxSizing: 'border-box' }}>
                  <button
                    onClick={() => handleClickDecade(decade)}
                    onMouseEnter={() => setHoveredDecade(decade)}
                    onMouseLeave={() => setHoveredDecade(null)}
                    style={{
                      width: '100%',
                      backgroundColor:
                        hoveredDecade === decade
                          ? '#b98c54'
                          : selectedDecade === decade
                          ? '#4A5964'
                          : '#2C3440',
                      color: 'white',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.3s',
                      boxSizing: 'border-box',
                    }}
                  >
                    {decade}
                  </button>

                  {selectedDecade === decade && (
                    <div
                      style={{
                        backgroundColor: '#4A5964',
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                        padding: '1rem',
                        width: '100%',
                        boxSizing: 'border-box',
                        overflow: 'auto',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                          gap: '1rem',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        {uniqueIssues(rows)
                          .filter((j) => getDecade(j.journal_year) === decade)
                          .sort((a, b) => a.journal_id.localeCompare(b.journal_id))
                          .map((journal) => (
                            <div
                              key={journal.journal_id}
                              onMouseEnter={() => setHoveredJournal(journal.journal_id)}
                              onMouseLeave={() => setHoveredJournal(null)}
                              style={{
                                backgroundColor:
                                  hoveredJournal === journal.journal_id ? '#b98c54' : '#303841',
                                borderRadius: '4px',
                                padding: '1rem',
                                transition: 'background-color 0.3s',
                                cursor: 'pointer',
                                wordWrap: 'break-word',
                              }}
                            >
                              <Link
                                href={`/journals/${encodeId(journal.journal_id)}`}
                                style={{ color: 'white', textDecoration: 'none', display: 'block' }}
                              >
                                {`${journal.journal_name}, ${journal.journal_year}, ${journal.journal_number}`}
                              </Link>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
