import type { GetStaticPaths, GetStaticProps } from 'next';
import { allIssueIds, articlesForIssue } from '../../lib/loadCsvServer';
import styles from '../../styles/Home.module.css';
import Nav from '../../components/Nav';
import { loadCsvFromDisk } from '../../lib/loadCsvServer';
import type { Journal } from '../../types/journal';

type Props = { id: string; articles: Journal[] };

export const getStaticPaths: GetStaticPaths = async () => {
  const ids = await allIssueIds();
  return {
    paths: ids.map((journal_id) => ({ params: { journal_id } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const id = params?.journal_id as string;
  const articles = await articlesForIssue(id);
  if (!articles.length) return { notFound: true };
  return { props: { id, articles } };
};

export default function JournalIssue({ articles }: Props) {
  // getStaticPaths only emits ids that exist in the data, and getStaticProps
  // returns notFound for anything else, so there is always at least one row.
  const issue = articles[0];

  return (
    <div className={styles.container}>
      <Nav title={`${issue.journal_name} ${issue.journal_year}`} />

      {/* .main is already a centred flex column (align-items: center), so it
          must stay full width — the width belongs on the child. */}
      <main className={styles.main}>
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
      </main>
    </div>
  );
}
