import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  FileText,
  Layers3,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

const regulators = [
  {
    name: "NSE",
    full: "National Stock Exchange",
    badge: "Member",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/c5/NSE-logo.jpg",
  },
  {
    name: "BSE",
    full: "Bombay Stock Exchange",
    badge: "Member",
    logo: "https://m.economictimes.com/thumb/height-450,width-600,imgsize-8802,msid-101646037/bse-new-logo.jpg",
  },
  {
    name: "AMFI",
    full: "Association of Mutual Funds in India",
    badge: "Registered",
    logo: "https://tradebrains.in/wp-content/uploads/2021/03/amfi-logo.jpg",
  },
];

const trustItems = [
  {
    icon: LockKeyhole,
    title: "Secure & Protected",
    desc: "Advanced security measures designed to safeguard your personal and investment information.",
  },
  {
    icon: ShieldCheck,
    title: "AMFI Registered",
    desc: "Invest through an AMFI-registered mutual fund distributor with access to leading AMCs.",
  },
  {
    icon: Target,
    title: "Goal-Based Investing",
    desc: "Build wealth systematically with research-backed investment strategies and planning tools.",
  },
  {
    icon: BarChart3,
    title: "Transparent Investing",
    desc: "Track your investments with complete visibility and clear information at every step.",
  },
];

const heroBadges = [
  "Mutual Funds",
  "Unlisted Shares",
  "Insurance",
  "Strategy Builder",
  "Smart Tools",
];

const investorRows = [
  {
    label: "Zero Manual Intervention",
    value: "Completely automated",
    sub: "investment dashboard",
  },
  {
    label: "Curated Portfolios",
    value: "Handpicked Mutual Funds",
    sub: "aligned with your goals",
  },
  {
    label: "Pre-IPO Opportunities",
    value: "Secure Demat delivery",
    sub: "of premium unlisted shares",
  },
];

const amcLogos = {
  "360 ONE MF": "https://www.google.com/s2/favicons?domain=360.one&sz=128",
  "Abakkus Mutual Fund": "https://www.google.com/s2/favicons?domain=abakkusim.com&sz=128",
  "Aditya Birla Sun Life": "https://www.google.com/s2/favicons?domain=adityabirlacapital.com&sz=128",
  "AlphaGrep Mutual Fund": "https://www.google.com/s2/favicons?domain=alphagrep.co.in&sz=128",
  "Angel One AMC": "https://www.google.com/s2/favicons?domain=angelone.in&sz=128",
  "ASK Mutual Fund": "https://www.google.com/s2/favicons?domain=askinvestmentmanagers.com&sz=128",
  "Axis Mutual Fund": "https://www.google.com/s2/favicons?domain=axismf.com&sz=128",
  "Bajaj Finserv AMC": "https://www.google.com/s2/favicons?domain=bajajamc.com&sz=128",
  "Bandhan AMC": "https://www.google.com/s2/favicons?domain=bandhanamc.com&sz=128",
  "Bank of India Mutual Fund": "https://www.google.com/s2/favicons?domain=boimf.in&sz=128",
  "Baroda BNP Paribas Mutual Fund": "https://www.google.com/s2/favicons?domain=barodabnpparibasmf.in&sz=128",
  "Canara Robeco": "https://www.google.com/s2/favicons?domain=canararobeco.com&sz=128",
  "Capitalmind Mutual Fund": "https://www.google.com/s2/favicons?domain=capitalmind.in&sz=128",
  "Carnelian Mutual Fund": "https://www.google.com/s2/favicons?domain=carnelian.in&sz=128",
  "Choice Mutual Fund": "https://www.google.com/s2/favicons?domain=choiceindia.com&sz=128",
  "DSP Mutual Fund": "https://www.google.com/s2/favicons?domain=dspim.com&sz=128",
  "Edelweiss AMC": "https://www.google.com/s2/favicons?domain=edelweissmf.com&sz=128",
  "Franklin Templeton": "https://www.google.com/s2/favicons?domain=franklintempletonindia.com&sz=128",
  "Groww Mutual Fund": "https://www.google.com/s2/favicons?domain=groww.in&sz=128",
  "HDFC Mutual Fund": "https://www.google.com/s2/favicons?domain=hdfcfund.com&sz=128",
  "Helios Mutual Fund": "https://www.google.com/s2/favicons?domain=heliosmf.com&sz=128",
  "HSBC Mutual Fund": "https://www.google.com/s2/favicons?domain=assetmanagement.hsbc.co.in&sz=128",
  "ICICI Prudential": "https://www.google.com/s2/favicons?domain=icicipruamc.com&sz=128",
  "Invesco Mutual Fund": "https://www.google.com/s2/favicons?domain=invescomutualfund.com&sz=128",
  "ITI Mutual Fund": "https://www.google.com/s2/favicons?domain=itimf.com&sz=128",
  "Jio BlackRock": "https://www.google.com/s2/favicons?domain=jioblackrock.com&sz=128",
  "JM Financial Mutual Fund": "https://www.google.com/s2/favicons?domain=jmfinancialmf.com&sz=128",
  "Kotak Mahindra": "https://www.google.com/s2/favicons?domain=kotakmf.com&sz=128",
  "LIC Mutual Fund": "https://www.google.com/s2/favicons?domain=licmf.com&sz=128",
  "Mahindra Manulife Mutual Fund": "https://www.google.com/s2/favicons?domain=mahindramanulife.com&sz=128",
  "Mirae Asset": "https://www.google.com/s2/favicons?domain=miraeassetmf.co.in&sz=128",
  "Motilal Oswal": "https://www.google.com/s2/favicons?domain=motilaloswalmf.com&sz=128",
  "Navi Mutual Fund": "https://www.google.com/s2/favicons?domain=navimutualfund.com&sz=128",
  "Nippon India": "https://www.google.com/s2/favicons?domain=nipponindiamf.com&sz=128",
  "NJ Mutual Fund": "https://www.google.com/s2/favicons?domain=njfunds.com&sz=128",
  "Nuvama Mutual Fund": "https://www.google.com/s2/favicons?domain=nuvamawealth.com&sz=128",
  "PGIM India Mutual Fund": "https://www.google.com/s2/favicons?domain=pgimindiamf.com&sz=128",
  "PPFAS Mutual Fund": "https://www.google.com/s2/favicons?domain=amc.ppfas.com&sz=128",
  "Quant Mutual Fund": "https://www.google.com/s2/favicons?domain=quantmutual.com&sz=128",
  "Quantum Mutual Fund": "https://www.google.com/s2/favicons?domain=quantumamc.com&sz=128",
  "Samco Mutual Fund": "https://www.google.com/s2/favicons?domain=samcomf.com&sz=128",
  "SBI Mutual Fund": "https://www.google.com/s2/favicons?domain=sbimf.com&sz=128",
  "Shriram Mutual Fund": "https://www.google.com/s2/favicons?domain=shriramamc.in&sz=128",
  "Sundaram AMC": "https://www.google.com/s2/favicons?domain=sundarammutual.com&sz=128",
  "Tata Asset Mgmt": "https://www.google.com/s2/favicons?domain=tatamutualfund.com&sz=128",
  "Taurus Mutual Fund": "https://www.google.com/s2/favicons?domain=taurusmutualfund.com&sz=128",
  "Trust Mutual Fund": "https://www.google.com/s2/favicons?domain=trustmf.com&sz=128",
  "Unifi Mutual Fund": "https://www.google.com/s2/favicons?domain=unifimf.com&sz=128",
  "Union Mutual Fund": "https://www.google.com/s2/favicons?domain=unionmf.com&sz=128",
  "UTI Mutual Fund": "https://www.google.com/s2/favicons?domain=utimf.com&sz=128",
  "The Wealth Company Mutual Fund": "https://www.google.com/s2/favicons?domain=thewealthcompanyamc.in&sz=128",
  "WhiteOak Capital": "https://www.google.com/s2/favicons?domain=whiteoakindia.com&sz=128",
  "Zerodha Mutual Fund": "https://www.google.com/s2/favicons?domain=zerodha.com&sz=128"
};

const mutualFunds = [
  "360 ONE MF",
  "Abakkus Mutual Fund",
  "Aditya Birla Sun Life",
  "AlphaGrep Mutual Fund",
  "Angel One AMC",
  "ASK Mutual Fund",
  "Axis Mutual Fund",
  "Bajaj Finserv AMC",
  "Bandhan AMC",
  "Bank of India Mutual Fund",
  "Baroda BNP Paribas Mutual Fund",
  "Canara Robeco",
  "Capitalmind Mutual Fund",
  "Carnelian Mutual Fund",
  "Choice Mutual Fund",
  "DSP Mutual Fund",
  "Edelweiss AMC",
  "Franklin Templeton",
  "Groww Mutual Fund",
  "HDFC Mutual Fund",
  "Helios Mutual Fund",
  "HSBC Mutual Fund",
  "ICICI Prudential",
  "Invesco Mutual Fund",
  "ITI Mutual Fund",
  "Jio BlackRock",
  "JM Financial Mutual Fund",
  "Kotak Mahindra",
  "LIC Mutual Fund",
  "Mahindra Manulife Mutual Fund",
  "Mirae Asset",
  "Motilal Oswal",
  "Navi Mutual Fund",
  "Nippon India",
  "NJ Mutual Fund",
  "Nuvama Mutual Fund",
  "PGIM India Mutual Fund",
  "PPFAS Mutual Fund",
  "Quant Mutual Fund",
  "Quantum Mutual Fund",
  "Samco Mutual Fund",
  "SBI Mutual Fund",
  "Shriram Mutual Fund",
  "Sundaram AMC",
  "Tata Asset Mgmt",
  "Taurus Mutual Fund",
  "Trust Mutual Fund",
  "Unifi Mutual Fund",
  "Union Mutual Fund",
  "UTI Mutual Fund",
  "The Wealth Company Mutual Fund",
  "WhiteOak Capital",
  "Zerodha Mutual Fund"
].map((name) => ({ name, type: "Mutual Fund" }));

const sifFunds = [
  "SBI AMC SIF",
  "Infinity SIF - Kotak",
  "SIF - ICICI Prudential",
  "Jio BlackRock Prism SIF",
  "Platinum SIF - Mirae",
  "Redhex SIF - HSBC",
  "Bandhan MF SIF",
  "Franklin Templeton SIF",
  "Edelweiss SIF",
  "Invesco SIF",
  "ITI MF SIF",
  "Quant MF SIF",
  "Tata MF SIF",
  "Union Arthaya SIF",
  "360 ONE SIF",
].map((name) => ({ name, type: "SIF" }));

const featureCards = [
  {
    icon: Wallet,
    title: "Mutual Funds",
    desc: "Build and track automated SIPs or lump-sum investments through a zero-manual-intervention dashboard.",
  },
  {
    icon: TrendingUp,
    title: "Unlisted Shares",
    desc: "Access curated wealth-creation opportunities in high-growth companies with institutional disclosures.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance",
    desc: "Safeguard your wealth and secure your family's future with premium life and health insurance products.",
  },
  {
    icon: LineChart,
    title: "Strategy Builder",
    desc: "Analyze payoff charts, Greeks, and probability of profit in real-time with precision derivative tools.",
  },
];

const comparisonRows = [
  ["High brokerage & hidden fees", "Zero distributor fees for investment tracking"],
  ["Limited fund options & manual execution", "60+ AMCs with automated portfolios"],
  ["Basic charts & generic advice", "Institutional-grade Strategy Builder & analytics"],
  ["Noise, tips culture & hype", "Clarity, deep data, and disciplined wealth building"],
];

function initials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const sifParentAmc = {
  "SBI AMC SIF": "SBI Mutual Fund",
  "Infinity SIF - Kotak": "Kotak Mahindra",
  "SIF - ICICI Prudential": "ICICI Prudential",
  "Jio BlackRock Prism SIF": "Jio BlackRock",
  "Platinum SIF - Mirae": "Mirae Asset",
  "Redhex SIF - HSBC": "HSBC Mutual Fund",
  "Bandhan MF SIF": "Bandhan AMC",
  "Franklin Templeton SIF": "Franklin Templeton",
  "Edelweiss SIF": "Edelweiss AMC",
  "Invesco SIF": "Invesco Mutual Fund",
  "ITI MF SIF": "ITI Mutual Fund",
  "Quant MF SIF": "Quant Mutual Fund",
  "Tata MF SIF": "Tata Asset Mgmt",
  "Union Arthaya SIF": "Union Mutual Fund",
  "360 ONE SIF": "360 ONE MF"
};

const AmcChip = ({ item }) => {
  const logo = amcLogos[item.name] || amcLogos[sifParentAmc[item.name]];

  return (
    <div className="lp-amc-chip">
      <div className="lp-amc-logo">
        {logo ? (
          <img
            src={logo}
            alt={item.name}
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.parentElement.dataset.fallback = initials(item.name);
            }}
          />
        ) : (
          <span>{initials(item.name)}</span>
        )}
      </div>
      <div>
        <span className="lp-amc-name">{item.name}</span>
        <span className="lp-amc-type">{item.type}</span>
      </div>
    </div>
  );
};

const MarqueeRow = ({ items, direction = "left" }) => {
  const doubled = [...items, ...items];

  return (
    <div className="lp-marquee">
      <div className="lp-marquee-fade left" />
      <div className="lp-marquee-fade right" />
      <div className={`lp-marquee-track ${direction === "right" ? "right" : "left"}`}>
        {doubled.map((item, index) => (
          <AmcChip key={`${item.name}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
};

const LandingPage = () => (
  <main className="lp-root">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

      .lp-root {
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
        background: var(--paper);
        color: var(--ink);
        font-family: 'Manrope', system-ui, sans-serif;
        line-height: 1.5;
        overflow-x: hidden;
      }
      .lp-root * { box-sizing: border-box; }
      .lp-serif { font-family: 'Fraunces', Georgia, serif; }
      .lp-mono { font-family: 'IBM Plex Mono', monospace; }
      .lp-link { text-decoration: none; }

      .lp-hero {
        position: relative;
        overflow: hidden;
        background: radial-gradient(circle at 78% 15%, #17334f 0%, var(--ink) 55%, #081420 100%);
        color: var(--paper);
      }
      .lp-hero-inner {
        max-width: 1160px;
        margin: 0 auto;
        padding: 148px 24px 86px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 42px;
        align-items: center;
      }
      @media (min-width: 960px) {
        .lp-hero-inner { grid-template-columns: 1.12fr 0.88fr; padding: 156px 24px 96px; }
      }
      .lp-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 22px;
        padding: 5px 12px;
        border: 1px solid rgba(231, 201, 140, 0.35);
        border-radius: 999px;
        color: var(--gold-soft);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.10em;
        text-transform: uppercase;
      }
      .lp-hero h1 {
        margin: 0 0 20px;
        max-width: 680px;
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.45rem, 3vw, 2.2rem);
        line-height: 1.15;
        max-width: 640px;
        font-weight: 600;
        line-height: 1.08;
        letter-spacing: -0.01em;
      }
      .lp-hero h1 span { color: var(--gold-soft); }
      .lp-sub {
        max-width: 540px;
        margin: 0 0 28px;
        color: var(--mist);
        font-size: 17px;
      }
      .lp-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 30px;
      }
      .lp-badge {
        padding: 6px 12px;
        border: 1px solid rgba(231, 201, 140, 0.24);
        border-radius: 999px;
        background: rgba(15, 35, 56, 0.72);
        color: var(--paper);
        font-size: 11.5px;
        font-weight: 600;
      }
      .lp-actions { display: flex; flex-wrap: wrap; gap: 14px; }
      .lp-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 40px;
        padding: 10px 18px;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        font-family: 'Manrope', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.01em;
        text-decoration: none;
        transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
      }
      .lp-btn:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
      .lp-btn-primary {
        background: var(--gold);
        color: var(--ink);
        box-shadow: 0 8px 20px -8px rgba(201, 151, 74, 0.6);
      }
      .lp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(201, 151, 74, 0.7); }
      .lp-btn-outline {
        background: transparent;
        color: var(--paper);
        border: 1.5px solid rgba(251, 249, 244, 0.3);
      }
      .lp-btn-dark { background: var(--ink); color: var(--paper); }
      .lp-btn-dark:hover { transform: translateY(-1px); background: var(--ink-2); }

      .lp-hero-card {
        border: 1px solid rgba(231, 201, 140, 0.26);
        border-radius: 20px;
        padding: 20px;
        background: rgba(15, 35, 56, 0.72);
        box-shadow: 0 26px 60px -34px rgba(0, 0, 0, 0.75);
      }
      .lp-card-kicker {
        margin: 0 0 8px;
        color: var(--gold-soft);
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.10em;
        text-transform: uppercase;
      }
      .lp-hero-card h2 {
        margin: 0 0 14px;
        color: var(--paper);
        font-family: 'Fraunces', Georgia, serif;
        font-size: 21px;
        font-weight: 600;
      }
      .lp-invest-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        padding: 12px 0;
        border-top: 1px solid rgba(159, 179, 200, 0.16);
      }
      .lp-invest-row:first-of-type { border-top: 0; }
      .lp-invest-row > span { color: var(--mist); font-size: 12.5px; }
      .lp-invest-row strong { display: block; color: var(--paper); font-size: 13px; text-align: right; }
      .lp-invest-row small { display: block; margin-top: 2px; color: var(--mist); font-size: 11px; text-align: right; }

      .lp-band-dark {
        background: var(--ink);
        color: var(--paper);
        border-top: 1px solid rgba(159, 179, 200, 0.12);
        border-bottom: 1px solid rgba(159, 179, 200, 0.12);
      }
      .lp-section {
        max-width: 1160px;
        margin: 0 auto;
        padding: 84px 24px;
      }
      .lp-section-head {
        max-width: 650px;
        margin-bottom: 42px;
      }
      .lp-center { text-align: center; margin-left: auto; margin-right: auto; }
      .lp-kicker {
        margin-bottom: 12px;
        color: var(--teal);
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.10em;
        text-transform: uppercase;
      }
      .lp-band-dark .lp-kicker { color: var(--gold-soft); }
      .lp-section-head h2 {
        margin: 0 0 12px;
        color: var(--ink);
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.7rem, 3vw, 2.3rem);
        font-weight: 600;
        line-height: 1.16;
      }
      .lp-band-dark .lp-section-head h2 { color: var(--paper); }
      .lp-section-head p {
        margin: 0;
        color: var(--slate);
        font-size: 15.5px;
      }
      .lp-band-dark .lp-section-head p { color: var(--mist); }

      .lp-trust-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 18px;
      }
      @media (min-width: 720px) { .lp-trust-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 1000px) { .lp-trust-grid { grid-template-columns: repeat(4, 1fr); } }
      .lp-trust-card {
        padding: 12px;
        border: 1px solid rgba(231, 201, 140, 0.18);
        border-radius: 12px;
        background: rgba(15, 35, 56, 0.54);
      }
      .lp-icon {
        width: 42px;
        height: 42px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 11px;
        background: #EEF3F1;
        color: var(--teal);
      }
      .lp-trust-card .lp-icon {
        background: rgba(231, 201, 140, 0.10);
        color: var(--gold-soft);
      }
      .lp-trust-card h3, .lp-feature-card h3 {
        margin: 0 0 7px;
        font-size: 15px;
        font-weight: 700;
      }
      .lp-trust-card p, .lp-feature-card p {
        margin: 0;
        color: var(--mist);
        font-size: 13px;
      }
      .lp-feature-card p { color: var(--slate); }

      .lp-reg-grid {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 18px;
      }
      .lp-reg-card {
        width: min(100%, 250px);
        min-height: 100px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        text-align: center;
        transition: transform .15s ease, box-shadow .15s ease;
      }
      .lp-reg-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -18px rgba(10, 25, 41, 0.25); }
      .lp-reg-logo {
        width: 90px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 12px;
        background: var(--paper);
        border: 1px solid var(--line);
      }
      .lp-reg-logo img { width: 100%; height: 100%; object-fit: contain; padding: 9px; }
      .lp-reg-card h3 { margin: 0; font-size: 15px; font-weight: 700; }
      .lp-reg-badge {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(201, 151, 74, 0.30);
        background: rgba(201, 151, 74, 0.08);
        color: var(--gold);
        font-size: 12.5px;
        font-weight: 700;
      }

      .lp-amc-stats {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 34px;
      }
      .lp-amc-stat {
        padding: 9px 16px;
        border: 1px solid rgba(231, 201, 140, 0.24);
        border-radius: 999px;
        background: rgba(15, 35, 56, 0.72);
        color: var(--gold-soft);
        font-size: 13.5px;
        font-weight: 700;
      }
      @keyframes lp-marquee-left {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes lp-marquee-right {
        0% { transform: translateX(-50%); }
        100% { transform: translateX(0); }
      }
      .lp-marquee {
        position: relative;
        overflow: hidden;
        margin-bottom: 12px;
      }
      .lp-marquee-track {
        display: flex;
        width: max-content;
        animation-duration: 58s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      .lp-marquee-track.left { animation-name: lp-marquee-left; }
      .lp-marquee-track.right { animation-name: lp-marquee-right; }
      .lp-marquee-track:hover { animation-play-state: paused; }
      .lp-marquee-fade {
        position: absolute;
        top: 0;
        z-index: 2;
        width: 80px;
        height: 100%;
        pointer-events: none;
      }
      .lp-marquee-fade.left { left: 0; background: linear-gradient(to right, var(--ink), transparent); }
      .lp-marquee-fade.right { right: 0; background: linear-gradient(to left, var(--ink), transparent); }
      .lp-amc-chip {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin: 0 6px;
        padding: 10px 16px;
        flex-shrink: 0;
        white-space: nowrap;
        border: 1px solid rgba(231, 201, 140, 0.16);
        border-radius: 12px;
        background: rgba(15, 35, 56, 0.88);
      }
      .lp-amc-logo {
        position: relative;
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #fff;
        color: var(--paper);
        font-size: 11px;
        font-weight: 700;
      }
      .lp-amc-logo[data-fallback] { background: var(--teal); }
      .lp-amc-logo[data-fallback]::after { content: attr(data-fallback); }
      .lp-amc-logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
      .lp-amc-logo span { color: var(--paper); }
      .lp-amc-name {
        display: block;
        max-width: 136px;
        overflow: hidden;
        color: var(--paper);
        font-size: 12px;
        font-weight: 700;
        text-overflow: ellipsis;
      }
      .lp-amc-type {
        display: block;
        margin-top: 1px;
        color: var(--mist);
        font-size: 10.5px;
      }

      .lp-feature-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 18px;
      }
      @media (min-width: 720px) { .lp-feature-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 1000px) { .lp-feature-grid { grid-template-columns: repeat(4, 1fr); } }
      .lp-feature-card {
        padding: 26px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fff;
        transition: transform .15s ease, box-shadow .15s ease;
      }
      .lp-feature-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -18px rgba(10, 25, 41, 0.25); }

      .lp-why {
        max-width: 860px;
        margin: 0 auto;
        text-align: center;
      }
      .lp-why h2 {
        margin: 0 0 14px;
        color: var(--paper);
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.7rem, 3vw, 2.3rem);
        font-weight: 600;
      }
      .lp-why p {
        margin: 0;
        color: var(--mist);
        font-size: 16px;
        line-height: 1.75;
      }

      .lp-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: #fff;
      }
      .lp-table {
        width: 100%;
        min-width: 620px;
        border-collapse: collapse;
        text-align: left;
      }
      .lp-table th {
        padding: 16px 22px;
        border-bottom: 1px solid var(--line);
        color: var(--slate);
        font-size: 12.5px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .lp-table td {
        padding: 18px 22px;
        border-bottom: 1px solid var(--line);
        color: var(--slate);
        font-size: 14.5px;
      }
      .lp-table tr:last-child td { border-bottom: 0; }
      .lp-table td:last-child {
        color: var(--teal);
        font-weight: 800;
      }

      .lp-strategy {
        display: grid;
        grid-template-columns: 0.9fr 1fr;
        gap: 20px;
        align-items: center;
        padding: 20px;
        border: 1px solid rgba(231, 201, 140, 0.18);
        border-radius: 18px;
        background: rgba(15, 35, 56, 0.72);
      }
      @media (min-width: 900px) { .lp-strategy { grid-template-columns: 0.9fr 1.1fr; padding: 34px; } }
      .lp-strategy h2 {
        margin: 0 0 10px;
        color: var(--paper);
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.35rem, 2.2vw, 1.8rem);
        font-weight: 600;
      }
      .lp-strategy p {
        margin: 0 0 18px;
        max-width: 440px;
        color: var(--mist);
        font-size: 13px;
        line-height: 1.6;
      }
      .lp-preview {
        overflow: hidden;
        border: 1px solid rgba(231, 201, 140, 0.18);
        border-radius: 16px;
        background: #071320;
      }
      .lp-preview img {
        display: block;
        width: 100%;
        min-height: 220px;
        object-fit: cover;
      }

      @media (max-width: 520px) {
        .lp-hero-inner, .lp-section { padding-left: 18px; padding-right: 18px; }
        .lp-hero-inner { padding-top: 116px; padding-bottom: 66px; }
        .lp-hero-card, .lp-strategy { padding: 24px; }
        .lp-invest-row { flex-direction: column; gap: 6px; }
        .lp-invest-row strong, .lp-invest-row small { text-align: left; }
        .lp-marquee-fade { width: 42px; }
      }
    `}</style>

    <section className="lp-hero">
      <div className="lp-hero-inner">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <span className="lp-eyebrow">
            <Sparkles size={14} /> Dhanvo Wealth Platform
          </span>
          <h1>
            Empowering your wealth with<br/><span style={{whiteSpace: "nowrap"}}>Trust, Technology &amp; Transparency.</span>
          </h1>
          <p className="lp-sub">
            Dhanvo is a premium financial ecosystem designed for serious investors, helping you invest,
            monitor, and grow your wealth with confidence.
          </p>
          <div className="lp-badges">
            {heroBadges.map((badge) => (
              <span className="lp-badge" key={badge}>{badge}</span>
            ))}
          </div>
          <div className="lp-actions">
            <Link to="/signup" className="lp-btn lp-btn-primary lp-link">
              Start Investing Now <ArrowRight size={17} />
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="lp-hero-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="lp-card-kicker">For Smart Investors</p>
          <h2>Seamless Investing Experience</h2>
          {investorRows.map((row) => (
            <div className="lp-invest-row" key={row.label}>
              <span>{row.label}</span>
              <div>
                <strong>{row.value}</strong>
                <small>{row.sub}</small>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>

    <section className="lp-band-dark">
      <div className="lp-section">
        <div className="lp-trust-grid">
          {trustItems.map((item, index) => (
            <motion.div
              className="lp-trust-card"
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <div className="lp-icon"><item.icon size={20} /></div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section>
      <div className="lp-section">
        <div className="lp-section-head lp-center">
          <div className="lp-kicker">Recognised &amp; Regulated By</div>
          <h2>Trusted by Market Regulators</h2>
          <p>Operating under India's respected financial regulatory framework.</p>
        </div>
        <div className="lp-reg-grid">
          {regulators.map((regulator) => (
            <motion.div
              className="lp-reg-card"
              key={regulator.name}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
            >
              <div className="lp-reg-logo">
                <img
                  src={regulator.logo}
                  alt={regulator.name}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    event.currentTarget.parentElement.textContent = regulator.name;
                  }}
                />
              </div>
              <h3>{regulator.full}</h3>
              <span className="lp-reg-badge">{regulator.badge}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section className="lp-band-dark">
      <div className="lp-section">
        <div className="lp-section-head lp-center">
          <div className="lp-kicker">AMC Partners</div>
          <h2>46+ AMCs. 65+ Investment Offerings.</h2>
          <p>Access Mutual Funds and SIF offerings from leading asset managers, all in one place.</p>
        </div>
        <div className="lp-amc-stats">
          {["49 Mutual Fund AMCs", "17 SIF Offerings", "65+ Total Products"].map((stat) => (
            <span className="lp-amc-stat" key={stat}>{stat}</span>
          ))}
        </div>
        <MarqueeRow items={mutualFunds} direction="left" />
        <MarqueeRow items={sifFunds} direction="right" />
      </div>
    </section>

    <section className="lp-band-dark">
      <div className="lp-section">
        <div className="lp-why">
          <h2>Why we built Dhanvo</h2>
          <p>
            Most people lose money not because markets are bad, but because there is no structure,
            discipline or understanding. Dhanvo was built to bring clarity, long-term thinking,
            and real financial understanding back into investing.
          </p>
        </div>
      </div>
    </section>

    <section>
      <div className="lp-section">
        <div className="lp-section-head">
          <div className="lp-kicker">Investment Ecosystem</div>
          <h2>Everything you need for confident wealth building</h2>
          <p>Invest, protect, analyze, and plan through one clean financial experience.</p>
        </div>
        <div className="lp-feature-grid">
          {featureCards.map((card) => (
            <motion.div
              className="lp-feature-card"
              key={card.title}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
            >
              <div className="lp-icon"><card.icon size={20} /></div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section>
      <div className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-section-head lp-center">
          <div className="lp-kicker">Dhanvo Advantage</div>
          <h2>How Dhanvo is different</h2>
        </div>
        <div className="lp-table-wrap">
          <table className="lp-table">
            <thead>
              <tr>
                <th>Typical Platforms</th>
                <th>Dhanvo</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([left, right]) => (
                <tr key={left}>
                  <td>{left}</td>
                  <td>{right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section className="lp-band-dark">
      <div className="lp-section">
        <div className="lp-strategy">
          <div>
            <span className="lp-eyebrow">
              <Layers3 size={14} /> Advanced Tools
            </span>
            <h2>Dhanvo Strategy Builder</h2>
            <p>
              Build and backtest your F&amp;O strategies with complete precision. Analyze payoff
              charts, Option Greeks, and probability of profit in real-time with institutional-grade tools.
            </p>
            <Link to="/calculator" className="lp-btn lp-btn-primary lp-link">
              Start Building <ArrowRight size={17} />
            </Link>
          </div>
          <div className="lp-preview">
            <img
              src="https://plain-apac-prod-public.komododecks.com/202606/27/2g8gkjbbUPuoTPO7Jwxh/image.png"
              alt="Dhanvo Strategy Builder Preview"
            />
          </div>
        </div>
      </div>
    </section>

    <section>
      <div className="lp-section">
        <div className="lp-strategy" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          <div>
            <span className="lp-eyebrow">
              <Award size={14} /> Start Today
            </span>
            <h2>Start investing with clarity</h2>
            <p>
              Get a structured investment experience with curated opportunities, transparent tools,
              and a team built around long-term wealth creation.
            </p>
          </div>
          <div className="lp-actions" style={{ justifyContent: "flex-start" }}>
            <Link to="/contact" className="lp-btn lp-btn-primary lp-link">
              Contact Dhanvo <ArrowRight size={17} />
            </Link>
            <Link to="/open-free-demat" className="lp-btn lp-btn-outline lp-link">
              Open Free Demat
            </Link>
          </div>
        </div>
      </div>
    </section>
  </main>
);

export default LandingPage;