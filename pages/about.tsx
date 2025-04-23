import { useEffect, useState } from "react";
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import "../styles/global.css";
import logo from '../asset/logo.png';
import Head from 'next/head';
import Image from 'next/image';

const YourComponentName: React.FC = () => {
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


      <main className={styles.main}>
        <p> About our team </p>
      </main>
    </div>
  );
}

export default YourComponentName;