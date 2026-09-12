import Link from 'next/link';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { config } from '../publicat.config';

/**
 * Shared page chrome. Every page renders this, so the menu can no longer
 * drift between routes the way it had (the journal page was missing
 * "Visualizations").
 */
export default function Nav({ title }: { title?: string }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} · ${config.siteTitle}` : config.siteTitle}</title>
        <meta name="description" content={config.siteDescription} />
      </Head>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {config.nav.map((item) => (
            <li key={item.href} className={styles.navItem}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
