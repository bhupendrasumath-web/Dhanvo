import { pool } from '../config/db.js';
import {
  getSchemeCategoryIds,
  getSchemeCategoryLabels,
  getUniqueSchemeCodesForCategory,
  MF_PUBLICATION_CATEGORIES,
} from './mfCategories.js';

export {
  getSchemeCategoryIds,
  getSchemeCategoryLabels,
  getUniqueSchemeCodesForCategory,
  MF_PUBLICATION_CATEGORIES,
};

export const MF_PUBLICATION_COLLECTIONS = [
  { id: 'equity-funds', label: 'Equity Funds' },
  { id: 'growth-option', label: 'Growth Option' },
  { id: 'gold-silver', label: 'Gold & Silver' },
  { id: 'large-cap', label: 'Large Cap' },
  { id: 'mid-cap', label: 'Mid Cap' },
  { id: 'small-cap', label: 'Small Cap' },
];

const normalizeText = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const hasTerm = (entry, pattern) => entry.collectionText.some((field) => pattern.test(field));

export function getSchemeCollectionIds(scheme) {
  const categoryLabels = getSchemeCategoryLabels(scheme);
  const collectionText = [
    scheme.schemeType,
    scheme.schemeCategory,
    scheme.schemeSubCategory,
    scheme.option,
    scheme.name,
  ].map(normalizeText);
  const entry = { categories: categoryLabels, collectionText };
  const normalizedOption = normalizeText(scheme.option);
  return MF_PUBLICATION_COLLECTIONS
    .filter(({ id }) => {
      if (id === 'equity-funds') return categoryLabels.includes('Equity');
      if (id === 'growth-option') return categoryLabels.includes('Equity') && /\bgrowth\b/.test(normalizedOption);
      if (id === 'gold-silver') return hasTerm(entry, /\b(?:gold|silver)\b/);
      if (id === 'large-cap') return categoryLabels.includes('Equity') && hasTerm(entry, /\blarge cap\b/);
      if (id === 'mid-cap') return categoryLabels.includes('Equity') && hasTerm(entry, /\bmid cap\b/);
      if (id === 'small-cap') return categoryLabels.includes('Equity') && hasTerm(entry, /\bsmall cap\b/);
      return false;
    })
    .map(({ id }) => id);
}

let publicationSettingsReady;

export async function ensureMfPublicationSettings() {
  if (!publicationSettingsReady) {
    publicationSettingsReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mf_explorer_publication_settings (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          settings JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const defaultSettings = {
        categoryVisibility: Object.fromEntries(MF_PUBLICATION_CATEGORIES.map(({ id }) => [id, true])),
        fundVisibility: {},
        collectionVisibility: Object.fromEntries(MF_PUBLICATION_COLLECTIONS.map(({ id }) => [id, true])),
        featuredPicksEnabled: true,
      };
      await pool.query(
        `INSERT INTO mf_explorer_publication_settings (id, settings)
         VALUES (1, $1::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(defaultSettings)],
      );
    })().catch((error) => {
      publicationSettingsReady = null;
      throw error;
    });
  }
  await publicationSettingsReady;
}

export async function readMfPublicationSettings() {
  await ensureMfPublicationSettings();
  const result = await pool.query(
    'SELECT settings FROM mf_explorer_publication_settings WHERE id = 1',
  );
  return result.rows[0]?.settings || {};
}

export function isSchemePublished(scheme, settings) {
  const visibility = settings?.categoryVisibility || {};
  const categoryIdsForScheme = getSchemeCategoryIds(scheme);
  if (categoryIdsForScheme.some((id) => visibility[id] === false)) return false;
  const schemeCode = String(scheme.schemeCode || '').trim();
  return !schemeCode || settings?.fundVisibility?.[schemeCode] !== false;
}

export function getPublicMfPublicationSettings(settings) {
  const categoryVisibility = Object.fromEntries(
    MF_PUBLICATION_CATEGORIES.map(({ id }) => [id, settings?.categoryVisibility?.[id] !== false]),
  );
  const collectionVisibility = Object.fromEntries(
    MF_PUBLICATION_COLLECTIONS.map(({ id }) => [id, settings?.collectionVisibility?.[id] !== false]),
  );
  return {
    categoryVisibility,
    collectionVisibility,
    featuredPicksEnabled: settings?.featuredPicksEnabled !== false,
  };
}
