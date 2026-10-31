const normalizeField = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const columnIndex = (headers, aliases) => {
  const normalizedAliases = aliases.map(normalizeField);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeField(header)));
};

const readValue = (row, index) => (index < 0 ? '' : String(row[index] || '').trim());

const parseRows = (file) => String(file || '')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.split('|').map((value) => value.trim().replace(/^"(.*)"$/, '$1')));

const getHeaderAndRows = (file, requiredFields) => {
  const rows = parseRows(file);
  const headerIndex = rows.findIndex((row) => requiredFields.every((aliases) => columnIndex(row, aliases) >= 0));

  if (headerIndex < 0) {
    const candidateHeaders = rows
      .slice(0, 10)
      .filter((row) => row.length > 1)
      .sort((first, second) => second.length - first.length)[0] || [];
    const headerSummary = candidateHeaders
      .map((header) => header.replace(/[^a-z0-9_ -]/gi, '').slice(0, 50))
      .join('|')
      .slice(0, 500);
    throw new Error(`NSE returned an unsupported pipe-delimited column layout${headerSummary ? ` (candidate columns: ${headerSummary})` : ''}`);
  }

  return { headers: rows[headerIndex], rows: rows.slice(headerIndex + 1) };
};

const SCHEME_CODE_FIELDS = ['scheme_code', 'schemecode', 'nse_scheme_code', 'scheme_cd'];
const SCHEME_NAME_FIELDS = ['scheme_name', 'schemename', 'fund_name', 'fundname'];
const MIN_PURCHASE_AMOUNT_FIELDS = [
  'minimum_purchase_amount',
  'minimumpurchaseamount',
  'min_purchase_amount',
  'minpurchaseamount',
  'min_purchase_amt',
  'minimum_purchase_amt',
  'minimum_first_purchase_amount',
  'min_first_purchase_amount',
  'minimum_amount',
];
const MAX_PURCHASE_AMOUNT_FIELDS = [
  'maximum_purchase_amount',
  'maximumpurchaseamount',
  'max_purchase_amount',
  'maxpurchaseamount',
  'max_purchase_amt',
  'maximum_purchase_amt',
  'maximum_first_purchase_amount',
  'max_first_purchase_amount',
  'maximum_amount',
];
const SCHEME_PLAN_FIELDS = [
  'plan_name',
  'planname',
  'plan',
  'scheme_plan',
  'schemeplan',
  'plan_type',
  'plantype',
  'plan_description',
  'plandescription',
];

const normalizeSchemePlan = (value, name) => {
  const normalizedPlan = String(value || '').trim().toUpperCase();
  if (['D', 'DIRECT', 'DIRECT PLAN'].includes(normalizedPlan) || normalizedPlan.startsWith('DIRECT ')) {
    return 'Direct';
  }
  if (['R', 'REG', 'REGULAR', 'REGULAR PLAN'].includes(normalizedPlan) || normalizedPlan.startsWith('REGULAR ')) {
    return 'Regular';
  }

  const normalizedName = String(name || '');
  if (/\bdirect(?:\s+plan)?\b/i.test(normalizedName)) return 'Direct';
  if (/\bregular(?:\s+plan)?\b/i.test(normalizedName)) return 'Regular';
  return '';
};

const classifySchemeName = (name) => {
  const normalizedName = String(name || '').toLowerCase();
  if (/\belss\b|tax saver|tax saving|tax advantage/.test(normalizedName)) return 'ELSS';
  if (/\bindex\b|\bindices\b/.test(normalizedName)) return 'Index Funds';
  if (/\bhybrid\b|\bbalanced\b|aggressive allocation/.test(normalizedName)) return 'Hybrid';
  if (/\bdebt\b|\bliquid\b|\bbond\b|\bmoney market\b|overnight fund/.test(normalizedName)) return 'Debt';
  if (/\bequity\b|\blarge cap\b|\bmid cap\b|\bsmall cap\b|\bflexi cap\b/.test(normalizedName)) return 'Equity';
  return '';
};

const isActiveFlag = (value) => !['N', 'NO', '0', 'INACTIVE', 'CLOSED'].includes(value);
const isPurchaseAllowed = (value) => ['Y', 'YES', '1'].includes(value);
const parseAmount = (value) => {
  const rawValue = String(value || '').replace(/,/g, '').trim();
  if (!rawValue) return null;
  const amount = Number(rawValue);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export function parseSchemeMaster(file) {
  const sourceRows = parseRows(file);
  const headerIndex = sourceRows.findIndex(
    (row) => columnIndex(row, SCHEME_CODE_FIELDS) >= 0 && columnIndex(row, SCHEME_NAME_FIELDS) >= 0,
  );
  const hasHeader = headerIndex >= 0;
  const headers = hasHeader ? sourceRows[headerIndex] : [];
  const rows = hasHeader
    ? sourceRows.slice(headerIndex + 1)
    : sourceRows.filter((row) => row.length >= 10 && row[1] && row[8]);
  if (!rows.length) {
    getHeaderAndRows(file, [SCHEME_CODE_FIELDS, SCHEME_NAME_FIELDS]);
  }
  const indexes = {
    schemeCode: hasHeader ? columnIndex(headers, SCHEME_CODE_FIELDS) : 1,
    schemeName: hasHeader ? columnIndex(headers, SCHEME_NAME_FIELDS) : 8,
    amcCode: hasHeader ? columnIndex(headers, ['amc_code', 'amccode', 'fund_house_code', 'fundhousecode']) : 0,
    amcName: hasHeader ? columnIndex(headers, ['amc_name', 'amcname', 'fund_house', 'fundhouse']) : -1,
    schemeType: hasHeader ? columnIndex(headers, ['scheme_type', 'schemetype', 'fund_type', 'fundtype']) : -1,
    schemeCategory: hasHeader ? columnIndex(headers, ['scheme_category', 'schemecategory', 'category']) : -1,
    schemeSubCategory: hasHeader ? columnIndex(headers, ['scheme_sub_category', 'schemesubcategory', 'sub_category', 'subcategory']) : -1,
    schemePlan: hasHeader ? columnIndex(headers, SCHEME_PLAN_FIELDS) : 7,
    schemeOption: hasHeader ? columnIndex(headers, ['option_name', 'optionname', 'option']) : 27,
    isin: hasHeader ? columnIndex(headers, ['isin', 'isin_code', 'isincode', 'isin_growth']) : 4,
    purchaseAllowed: hasHeader ? columnIndex(headers, ['purchase_allowed', 'purchaseallowed', 'purchase_flag', 'purchaseflag']) : 9,
    schemeStatus: hasHeader ? columnIndex(headers, ['scheme_status', 'schemestatus', 'status', 'active_flag']) : 26,
    minPurchaseAmount: hasHeader ? columnIndex(headers, MIN_PURCHASE_AMOUNT_FIELDS) : 11,
    maxPurchaseAmount: hasHeader ? columnIndex(headers, MAX_PURCHASE_AMOUNT_FIELDS) : 13,
    purchaseAmountMultiple: hasHeader ? columnIndex(headers, [
      'purchase_amount_multiple',
      'multiple_purchase_amount',
      'multiples_of_purchase_amount',
      'purchase_multiple',
      'multiple_of_additional_purchase_amount',
      'multiples_of_additional_purchase_amount',
      'additional_purchase_multiple',
    ]) : -1,
  };

  return rows
    .map((row) => {
      const name = readValue(row, indexes.schemeName);
      const rawPlan = readValue(row, indexes.schemePlan);
      const rawOption = readValue(row, indexes.schemeOption).toUpperCase();
      return {
        schemeCode: readValue(row, indexes.schemeCode),
        name,
        amcCode: readValue(row, indexes.amcCode),
        amcName: readValue(row, indexes.amcName),
        schemeType: readValue(row, indexes.schemeType),
        schemeCategory: readValue(row, indexes.schemeCategory) || classifySchemeName(name),
        schemeSubCategory: readValue(row, indexes.schemeSubCategory),
        plan: normalizeSchemePlan(rawPlan, name),
        option: hasHeader
          ? rawOption
          : ({ Z: 'Growth', Y: 'IDCW Reinvestment', N: 'IDCW Payout' }[rawOption] || rawOption),
        isin: readValue(row, indexes.isin).toUpperCase(),
        purchaseAllowed: readValue(row, indexes.purchaseAllowed).toUpperCase(),
        schemeStatus: readValue(row, indexes.schemeStatus).toUpperCase(),
        purchaseEligible: isPurchaseAllowed(readValue(row, indexes.purchaseAllowed))
          && isActiveFlag(readValue(row, indexes.schemeStatus)),
        minPurchaseAmount: parseAmount(readValue(row, indexes.minPurchaseAmount)),
        maxPurchaseAmount: parseAmount(readValue(row, indexes.maxPurchaseAmount)),
        purchaseAmountMultiple: parseAmount(readValue(row, indexes.purchaseAmountMultiple)),
      };
    })
    .filter((scheme) => scheme.schemeCode && scheme.name)
    .filter((scheme) => isActiveFlag(scheme.schemeStatus));
}

const parseNseDate = (value) => {
  const text = String(value || '').trim();
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  if (dmy) {
    return new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}T00:00:00Z`);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function parseNavFile(file) {
  const rows = parseRows(file);
  const navCodeFields = ['scheme_code', 'schemecode', 'nse_scheme_code', 'scheme_cd'];
  const navFields = ['nav', 'net_asset_value', 'netassetvalue', 'closing_nav'];
  const headerIndex = rows.findIndex(
    (row) => columnIndex(row, navCodeFields) >= 0 && columnIndex(row, navFields) >= 0,
  );
  const hasHeader = headerIndex >= 0;
  const headers = hasHeader ? rows[headerIndex] : [];
  const records = hasHeader
    ? rows.slice(headerIndex + 1)
    : rows.filter((row) => row.length >= 7 && parseNseDate(row[0]));
  if (!records.length) {
    getHeaderAndRows(file, [navCodeFields, navFields]);
  }
  const indexes = {
    schemeCode: hasHeader ? columnIndex(headers, navCodeFields) : 1,
    isin: hasHeader ? columnIndex(headers, ['isin', 'isin_code', 'isincode']) : 5,
    nav: hasHeader ? columnIndex(headers, navFields) : 6,
    navDate: hasHeader ? columnIndex(headers, ['nav_date', 'navdate', 'date', 'latest_nav_date']) : 0,
  };
  const byScheme = new Map();

  records.forEach((row) => {
    const schemeCode = readValue(row, indexes.schemeCode).toUpperCase();
    const isin = readValue(row, indexes.isin).toUpperCase();
    const navValue = readValue(row, indexes.nav);
    const nav = Number(navValue.replace(/,/g, ''));

    if ((!schemeCode && !isin) || !navValue || !Number.isFinite(nav) || nav < 0) {
      return;
    }

    const navDate = readValue(row, indexes.navDate);
    const dateValue = parseNseDate(navDate);
    const entry = { nav, navDate, dateValue };

    [schemeCode, isin].filter(Boolean).forEach((key) => {
      const previous = byScheme.get(key);
      if (!previous || (dateValue && (!previous.dateValue || dateValue > previous.dateValue))) {
        byScheme.set(key, entry);
      }
    });
  });

  return byScheme;
}
