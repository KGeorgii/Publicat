import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { browserCsvUrl, parseCsv } from './loadCsv';
import type { Journal } from '../types/journal';

type State = { rows: Journal[]; loading: boolean; error: string | null };

const Ctx = createContext<State>({ rows: [], loading: true, error: null });

/**
 * Fetches and parses the CSV exactly once per session. Mounted in _app.tsx,
 * so navigating between pages reuses the parsed array instead of refetching.
 */
export function JournalDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ rows: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch(browserCsvUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`CSV fetch failed: ${r.status} (${browserCsvUrl})`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setState({ rows: parseCsv(text), loading: false, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ rows: [], loading: false, error: e.message });
      });
    return () => { cancelled = true; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useJournalData = () => useContext(Ctx);
