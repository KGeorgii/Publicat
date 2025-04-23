"use client";
import { useEffect, useState } from "react";
import styles from '../styles/Home.module.css';
import "../styles/global.css";
import Head from 'next/head';
import Link from 'next/link';
import logo from '../asset/logo.png';
import Image from 'next/image';
import Papa from 'papaparse';

interface Journal {
  journal_id: string;
  journal_name: string;
  journal_year: number;
  journal_number: number;
  article_name: string;
  author: string | null;
  translator?: string;
  language?: string;
}

// GitHub CSV URL - replace with your actual CSV URL
const CSV_URL = 'https://raw.githubusercontent.com/KGeorgii/vsesvit/refs/heads/main/vsesvit_test_2.csv';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  const getData = async () => {
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error('Failed to fetch CSV from GitHub');

      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const parsedData: Journal[] = result.data.map((item: any) => ({
            journal_id: item.journal_id,
            journal_name: item.journal_name,
            journal_year: Number(item.journal_year) || 0,
            journal_number: Number(item.journal_number) || 0,
            article_name: item.article_name || '',
            author: item.author || null,
            translator: item.translator || '',
            language: item.language || ''
          }));

          setSearchResults(parsedData);
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.toLowerCase();
    setSearchTerm(searchTerm);
  };

  const sortedResults = [...searchResults].sort((a, b) => {
    return a.journal_id.localeCompare(b.journal_id);
  });

  const blocks: { [key: string]: Journal[] } = {};

  sortedResults.forEach(journal => {
    if (searchTerm === '') return;
    
    if (journal.translator && journal.translator.toLowerCase().includes(searchTerm.toLowerCase())) {
      if (!blocks['Translator']) {
        blocks['Translator'] = [];
      }
      blocks['Translator'].push(journal);
    }

    if (journal.article_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      if (!blocks['Article Name']) {
        blocks['Article Name'] = [];
      }
      blocks['Article Name'].push(journal);
    }

    if (journal.author && journal.author.toLowerCase().includes(searchTerm.toLowerCase())) {
      if (!blocks['Author']) {
        blocks['Author'] = [];
      }
      blocks['Author'].push(journal);
    }
  });

  return (
    <div className={styles.container}>
      <Head>
        <title>Vsesvit</title>
        <meta name="description" content="Vsesvit project" />
      </Head>

      {/* Top Navigation Bar */}
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
        <div style={{ 
          width: '70%', 
          backgroundColor: '#3A444E', 
          padding: '1.5rem', 
          borderRadius: '8px',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <h2 style={{ color: 'white', marginTop: 0 }}>Journal Search</h2>
          <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 1.5rem 0', color: 'white' }}>
            Search for journals by author, article name, or translator.
          </p>
          
          <div style={{
            width: '100%',
            marginBottom: '1.5rem'
          }}>
            <input
              type="text"
              placeholder="Search journals..."
              value={searchTerm}
              onChange={handleSearch}
              style={{ 
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#2C3440',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        
          {loading ? (
            <div style={{ 
              textAlign: 'center',
              color: 'white',
              padding: '1rem'
            }}>
              <p style={{ fontFamily: 'verdana', fontSize: '1rem', lineHeight: '1.5', margin: 0 }}>
                Getting Vsesvit data...
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}>
              {Object.entries(blocks).length === 0 && searchTerm !== '' ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '1rem' }}>
                  <p>No results found for &quot;{searchTerm}&quot;</p>
                </div>
              ) : (
                Object.entries(blocks).map(([blockName, journals]) => (
                  <div key={blockName} style={{
                    backgroundColor: '#4A5964',
                    borderRadius: '4px',
                    padding: '1rem',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'auto'
                  }}>
                    <h3 style={{ color: 'white', marginTop: 0 }}>{blockName}</h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '1rem',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      {journals.map((journal, index) => (
                        <div 
                          key={index}
                          style={{
                            backgroundColor: '#303841',
                            borderRadius: '4px',
                            padding: '1rem',
                            transition: 'background-color 0.3s',
                            cursor: 'pointer',
                            color: 'white',
                            wordWrap: 'break-word',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <Link href={`/journals/${journal.journal_id}`} style={{
                            color: '#b98c54',
                            textDecoration: 'none',
                            fontWeight: 'bold'
                          }}>
                            {journal.journal_name} ({journal.journal_year}, №{journal.journal_number})
                          </Link>
                          <div style={{ fontSize: '0.9rem' }}>
                            <p style={{ margin: '0.2rem 0' }}><strong>Article:</strong> {journal.article_name}</p>
                            {journal.author && <p style={{ margin: '0.2rem 0' }}><strong>Author:</strong> {journal.author}</p>}
                            {journal.translator && journal.translator !== '' && 
                              <p style={{ margin: '0.2rem 0' }}><strong>Translator:</strong> {journal.translator}</p>}
                            {journal.language && journal.language !== '' && 
                              <p style={{ margin: '0.2rem 0' }}><strong>Language:</strong> {journal.language}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {searchTerm === '' && (
                <div style={{ color: 'white', textAlign: 'center', padding: '1rem' }}>
                  <p>Enter a search term to find journals</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}