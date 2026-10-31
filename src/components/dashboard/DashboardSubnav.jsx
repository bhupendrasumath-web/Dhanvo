const tabs = [
  { id: 'explore', label: 'Explore' },
  { id: 'overview', label: 'Dashboard' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'sips', label: 'SIPs' },
  { id: 'swp', label: 'SWP' },
  { id: 'stp', label: 'STP' },
  { id: 'activity', label: 'Activity' },
];

const DashboardSubnav = ({ activeTab, onChange }) => {

  return (
    <nav className="dash-subnav" aria-label="Mutual funds navigation">
      <div className="dash-subnav-inner">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`dash-subnav-tab${activeTab === id ? ' active' : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default DashboardSubnav;
