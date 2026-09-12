import fs from 'fs/promises';
import path from 'path';
import { config } from '../publicat.config';
import { parseCsv } from './loadCsv';
import type { Journal } from '../types/journal';

export async function loadCsvFromDisk(): Promise<Journal[]> {
  if (config.csvPath.startsWith('http')) {
    const res = await fetch(config.csvPath);
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    return parseCsv(await res.text());
  }
  const file = path.join(process.cwd(), 'public', config.csvPath);
  return parseCsv(await fs.readFile(file, 'utf8'));
}