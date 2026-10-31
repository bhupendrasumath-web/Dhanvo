import { ArrowUpRight, BriefcaseBusiness, CircleAlert, WalletCards } from 'lucide-react';

const formatActivityTime = (value) => {
  if (!value) return 'Date unavailable';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Date unavailable';

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const DashboardCard = ({ title, subtitle, children }) => (
  <section className="dashboard-insight-card" aria-label={title}>
    <header className="dashboard-insight-header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </header>
    {children}
  </section>
);

const AdminDashboardSections = ({
  recentUsers = [],
  onViewAllUsers,
  onViewStatusTracker,
  failedAccountProcesses,
  attentionLoading = false,
  attentionUnavailable = false,
}) => (
  <div className="dashboard-insights">
    <div className="dashboard-chart-grid">
      <DashboardCard title="AUM trend · last 12 months" subtitle="Indicative, from client AUM" />
      <DashboardCard title="Business mix" subtitle="Annualised" />
    </div>

    <div className="dashboard-lower-grid">
      <DashboardCard title="Needs your attention" subtitle="Operational follow-ups">
        <div className="dashboard-attention-list">
          <div className="dashboard-attention-row dashboard-attention-row-unavailable">
            <span className="dashboard-attention-icon dashboard-attention-icon-muted" aria-hidden="true">
              <BriefcaseBusiness />
            </span>
            <span className="dashboard-attention-copy">
              <strong>Partner applications</strong>
              <small>Application tracking is not connected.</small>
            </span>
            <span className="dashboard-attention-badge">Not connected</span>
          </div>

          <div className="dashboard-attention-row dashboard-attention-row-actionable">
            <span className="dashboard-attention-icon dashboard-attention-icon-warning" aria-hidden="true">
              <CircleAlert />
            </span>
            <span className="dashboard-attention-copy">
              <strong>Failed account processes</strong>
              <small>
                {attentionLoading
                  ? 'Checking onboarding statuses…'
                  : attentionUnavailable || !Number.isFinite(failedAccountProcesses)
                    ? 'Account status count is unavailable.'
                    : failedAccountProcesses === 0
                      ? 'No failed or rejected account statuses.'
                      : 'Users with a failed or rejected onboarding status.'}
              </small>
            </span>
            <span className="dashboard-attention-action">
              <span className="dashboard-attention-count" aria-live="polite">
                {attentionLoading || attentionUnavailable || !Number.isFinite(failedAccountProcesses)
                  ? '—'
                  : failedAccountProcesses}
              </span>
              <button
                type="button"
                className="dashboard-attention-link"
                onClick={onViewStatusTracker}
                aria-label="Open account Status Tracker"
              >
                <span>View tracker</span>
                <ArrowUpRight aria-hidden="true" />
              </button>
            </span>
          </div>

          <div className="dashboard-attention-row dashboard-attention-row-unavailable">
            <span className="dashboard-attention-icon dashboard-attention-icon-muted" aria-hidden="true">
              <WalletCards />
            </span>
            <span className="dashboard-attention-copy">
              <strong>SIPs &amp; mandates</strong>
              <small>Tracking and follow-up actions are not connected.</small>
            </span>
            <span className="dashboard-attention-badge">Not connected</span>
          </div>
        </div>
      </DashboardCard>
      <DashboardCard title="Top partners by AUM" />
      <DashboardCard title="Recent activity" subtitle="Latest account registrations">
        <div className="dashboard-recent-activity">
          {recentUsers.length ? recentUsers.slice(0, 5).map((user) => (
            <div className="dashboard-recent-activity-item" key={user.id}>
              <span className="dashboard-recent-activity-avatar" aria-hidden="true">
                {(user.name || 'U').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <span className="dashboard-recent-activity-copy">
                <strong>{user.name || 'New user'}</strong>
                <small>{user.email || 'Registered user'} · Created account</small>
              </span>
              <time className="dashboard-recent-activity-time" dateTime={user.createdAt || undefined}>
                {formatActivityTime(user.createdAt)}
              </time>
            </div>
          )) : (
            <p className="dashboard-recent-activity-empty">No registered users yet.</p>
          )}
        </div>
        {recentUsers.length > 0 && (
          <button type="button" className="dashboard-recent-activity-link" onClick={onViewAllUsers}>
            View all user leads
          </button>
        )}
      </DashboardCard>
    </div>
  </div>
);

export default AdminDashboardSections;
