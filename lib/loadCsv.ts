import Papa from 'papaparse';
import { config } from '../publicat.config';
import { normalize, type Journal } from '../types/journal';

const isRemote = config.csvPath.startsWith('http');

/** URL the browser fetches. */
export const browserCsvUrl = isRemote ? config.csvPath : `/${config.csvPath}`;

export function parseCsv(text: string): Journal[] {
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
  return (data as Record<string, unknown>[]).map(normalize);
}

/**
 * journal_id may contain '/' for combined issues ("3/4", "22/23", "7/9"),
 * which cannot appear inside a URL path segment. No id in the corpus contains
 * '--', so the mapping is reversible and cannot collide with a literal id.
 */
export const encodeId = (id: string) => id.replace(/\//g, '--');
