import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '/styles/Home.module.css';
import { supabase } from '../../supabase'; 
import Head from 'next/head';
import Link from 'next/link';
import logo from '/asset/logo.png';
import Image from 'next/image';
import "/styles/global.css";

interface Journal {
  journal_id: string;
  article_name: string;
  author: string;
  translator: string;
  language: string;
  journal_name: string; // Added property
  journal_year: number; // Added property
  journal_number: string; // Added property
  // other properties...
}

export default function Journals() {
  const [journalDetails, setJournalDetails] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [filteredJournalDetails, setFilteredJournalDetails] = useState<Journal[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('vsesvit').select('*');
        if (error) {
          throw error;
        }

        console.log('Supabase response:', data); // Log the Supabase response
        setJournalDetails(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const pathSegments = router.asPath.split('/'); // Get the URL path segments
    const extractedId = pathSegments[pathSegments.length - 1]; // Extract the journal_id

    console.log('Extracted journalId:', extractedId); // Log the extracted ID

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
          <li className={styles.navItem}>
            <Link href="/">Main</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/navigation">Navigation</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/map">Map</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/visualizations">Visualizations</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/network">Network Graphs</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/search">Search</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/about">About</Link>
          </li>
          <li className={styles.navItem}>
            <Image alt='logo' src={logo} style={{ width: '20%', height: 'auto', marginLeft: '20vw'}} />
          </li>
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
