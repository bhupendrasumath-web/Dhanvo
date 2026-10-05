import { useState, useEffect, useRef, useCallback } from 'react';
import { Calculator, ChevronDown } from 'lucide-react';
/* --- helpers ----------------------------------------------------------- */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n) => {
  if (n >= 1e7) return '\u20B9' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '\u20B9' + (n / 1e5).toFixed(2) + ' L';
  return fmt(n);
};

function applySlabs(income, slabs) {
  let tax = 0;
  for (const [limit, rate] of slabs) {
    if (income <= 0) break;
    const chunk = limit === Infinity ? income : Math.min(income, limit);
    tax += (chunk * rate) / 100;
    income -= chunk;
  }
  return tax;
}

// OLD REGIME: Standard deduction \u20B950,000 + 80C/other deductions
// Rebate u/s 87A: \u20B912,500 if taxable <= 5L
// Cess: 4%
function calcOldTax(gross, deductions) {
  const taxable = Math.max(0, gross - 50000 - deductions);
  let tax = applySlabs(taxable, [
    [250000, 0],
    [250000, 5],
    [500000, 20],
    [Infinity, 30],
  ]);
  if (taxable <= 500000) tax = Math.max(0, tax - 12500);
  return Math.round(tax * 1.04);
}

// NEW REGIME FY 2024-25: Standard deduction \u20B975,000
// Slabs: 0-3L@0, 3-7L@5, 7-10L@10, 10-12L@15, 12-15L@20, >15L@30
// Rebate u/s 87A: full tax rebate if taxable income <= \u20B912L (so effectively 0 tax)
// Cess: 4%
function calcNewTax(gross) {
  const taxable = Math.max(0, gross - 75000);
  let tax = applySlabs(taxable, [
    [300000, 0],
    [400000, 5],  // 3L-7L
    [300000, 10], // 7L-10L
    [200000, 15], // 10L-12L
    [300000, 20], // 12L-15L
    [Infinity, 30],
  ]);
  // 87A rebate: if taxable <= 12L, tax = 0
  if (taxable <= 1200000) tax = 0;
  return Math.round(tax * 1.04);
}

/* --- calculator configs ----------------------------------------------- */
const CONFIGS = {
  sip: {
    name: 'SIP Calculator',
    s1: { label: 'Monthly Investment',     prefix: '\u20B9', suffix: '',    min: 500,     max: 500000,  step: 500,   def: 25000  },
    s2: { label: 'Expected Return (p.a.)', prefix: '',  suffix: '%',   min: 1,       max: 30,       step: 1,   def: 12     },
    s3: { label: 'Time Period',            prefix: '',  suffix: 'Yr',  min: 1,       max: 40,       step: 1,     def: 10     },
    resLabels: ['Invested Amount', 'Est. Returns', 'Total Value'],
    centerLabel: 'Total Value',
    // Geometric monthly rate: i = (1 + annual)^(1/12) - 1
    calc: (s1, s2, s3) => {
      const i = Math.pow(1 + s2 / 100, 1 / 12) - 1;
      const n = s3 * 12;
      const fv = i === 0 ? s1 * n : s1 * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
      return [Math.round(s1 * n), Math.round(fv - s1 * n), Math.round(fv)];
    },
  },
  lumpsum: {
    name: 'Lumpsum Calculator',
    s1: { label: 'Total Investment',       prefix: '\u20B9', suffix: '',    min: 500,     max: 10000000, step: 5000,  def: 25000  },
    s2: { label: 'Expected Return (p.a.)', prefix: '',  suffix: '%',   min: 1,       max: 30,       step: 1,   def: 12     },
    s3: { label: 'Time Period',            prefix: '',  suffix: 'Yr',  min: 1,       max: 40,       step: 1,     def: 10     },
    resLabels: ['Invested Amount', 'Est. Returns', 'Total Value'],
    centerLabel: 'Total Value',
    calc: (s1, s2, s3) => {
      const fv = s1 * Math.pow(1 + s2 / 100, s3);
      return [Math.round(s1), Math.round(fv - s1), Math.round(fv)];
    },
  },
  swp: {
    name: 'SWP Calculator',
    s1: { label: 'Total Investment',       prefix: '\u20B9', suffix: '',    min: 50000,   max: 50000000, step: 10000, def: 1000000 },
    s2: { label: 'Monthly Withdrawal',     prefix: '\u20B9', suffix: '',    min: 500,     max: 200000,   step: 500,   def: 10000   },
    s3: { label: 'Expected Return (p.a.)', prefix: '',  suffix: '%',   min: 1,       max: 30,       step: 1,   def: 8       },
    s4: { label: 'Time Period',            prefix: '',  suffix: 'Yr',  min: 1,       max: 30,       step: 1,     def: 10      },
    resLabels: ['Total Investment', 'Total Withdrawal', 'Final Balance'],
    centerLabel: 'Final Balance',
    // SWP formula: FV = P*(1+r)^n - W*[((1+r)^n - 1)/r]
    // Geometric monthly rate for consistency
    calc: (s1, s2, s3, s4 = 10) => {
      const n = s4 * 12;
      const r = Math.pow(1 + s3 / 100, 1 / 12) - 1;
      const bal = r === 0
        ? s1 - s2 * n
        : s1 * Math.pow(1 + r, n) - s2 * ((Math.pow(1 + r, n) - 1) / r);
      return [Math.round(s1), Math.round(s2 * n), Math.round(Math.max(0, bal))];
    },
  },
  mf: {
    name: 'Mutual Fund Returns',
    s1: { label: 'Total Investment',       prefix: '\u20B9', suffix: '',    min: 1000,    max: 5000000,  step: 1000,  def: 50000  },
    s2: { label: 'Expected Return (p.a.)', prefix: '',  suffix: '%',   min: 1,       max: 30,       step: 1,   def: 12     },
    s3: { label: 'Time Period',            prefix: '',  suffix: 'Yr',  min: 1,       max: 30,       step: 1,     def: 5      },
    resLabels: ['Invested Amount', 'Est. Returns', 'Total Value'],
    centerLabel: 'Total Value',
    calc: (s1, s2, s3) => {
      const fv = s1 * Math.pow(1 + s2 / 100, s3);
      return [Math.round(s1), Math.round(fv - s1), Math.round(fv)];
    },
  },
  ssy: {
    name: 'SSY Calculator',
    s1: { label: 'Yearly Investment',      prefix: '\u20B9', suffix: '',    min: 250,     max: 150000,   step: 500,   def: 50000  },
    s2: { label: 'Rate of Interest (p.a.)',prefix: '',  suffix: '%',   min: 8.2,     max: 8.2,      step: 0.1,   def: 8.2    },
    s3: { label: 'Girl\'s Current Age',   prefix: '',  suffix: 'Yr',  min: 1,       max: 10,       step: 1,     def: 5      },
    resLabels: ['Total Invested', 'Interest Earned', 'Maturity Value'],
    centerLabel: 'Maturity Value',
    // SSY: deposits for 15 yrs from account opening, matures at 21 yrs from opening
    // Account can be opened till girl is 10; matures when girl turns 21
    // Deposits made in years 1-15; interest accrues till year 21
    calc: (s1, s2, s3) => {
      const r = s2 / 100;
      const accountOpenAge = s3; // girl's current age when account opened
      const maturityAge = 21;
      const depositYears = 15;
      const maturityYears = maturityAge - accountOpenAge; // total years till maturity
      let maturity = 0;
      for (let i = 1; i <= depositYears; i++) {
        // each deposit grows for (maturityYears - i + 1) years
        maturity += s1 * Math.pow(1 + r, maturityYears - i + 1);
      }
      const inv = s1 * depositYears;
      return [Math.round(inv), Math.round(maturity - inv), Math.round(maturity)];
    },
  },
  tax: {
    name: 'Income Tax Calculator',
    s1: { label: 'Annual Income',          prefix: '\u20B9', suffix: '',    min: 100000,  max: 10000000, step: 25000, def: 1200000 },
    s2: { label: 'Total Deductions (80C+)',prefix: '\u20B9', suffix: '',    min: 0,       max: 350000,   step: 5000,  def: 150000  },
    s3: { label: 'Assessment Year',        prefix: '',  suffix: '',    min: 2026,    max: 2027,     step: 1,     def: 2026    },
    resLabels: ['Old Regime Tax', 'New Regime Tax', 'Tax Saved (New)'],
    centerLabel: 'Tax Saved',
    calc: (s1, s2) => {
      const oldTax = calcOldTax(s1, s2);
      const newTax = calcNewTax(s1);
      return [oldTax, newTax, Math.max(0, oldTax - newTax)];
    },
  },
  ppf: {
    name: 'PPF Calculator',
    s1: { label: 'Yearly Investment',      prefix: '\u20B9', suffix: '',    min: 500,     max: 150000,   step: 500,   def: 75000  },
    s2: { label: 'Rate of Interest (p.a.)',prefix: '',  suffix: '%',   min: 7.1,     max: 7.1,      step: 0.1,   def: 7.1    },
    s3: { label: 'Time Horizon',           prefix: '',  suffix: 'Yr',  min: 15,      max: 50,       step: 5,     def: 15     },
    resLabels: ['Invested Amount', 'Total Interest', 'Maturity Amount'],
    centerLabel: 'Maturity Amount',
    // PPF: yearly investment at start of year, compounded annually
    // After 15 yrs, can extend in blocks of 5
    calc: (s1, s2, s3) => {
      const r = s2 / 100;
      let mat = 0;
      for (let i = 1; i <= s3; i++) mat += s1 * Math.pow(1 + r, s3 - i + 1);
      const inv = s1 * s3;
      return [Math.round(inv), Math.round(mat - inv), Math.round(mat)];
    },
  },
  epf: {
    name: 'EPF Calculator',
    s1: { label: 'Monthly Basic + DA',     prefix: '\u20B9', suffix: '',    min: 5000,    max: 500000,   step: 1000,  def: 50000  },
    s2: { label: 'Your Contribution',      prefix: '',  suffix: '%',   min: 12,      max: 12,       step: 1,     def: 12     },
    s3: { label: 'Current Age',            prefix: '',  suffix: 'Yrs', min: 18,      max: 55,       step: 1,     def: 25     },
    resLabels: ['Total Contribution', 'Interest Earned', 'Corpus at Retirement'],
    centerLabel: 'Retirement Corpus',
    // EPF: Employee 12% + Employer 3.67% (rest goes to EPS)
    // Current EPF interest rate: 8.25% p.a. (FY 2023-24), compounded annually but
    // calculated on monthly running balance - approximate with geometric monthly rate
    calc: (s1, s2, s3) => {
      const yrs = Math.max(1, 60 - s3);
      const n = yrs * 12;
      const monthlyContrib = s1 * (12 / 100 + 3.67 / 100); // employee + employer EPF share
      const annualRate = 8.25 / 100;
      // EPF interest is calculated on monthly basis, credited annually
      // Use monthly compounding for approximation
      const r = Math.pow(1 + annualRate, 1 / 12) - 1;
      const fv = monthlyContrib * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const inv = monthlyContrib * n;
      return [Math.round(inv), Math.round(fv - inv), Math.round(fv)];
    },
  },
  fd: {
    name: 'FD Calculator',
    s1: { label: 'Total Investment',        prefix: '\u20B9', suffix: '',    min: 1000,    max: 10000000, step: 1000,  def: 100000 },
    s2: { label: 'Rate of Interest (p.a.)', prefix: '',  suffix: '%',   min: 1,       max: 15,       step: 0.1,   def: 7      },
    s3: { label: 'Tenure Period',           prefix: '',  suffix: 'Yr',  min: 1,       max: 10,       step: 1,     def: 5      },
    resLabels: ['Invested Amount', 'Est. Interest', 'Maturity Value'],
    centerLabel: 'Maturity Value',
    // FD: quarterly compounding (standard Indian bank FDs)
    calc: (s1, s2, s3) => {
      const fv = s1 * Math.pow(1 + s2 / 100 / 4, 4 * s3);
      return [Math.round(s1), Math.round(fv - s1), Math.round(fv)];
    },
  },
  rd: {
    name: 'RD Calculator',
    s1: { label: 'Monthly Deposit',         prefix: '\u20B9', suffix: '',    min: 500,     max: 100000,   step: 500,   def: 5000   },
    s2: { label: 'Rate of Interest (p.a.)', prefix: '',  suffix: '%',   min: 1,       max: 15,       step: 0.1,   def: 6.8    },
    s3: { label: 'Tenure Period',           prefix: '',  suffix: 'Yr',  min: 1,       max: 10,       step: 1,     def: 5      },
    resLabels: ['Invested Amount', 'Est. Interest', 'Maturity Value'],
    centerLabel: 'Maturity Value',
    // RD: quarterly compounding per Indian bank convention
    // Effective monthly rate = (1 + R/4)^(1/3) - 1
    calc: (s1, s2, s3) => {
      const r = Math.pow(1 + s2 / 100 / 4, 1 / 3) - 1;
      const n = s3 * 12;
      const fv = r === 0 ? s1 * n : s1 * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const inv = s1 * n;
      return [Math.round(inv), Math.round(fv - inv), Math.round(fv)];
    },
  },
  emi: {
    name: 'EMI Calculator',
    s1: { label: 'Loan Amount',             prefix: '\u20B9', suffix: '',    min: 10000,   max: 10000000, step: 10000, def: 500000 },
    s2: { label: 'Interest Rate (p.a.)',    prefix: '',  suffix: '%',   min: 1,       max: 30,       step: 0.1,   def: 9.5    },
    s3: { label: 'Tenure',                  prefix: '',  suffix: 'Yr',  min: 1,       max: 30,       step: 1,     def: 5      },
    resLabels: ['Principal Amount', 'Total Interest Payable', 'Monthly EMI'],
    centerLabel: 'Monthly EMI',
    // Standard EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    calc: (s1, s2, s3) => {
      const r = s2 / 100 / 12;
      const n = s3 * 12;
      const emi = r === 0 ? s1 / n : (s1 * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      return [Math.round(s1), Math.round(emi * n - s1), Math.round(emi)];
    },
  },
  gst: {
    name: 'GST Calculator',
    s1: { label: 'Amount (\u20B9)',              prefix: '\u20B9', suffix: '',    min: 100,     max: 10000000, step: 100,   def: 10000  },
    s2: { label: 'GST Rate',               prefix: '',  suffix: '%',   min: 0,       max: 28,       step: 1,     def: 18     },
    s3: { label: 'Add GST=1 / Remove=0',   prefix: '',  suffix: '',    min: 0,       max: 1,        step: 1,     def: 1      },
    resLabels: ['Net/Base Amount', 'GST Amount', 'Gross Total'],
    centerLabel: 'GST Amount',
    calc: (s1, s2, s3) => {
      if (s3 >= 1) {
        const gst = Math.round(s1 * s2 / 100);
        return [Math.round(s1), gst, Math.round(s1 + gst)];
      }
      const net = Math.round(s1 / (1 + s2 / 100));
      return [net, Math.round(s1 - net), Math.round(s1)];
    },
  },
  cagr: {
    name: 'CAGR Calculator',
    s1: { label: 'Initial Investment',      prefix: '\u20B9', suffix: '',    min: 1000,    max: 10000000, step: 1000,  def: 100000 },
    s2: { label: 'Final Maturity Value',    prefix: '\u20B9', suffix: '',    min: 1000,    max: 50000000, step: 1000,  def: 200000 },
    s3: { label: 'Duration',               prefix: '',  suffix: 'Yr',  min: 1,       max: 30,       step: 1,     def: 5      },
    resLabels: ['Initial Principal', 'Absolute Profit', 'CAGR'],
    centerLabel: 'CAGR',
    r3IsPercent: true,
    calc: (s1, s2, s3) => {
      const profit = Math.max(0, s2 - s1);
      const cagr = s1 > 0 && s3 > 0 ? (Math.pow(s2 / s1, 1 / s3) - 1) * 100 : 0;
      return [Math.round(s1), Math.round(profit), parseFloat(cagr.toFixed(2))];
    },
  },
};

/* --- Info & FAQ content per calculator ------------------------------- */
const CALC_INFO = {
  sip: {
    about: `A Systematic Investment Plan (SIP) lets you invest a fixed amount regularly — typically monthly — into a mutual fund. Instead of timing the market, SIP averages your cost over time (rupee cost averaging), meaning you buy more units when prices are low and fewer when prices are high. Even small monthly amounts can grow significantly over long periods due to the power of compounding.`,
    faqs: [
      { q: 'What is the minimum SIP amount?', a: 'Most mutual funds allow SIPs starting from \u20B9500 per month. Some ELSS and flexi-cap funds allow \u20B9100/month.' },
      { q: 'Can I pause or stop my SIP?', a: 'Yes. You can pause a SIP for 1-3 months or stop it entirely anytime without any penalty through your AMC or broker app.' },
      { q: 'Is SIP return guaranteed?', a: 'No. SIP returns depend on market performance. The expected return % entered in this calculator is an assumption, not a guarantee.' },
      { q: 'What formula is used here?', a: 'FV = P × [((1+i)^n - 1) / i] × (1+i), where i = (1+annual rate)^(1/12) - 1 (geometric monthly rate) and n = total months.' },
      { q: 'SIP vs Lumpsum — which is better?', a: 'SIP is better for salaried individuals with monthly income. Lumpsum suits those with a large idle corpus who want full market exposure immediately.' },
    ],
  },
  lumpsum: {
    about: `A lumpsum investment means putting a large amount of money into a mutual fund or investment instrument at once. This approach works best when you have idle funds and believe markets are at a favorable entry point. Over long horizons, lumpsum investing can outperform SIP in rising markets.`,
    faqs: [
      { q: 'What is lumpsum investing?', a: 'Investing a one-time, large fixed amount into a financial instrument all at once — unlike SIP which spreads investment over time.' },
      { q: 'What formula is used?', a: 'FV = P × (1 + r)^n, where P = principal, r = annual return rate, n = tenure in years.' },
      { q: 'When should I prefer lumpsum over SIP?', a: 'When markets are undervalued or you have a windfall (bonus, inheritance), lumpsum can deliver better returns than SIP.' },
      { q: 'Is there a lock-in period for MF lumpsum?', a: 'For most equity funds, there is no lock-in. ELSS funds have a 3-year lock-in. Liquid funds may have a 7-day exit load window.' },
      { q: 'What return rate should I use?', a: 'Historically, large-cap funds return ~10-12% p.a., mid-cap ~12-15%, and small-cap ~15-18% over long periods. Use conservative estimates for planning.' },
    ],
  },
  swp: {
    about: `A Systematic Withdrawal Plan (SWP) allows you to withdraw a fixed amount from your mutual fund investment at regular intervals (monthly, quarterly). It's ideal for retirees or anyone needing regular income from their corpus. The remaining balance continues to earn returns, potentially sustaining your corpus for a long time.`,
    faqs: [
      { q: 'What is SWP?', a: 'SWP is the reverse of SIP — you withdraw a fixed amount from your invested corpus periodically instead of investing.' },
      { q: 'Is SWP tax efficient?', a: 'SWP from equity funds held >1 year is taxed as LTCG at 12.5% above \u20B91.25 lakh gains. Debt fund SWP is taxed as per your income slab.' },
      { q: 'What formula is used?', a: 'Final Balance = P(1+r)^n - W[((1+r)^n - 1)/r], where r = geometric monthly rate, n = months, W = monthly withdrawal.' },
      { q: 'Can my corpus run out?', a: 'Yes, if your withdrawal amount is too high or returns are lower than expected. This calculator shows the final balance so you can adjust accordingly.' },
      { q: 'What is a sustainable withdrawal rate?', a: 'A commonly used guideline is 4% per annum of the corpus (the 4% rule). Withdraw less to preserve the corpus longer.' },
    ],
  },
  mf: {
    about: `This calculator estimates the returns on a one-time mutual fund investment. Mutual funds pool money from investors and invest in diversified assets like stocks, bonds, or a mix. Returns depend on the fund category, market conditions, and holding period. Equity funds are best for long-term (5+ years) wealth creation.`,
    faqs: [
      { q: 'How are mutual fund returns calculated?', a: 'Returns = Final NAV - Initial NAV (with dividend reinvestment). CAGR is used for annualized comparison across funds.' },
      { q: 'What is NAV?', a: 'Net Asset Value (NAV) is the per-unit price of a mutual fund scheme, calculated daily after market close.' },
      { q: 'What is the difference between direct and regular plans?', a: 'Direct plans have lower expense ratios (no distributor commission) and hence give slightly higher returns than regular plans.' },
      { q: 'How is mutual fund return taxed?', a: 'Equity funds: LTCG (>1yr) at 12.5% over \u20B91.25L; STCG at 20%. Debt funds: as per income slab (indexation removed from April 2023).' },
      { q: 'What return rate is realistic for equity MF?', a: 'Historically, diversified equity MFs have delivered 10-14% CAGR over 10+ year periods. Past performance doesn\'t guarantee future returns.' },
    ],
  },
  ssy: {
    about: `Sukanya Samriddhi Yojana (SSY) is a government-backed small savings scheme for the girl child, launched under the Beti Bachao Beti Padhao initiative. The account can be opened for a girl below age 10 and matures when she turns 21. Deposits can be made for 15 years from account opening. It offers one of the highest risk-free returns among government schemes.`,
    faqs: [
      { q: 'Who can open an SSY account?', a: 'Parents or legal guardians of a girl child below 10 years of age can open an SSY account. Maximum 2 accounts per family (exceptions for twins/triplets).' },
      { q: 'What is the current interest rate?', a: 'The current SSY interest rate is 8.2% p.a. (Q1 FY 2024-25), compounded annually. Rates are revised quarterly by the Government of India.' },
      { q: 'How many years do I need to deposit?', a: 'Deposits must be made for 15 years from the date of account opening. After 15 years, the account continues to earn interest till maturity (21 years from opening).' },
      { q: 'Is SSY tax-free?', a: 'Yes. SSY is EEE (Exempt-Exempt-Exempt): investment is deductible under 80C, interest is tax-free, and maturity amount is tax-free.' },
      { q: 'Can I withdraw early?', a: 'Partial withdrawal (up to 50%) is allowed after the girl turns 18 for higher education. Premature closure is allowed only in case of death or life-threatening illness.' },
    ],
  },
  tax: {
    about: `India has two income tax regimes — Old and New. The Old Regime allows deductions (80C, HRA, 80D, etc.) to reduce taxable income. The New Regime (default from FY 2023-24) offers lower slab rates but most deductions are disallowed (except standard deduction of \u20B975,000). The calculator helps you compare and choose the regime that saves you more tax. A 4% health & education cess is applied on all tax amounts.`,
    faqs: [
      { q: 'Which regime is better for me?', a: 'If your total deductions (80C + HRA + 80D etc.) are less than ~\u20B93.75 lakh, the New Regime is typically better. Use this calculator to compare.' },
      { q: 'What is the standard deduction?', a: 'Old Regime: \u20B950,000 standard deduction for salaried. New Regime: \u20B975,000 standard deduction (increased in Budget 2024).' },
      { q: 'What is the 87A rebate?', a: 'Under both regimes, if total taxable income is <= \u20B95L (old) or <= \u20B912L (new), the entire tax liability is waived via Section 87A rebate.' },
      { q: 'New Regime slabs for FY 2024-25?', a: '\u20B90-3L: 0%, \u20B93-7L: 5%, \u20B97-10L: 10%, \u20B910-12L: 15%, \u20B912-15L: 20%, above \u20B915L: 30%. Plus 4% cess.' },
      { q: 'Can I switch between regimes?', a: 'Salaried employees can switch every year. Business owners/professionals can switch only once from New to Old regime.' },
    ],
  },
  ppf: {
    about: `Public Provident Fund (PPF) is one of India's most popular long-term savings instruments backed by the Government of India. It offers guaranteed tax-free returns, EEE tax status, and is completely safe from market fluctuations. The minimum tenure is 15 years, extendable in blocks of 5 years. Deposits can be made annually (minimum \u20B9500, maximum \u20B91.5 lakh per year).`,
    faqs: [
      { q: 'What is the current PPF interest rate?', a: 'The current PPF rate is 7.1% p.a., compounded annually and credited at year-end. Rates are set by the Government and reviewed quarterly.' },
      { q: 'Is PPF tax-free?', a: 'Yes. PPF is EEE: contribution deductible under Section 80C, interest earned is tax-free, and maturity amount is fully exempt from tax.' },
      { q: 'Can I withdraw before 15 years?', a: 'Partial withdrawal is allowed from 7th year onwards (up to 50% of balance at end of 4th year). Premature closure is allowed from 5th year under specific conditions.' },
      { q: 'Can I take a loan against PPF?', a: 'Yes. Loan facility is available from 3rd to 6th financial year. Loan amount can be up to 25% of the balance at the end of 2nd preceding year.' },
      { q: 'What happens after 15 years?', a: 'You can either withdraw the full corpus tax-free, or extend in blocks of 5 years with or without further deposits, continuing to earn interest.' },
    ],
  },
  epf: {
    about: `Employee Provident Fund (EPF) is a mandatory retirement savings scheme for salaried employees in India under the EPF & MP Act, 1952. Both the employee and employer contribute 12% of basic salary + DA. Of the employer's 12%, 8.33% goes to EPS (pension) and 3.67% goes to EPF. The accumulated corpus earns compound interest and is tax-free on withdrawal after 5 years of continuous service.`,
    faqs: [
      { q: 'What is the EPF interest rate?', a: 'The EPF interest rate for FY 2023-24 is 8.25% p.a., declared by EPFO (Employees\' Provident Fund Organisation) annually.' },
      { q: 'Who contributes to EPF?', a: 'Both employee (12% of basic+DA) and employer (12% of basic+DA: 3.67% to EPF + 8.33% to EPS) contribute. This calculator accounts for the combined EPF share.' },
      { q: 'When can I withdraw EPF?', a: 'Full withdrawal is allowed on retirement at 58 years, or if unemployed for 2+ months. Partial withdrawal allowed for specific needs like home purchase, education, medical emergency.' },
      { q: 'Is EPF withdrawal taxable?', a: 'Tax-free after 5 years of continuous service. If withdrawn before 5 years, it\'s taxable as per income slab and TDS @ 10% is deducted.' },
      { q: 'What is EPS?', a: 'Employee Pension Scheme (EPS) receives 8.33% of employer\'s contribution (capped at \u20B91,250/month). It provides pension after retirement, not lumpsum. This is separate from EPF.' },
    ],
  },
  fd: {
    about: `Fixed Deposit (FD) is the most popular risk-free savings instrument in India, offered by banks, NBFCs, and Post Office. You deposit a lump sum for a fixed tenure and earn guaranteed interest. Banks compound FD interest quarterly in India, which this calculator correctly accounts for.`,
    faqs: [
      { q: 'How is FD interest calculated?', a: 'Indian banks use quarterly compounding: A = P × (1 + r/4)^(4n), where r = annual rate, n = tenure in years.' },
      { q: 'Is FD interest taxable?', a: 'Yes. FD interest is added to your income and taxed at your applicable slab rate. TDS @ 10% is deducted if interest exceeds \u20B940,000/year (\u20B950,000 for seniors).' },
      { q: 'What is a tax-saving FD?', a: 'FDs with 5-year lock-in qualify for Section 80C deduction up to \u20B91.5 lakh. However, interest earned is fully taxable.' },
      { q: 'Are senior citizens offered higher FD rates?', a: 'Yes. Most banks offer 0.25% to 0.75% additional interest to senior citizens (age 60+) on their FD rates.' },
      { q: 'Can I break an FD prematurely?', a: 'Yes, but with a penalty (usually 0.5-1% reduction in interest rate). Tax-saving 5-year FDs cannot be broken before maturity.' },
    ],
  },
  rd: {
    about: `Recurring Deposit (RD) allows you to invest a fixed amount monthly and earn guaranteed returns, similar to an FD but with regular monthly contributions. Banks in India calculate RD interest using quarterly compounding. RDs are good for building a savings habit while earning better returns than a savings account.`,
    faqs: [
      { q: 'How is RD interest calculated?', a: 'RD uses quarterly compounding. Effective monthly rate r = (1 + R/4)^(1/3) - 1. Maturity = sum of [Monthly deposit × (1+r)^remaining months] for every deposit made.' },
      { q: 'What is the minimum RD tenure?', a: 'Most banks offer RD for a minimum of 6 months, with maximum up to 10 years. Post Office RD has a fixed 5-year tenure.' },
      { q: 'Is RD interest taxable?', a: 'Yes. RD interest is taxable as per income slab. TDS @ 10% applies if total interest across all RDs in a bank exceeds \u20B940,000 (\u20B950,000 for seniors) per year.' },
      { q: 'Can I break an RD early?', a: 'Yes, but with a penalty on the applicable interest rate (usually 1-2%). Some banks allow premature closure after 3 months of the RD start.' },
      { q: 'RD vs SIP — which is better?', a: 'RD offers guaranteed capital protection with fixed returns. SIP in equity funds offers potentially higher returns but with market risk. Choose RD for capital safety, SIP for wealth creation.' },
    ],
  },
  emi: {
    about: `The EMI (Equated Monthly Installment) calculator helps you find out the fixed monthly payment for any loan — home loan, car loan, personal loan, or education loan. The EMI includes both principal repayment and interest. The formula used is the standard reducing balance method, where interest is calculated on the outstanding loan principal.`,
    faqs: [
      { q: 'What is the EMI formula?', a: 'EMI = P × r × (1+r)^n / ((1+r)^n - 1), where P = loan amount, r = monthly interest rate (annual rate ÷ 12), n = tenure in months.' },
      { q: 'Does EMI change during the loan tenure?', a: 'For fixed-rate loans, EMI stays constant. For floating-rate loans, EMI may change when RBI changes interest rates, affecting the tenure or EMI amount.' },
      { q: 'What is a prepayment?', a: 'Paying more than the EMI to reduce outstanding principal. This reduces total interest paid and/or loan tenure. Most banks allow part-prepayment with no penalty on floating rate loans.' },
      { q: 'How does tenure affect EMI and total interest?', a: 'Longer tenure = lower EMI but higher total interest paid. Shorter tenure = higher EMI but lower total interest. Try to keep tenure as short as comfortably affordable.' },
      { q: 'What is an amortization schedule?', a: 'A table showing month-by-month breakdown of how much of each EMI goes toward principal and how much toward interest. Interest component is higher in early months.' },
    ],
  },
  gst: {
    about: `Goods and Services Tax (GST) is India's comprehensive indirect tax on supply of goods and services, implemented from 1st July 2017. It replaced multiple cascading taxes like VAT, Service Tax, and Excise Duty. GST has five main rates: 0%, 5%, 12%, 18%, and 28%. This calculator helps you quickly add GST to a base price or extract the GST component from a GST-inclusive price.`,
    faqs: [
      { q: 'How to add GST to a price?', a: 'Select "Add GST (1)" mode. Enter the base price and GST rate. The calculator adds GST: Total = Base × (1 + GST rate/100).' },
      { q: 'How to remove GST from an MRP?', a: 'Select "Remove GST (0)" mode. Enter the MRP (inclusive of GST). Base price = MRP ÷ (1 + GST rate/100).' },
      { q: 'What are the GST rate slabs?', a: '0%: essential items (rice, wheat, milk); 5%: basic necessities; 12%: processed foods, electronics; 18%: most services, AC restaurants; 28%: luxury goods, cars.' },
      { q: 'What is CGST and SGST?', a: 'GST is split equally between Centre (CGST) and State (SGST) for intra-state sales. For inter-state sales, IGST = CGST + SGST is levied.' },
      { q: 'Who needs to register for GST?', a: 'Businesses with annual turnover above \u20B940 lakh (\u20B920 lakh for services, \u20B910 lakh for special category states) must register for GST.' },
    ],
  },
  cagr: {
    about: `CAGR (Compound Annual Growth Rate) measures the steady growth rate of an investment over a period, assuming profits are reinvested. It smooths out volatility and allows fair comparison between different investments over different time periods. XIRR is the extended version used for irregular cash flows (like SIPs). This calculator computes CAGR for a lumpsum investment.`,
    faqs: [
      { q: 'What is CAGR?', a: 'CAGR = (Final Value / Initial Value)^(1/n) - 1, where n = number of years. It shows the annualized growth rate that gets you from initial to final value.' },
      { q: 'What is XIRR?', a: 'Extended Internal Rate of Return (XIRR) is used when cash flows are irregular (like monthly SIP investments). Most mutual fund apps show XIRR for SIP performance.' },
      { q: 'What is the difference between CAGR and absolute return?', a: 'Absolute return = (Final - Initial)/Initial × 100%. CAGR = annualized version of this. CAGR is more useful for comparing investments held for different durations.' },
      { q: 'What is a good CAGR for equity investments?', a: 'Equity mutual funds: 10-15% CAGR over 10+ years is considered good. Fixed income: 6-8% CAGR is typical. Real estate varies widely by location.' },
      { q: 'Can CAGR be negative?', a: 'Yes, if the final value is less than the initial value, CAGR is negative — indicating a loss on the investment.' },
    ],
  },
};

const SIDEBAR_LIST = ['sip', 'lumpsum', 'swp', 'mf', 'ssy', 'tax', 'ppf', 'epf', 'fd', 'rd', 'emi', 'gst', 'cagr'];

/* --- Smooth SliderInput (Dhanvo styled) -------------------------------- */
const SliderInput = ({ label, value, onChange, min, max, step, prefix = '', suffix = '' }) => {
  const [displayVal, setDisplayVal] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const sliderValue = value > max ? max : value < min ? min : value;
  const pct = ((sliderValue - min) / (max - min)) * 100;

  const formatVal = useCallback((v) => {
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  }, []);

  useEffect(() => {
    if (!focused) setDisplayVal(formatVal(value));
  }, [value, focused, formatVal]);

  const commitInput = () => {
    setFocused(false);
    const parsed = parseFloat(displayVal.replace(/,/g, ''));
    if (!isNaN(parsed)) {
      const final = Math.min(
        max,
        Math.max(min, Math.round(parsed / step) * step)
      );
      onChange(final);
      setDisplayVal(formatVal(final));
    } else {
      setDisplayVal(formatVal(value));
    }
  };

  const handleSlider = useCallback((e) => {
    const v = Math.round(Number(e.target.value) / step) * step;
    onChange(v);
  }, [onChange, step]);

  return (
    <div className="calc-field">
      <div className="calc-field-top">
        <label className="calc-field-label">{label}</label>
        <div className="calc-field-value">
          {prefix && <span className="calc-field-affix">{prefix}</span>}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={displayVal}
            onChange={(e) => setDisplayVal(e.target.value.replace(/[^0-9.]/g, ''))}
            onFocus={() => { setFocused(true); setDisplayVal(formatVal(value)); }}
            onBlur={commitInput}
            onKeyDown={(e) => { if (e.key === 'Enter') { inputRef.current?.blur(); } }}
            className="calc-field-input"
          />
          {suffix && <span className="calc-field-affix">{suffix}</span>}
        </div>
      </div>

      <div className="calc-slider">
        <div className="calc-slider-track" />
        <div className="calc-slider-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleSlider}
          className="calc-slider-input"
        />
        <div className="calc-slider-thumb" style={{ left: `calc(${pct}% - 10px)` }} />
      </div>
    </div>
  );
};

/* --- FAQ Accordion (Dhanvo styled) ------------------------------------- */
const FAQ = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="calc-faq-item">
      <button
        onClick={() => setOpen(!open)}
        className="calc-faq-q"
        aria-expanded={open}
      >
        {q}
        <ChevronDown size={18} className={`calc-faq-chevron ${open ? 'open' : ''}`} />
      </button>
      <div className={`calc-faq-a ${open ? 'open' : ''}`}>
        <div className="calc-faq-a-inner">{a}</div>
      </div>
    </div>
  );
};

/* --- Main page ---------------------------------------------------------- */
const CalculatorPage = () => {
  const [activeCalc, setActiveCalc] = useState('sip');
  const [vals, setVals] = useState({ s1: 25000, s2: 12, s3: 10, s4: undefined });

  const cfg = CONFIGS[activeCalc];
  const info = CALC_INFO[activeCalc];

  const switchCalc = (id) => {
    const c = CONFIGS[id];
    setActiveCalc(id);
    setVals({ s1: c.s1.def, s2: c.s2.def, s3: c.s3.def, s4: c.s4?.def });
  };

  const setVal = useCallback((key) => (v) => setVals((p) => ({ ...p, [key]: v })), []);

  const [r1, r2, r3] = cfg.calc(vals.s1, vals.s2, vals.s3, vals.s4);

  /* Donut chart - circumference for r=80: 2 x pi x 80 ~ 502.65 */
  const CIRC = 502.65;

  /* Tax calculator: r1=old tax, r2=new tax - donut should show old vs new.
     For every other calculator r1/r2 are already the two values the donut needs
     (invested amount vs returns), so the same pair is used either way. */
  const donutA = r1;
  const donutB = r2;
  const donutTotal = donutA + donutB;
  const dashA = donutTotal > 0 ? (donutA / donutTotal) * CIRC : CIRC / 2;
  const dashB = CIRC - dashA;

  const centerDisplay = cfg.r3IsPercent
    ? `${r3.toFixed(2)}%`
    : fmtShort(r3);

  return (
    <main className="calc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .calc-root {
          --ink: #0A1929;
          --ink-2: #10233b;
          --paper: #FBF9F4;
          --gold: #C9974A;
          --gold-soft: #E7C98C;
          --teal: #1D6F64;
          --slate: #45526A;
          --mist: #9FB3C8;
          --line: rgba(10, 25, 41, 0.10);
          min-height: 100vh;
          padding-top: 0;
          padding-bottom: 64px;
          background: radial-gradient(circle at 78% 15%, #17334f 0%, #0A1929 55%, #081420 100%);
          color: var(--ink);
          font-family: 'Manrope', system-ui, sans-serif;
          line-height: 1.5;
          overflow-x: hidden;
        }
        .calc-root * { box-sizing: border-box; }
        .calc-serif { font-family: 'Fraunces', Georgia, serif; }
        .calc-mono { font-family: 'IBM Plex Mono', monospace; }

        /* Hero */
        .calc-hero {
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at 78% 15%, #17334f 0%, var(--ink) 55%, #081420 100%);
          color: var(--paper);
        }
        .calc-hero-inner {
          max-width: 1160px;
          margin: 0 auto;
          padding: 148px 24px 56px;
          text-align: center;
        }
        .calc-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          padding: 7px 14px;
          border: 1px solid rgba(231, 201, 140, 0.35);
          border-radius: 999px;
          color: var(--gold-soft);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }
        .calc-hero h1 {
          margin: 0 0 16px;
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(1.9rem, 4.2vw, 3rem);
          font-weight: 600;
          line-height: 1.12;
          letter-spacing: -0.01em;
        }
        .calc-hero h1 span { color: var(--gold-soft); }
        .calc-hero-sub {
          max-width: 560px;
          margin: 0 auto;
          color: var(--mist);
          font-size: 16px;
        }

        /* Tabs / toggle */
        .calc-section {
          max-width: 1160px;
          margin: 0 auto;
          padding: 40px 24px 0;
        }
        .calc-toggle {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .calc-toggle-btn {
          padding: 11px 22px;
          border-radius: 999px;
          border: 1.5px solid var(--line);
          background: #fff;
          color: var(--slate);
          font-family: 'Manrope', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
        }
        .calc-toggle-btn:hover { color: var(--ink); }
        .calc-toggle-btn.active {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--ink);
          box-shadow: 0 8px 20px -8px rgba(201, 151, 74, 0.6);
        }

        /* Layout */
        .calc-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: flex-start;
        }
        @media (min-width: 1024px) { .calc-layout { flex-direction: row; } }
        .calc-main { width: 100%; flex: 1; min-width: 0; }

        .calc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 720px) { .calc-grid { grid-template-columns: repeat(2, 1fr); } }

        .calc-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 20px 44px -30px rgba(10, 25, 41, 0.25);
        }
        @media (min-width: 640px) { .calc-card { padding: 32px; } }
        .calc-card h2 {
          margin: 0 0 22px;
          font-family: 'Fraunces', Georgia, serif;
          font-size: 19px;
          font-weight: 600;
          color: var(--ink);
        }

        /* Slider field */
        .calc-field { margin-bottom: 26px; }
        .calc-field:last-child { margin-bottom: 4px; }
        .calc-field-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .calc-field-label { color: var(--slate); font-size: 13.5px; font-weight: 700; }
        .calc-field-value {
          display: flex;
          align-items: center;
          min-width: 116px;
          padding: 7px 12px;
          border: 1.5px solid #DADFE6;
          border-radius: 10px;
          background: var(--paper);
        }
        .calc-field-affix { color: var(--teal); font-weight: 700; font-size: 13.5px; }
        .calc-field-affix:first-child { margin-right: 4px; }
        .calc-field-affix:last-child { margin-left: 4px; }
        .calc-field-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          text-align: right;
          color: var(--ink);
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 13.5px;
        }

        .calc-slider { position: relative; width: 100%; height: 20px; display: flex; align-items: center; }
        .calc-slider-track {
          position: absolute; inset-inline: 0; height: 6px;
          background: #E7E2D6; border-radius: 999px;
        }
        .calc-slider-fill {
          position: absolute; left: 0; height: 6px;
          background: linear-gradient(90deg, var(--teal), var(--gold));
          border-radius: 999px; pointer-events: none;
        }
        .calc-slider-input {
          position: absolute; inset: 0; width: 100%; height: 100%;
          opacity: 0; cursor: pointer; z-index: 10; margin: 0;
          -webkit-appearance: none;
        }
        .calc-slider-thumb {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; border: 2.5px solid var(--gold);
          box-shadow: 0 3px 8px rgba(10,25,41,0.25);
          pointer-events: none; z-index: 0;
        }

        /* Donut + results */
        .calc-donut-wrap {
          position: relative;
          width: 168px; height: 168px;
          margin: 0 auto 24px;
        }
        .calc-donut-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 0 8px;
        }
        .calc-donut-label { color: var(--slate); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .calc-donut-value { color: var(--ink); font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 15px; margin-top: 4px; line-height: 1.2; }

        .calc-results { display: flex; flex-direction: column; gap: 10px; }
        .calc-result-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-radius: 12px; background: var(--paper);
          border: 1px solid var(--line);
        }
        .calc-result-left { display: flex; align-items: center; gap: 9px; }
        .calc-result-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .calc-result-name { color: var(--slate); font-size: 13.5px; font-weight: 600; }
        .calc-result-val { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 13.5px; color: var(--ink); }
        .calc-result-row.highlight {
          background: rgba(201, 151, 74, 0.08);
          border-color: rgba(201, 151, 74, 0.35);
        }
        .calc-result-row.highlight .calc-result-name { color: var(--ink); font-weight: 700; }
        .calc-result-row.highlight .calc-result-val { color: var(--gold); font-size: 15px; }

        /* About + FAQ */
        .calc-about h3, .calc-faq-card h3 {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 14px;
        }
        .calc-about p { color: var(--slate); font-size: 14.5px; line-height: 1.75; margin: 0; }

        .calc-faq-item { border-bottom: 1px solid var(--line); }
        .calc-faq-item:last-child { border-bottom: none; }
        .calc-faq-q {
          width: 100%; background: none; border: none; text-align: left; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 16px 2px; font-size: 14.5px; font-weight: 700; color: var(--ink);
          font-family: 'Manrope', sans-serif;
        }
        .calc-faq-q:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
        .calc-faq-chevron { transition: transform .2s ease; flex-shrink: 0; color: var(--teal); }
        .calc-faq-chevron.open { transform: rotate(180deg); }
        .calc-faq-a { max-height: 0; overflow: hidden; transition: max-height .25s ease; }
        .calc-faq-a.open { max-height: 260px; }
        .calc-faq-a-inner { padding: 0 2px 16px; font-size: 13.5px; color: var(--slate); line-height: 1.7; }

        /* Sidebar */
        .calc-sidebar {
          width: 100%;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 18px;
        }
        @media (min-width: 1024px) { .calc-sidebar { width: 240px; flex-shrink: 0; padding: 20px; } }
        .calc-sidebar h4 {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--line);
        }
        .calc-sidebar-scroll {
          display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;
          margin: 0 -4px; padding-left: 4px; padding-right: 4px;
        }
        @media (min-width: 1024px) { .calc-sidebar-scroll { display: none; } }
        .calc-sidebar-list { list-style: none; margin: 0; padding: 0; display: none; flex-direction: column; gap: 3px; }
        @media (min-width: 1024px) { .calc-sidebar-list { display: flex; } }
        .calc-sidebar-pill {
          flex-shrink: 0; white-space: nowrap; padding: 9px 14px; border-radius: 10px;
          font-size: 12.5px; font-weight: 700; border: 1px solid var(--line); background: var(--paper);
          color: var(--slate); cursor: pointer; transition: all .15s ease;
        }
        .calc-sidebar-pill.active { background: var(--gold); border-color: var(--gold); color: var(--ink); }
        .calc-sidebar-item {
          width: 100%; text-align: left; padding: 10px 12px; border-radius: 10px;
          font-size: 13.5px; font-weight: 600; color: var(--slate); background: none; border: none;
          cursor: pointer; transition: all .15s ease; font-family: 'Manrope', sans-serif;
        }
        .calc-sidebar-item:hover { background: rgba(29, 111, 100, 0.08); color: var(--teal); }
        .calc-sidebar-item.active { background: var(--gold); color: var(--ink); font-weight: 700; }

        @media (max-width: 520px) {
          .calc-root { padding-top: 72px; }
          .calc-hero-inner, .calc-section { padding-left: 18px; padding-right: 18px; }
          .calc-card { padding: 20px; }
        }
      `}</style>

      {/* Hero */}
      <section className="calc-hero">
        <div className="calc-hero-inner">
          <span className="calc-eyebrow"><Calculator size={14} /> Dhanvo Calculators</span>
          <h1 className="calc-serif">
            Financial Planning Made <span>Simple.</span>
          </h1>
          <p className="calc-hero-sub">
            Plan your investments wisely with our easy-to-use SIP, SWP, EMI, and savings calculators &mdash; instant results, no guesswork.
          </p>
        </div>
      </section>

      <div className="calc-section">
        {/* Top Toggle */}
        <div className="calc-toggle">
          {['sip', 'lumpsum'].map((id) => (
            <button
              key={id}
              onClick={() => switchCalc(id)}
              className={`calc-toggle-btn ${activeCalc === id ? 'active' : ''}`}
            >
              {CONFIGS[id].name}
            </button>
          ))}
        </div>

        {/* Layout */}
        <div className="calc-layout">

          {/* Main Calculator Engine */}
          <div className="calc-main">
            <div className="calc-grid">
              {/* Inputs */}
              <div className="calc-card">
                <h2>{cfg.name}</h2>
                <SliderInput
                  label={cfg.s1.label} value={vals.s1} onChange={setVal('s1')}
                  min={cfg.s1.min} max={cfg.s1.max} step={cfg.s1.step}
                  prefix={cfg.s1.prefix} suffix={cfg.s1.suffix}
                />
                <SliderInput
                  label={cfg.s2.label} value={vals.s2} onChange={setVal('s2')}
                  min={cfg.s2.min} max={cfg.s2.max} step={cfg.s2.step}
                  prefix={cfg.s2.prefix} suffix={cfg.s2.suffix}
                />
                <SliderInput
                  label={cfg.s3.label} value={vals.s3} onChange={setVal('s3')}
                  min={cfg.s3.min} max={cfg.s3.max} step={cfg.s3.step}
                  prefix={cfg.s3.prefix} suffix={cfg.s3.suffix}
                />
                {cfg.s4 && (
                  <SliderInput
                    label={cfg.s4.label} value={vals.s4 ?? cfg.s4.def} onChange={setVal('s4')}
                    min={cfg.s4.min} max={cfg.s4.max} step={cfg.s4.step}
                    prefix={cfg.s4.prefix} suffix={cfg.s4.suffix}
                  />
                )}
              </div>

              {/* Results */}
              <div className="calc-card">
                <h2>Results</h2>

                {/* Donut */}
                <div className="calc-donut-wrap">
                  <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#EDE7D8" strokeWidth="22" />
                    <circle
                      cx="100" cy="100" r="80" fill="none"
                      stroke="#C9974A" strokeWidth="22"
                      strokeDasharray={`${dashA} ${dashB}`}
                      strokeLinecap="butt"
                      style={{ transition: 'stroke-dasharray 0.4s ease' }}
                    />
                    <circle
                      cx="100" cy="100" r="80" fill="none"
                      stroke="#1D6F64" strokeWidth="22"
                      strokeDasharray={`${dashB} ${dashA}`}
                      strokeDashoffset={dashB}
                      strokeLinecap="butt"
                      style={{ transition: 'stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease' }}
                    />
                  </svg>
                  <div className="calc-donut-center">
                    <span className="calc-donut-label">{cfg.centerLabel}</span>
                    <span className="calc-donut-value">{centerDisplay}</span>
                  </div>
                </div>

                <div className="calc-results">
                  <div className="calc-result-row">
                    <div className="calc-result-left">
                      <div className="calc-result-dot" style={{ background: '#C9974A' }} />
                      <span className="calc-result-name">{cfg.resLabels[0]}</span>
                    </div>
                    <span className="calc-result-val">{fmt(r1)}</span>
                  </div>

                  <div className="calc-result-row">
                    <div className="calc-result-left">
                      <div className="calc-result-dot" style={{ background: '#1D6F64' }} />
                      <span className="calc-result-name">{cfg.resLabels[1]}</span>
                    </div>
                    <span className="calc-result-val">{fmt(r2)}</span>
                  </div>

                  <div className="calc-result-row highlight">
                    <span className="calc-result-name">{cfg.resLabels[2]}</span>
                    <span className="calc-result-val">
                      {cfg.r3IsPercent ? `${r3.toFixed(2)}%` : fmt(r3)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* About + FAQs */}
            {info && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* About */}
                <div className="calc-card calc-about">
                  <h3>About {cfg.name}</h3>
                  <p>{info.about}</p>
                </div>

                {/* FAQs */}
                <div className="calc-card calc-faq-card">
                  <h3>Frequently Asked Questions</h3>
                  <div>
                    {info.faqs.map((faq, i) => (
                      <FAQ key={i} q={faq.q} a={faq.a} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="calc-sidebar">
            <h4>Popular Calculators</h4>
            {/* Mobile: horizontal scroll */}
            <div className="calc-sidebar-scroll">
              {SIDEBAR_LIST.map((id) => (
                <button
                  key={id}
                  onClick={() => switchCalc(id)}
                  className={`calc-sidebar-pill ${activeCalc === id ? 'active' : ''}`}
                >
                  {CONFIGS[id].name}
                </button>
              ))}
            </div>
            {/* Desktop: vertical list */}
            <ul className="calc-sidebar-list">
              {SIDEBAR_LIST.map((id) => (
                <li key={id}>
                  <button
                    onClick={() => switchCalc(id)}
                    className={`calc-sidebar-item ${activeCalc === id ? 'active' : ''}`}
                  >
                    {CONFIGS[id].name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </main>
  );
};

export default CalculatorPage;