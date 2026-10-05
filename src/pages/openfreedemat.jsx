import React, { useState } from "react";
import {
  ShieldCheck,
  TrendingUp,
  Wallet,
  LineChart,
  FileText,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  Award,
  ChevronDown,
  Phone,
  User as UserIcon,
  Handshake,
} from "lucide-react";

// The link that must open when the user submits the contact form / clicks
// "Open Free Demat Account".
const RUPEEZY_SIGNUP_URL =
  "https://accounts.rupeezy.in/authentication/login?referred_by=dBj0Q&clicked=true";
const RUPEEZY_LOGIN_URL = "https://flow.rupeezy.in/web/";
const DEMAT_BADGE_IMAGE = "/rupeezy.png";
const DHANVO_LOGO_IMAGE = "/dhanvo.png";

export default function DhanvoDematPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [touched, setTouched] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [showRupeezyOptions, setShowRupeezyOptions] = useState(false);

  const mobileValid = /^[6-9]\d{9}$/.test(mobile);
  const nameValid = name.trim().length > 1;
  const formValid = nameValid && mobileValid;

  const scrollToForm = () => {
    document.getElementById("dhanvo-contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOpenDemat = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;
    window.open(RUPEEZY_SIGNUP_URL, "_blank", "noopener,noreferrer");
  };

  const features = [
    { icon: Wallet, title: "Zero AMC for Life", desc: "No hidden charges   lifetime annual maintenance is Ã¢â€šÂ¹0." },
    { icon: TrendingUp, title: "5X Margin, 7 Days Free", desc: "Interest-free margin to increase your buying power." },
    { icon: LineChart, title: "All-in-One Account", desc: "Stocks, F&O, IPO, and Mutual Funds   all in one account." },
    { icon: Smartphone, title: "Advanced Charting", desc: "TradingView-powered charts, option chain, and 12+ chart types." },
    { icon: ShieldCheck, title: "Free Strategy Store", desc: "Ready-made option strategies you can apply in one click." },
    { icon: FileText, title: "Instant IPO Apply", desc: "Apply for IPOs in seconds through UPI." },
  ];

  const pricing = [
    { value: "₹0", label: "Account Opening", note: "Demat + Trading, both free" },
    { value: "₹0", label: "AMC", note: "Lifetime, no renewal" },
    { value: "₹20", label: "Brokerage", note: "Per order, flat on F&O" },
    { value: "10.99%", label: "MTF Interest p.a.", note: "On Margin Trading Facility" },
  ];

  const steps = [
    { title: "Fill in details", desc: "Name, mobile, PAN, and date of birth   just 2 minutes." },
    { title: "Upload documents", desc: "Selfie, signature, and income proof   all digital." },
    { title: "E-sign with Aadhaar OTP", desc: "Verify and get your account activated the same day." },
  ];

  const faqs = [
    {
      q: "What is a Demat account?",
      a: "A Demat account is an electronic account where your shares and securities are held in digital form instead of paper certificates. It makes trading fast, safe, and paperless, and you can view your holdings anytime.",
    },
    {
      q: "Is a Demat account like a bank account?",
      a: "No, a Demat account is opened with a SEBI-registered depository participant and is used only to hold securities such as shares, bonds, ETFs, and mutual funds in digital form. It is not a bank account for keeping money.",
    },
    {
      q: "Is a minimum balance required?",
      a: "No. A Demat account has no minimum balance or minimum shareholding requirement   you can maintain it even with a 0 balance.",
    },
    {
      q: "How long does account opening take?",
      a: "The entire process is online, so you can activate your account the same day without visiting a branch or using physical signatures   just keep your mobile and PAN details ready.",
    },
    {
      q: "Which documents are required?",
      a: "For identity proof, a digital copy of any one document such as PAN Card, Aadhaar Card, Voter ID, Passport, or Driving Licence is enough   the process is fully paperless.",
    },
  ];

  return (
    <div className="dhv-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .dhv-root {
          --ink: #0A1929;
          --ink-2: #10233b;
          --paper: #FBF9F4;
          --gold: #C9974A;
          --gold-soft: #E7C98C;
          --teal: #1D6F64;
          --slate: #45526A;
          --mist: #9FB3C8;
          --line: rgba(10, 25, 41, 0.10);
          font-family: 'Manrope', system-ui, sans-serif;
          background: var(--paper);
          color: var(--ink);
          line-height: 1.5;
          overflow-x: hidden;
        }
        .dhv-root * { box-sizing: border-box; }
        .dhv-serif { font-family: 'Fraunces', Georgia, serif; }
        .dhv-mono { font-family: 'IBM Plex Mono', monospace; }

        .dhv-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(251, 249, 244, 0.88);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        .dhv-nav-inner {
          max-width: 1160px; margin: 0 auto; padding: 16px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .dhv-logo { display: flex; align-items: center; gap: 8px; }
        .dhv-logo-mark {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, var(--ink) 0%, var(--ink-2) 100%);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold-soft); font-family: 'Fraunces', serif; font-weight: 600; font-size: 18px;
        }
        .dhv-logo-text { font-family: 'Fraunces', serif; font-weight: 600; font-size: 21px; letter-spacing: 0.01em; }
        .dhv-nav-links { display: none; gap: 28px; align-items: center; font-size: 14.5px; font-weight: 600; color: var(--slate); }
        @media (min-width: 900px) { .dhv-nav-links { display: flex; } }
        .dhv-nav-links a { color: var(--slate); text-decoration: none; transition: color .15s ease; }
        .dhv-nav-links a:hover { color: var(--ink); }

        .dhv-btn {
          display: inline-flex; align-items: center; gap: 8px;
          font-weight: 700; font-size: 14.5px; letter-spacing: 0.01em;
          padding: 12px 22px; border-radius: 999px; border: none; cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
          font-family: 'Manrope', sans-serif;
        }
        .dhv-btn:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
        .dhv-btn-primary { background: var(--gold); color: var(--ink); box-shadow: 0 8px 20px -8px rgba(201,151,74,0.6); }
        .dhv-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(201,151,74,0.7); }
        .dhv-btn-dark { background: var(--ink); color: var(--paper); }
        .dhv-btn-dark:hover { transform: translateY(-1px); background: var(--ink-2); }
        .dhv-btn-sm { padding: 9px 16px; font-size: 13.5px; }
        .dhv-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .dhv-hero {
          background: radial-gradient(circle at 78% 15%, #17334f 0%, var(--ink) 55%, #081420 100%);
          color: var(--paper);
          position: relative;
          overflow: hidden;
        }
        .dhv-hero-inner {
          max-width: 1160px; margin: 0 auto; padding: 72px 24px 88px;
          display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; position: relative; z-index: 2;
        }
        @media (min-width: 960px) { .dhv-hero-inner { grid-template-columns: 1.15fr 0.85fr; gap: 24px; padding: 96px 24px 100px; } }
        .dhv-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12.5px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase;
          color: var(--gold-soft); border: 1px solid rgba(231,201,140,0.35);
          padding: 7px 14px; border-radius: 999px; margin-bottom: 22px;
        }
        .dhv-hero h1 {
          font-size: clamp(2.1rem, 4.6vw, 3.4rem);
          font-weight: 600; line-height: 1.08; letter-spacing: -0.01em; margin: 0 0 20px;
        }
        .dhv-hero h1 em { font-style: normal; color: var(--gold-soft); }
        .dhv-hero p.dhv-sub { font-size: 17px; color: var(--mist); max-width: 480px; margin: 0 0 30px; }
        .dhv-hero-ctas { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 40px; }
        .dhv-stats { display: grid; grid-template-columns: repeat(3, auto); gap: 28px; max-width: 460px; }
        .dhv-stat-num { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; color: var(--paper); }
        .dhv-stat-label { font-size: 12px; color: var(--mist); margin-top: 2px; }

        /* ===== Premium Partner / Collaboration Visual ===== */
        .dhv-seal-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .dhv-partner-visual {
          position: relative;
          width: min(520px, 92vw);
          height: 410px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dhv-partner-visual::before {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          border: 1px solid rgba(231,201,140,0.22);
          border-radius: 50%;
          box-shadow:
            0 0 70px rgba(201,151,74,0.08),
            inset 0 0 60px rgba(201,151,74,0.035);
        }

        .dhv-partner-visual::after {
          content: "";
          position: absolute;
          width: 290px;
          height: 290px;
          border: 1px dashed rgba(231,201,140,0.24);
          border-radius: 50%;
          animation: dhv-partner-rotate 32s linear infinite;
        }

        @keyframes dhv-partner-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Golden connection line behind both brands */
        .dhv-partner-connection {
          position: absolute;
          z-index: 3;
          width: 300px;
          height: 92px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-top: 1.5px solid rgba(231,201,140,0.55);
          border-bottom: 1.5px solid rgba(231,201,140,0.18);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(201,151,74,0.08) 25%,
            rgba(231,201,140,0.13) 50%,
            rgba(201,151,74,0.08) 75%,
            transparent 100%
          );
          filter: drop-shadow(0 0 10px rgba(201,151,74,0.12));
        }

        .dhv-partner-connection::before,
        .dhv-partner-connection::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--gold-soft);
          box-shadow: 0 0 14px rgba(231,201,140,0.85);
          transform: translateY(-50%);
        }

        .dhv-partner-connection::before { left: 0; }
        .dhv-partner-connection::after { right: 0; }

        /* Brand circles */
        .dhv-brand-circle {
          position: absolute;
          z-index: 4;
          top: 50%;
          width: 154px;
          height: 154px;
          transform: translateY(-50%);
          border-radius: 50%;
          background: #0B1D31;
          border: 1.5px solid var(--gold-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          box-shadow:
            0 25px 45px -24px rgba(0,0,0,0.9),
            0 0 0 8px rgba(201,151,74,0.045),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .dhv-brand-circle::before {
          content: "";
          position: absolute;
          inset: 7px;
          border: 1px solid rgba(231,201,140,0.18);
          border-radius: 50%;
          pointer-events: none;
        }

        .dhv-brand-circle-left { left: 7%; }
        .dhv-brand-circle-right { right: 7%; }

        .dhv-brand-circle img {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .dhv-brand-circle-left img {
          width: 92%;
          height: 92%;
          object-fit: contain;
          border-radius: 50%;
        }

        .dhv-brand-circle-right img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          display: block;
        }

        /* Center handshake = explicit partnership signal */
        .dhv-partner-handshake {
          position: absolute;
          z-index: 8;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 104px;
          height: 104px;
          border-radius: 50%;
          background: linear-gradient(145deg, #17334F 0%, #0A1929 78%);
          border: 1.5px solid var(--gold-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 9px rgba(201,151,74,0.055),
            0 22px 42px -18px rgba(0,0,0,0.9),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .dhv-handshake-icon {
          width: 55px !important;
          height: 55px !important;
          color: var(--gold-soft);
          stroke: var(--gold-soft);
          filter: drop-shadow(0 0 9px rgba(231,201,140,0.28));
        }

        /* Small partnership ribbon */
        .dhv-partner-ribbon {
          position: absolute;
          z-index: 8;
          bottom: 23px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 7px 15px;
          border: 1px solid rgba(231,201,140,0.28);
          border-radius: 999px;
          background: rgba(10,25,41,0.72);
          backdrop-filter: blur(8px);
          color: var(--gold-soft);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 1.8px;
          white-space: nowrap;
          box-shadow: 0 10px 25px -16px rgba(0,0,0,0.9);
        }

        .dhv-partner-ribbon .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--gold-soft);
          box-shadow: 0 0 8px rgba(231,201,140,0.7);
        }

        @media (max-width: 620px) {
          .dhv-partner-visual {
            width: 100%;
            height: 330px;
          }

          .dhv-partner-visual::before {
            width: 285px;
            height: 285px;
          }

          .dhv-partner-visual::after {
            width: 235px;
            height: 235px;
          }

          .dhv-brand-circle {
            width: 112px;
            height: 112px;
            padding: 7px;
          }

          .dhv-brand-circle-left { left: 4%; }
          .dhv-brand-circle-right { right: 4%; }

          .dhv-partner-connection { width: 190px; height: 70px; }

          .dhv-partner-handshake {
            width: 76px;
            height: 76px;
          }

          .dhv-handshake-icon {
            width: 40px !important;
            height: 40px !important;
          }

          .dhv-partner-ribbon {
            bottom: 8px;
            font-size: 7.5px;
            letter-spacing: 1.25px;
            padding: 6px 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dhv-partner-visual::after { animation: none; }
        }

        .dhv-section { max-width: 1160px; margin: 0 auto; padding: 84px 24px; }
        .dhv-section-head { max-width: 620px; margin-bottom: 48px; }
        .dhv-kicker { font-size: 12.5px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
        .dhv-section-head h2 { font-family: 'Fraunces', serif; font-size: clamp(1.7rem, 3vw, 2.3rem); font-weight: 600; margin: 0 0 12px; color: var(--ink); }
        .dhv-section-head p { color: var(--slate); font-size: 15.5px; margin: 0; }

        .dhv-feature-grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
        @media (min-width: 720px) { .dhv-feature-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1000px) { .dhv-feature-grid { grid-template-columns: repeat(3, 1fr); } }
        .dhv-feature-card {
          background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 26px;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .dhv-feature-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -18px rgba(10,25,41,0.25); }
        .dhv-feature-icon {
          width: 42px; height: 42px; border-radius: 11px; background: #EEF3F1;
          display: flex; align-items: center; justify-content: center; color: var(--teal); margin-bottom: 16px;
        }
        .dhv-feature-card h3 { font-size: 16.5px; font-weight: 700; margin: 0 0 6px; }
        .dhv-feature-card p { font-size: 14px; color: var(--slate); margin: 0; }

        .dhv-pricing-strip { background: var(--ink); border-radius: 22px; padding: 40px 28px; }
        .dhv-pricing-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        @media (min-width: 800px) { .dhv-pricing-grid { grid-template-columns: repeat(4, 1fr); } }
        .dhv-price-value { font-family: 'IBM Plex Mono', monospace; font-size: 30px; font-weight: 600; color: var(--gold-soft); }
        .dhv-price-label { font-size: 13.5px; font-weight: 700; color: var(--paper); margin-top: 6px; }
        .dhv-price-note { font-size: 12.5px; color: var(--mist); margin-top: 3px; }

        .dhv-steps { display: grid; grid-template-columns: 1fr; gap: 0; counter-reset: step; }
        @media (min-width: 800px) { .dhv-steps { grid-template-columns: repeat(3, 1fr); gap: 24px; } }
        .dhv-step { position: relative; padding: 28px 24px 24px; border: 1px solid var(--line); border-radius: 16px; background: #fff; margin-bottom: 18px; }
        @media (min-width: 800px) { .dhv-step { margin-bottom: 0; } }
        .dhv-step-num {
          font-family: 'Fraunces', serif; font-size: 15px; font-weight: 600; color: var(--gold);
          border: 1.5px solid var(--gold); width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .dhv-step h3 { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
        .dhv-step p { font-size: 14px; color: var(--slate); margin: 0; }

        .dhv-faq-item { border-bottom: 1px solid var(--line); }
        .dhv-faq-q {
          width: 100%; background: none; border: none; text-align: left; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 20px 4px; font-size: 15.5px; font-weight: 700; color: var(--ink); font-family: 'Manrope', sans-serif;
        }
        .dhv-faq-q:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
        .dhv-faq-chevron { transition: transform .2s ease; flex-shrink: 0; color: var(--teal); }
        .dhv-faq-chevron.open { transform: rotate(180deg); }
        .dhv-faq-a { max-height: 0; overflow: hidden; transition: max-height .25s ease; }
        .dhv-faq-a.open { max-height: 240px; }
        .dhv-faq-a-inner { padding: 0 4px 20px; font-size: 14.5px; color: var(--slate); }

        .dhv-contact { background: linear-gradient(180deg, #10233b 0%, var(--ink) 100%); color: var(--paper); }
        .dhv-contact-grid { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: start; }
        @media (min-width: 900px) { .dhv-contact-grid { grid-template-columns: 1fr 1fr; gap: 56px; } }
        .dhv-trust-list { list-style: none; padding: 0; margin: 24px 0 0; display: flex; flex-direction: column; gap: 12px; }
        .dhv-trust-list li { display: flex; align-items: center; gap: 10px; font-size: 14.5px; color: var(--mist); }
        .dhv-trust-list svg { color: var(--gold-soft); flex-shrink: 0; }

        .dhv-form-card { background: var(--paper); color: var(--ink); border-radius: 20px; padding: 32px; box-shadow: 0 30px 60px -20px rgba(0,0,0,0.45); }
        .dhv-form-card h3 { font-family: 'Fraunces', serif; font-size: 21px; font-weight: 600; margin: 0 0 6px; }
        .dhv-form-card > p { font-size: 13.5px; color: var(--slate); margin: 0 0 24px; }
        .dhv-field { margin-bottom: 16px; }
        .dhv-field label { display: block; font-size: 12.5px; font-weight: 700; color: var(--slate); margin-bottom: 7px; letter-spacing: 0.02em; text-transform: uppercase; }
        .dhv-input-wrap { display: flex; align-items: center; border: 1.5px solid #DADFE6; border-radius: 12px; padding: 0 14px; background: #fff; transition: border-color .15s ease; }
        .dhv-input-wrap:focus-within { border-color: var(--teal); }
        .dhv-input-wrap svg { color: var(--slate); flex-shrink: 0; }
        .dhv-input-wrap input {
          border: none; outline: none; padding: 13px 10px; font-size: 15px; width: 100%;
          font-family: 'Manrope', sans-serif; background: transparent; color: var(--ink);
        }
        .dhv-prefix { font-size: 15px; color: var(--slate); font-weight: 600; padding-right: 2px; }
        .dhv-error { font-size: 12.5px; color: #B3432B; margin-top: 6px; }
        .dhv-form-card .dhv-btn { width: 100%; justify-content: center; margin-top: 6px; padding: 14px; font-size: 15px; }
        .dhv-form-fine { font-size: 11.5px; color: var(--slate); margin-top: 14px; text-align: center; }

        .dhv-footer { background: #071320; color: var(--mist); padding: 48px 24px 28px; }
        .dhv-footer-inner { max-width: 1160px; margin: 0 auto; }
        .dhv-footer-top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 24px; padding-bottom: 28px; border-bottom: 1px solid rgba(159,179,200,0.15); }
        .dhv-footer-note { font-size: 12px; line-height: 1.7; margin-top: 20px; color: #6E829D; }
      `}</style>


      <section className="dhv-hero">
        <div className="dhv-hero-inner">
          <div>
            <span className="dhv-eyebrow"><ShieldCheck size={14} /> Marketing Partner   Rupeezy</span>
            <h1 className="dhv-serif">
              Want to grow your money?<br />Then start <em>here.</em>
            </h1>
            <p className="dhv-sub">
              Open a free Demat and Trading account through Dhanvo   in just 5 minutes.
              Zero AMC, zero account-opening charges, and one account for Stocks, F&amp;O, IPO, and Mutual Funds.
            </p>
            <div className="dhv-hero-ctas">
              <button className="dhv-btn dhv-btn-primary" onClick={scrollToForm}>
                Open Free Demat Account <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="dhv-btn"
                onClick={() => setShowRupeezyOptions(true)}
                style={{ background: "rgba(251,249,244,0.08)", color: "var(--paper)", border: "1.5px solid rgba(231,201,140,0.45)" }}
              >
                Login Your Rupeezy Demat <ArrowRight size={17} />
              </button>
              <a href="#dhv-features" className="dhv-btn" style={{ background: "transparent", color: "var(--paper)", border: "1.5px solid rgba(251,249,244,0.3)" }}>
                Explore Features
              </a>
            </div>
            <div className="dhv-stats">
              <div>
                <div className="dhv-stat-num dhv-mono">2L+</div>
                <div className="dhv-stat-label">Happy Investors</div>
              </div>
              <div>
                <div className="dhv-stat-num dhv-mono">20 Yrs</div>
                <div className="dhv-stat-label">Market Trust</div>
              </div>
              <div>
                <div className="dhv-stat-num dhv-mono">4.3✰</div>
                <div className="dhv-stat-label">App Rating</div>
              </div>
            </div>
          </div>

          <div className="dhv-seal-wrap">
            <div className="dhv-partner-visual" aria-label="Rupeezy and Dhanvo partnership">
              <div className="dhv-partner-connection" aria-hidden="true" />

              <div className="dhv-brand-circle dhv-brand-circle-left">
                <img src={DEMAT_BADGE_IMAGE} alt="Rupeezy logo" />
              </div>

              <div className="dhv-partner-handshake" aria-hidden="true">
                <Handshake
                  className="dhv-handshake-icon"
                  size={58}
                  strokeWidth={2.1}
                  aria-hidden="true"
                />
              </div>

              <div className="dhv-brand-circle dhv-brand-circle-right">
                <img src={DHANVO_LOGO_IMAGE} alt="Dhanvo logo" />
              </div>

              <div className="dhv-partner-ribbon">
                <span>RUPEEZY</span>
                <span className="dot" />
                <span>MARKETING PARTNER</span>
                <span className="dot" />
                <span>DHANVO</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dhv-section" id="dhv-features">
        <div className="dhv-section-head">
          <div className="dhv-kicker">Why Dhanvo</div>
          <h2>Everything you need for wealth building, in one place</h2>
          <p>With our partner broker, you get an institutional-grade trading experience without complexity.</p>
        </div>
        <div className="dhv-feature-grid">
          {features.map((f, i) => (
            <div className="dhv-feature-card" key={i}>
              <div className="dhv-feature-icon"><f.icon size={20} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dhv-section" id="dhv-pricing" style={{ paddingTop: 0 }}>
        <div className="dhv-pricing-strip">
          <div className="dhv-section-head" style={{ marginBottom: 32 }}>
            <div className="dhv-kicker" style={{ color: "var(--gold-soft)" }}>Transparent Pricing</div>
            <h2 style={{ color: "var(--paper)" }}>No hidden charges</h2>
          </div>
          <div className="dhv-pricing-grid">
            {pricing.map((p, i) => (
              <div key={i}>
                <div className="dhv-price-value">{p.value}</div>
                <div className="dhv-price-label">{p.label}</div>
                <div className="dhv-price-note">{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dhv-section" id="dhv-steps">
        <div className="dhv-section-head">
          <div className="dhv-kicker">Getting Started</div>
          <h2>Open a Demat account in just 3 steps</h2>
          <p>The entire process is online   no branch visit and no paperwork.</p>
        </div>
        <div className="dhv-steps">
          {steps.map((s, i) => (
            <div className="dhv-step" key={i}>
              <div className="dhv-step-num dhv-mono">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dhv-section" id="dhv-faq" style={{ maxWidth: 820 }}>
        <div className="dhv-section-head">
          <div className="dhv-kicker">FAQs</div>
          <h2>Answers to your questions</h2>
        </div>
        <div>
          {faqs.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div className="dhv-faq-item" key={i}>
                <button
                  className="dhv-faq-q"
                  onClick={() => setOpenFaq(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  {item.q}
                  <ChevronDown size={19} className={`dhv-faq-chevron ${isOpen ? "open" : ""}`} />
                </button>
                <div className={`dhv-faq-a ${isOpen ? "open" : ""}`}>
                  <div className="dhv-faq-a-inner">{item.a}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dhv-contact" id="dhanvo-contact">
        <div className="dhv-section dhv-contact-grid">
          <div>
            <span className="dhv-eyebrow"><Award size={14} /> Start Today</span>
            <h2 className="dhv-serif" style={{ color: "var(--paper)", fontSize: "clamp(1.7rem, 3vw, 2.3rem)", fontWeight: 600, margin: "0 0 14px" }}>
              Start your wealth journey today
            </h2>
            <p style={{ color: "var(--mist)", fontSize: 15.5, maxWidth: 420, margin: 0 }}>
              Fill in your name and mobile number   we will take you directly to our partner Rupeezy's secure account-opening page.
            </p>
            <ul className="dhv-trust-list">
              <li><CheckCircle2 size={17} /> SEBI Registered Broker Partner</li>
              <li><Users size={17} /> Trusted by 2 lakh+ investors</li>
              <li><Star size={17} /> 4.3Ã¢Ëœâ€¦ rated trading app</li>
              <li><ShieldCheck size={17} /> 100% paperless, Aadhaar e-Sign</li>
            </ul>
          </div>

          <div className="dhv-form-card">
            <h3>Open Your Free Demat Account</h3>
            <p>Fill in the fields and click "Open Free Demat Account".</p>

            <form onSubmit={handleOpenDemat} noValidate>
              <div className="dhv-field">
                <label htmlFor="dhv-name">Full Name</label>
                <div className="dhv-input-wrap">
                  <UserIcon size={17} />
                  <input
                    id="dhv-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                {touched && !nameValid && <div className="dhv-error">Please enter your name.</div>}
              </div>

              <div className="dhv-field">
                <label htmlFor="dhv-mobile">Mobile Number</label>
                <div className="dhv-input-wrap">
                  <Phone size={17} />
                  <span className="dhv-prefix">+91</span>
                  <input
                    id="dhv-mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    autoComplete="tel"
                  />
                </div>
                {touched && !mobileValid && <div className="dhv-error">Please enter a valid 10-digit mobile number.</div>}
              </div>

              <button type="submit" className="dhv-btn dhv-btn-primary">
                Open Free Demat Account <ArrowRight size={17} />
              </button>
            </form>
            <div className="dhv-form-fine">
              By continuing, you will be taken to our partner Rupeezy's secure signup page.
            </div>
          </div>
        </div>
      </section>

      {showRupeezyOptions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose Rupeezy login option"
          onClick={() => setShowRupeezyOptions(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(7,19,32,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(7px)"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(460px, 100%)",
              background: "var(--paper)",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
              border: "1px solid rgba(10,25,41,0.10)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--teal)",
                    marginBottom: "7px"
                  }}
                >
                  Rupeezy Demat
                </div>
                <h3
                  className="dhv-serif"
                  style={{
                    margin: 0,
                    color: "var(--ink)",
                    fontSize: "24px",
                    fontWeight: 600
                  }}
                >
                  How would you like to open it?
                </h3>
                <p
                  style={{
                    margin: "8px 0 22px",
                    color: "var(--slate)",
                    fontSize: "13.5px",
                    lineHeight: 1.55
                  }}
                >
                  Choose whether you want Rupeezy to open inside this Dhanvo page or in a separate browser tab.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowRupeezyOptions(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--slate)",
                  fontSize: "27px",
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: "0 4px"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <button
                type="button"
                className="dhv-btn dhv-btn-primary"
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  padding: "15px 18px"
                }}
                onClick={() => {
                  setShowRupeezyOptions(false);
                  window.open(RUPEEZY_LOGIN_URL, "_self");
                }}
              >
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span>Open in This Tab</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, opacity: 0.72 }}>
                    Continue in the current browser tab
                  </span>
                </span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="dhv-btn"
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  padding: "15px 18px",
                  background: "rgba(10,25,41,0.06)",
                  color: "var(--ink)",
                  border: "1.5px solid rgba(10,25,41,0.14)"
                }}
                onClick={() => {
                  setShowRupeezyOptions(false);
                  window.open(RUPEEZY_LOGIN_URL, "_blank", "noopener,noreferrer");
                }}
              >
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span>Open in New Tab</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--slate)" }}>
                    Keep Dhanvo open in the current tab
                  </span>
                </span>
                <ArrowRight size={18} />
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                textAlign: "center",
                fontSize: "11px",
                color: "var(--slate)"
              }}
            >
              Rupeezy login: flow.rupeezy.in/web/
            </div>
          </div>
        </div>
      )}

      <footer className="dhv-footer">
        <div className="dhv-footer-inner">
          <div className="dhv-footer-top">
            <div style={{ fontSize: 13.5, color: "var(--mist)" }}>
              Empowering Your Wealth With Trust, Technology &amp; Transparency
            </div>
          </div>
          <p className="dhv-footer-note">
            Dhanvo is a marketing partner and helps investors open a Demat &amp; Trading account with its
            SEBI-registered broker partner, Rupeezy (Astha Credit &amp; Securities Pvt Ltd). Investment in
            securities markets is subject to market risks; please read all related documents carefully before
            investing. Dhanvo does not itself hold a broking or depository participant licence   account opening,
            KYC and all trading/demat services are provided solely by the broker partner.
          </p>
        </div>
      </footer>
    </div>
  );
}
