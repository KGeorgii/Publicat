/**
 * The only file a new deployment needs to edit.
 *
 * csvPath: either a path under /public (e.g. 'data/vsesvit.csv')
 *          or a full https:// URL. If you use a remote URL, pin it to a
 *          commit SHA rather than a branch ref, so that a given deployment
 *          always resolves to the same data.
 */
export const config = {
  csvPath: 'data/vsesvit.csv',

  siteTitle: 'Publicat',
  siteDescription: 'Interactive periodical bibliography',

  nav: [
    { href: '/', label: 'Main' },
    { href: '/search', label: 'Search' },
    { href: '/visualizations', label: 'Visualizations' },
    { href: '/ai_chat', label: 'AI chat' },
    { href: '/about', label: 'About' },
  ],
};
