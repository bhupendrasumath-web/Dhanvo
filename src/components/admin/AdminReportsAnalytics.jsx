import { ArrowUpRight, BarChart3, Printer, TrendingUp } from 'lucide-react';

const formatMetric = (value) => (
  value == null ? '—' : typeof value === 'number' ? value.toLocaleString('en-IN') : value
);

const AdminReportsAnalytics = ({ metrics = {}, onNavigate }) => (
  <section className="reports-shell" aria-label="Reports and analytics">
    <div className="phead">
      <div>
        <div className="kicker">Overview</div>
        <h1>Reports &amp; Analytics</h1>
        <p>All-time registered account and recorded PAN check counts.</p>
      </div>
      <div className="acts">
        <button type="button" className="btn ghost" onClick={() => window.print()}>
          <Printer size={15} />
          Print
        </button>
      </div>
    </div>

    <div className="report-kpi-grid">
      <div className="report-kpi-card">
        <div className="report-kpi-head">
          <span className="report-kpi-icon"><TrendingUp size={15} /></span>
          <span>Registered users</span>
        </div>
        <div className="report-kpi-value">{formatMetric(metrics?.registeredUsers)}</div>
        <div className="report-kpi-sub">All registered user accounts</div>
      </div>
      <div className="report-kpi-card">
        <div className="report-kpi-head">
          <span className="report-kpi-icon"><BarChart3 size={15} /></span>
          <span>UCC registered</span>
        </div>
        <div className="report-kpi-value">{formatMetric(metrics?.registeredUcc)}</div>
        <div className="report-kpi-sub">User accounts with registered UCC</div>
      </div>
      <div className="report-kpi-card">
        <div className="report-kpi-head">
          <span className="report-kpi-icon"><ArrowUpRight size={15} /></span>
          <span>Verified users</span>
        </div>
        <div className="report-kpi-value">{formatMetric(metrics?.verifiedUsers)}</div>
        <div className="report-kpi-sub">User accounts with verified status</div>
      </div>
      <div className="report-kpi-card">
        <div className="report-kpi-head">
          <span className="report-kpi-icon"><BarChart3 size={15} /></span>
          <span>PAN checks</span>
        </div>
        <div className="report-kpi-value">{formatMetric(metrics?.panChecks)}</div>
        <div className="report-kpi-sub">Recorded PAN KYC check rows</div>
      </div>
    </div>

    <div className="report-panel-grid report-panel-grid-wide">
      <div className="card report-card">
        <div className="card-h">
          <h3>Partner performance</h3>
        </div>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Partner</th>
                <th>Status</th>
                <th>Clients</th>
                <th>AUM</th>
                <th>Monthly SIP</th>
                <th>Est. share</th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
      </div>

      <div className="card report-card">
        <div className="card-h">
          <h3>Mutual fund flows · monthly</h3>
          <button type="button" className="small-link" onClick={() => onNavigate?.('mfhub')}>MF overview</button>
        </div>
        <div className="report-bars-wrap" />
      </div>
    </div>

    <div className="report-panel-grid">
      <div className="card report-card">
        <div className="card-h">
          <h3>Lead funnel</h3>
        </div>
        <div className="report-bars-wrap compact" />
      </div>

      <div className="card report-card">
        <div className="card-h">
          <h3>Leads by source</h3>
        </div>
        <div className="report-bars-wrap compact" />
      </div>
    </div>

    <div className="report-panel-grid">
      <div className="card report-card">
        <div className="card-h">
          <h3>RM performance</h3>
        </div>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>RM</th>
                <th>Clients</th>
                <th>AUM</th>
                <th>Leads</th>
                <th>Converted</th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
      </div>

      <div className="card report-card">
        <div className="card-h">
          <h3>City-wise clients</h3>
        </div>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>City</th>
                <th>Clients</th>
                <th>AUM</th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
      </div>
    </div>
  </section>
);

export default AdminReportsAnalytics;
