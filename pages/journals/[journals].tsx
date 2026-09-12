import { useRouter } from 'next/router';
import styles from '../../styles/Home.module.css';
import Nav from '../../components/Nav';
import { useJournalData } from '../../lib/useJournalData';

export default function JournalIssue() {
  const router = useRouter();
  const { rows, loading, error } = useJournalData();

  const id = typeof router.query.journals === 'string' ? router.query.journals : '';
  const articles = rows.filter((r) => r.journal_id === id);
  const issue = articles[0];

  return (
    <div className={styles.container}>
      <Nav title={issue ? `${issue.journal_name} ${issue.journal_year}` : 'Issue'} />

      {/* .main is already a centred flex column (align-items: center), so it
          must stay full width — constraining <main> itself is what pushed the
          content left. The width belongs on the child. */}
      <main className={styles.main}>
        {loading && <p>Loading…</p>}

        {!loading && error && <p>Could not load the dataset: {error}</p>}

        {!loading && !error && !issue && (
          <p>No issue found with id &quot;{id}&quot;.</p>
        )}

        {!loading && !error && issue && (
          <div
            style={{
              width: '70%',
              maxWidth: '100%',
              backgroundColor: '#3A444E',
              padding: '1.5rem',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {issue.journal_name}, {issue.journal_year}, №{issue.journal_number}
            </h2>
            <p style={{ opacity: 0.8, marginTop: 0 }}>
              {articles.length} {articles.length === 1 ? 'item' : 'items'} in this issue
            </p>
            <ul style={{ lineHeight: 1.6, paddingLeft: '1.2rem' }}>
              {articles.map((a, i) => (
                <li key={`${a.journal_id}-${i}`}>
                  <strong>{a.article_name || 'Untitled'}</strong>
                  {a.author && <> — {a.author}</>}
                  {a.translator && <> (trans. {a.translator})</>}
                  {a.language_latin && <> · {a.language_latin}</>}
                  {a.country_latin && <> · {a.country_latin}</>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
