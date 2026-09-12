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