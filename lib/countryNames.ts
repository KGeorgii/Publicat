/**
 * Resolution of corpus country names to features of the world map.
 *
 * The `country_latin` column does not hold bare country names. It follows the
 * curators' own convention, in which a country is qualified by the literature
 * it stands for:
 *
 *     Ukraine. Literature in Ukranian
 *     Germany. Sorbian Literature
 *     Netherlands, Literature in Frisian Language
 *     Yugoslavia(Serbia, Montenegro, Bosnia)
 *     Ukraine. Ukranian diaspora literature. Canada
 *
 * The country is the segment before the first separator. Everything after it is
 * a scholarly distinction the map cannot draw — Sorbian and German literature
 * share a polygon — but which the CSV preserves and the search and query
 * interfaces expose in full.
 *
 * The table below is a scholarly artefact rather than a technical convenience.
 * Rendering a historical periodical record on a contemporary map requires
 * deciding which present-day polygon stands in for a vanished or unlisted
 * polity, and every such decision loses something. The decisions are recorded
 * with their reasoning and can be changed without touching visualisation code.
 */

/**
 * Corpus country name → ISO 3166-1 alpha-3 code, matched against the `id`
 * field of the world GeoJSON. Names absent here are matched directly against
 * the feature's `properties.name`, which covers most of the corpus.
 */
export const COUNTRY_TO_CODE: Record<string, string> = {
  // --- Names the map spells differently -----------------------------------
  USA: 'USA',
  'United States': 'USA',
  'United States of America': 'USA',
  'Great Britain': 'GBR',
  'United Kingdom': 'GBR',
  UK: 'GBR',
  England: 'GBR',
  Russia: 'RUS',
  'Czech Republic': 'CZE',
  Macedonia: 'MKD',
  'Democratic Republic of the Congo': 'COD',
  'Republic of Cabo Verde': 'CPV',
  'São Tomé': 'STP',
  'Trinidad and Tobago': 'TTO',
  'Sri Lanka': 'LKA',
  Palestine: 'PSE',
  Guiana: 'GUF',

  // --- Frequent names, listed so the id path works even when a given
  //     GeoJSON spells the display name differently ------------------------
  France: 'FRA',
  Germany: 'DEU',
  Ukraine: 'UKR',
  Poland: 'POL',
  Bulgaria: 'BGR',
  Japan: 'JPN',
  Italy: 'ITA',
  Spain: 'ESP',
  Hungary: 'HUN',
  Slovakia: 'SVK',
  Cuba: 'CUB',
  India: 'IND',
  Canada: 'CAN',
  Romania: 'ROU',
  Switzerland: 'CHE',
  Argentina: 'ARG',
  Austria: 'AUT',
  China: 'CHN',
  Mongolia: 'MNG',
  Vietnam: 'VNM',
  Turkey: 'TUR',
  Greece: 'GRC',
  Ireland: 'IRL',
  Chile: 'CHL',
  Netherlands: 'NLD',
  'South Africa': 'ZAF',
  Israel: 'ISR',
  Croatia: 'HRV',
  Brazil: 'BRA',
  Peru: 'PER',
  Australia: 'AUS',
  Norway: 'NOR',
  Portugal: 'PRT',
  Colombia: 'COL',
  Finland: 'FIN',
  Belgium: 'BEL',
  Slovenia: 'SVN',
  Sweden: 'SWE',
  Denmark: 'DNK',

  // --- Curatorial decisions ------------------------------------------------
  // "Korea" is unqualified throughout the corpus. Read as South Korea, which
  // is where the bulk of the translated material originates, but the corpus
  // does not distinguish and this assignment is not recoverable from it.
  Korea: 'KOR',

  // Yugoslavia is mapped to Serbia as continuator state. The corpus itself
  // records the qualification "Serbia, Montenegro, Bosnia", so the federation
  // is being collapsed onto one republic and the other two are rendered as
  // Serbian. The alternative — leaving it unplaced — hides 90 items entirely.
  Yugoslavia: 'SRB',

  // Czechoslovakia → Czechia rather than Slovakia: the larger successor. Note
  // that this corpus also records Czech Republic and Slovakia separately, so
  // the historical form appears only for the federal period.
  Czechoslovakia: 'CZE',

  // The Soviet Union is mapped to the Russian Federation, its largest
  // successor. This renders publication from the non-Russian republics as
  // Russian — defensible as convention, not neutral, and consequential for a
  // Ukrainian journal.
  USSR: 'RUS',

  // Zanzibar is recorded with its present state in parentheses; the segment
  // rule takes the island, so it is mapped on to Tanzania here.
  Zanzibar: 'TZA',

  // Overseas départements, which most world GeoJSON files fold into France.
  Martinique: 'MTQ',
  'Réunion': 'REU',
  'Puerto Rico': 'PRI',
};

/** Values that name no country and are excluded from the map. */
const NOT_A_COUNTRY = new Set(['country is unknown', 'literature in esperanto']);

/**
 * The country a `country_latin` value refers to: the segment before the first
 * period, comma, or parenthesis.
 *
 *   "France. French Literature"                     → "France"
 *   "Netherlands, Literature in Frisian Language"   → "Netherlands"
 *   "Yugoslavia(Serbia, Montenegro, Bosnia)"        → "Yugoslavia"
 *   "Ukraine. Ukranian diaspora literature. Canada" → "Ukraine"
 *
 * Note the last case. Diaspora material is recorded under the literature's
 * nationality, not its place of publication, so it counts towards Ukraine
 * rather than Canada. That is the curators' taxonomy and the map follows it.
 */
export function countryKey(countryLatin: unknown): string | null {
  const raw = String(countryLatin ?? '').trim();
  if (!raw || raw === '-') return null;
  const head = raw.split(/[.,(]/)[0].trim();
  if (!head || NOT_A_COUNTRY.has(head.toLowerCase())) return null;
  return head;
}

/**
 * A corpus name matches a feature if it equals the feature's display name, or
 * if the table maps it to the feature's id.
 */
export function matchesFeature(corpusName: string, feature: any): boolean {
  const featureName = feature?.properties?.name;
  const featureId = feature?.id;
  if (corpusName === featureName) return true;
  if (typeof featureName === 'string' && featureName.toLowerCase() === corpusName.toLowerCase()) return true;
  const code = COUNTRY_TO_CODE[corpusName];
  if (code === undefined) return false;
  if (code === featureId) return true;
  return featureId !== undefined && String(featureId).toUpperCase() === code;
}

/** The decisions worth citing, for display or documentation. */
export const MAPPING_NOTES = [
  { name: 'USSR', target: 'RUS', note: 'Largest successor; renders non-Russian Soviet publication as Russian.' },
  { name: 'Yugoslavia', target: 'SRB', note: 'Collapsed onto Serbia; Montenegrin and Bosnian material rendered as Serbian.' },
  { name: 'Czechoslovakia', target: 'CZE', note: 'Mapped to Czechia rather than Slovakia; Slovak authors rendered as Czech.' },
  { name: 'Korea', target: 'KOR', note: 'Unqualified in the corpus; read as South Korea, an assignment the data does not support.' },
  { name: 'Great Britain / England', target: 'GBR', note: 'Constituent countries mapped to the United Kingdom polygon; Scottish literature is recorded separately in the corpus but not drawn separately.' },
];
