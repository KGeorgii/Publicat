import fs from 'fs/promises';
import path from 'path';
import { config } from '../publicat.config';
import { parseCsv, encodeId } from './loadCsv';
import type { Journal } from '../types/journal';

/**
 * Server-only. Import this from getStaticProps / getStaticPaths, never from
 * component code — Next strips data-fetching imports from the client bundle,
 * which is what keeps the Node builtins above out of the browser graph.
 *
 * The CSV is read, parsed and grouped by journal_id once per build worker.
 * Without this, generating N issue pages re-read and re-scanned the whole file
 * N+1 times.
 */
let index: Map<string, Journal[]> | null = null;

async function readAll(): Promise<Journal[]> {
  if (config.csvPath.startsWith('http')) {
    const res = await fetch(config.csvPath);
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    return parseCsv(await res.text());
  }
  const file = path.join(process.cwd(), 'public', config.csvPath);
  return parseCsv(await fs.readFile(file, 'utf8'));
}

async function getIndex(): Promise<Map<string, Journal[]>> {
  if (index) return index;
  const rows = await readAll();
  const map = new Map<string, Journal[]>();
  for (const row of rows) {
    if (!row.journal_id) continue;
    const key = encodeId(row.journal_id);
    const existing = map.get(key);
    if (existing) existing.push(row);
    else map.set(key, [row]);
  }
  index = map;
  return index;
}

/** Every distinct issue id in the dataset. */
export async function allIssueIds(): Promise<string[]> {
  return Array.from((await getIndex()).keys());
}

/** The articles belonging to one issue. O(1) lookup. */
export async function articlesForIssue(id: string): Promise<Journal[]> {
  return (await getIndex()).get(id) ?? [];
}

/** Whole dataset, for anything that genuinely needs every row at build time. */
export async function loadCsvFromDisk(): Promise<Journal[]> {
  const map = await getIndex();
  return Array.from(map.values()).flat();
}
