import type { AppProps } from 'next/app';
import '../styles/global.css';
import { JournalDataProvider } from '../lib/useJournalData';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <JournalDataProvider>
      <Component {...pageProps} />
    </JournalDataProvider>
  );
}
