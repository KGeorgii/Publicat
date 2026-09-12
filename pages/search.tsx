import { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';
import { useJournalData } from '../lib/useJournalData';
import type { Journal } from '../types/journal';

export default function SearchPage() {
  const { rows, loading, error } = useJournalData();
  const [searchTerm, setSearchTerm] = useState('');

  const term = searchTerm.trim().toLowerCase();

  // Group matches by which field they matched on, which is how researchers
  // actually arrive: by a known author, a known text, or a known translator.
  const blocks: Record<string, Journal[]> = {};
  if (term) {
    const sorted = [...rows].sort((a, b) => a.journal_id.localeCompare(b.journal_id));
    const push = (key: string, j: Journal) => {
      (blocks[key] ||= []).push(j);
    };
    sorted.forEach((j) => {
      if (j.author.toLowerCase().includes(term)) push('Author', j);
      if (j.article_name.toLowerCase().includes(term)) push('Article Name', j);
      if (j.translator.toLowerCase().includes(term)) push('Translator', j);
    });
  }

  const hasResults = Object.keys(blocks).length > 0;

  return (
    <div className={styles.container}>
      <Nav title="Search" />

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
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '70%',
            backgroundColor: '#3A444E',
            padding: '1.5rem',
            borderRadius: '8px',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            color: 'white',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Journal Search</h2>
          <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
            Search by author, article title, or translator.
          </p>

          <div style={{ width: '100%', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#2C3440',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {loading && <p style={{ textAlign: 'center', margin: 0 }}>Loading data…</p>}
          {!loading && error && <p style={{ textAlign: 'center', margin: 0 }}>Could not load the dataset: {error}</p>}

          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
              {!term && <p style={{ textAlign: 'center' }}>Enter a search term to begin.</p>}

              {term && !hasResults && <p style={{ textAlign: 'center' }}>No results for &quot;{searchTerm}&quot;.</p>}

              {Object.entries(blocks).map(([blockName, items]) => (
                <div
                  key={blockName}
                  style={{
                    backgroundColor: '#4A5964',
                    borderRadius: '4px',
                    padding: '1rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'auto',
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    {blockName} <span style={{ opacity: 0.7, fontWeight: 'normal' }}>({items.length})</span>
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '1rem',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {items.slice(0, 100).map((journal, index) => (
                      <div
                        key={`${journal.journal_id}-${index}`}
                        style={{
                          backgroundColor: '#303841',
                          borderRadius: '4px',
                          padding: '1rem',
                          wordWrap: 'break-word',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <Link
                          href={`/journals/${journal.journal_id}`}
                          style={{ color: '#b98c54', textDecoration: 'none', fontWeight: 'bold' }}
                        >
                          {journal.journal_name} ({journal.journal_year}, №{journal.journal_number})
                        </Link>
                        <div style={{ fontSize: '0.9rem' }}>
                          <p style={{ margin: '0.2rem 0' }}>
                            <strong>Article:</strong> {journal.article_name}
                          </p>
                          {journal.author && (
                            <p style={{ margin: '0.2rem 0' }}>
                              <strong>Author:</strong> {journal.author}
                            </p>
                          )}
                          {journal.translator && (
                            <p style={{ margin: '0.2rem 0' }}>
                              <strong>Translator:</strong> {journal.translator}
                            </p>
                          )}
                          {journal.language_latin && (
                            <p style={{ margin: '0.2rem 0' }}>
                              <strong>Language:</strong> {journal.language_latin}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {items.length > 100 && (
                    <p style={{ marginBottom: 0, opacity: 0.7 }}>
                      Showing the first 100 of {items.length} matches.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
