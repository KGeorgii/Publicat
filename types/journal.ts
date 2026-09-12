/**
 * The eleven-field Publicat schema. One row = one article in one issue.
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
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Coerce one raw CSV row into the schema.
 *
 * The _latin variants fall back to their base field, so a deployment whose
 * values are already in Latin script can leave those columns out entirely.
 */
export function normalize(r: Record<string, unknown>): Journal {
  const year = Number(r.journal_year);
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
  };
}
