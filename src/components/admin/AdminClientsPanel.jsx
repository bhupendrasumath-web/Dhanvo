import { ArrowUpRight, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';

const fallbackClients = [
  { id: 'CL-1001', name: 'Aditya Sharma', phone: '9826000001', city: 'Mumbai', kyc: 'Verified', risk: 'Conservative', aum: 2200000, partner: 'Direct', rm: 'Aditya Sharma', joined: '2025-01-14' },
  { id: 'CL-1002', name: 'Neha Verma', phone: '9826000002', city: 'Delhi NCR', kyc: 'Pending', risk: 'Moderate', aum: 1420000, partner: 'DHV-P1008', rm: 'Neha Sharma', joined: '2025-03-09' },
  { id: 'CL-1003', name: 'Rohit Jain', phone: '9826000003', city: 'Bengaluru', kyc: 'Verified', risk: 'Aggressive', aum: 3800000, partner: 'DHV-P1021', rm: 'Rohit Jain', joined: '2024-12-23' },
  { id: 'CL-1004', name: 'Pooja Saxena', phone: '9826000004', city: 'Ahmedabad', kyc: 'Rejected', risk: 'Moderate', aum: 980000, partner: 'Direct', rm: 'Pooja Saxena', joined: '2025-06-02' },
  { id: 'CL-1005', name: 'Karan Patel', phone: '9826000005', city: 'Mumbai', kyc: 'Verified', risk: 'Conservative', aum: 4500000, partner: 'DHV-P1117', rm: 'Aditya Sharma', joined: '2024-11-17' },
  { id: 'CL-1006', name: 'Megha Iyer', phone: '9826000006', city: 'Pune', kyc: 'Pending', risk: 'Moderate', aum: 1640000, partner: 'Direct', rm: 'Neha Sharma', joined: '2025-02-09' },
];

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const kycClass = (status) => {
  if (status === 'Verified') return 'client-status client-status-ok';
  if (status === 'Pending') return 'client-status client-status-warn';
  if (status === 'Rejected') return 'client-status client-status-bad';
  return 'client-status client-status-neutral';
};

const AdminClientsPanel = ({ clients = [] }) => {
  const rows = clients.length ? clients : fallbackClients;
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((client) => {
      const matchesFilter = statusFilter === 'all' || client.kyc === statusFilter || (statusFilter === 'verified' && client.kyc === 'Verified') || (statusFilter === 'pending' && client.kyc === 'Pending') || (statusFilter === 'rejected' && client.kyc === 'Rejected');
      if (!matchesFilter) return false;
      if (!query) return true;
      const haystack = [client.name, client.email, client.phone, client.city, client.partner, client.rm, client.id].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search, statusFilter]);

  const totalAum = rows.reduce((sum, client) => sum + (Number(client.aum) || 0), 0);
  const verifiedCount = rows.filter((client) => client.kyc === 'Verified').length;
  const pendingCount = rows.filter((client) => client.kyc === 'Pending').length;

  return (
    <section className="clients-shell" aria-label="Clients">
      <div className="phead">
        <div>
          <div className="kicker">Business</div>
          <h1>Clients</h1>
          <p>Search protected account onboarding records and review each investor profile.</p>
        </div>
        <div className="acts">
          <button type="button" className="btn ghost sm">
            <UsersRound size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="clients-metrics-grid">
        <div className="client-metric-card">
          <div className="client-metric-label">Total clients</div>
          <div className="client-metric-value">{rows.length}</div>
          <div className="client-metric-note">Onboarded accounts</div>
        </div>
        <div className="client-metric-card">
          <div className="client-metric-label">KYC verified</div>
          <div className="client-metric-value">{verifiedCount}</div>
          <div className="client-metric-note">Accounts cleared</div>
        </div>
        <div className="client-metric-card">
          <div className="client-metric-label">Pending review</div>
          <div className="client-metric-value">{pendingCount}</div>
          <div className="client-metric-note">Awaiting action</div>
        </div>
        <div className="client-metric-card">
          <div className="client-metric-label">AUM</div>
          <div className="client-metric-value">{formatMoney(totalAum)}</div>
          <div className="client-metric-note">Across client base</div>
        </div>
      </div>

      <div className="card client-table-card">
        <div className="card-h client-table-header">
          <div>
            <h3>Client registry</h3>
            <p>Investor records and onboarding state</p>
          </div>
          <div className="client-toolbar">
            <div className="status-tracker-search client-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, phone, city, RM or partner"
                aria-label="Search clients"
              />
            </div>
          </div>
        </div>

        <div className="client-filter-row">
          <button type="button" className={`status-tracker-chip ${statusFilter === 'all' ? 'status-tracker-chip-active' : ''}`} onClick={() => setStatusFilter('all')}>
            All <span>{rows.length}</span>
          </button>
          <button type="button" className={`status-tracker-chip ${statusFilter === 'verified' ? 'status-tracker-chip-active' : ''}`} onClick={() => setStatusFilter('verified')}>
            Verified <span>{verifiedCount}</span>
          </button>
          <button type="button" className={`status-tracker-chip ${statusFilter === 'pending' ? 'status-tracker-chip-active' : ''}`} onClick={() => setStatusFilter('pending')}>
            Pending <span>{pendingCount}</span>
          </button>
          <button type="button" className={`status-tracker-chip ${statusFilter === 'rejected' ? 'status-tracker-chip-active' : ''}`} onClick={() => setStatusFilter('rejected')}>
            Rejected <span>{rows.filter((client) => client.kyc === 'Rejected').length}</span>
          </button>
        </div>

        <div className="status-tracker-table-wrap">
          <table className="status-tracker-table clients-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Phone</th>
                <th>City</th>
                <th>KYC</th>
                <th>Risk</th>
                <th>AUM</th>
                <th>Partner</th>
                <th>RM</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-name-cell">
                        <span className="client-avatar">{(client.name || 'U').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                        <div>
                          <strong>{client.name}</strong>
                          <small>{client.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{client.phone || '—'}</td>
                    <td>{client.city || '—'}</td>
                    <td><span className={kycClass(client.kyc)}>{client.kyc || 'Pending'}</span></td>
                    <td>{client.risk || 'Moderate'}</td>
                    <td>{formatMoney(client.aum)}</td>
                    <td>{client.partner || 'Direct'}</td>
                    <td>{client.rm || '—'}</td>
                    <td>{formatDate(client.joined)}</td>
                    <td>
                      <button type="button" className="admin-record-action inline-action">
                        <ArrowUpRight size={14} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="status-tracker-empty">No client records match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AdminClientsPanel;
