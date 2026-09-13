/**
 * The Publicat schema. One row = one article in one issue.
 *
 * Eleven core fields, plus an optional `decade` column (see below). Any other
 * column in the CSV is ignored without error, so a corpus can carry richer
 * metadata than the framework reads.
 */
export interface Journal {
  journal_id: string;
  journal_name: string;
  journal_year: number;
  journal_number: string;
  article_name: string;
  author: string;
  translator: string;
  country: string;
  country_latin: string;
  language: string;
  language_latin: string;

  /**
   * Optional twelfth column. If the CSV declares a decade field, its value is
   * used as the curator wrote it (e.g. "1990 - 2000"); otherwise it is computed
   * from journal_year. Curatorial bucketing wins over arithmetic.
   */
  decade: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

/** Column aliases accepted for the optional decade field. */
const DECADE_KEYS = ['decade', 'Decade', 'decades', 'journal_decade', 'period'];

function readDecade(r: Record<string, unknown>, year: number): string {
  for (const key of DECADE_KEYS) {
    const v = str(r[key]);
    if (v && v !== '-') return v;
  }
  return Number.isFinite(year) && year > 0 ? `${Math.floor(year / 10) * 10}s` : '';
}

/**
 * Coerce one raw CSV row into the schema.
 *
 * The _latin variants fall back to their base field, so a deployment whose
 * values are already in Latin script can leave those columns out entirely.
 */
export function normalize(r: Record<string, unknown>): Journal {
  const year = Number(str(r.journal_year));

  return {
    journal_id: str(r.journal_id),
    journal_name: str(r.journal_name),
    journal_year: Number.isFinite(year) ? year : 0,
    journal_number: str(r.journal_number),
    article_name: str(r.article_name),
    author: str(r.author),
    translator: str(r.translator),
    country: str(r.country),
    country_latin: str(r.country_latin) || str(r.country),
    language: str(r.language),
    language_latin: str(r.language_latin) || str(r.language),
    decade: readDecade(r, year),
  };
}
