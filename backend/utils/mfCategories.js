export const MF_PUBLICATION_CATEGORIES = [
  { id: 'equity', label: 'Equity' },
  { id: 'debt', label: 'Debt' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'elss', label: 'ELSS' },
  { id: 'index-funds', label: 'Index Funds' },
];

const categoryMatchers = [
  ['Equity', /\bequity\b/],
  ['Debt', /\bdebt\b|\bliquid\b|\bbond\b/],
  ['Hybrid', /\bhybrid\b|\bbalanced\b/],
  ['ELSS', /\belss\b|tax saver|equity linked savings/],
  ['Index Funds', /\bindex\b|\bindices\b/],
];
const categoryIds = new Map(MF_PUBLICATION_CATEGORIES.map(({ id, label }) => [label, id]));

export function getSchemeCategoryLabels(scheme) {
  const classification = [
    scheme.schemeType,
    scheme.schemeCategory,
    scheme.schemeSubCategory,
  ].filter(Boolean).join(' ').toLowerCase();
  return categoryMatchers
    .filter(([, matcher]) => matcher.test(classification))
    .map(([label]) => label);
}

export function getSchemeCategoryIds(scheme) {
  return getSchemeCategoryLabels(scheme).map((label) => categoryIds.get(label));
}

export function getUniqueSchemeCodesForCategory(schemes, categoryId) {
  const codeCounts = new Map();
  schemes.forEach((scheme) => {
    const code = String(scheme.schemeCode || '').trim();
    if (code) {
      const normalizedCode = code.toUpperCase();
      codeCounts.set(normalizedCode, (codeCounts.get(normalizedCode) || 0) + 1);
    }
  });

  return [...new Set(schemes
    .filter((scheme) => getSchemeCategoryIds(scheme).includes(categoryId))
    .map((scheme) => String(scheme.schemeCode || '').trim())
    .filter((code) => (
      /^[a-zA-Z0-9._-]{1,50}$/.test(code)
      && codeCounts.get(code.toUpperCase()) === 1
    )))];
}
