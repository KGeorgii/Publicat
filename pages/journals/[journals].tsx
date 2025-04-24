import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '/styles/Home.module.css';
import Papa from 'papaparse';
import logo from '../asset/logo.png';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import "/styles/global.css";

interface Journal {
  journal_id: string;
  article_name: string;
  author: string;
  translator: string;
  language: string;
  journal_name: string;
  journal_year: number;
  journal_number: string;
}

const CSV_URL = '/data/data_2.csv';

export default function Journals() {
  const [journalDetails, setJournalDetails] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [filteredJournalDetails, setFilteredJournalDetails] = useState<Journal[]>([]);

  // Fetch the data from the GitHub CSV file
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch CSV from GitHub');
        }

        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const parsedData: Journal[] = result.data.map((item: any) => ({
              journal_id: item.journal_id,
              article_name: item.article_name,
              author: item.author,
              translator: item.translator,
              language: item.language,
              journal_name: item.journal_name,
              journal_year: Number(item.journal_year),
              journal_number: item.journal_number,
            }));
            setJournalDetails(parsedData);
            setLoading(false);
          },
        });
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extract the journal ID from the URL and filter the details
  useEffect(() => {
    const pathSegments = router.asPath.split('/');
    const extractedId = pathSegments[pathSegments.length - 1];

    if (extractedId && journalDetails.length > 0) {
      const filteredJournal = journalDetails.filter(
        journal => journal.journal_id === extractedId
      );

      setFilteredJournalDetails(filteredJournal);
    }
  }, [router.asPath, journalDetails]);

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
          <li className={styles.navItem}><Link href="/ai_chat">AI chat</Link></li>
          <li className={styles.navItem}><Link href="/about">About</Link></li>
        </ul>
      </nav>

      <main className={styles.main}>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            {filteredJournalDetails.length > 0 ? (
              <div>
                <h2>Journal Details: {filteredJournalDetails[0].journal_name}, {filteredJournalDetails[0].journal_year}, {filteredJournalDetails[0].journal_number}</h2>
                <ul>
                  {filteredJournalDetails.map((journal, index) => (
                    <li key={index}>
                      {journal.article_name}, {journal.author}
                      {journal.translator && journal.translator !== '' && `, ${journal.translator}`}
                      {journal.language && journal.language !== '' && `, ${journal.language}`}
                      {/* Display additional properties */}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No journal details found for the specified ID.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
