import { useAuth } from '../../context/AuthContext';

const DashboardHeader = ({ onViewActivity, onExploreFunds }) => {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <section className="dash-page-heading">
      <div className="dash-heading-copy">
        <p className="dash-hero-eyebrow">{greeting}{user?.firstName ? `, ${user.firstName}` : ''}</p>
        <h1>Your investments, <em>clearly organised.</em></h1>
        <p className="dash-heading-subtitle">
          Review your saved NSE schemes, plan registrations and reported allotment activity. Consolidated holdings and returns need a CAS/RTA data source.
        </p>
      </div>
      <div className="dash-heading-actions">
        <button
          type="button"
          className="dash-heading-button secondary"
          onClick={onViewActivity}
        >
          Investment activity
        </button>
        <button
          type="button"
          className="dash-heading-button primary"
          onClick={onExploreFunds}
        >
          Explore funds
        </button>
      </div>
    </section>
  );
};

export default DashboardHeader;
