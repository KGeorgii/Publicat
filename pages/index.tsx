import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Image from 'next/image';
import "../styles/global.css";
import logo from '../asset/logo.png';
import Head from 'next/head';
import Papa from 'papaparse';

interface Journal {
  journal_id: string;
  journal_name: string;
  journal_year: number;
  journal_number: number;
}

const CSV_URL = 'https://raw.githubusercontent.com/KGeorgii/vsesvit/refs/heads/main/vsesvit_test_2.csv'; // <-- Replace with your actual CSV URL

export default function Home() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);
  const [hoveredDecade, setHoveredDecade] = useState<string | null>(null);
  const [hoveredJournal, setHoveredJournal] = useState<string | null>(null);

  const getData = async () => {
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error('Failed to fetch CSV from GitHub');

      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const parsedData: Journal[] = result.data.map((item: any) => {
            const year = Number(item.journal_year);
            return {
              journal_id: item.journal_id,
              journal_name: item.journal_name,
              journal_year: isNaN(year) ? 0 : year, // Ensure valid number
              journal_number: Number(item.journal_number) || 0, // Default to 0 if invalid
            };
          });

          setJournals(parsedData);
        },
      });
    } catch (err) {
      console.error('Error loading CSV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const getDecade = (year: number) => `${Math.floor(year / 10) * 10}s`;

  const sortedDecades = Array.from(new Set(journals.map(j => getDecade(j.journal_year)))).sort();

  const handleClickDecade = (decade: string) => {
    setSelectedDecade(selectedDecade === decade ? null : decade);
  };

  const uniqueJournals = (journals: Journal[]) => {
    const uniqueMap = new Map<string, Journal>();
    journals.forEach(journal => uniqueMap.set(journal.journal_id, journal));
    return Array.from(uniqueMap.values());
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Vsesvit</title>
        <meta name="description" content="Vsesvit project" />
      </Head>

      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          <li className={styles.navItem}><Link href="/">Main</Link></li>
          <li className={styles.navItem}><Link href="/search">Search</Link></li>
          <li className={styles.navItem}><Link href="/visualizations">Visualizations</Link></li>
          <li className={styles.navItem}><Link href="/ai_chat">AI chat</Link></li>
          <li className={styles.navItem}><Link href="/about">About</Link></li>
        </ul>
      </nav>

      <main className={styles.main} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '3rem',
        backgroundColor: '#303841',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {loading ? (
          <div style={{ 
            width: '70%', 
            backgroundColor: '#3A444E', 
            padding: '1.5rem', 
            borderRadius: '8px',
            color: 'white',
            textAlign: 'center'
          }}>
            <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5', margin: 0 }}>
              Getting Vsesvit data...
            </p>
          </div>
        ) : (
          <div style={{ 
            width: '70%', 
            backgroundColor: '#3A444E', 
            padding: '1.5rem', 
            borderRadius: '8px',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}>
            <h2 style={{ color: 'white', marginTop: 0 }}>Journal Collection by Decade</h2>
            <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 1.5rem 0', color: 'white' }}>
              Browse journals by decade. Click on a decade to see all available journals published during that time period.
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}>
              {sortedDecades.map((decade) => (
                <div key={decade} style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}>
                  <button
                    onClick={() => handleClickDecade(decade)}
                    onMouseEnter={() => setHoveredDecade(decade)}
                    onMouseLeave={() => setHoveredDecade(null)}
                    style={{
                      width: '100%',
                      backgroundColor: hoveredDecade === decade ? '#b98c54' : 
                                      selectedDecade === decade ? '#4A5964' : '#2C3440',
                      color: 'white',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.3s',
                      boxSizing: 'border-box'
                    }}
                  >
                    {decade}
                  </button>
                  {selectedDecade === decade && (
                    <div style={{
                      backgroundColor: '#4A5964',
                      borderRadius: '4px',
                      marginTop: '0.5rem',
                      padding: '1rem',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      overflow: 'auto'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1rem',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        {uniqueJournals(journals)
                          .filter(journal => getDecade(journal.journal_year) === decade)
                          .sort((a, b) => a.journal_id.localeCompare(b.journal_id))
                          .map(journal => (
                            <div 
                              key={journal.journal_id} 
                              onMouseEnter={() => setHoveredJournal(journal.journal_id)}
                              onMouseLeave={() => setHoveredJournal(null)}
                              style={{
                                backgroundColor: hoveredJournal === journal.journal_id ? '#b98c54' : '#303841',
                                borderRadius: '4px',
                                padding: '1rem',
                                transition: 'background-color 0.3s',
                                cursor: 'pointer',
                                color: 'white',
                                wordWrap: 'break-word'
                              }}
                            >
                              <Link href={`/journals/${journal.journal_id}`} style={{
                                color: 'white',
                                textDecoration: 'none',
                                display: 'block'
                              }}>
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

      <style jsx>{`
        .tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border-radius: 5px;
          padding: 5px 10px;
          pointer-events: none;
          z-index: 100;
        }
      `}</style>
    </div>
  );
}