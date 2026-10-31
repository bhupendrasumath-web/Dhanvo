import { ArrowRight, CircleHelp } from 'lucide-react';

const PortfolioOverview = ({ onViewActivity }) => (
  <section className="dash-portfolio-unavailable" aria-label="Portfolio valuation status">
    <span className="dash-portfolio-unavailable-icon"><CircleHelp size={20} aria-hidden="true" /></span>
    <div>
      <p className="dash-screen-eyebrow">Portfolio valuation</p>
      <h2>Consolidated holdings are not available yet</h2>
      <p>NSE MFSS provides scheme data, plan registrations and allotment activity, but not a complete current holdings valuation. We won’t estimate your invested amount, returns or daily gains from sample data.</p>
      <button type="button" onClick={onViewActivity}>Review NSE allotment activity <ArrowRight size={15} aria-hidden="true" /></button>
    </div>
  </section>
);

export default PortfolioOverview;
