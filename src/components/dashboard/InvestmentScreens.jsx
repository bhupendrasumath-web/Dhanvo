import { useState } from 'react';
import { ArrowRight, Calculator, Check, CircleHelp, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardScreenHeader from './DashboardScreenHeader';

const UnlistedSharesScreen = () => (
  <section aria-labelledby="unlisted-title">
    <DashboardScreenHeader
      eyebrow="Pre-IPO access"
      title={<>Unlisted Shares <span className="dash-screen-title-tag">PRE-IPO</span></>}
      description="Explore privately held companies before they list on public exchanges."
    />
    <div className="dash-market-unavailable">
      <span className="dash-market-unavailable-icon"><CircleHelp size={21} aria-hidden="true" /></span>
      <div>
        <p className="dash-screen-eyebrow">Market availability</p>
        <h2 id="unlisted-title">No live listings to show</h2>
        <p>
          Unlisted-share availability and pricing have not been connected to this account yet.
          We won’t display indicative prices or company listings as if they were live market data.
        </p>
        <span className="dash-market-status"><span /> Live market data unavailable</span>
      </div>
    </div>
    <p className="dash-market-disclaimer">
      Unlisted securities can be illiquid and carry significant risk. Verify availability, price,
      transfer conditions and disclosures independently before making an investment decision.
    </p>
  </section>
);

const DematTradingScreen = () => {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="demat-screen-title">
      <DashboardScreenHeader
        eyebrow="Account services"
        title="Demat/Trading Account"
        description="Open or learn about your Demat and Trading account through Dhanvo’s existing account-opening flow."
      />
      <div className="dash-demat-intro">
        <div className="dash-demat-copy">
          <span className="dash-demat-kicker"><ShieldCheck size={14} /> Account opening</span>
          <h2 id="demat-screen-title">One account for your investing journey.</h2>
          <p>
            Continue to the established account page for details, eligibility, FAQs and the
            secure account-opening form. Your application will continue through the existing
            broker-partner flow.
          </p>
          <button type="button" className="dash-screen-action is-enabled" onClick={() => navigate('/openfreedemat')}>
            Open Free Demat Account <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="dash-demat-assurances" aria-label="Account flow details">
          <div><span><WalletCards size={17} /></span><strong>Existing account flow</strong><small>Securely continue on the account page</small></div>
          <div><span><Check size={17} /></span><strong>Clear next steps</strong><small>Review the process before you apply</small></div>
          <div><span><TrendingUp size={17} /></span><strong>Broker-provided service</strong><small>Account services are handled by the broker partner</small></div>
        </div>
      </div>
    </section>
  );
};

const formatCurrency = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

const SipCalculator = () => {
  const [monthlyAmount, setMonthlyAmount] = useState(5000);
  const [years, setYears] = useState(10);
  const [annualReturn, setAnnualReturn] = useState(12);
  const months = years * 12;
  const monthlyRate = annualReturn / 100 / 12;
  const invested = monthlyAmount * months;
  const estimatedTotal = monthlyRate === 0
    ? invested
    : monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);

  return (
    <section className="dash-calculator-panel" aria-label="SIP calculator">
      <div className="dash-calculator-controls">
        <label className="dash-range-field">
          <span>Monthly investment <strong>{formatCurrency(monthlyAmount)}</strong></span>
          <input type="range" min="500" max="100000" step="500" value={monthlyAmount} onChange={(event) => setMonthlyAmount(Number(event.target.value))} />
          <span className="dash-range-bounds"><span>₹500</span><span>₹1,00,000</span></span>
        </label>
        <label className="dash-range-field">
          <span>Investment period <strong>{years} years</strong></span>
          <input type="range" min="1" max="30" value={years} onChange={(event) => setYears(Number(event.target.value))} />
          <span className="dash-range-bounds"><span>1 year</span><span>30 years</span></span>
        </label>
        <label className="dash-range-field">
          <span>Assumed annual return <strong>{annualReturn}%</strong></span>
          <input type="range" min="0" max="20" value={annualReturn} onChange={(event) => setAnnualReturn(Number(event.target.value))} />
          <span className="dash-range-bounds"><span>0%</span><span>20%</span></span>
        </label>
      </div>
      <div className="dash-calculator-results" aria-live="polite">
        <div><span>Invested amount</span><strong>{formatCurrency(invested)}</strong></div>
        <div><span>Estimated returns</span><strong>{formatCurrency(estimatedTotal - invested)}</strong></div>
        <div className="is-total"><span>Estimated value</span><strong>{formatCurrency(estimatedTotal)}</strong></div>
      </div>
      <p className="dash-calculator-note">
        Illustrative estimate only. Returns are not guaranteed; actual results depend on market performance and investment timing.
      </p>
    </section>
  );
};

const MoreDashboardScreen = ({ page }) => {
  if (page === 'calculators') {
    return (
      <section>
        <DashboardScreenHeader
          eyebrow="Plan ahead"
          title="Calculators"
          description="Explore how regular investing and time can shape a long-term investment estimate."
        />
        <div className="dash-calculator-title"><span><Calculator size={17} /></span><div><h2>SIP calculator</h2><p>Adjust the assumptions to see an illustrative estimate.</p></div></div>
        <SipCalculator />
      </section>
    );
  }

  if (page === 'planning') {
    return (
      <section>
        <DashboardScreenHeader
          eyebrow="Advisory"
          title="Financial Planning"
          description="A considered roadmap can help connect your savings with the goals that matter to you."
        />
        <div className="dash-more-content-grid">
          <article className="dash-more-content-card">
            <span className="dash-more-content-icon"><TrendingUp size={20} /></span>
            <p className="dash-screen-eyebrow">Personal roadmap</p>
            <h2>Plan around your priorities</h2>
            <p>Bring your goals, time horizon and current commitments together before choosing your next step.</p>
            <span className="dash-coming-soon"><span /> Planning flow not connected</span>
          </article>
          <article className="dash-more-content-card">
            <span className="dash-more-content-icon"><WalletCards size={20} /></span>
            <p className="dash-screen-eyebrow">Family goals</p>
            <h2>Keep long-term goals in view</h2>
            <p>Consider education, retirement and other future needs as part of one household plan.</p>
            <span className="dash-coming-soon"><span /> Goal tracking not connected</span>
          </article>
        </div>
      </section>
    );
  }

  if (page === 'strategy') {
    return (
      <section>
        <DashboardScreenHeader
          eyebrow="Custom portfolios"
          title="Strategy Builder"
          description="Shape a portfolio approach around your preferred asset mix and review cadence."
        />
        <div className="dash-more-content-grid">
          <article className="dash-more-content-card">
            <span className="dash-more-content-icon"><Calculator size={20} /></span>
            <p className="dash-screen-eyebrow">Build an approach</p>
            <h2>Create a strategy</h2>
            <p>Strategy creation and backtesting are not available in this dashboard yet.</p>
            <span className="dash-coming-soon"><span /> Strategy tools not connected</span>
          </article>
          <article className="dash-more-content-card">
            <span className="dash-more-content-icon"><CircleHelp size={20} /></span>
            <p className="dash-screen-eyebrow">Saved strategies</p>
            <h2>No saved strategies</h2>
            <p>Your saved approaches will appear here when strategy tools are available.</p>
            <span className="dash-coming-soon"><span /> Nothing to display</span>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section>
      <DashboardScreenHeader
        eyebrow="Protection"
        title="Insurance"
        description="Understand the role different types of cover can play in protecting your financial wellbeing."
      />
      <div className="dash-more-content-grid is-three">
        {[
          { icon: ShieldCheck, title: 'Term life cover', body: 'Life cover can help provide financial support to dependants if the policyholder passes away.' },
          { icon: WalletCards, title: 'Health cover', body: 'Health insurance can help manage eligible medical expenses, subject to policy terms.' },
          { icon: TrendingUp, title: 'Motor cover', body: 'Motor insurance can cover eligible vehicle-related risks as set out in the policy.' },
        ].map(({ icon: Icon, title, body }) => (
          <article className="dash-more-content-card" key={title}>
            <span className="dash-more-content-icon"><Icon size={20} /></span>
            <h2>{title}</h2>
            <p>{body}</p>
            <span className="dash-coming-soon"><span /> Plan comparison not connected</span>
          </article>
        ))}
      </div>
    </section>
  );
};

export { DematTradingScreen, MoreDashboardScreen, UnlistedSharesScreen };
