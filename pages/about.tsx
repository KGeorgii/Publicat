import styles from '../styles/Home.module.css';
import Nav from '../components/Nav';

export default function About() {
  return (
    <div className={styles.container}>
      <Nav title="About" />
      <main className={styles.main}>
        <p>About our team</p>
      </main>
    </div>
  );
}
