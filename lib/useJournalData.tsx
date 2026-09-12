import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { browserCsvUrl, parseCsv } from './loadCsv';
import type { Journal } from '../types/journal';

type State = { rows: Journal[]; loading: boolean; error: string | null };
type Ctx = State & { request: () => void };

const DataCtx = createContext<Ctx>({
  rows: [], loading: true, error: null, request: () => {},
});

/**
 * Fetches and parses the CSV at most once per session, and only when a page
 * actually asks for it. Statically generated pages (the issue pages) already
 * have their data in the HTML, so they never trigger the download.
 */
export function JournalDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ rows: [], loading: true, error: null });
  const started = useRef(false);

  const request = useCallback(() => {
    if (started.current) return;
    started.current = true;

    fetch(browserCsvUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`CSV fetch failed: ${r.status} (${browserCsvUrl})`);
        return r.text();
      })
      .then((text) => setState({ rows: parseCsv(text), loading: false, error: null }))
      .catch((e: Error) => setState({ rows: [], loading: false, error: e.message }));
  }, []);

  return <DataCtx.Provider value={{ ...state, request }}>{children}</DataCtx.Provider>;
}

/** Calling this hook is what triggers the fetch. */
export function useJournalData() {
  const { rows, loading, error, request } = useContext(DataCtx);
  useEffect(() => { request(); }, [request]);
  return { rows, loading, error };
}
