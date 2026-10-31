import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { getAdminMfOverview } from '../../services/adminApi';

const statusAliases = new Map([
  ['active', 'Active'],
  ['active sip', 'Active'],
  ['sip active', 'Active'],
  ['pending mandate', 'Pending Mandate'],
  ['mandate pending', 'Pending Mandate'],
  ['pending for mandate', 'Pending Mandate'],
  ['paused', 'Paused'],
  ['sip paused', 'Paused'],
  ['failed', 'Failed'],
  ['failure', 'Failed'],
  ['rejected', 'Failed'],
  ['cancelled', 'Cancelled'],
  ['canceled', 'Cancelled'],
  ['completed', 'Completed'],
  ['complete', 'Completed'],
]);

const displayStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return statusAliases.get(normalized) || 'Other / not reported';
};

const money = (value) => (
  Number.isFinite(value)
    ? new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
    : 'Not reported'
);

const dateLabel = (value) => {
  if (!value) return 'Not reported';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return 'Not reported';
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const maskedRegistrationId = (value) => {
  const id = String(value || '').trim();
  if (!id) return 'Not reported';
  if (id.length <= 4) return `••••${id}`;
  return `${'•'.repeat(Math.min(id.length - 4, 8))}${id.slice(-4)}`;
};

const csvCell = (value) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const downloadCsv = (rows, coverage, refreshedAt) => {
  const table = [
    ['SIP Book · live NSE report rows', '', '', '', '', '', '', '', ''],
    ['Scope', `${rows.length} returned rows`, 'Report coverage', `${coverage.succeeded} of ${coverage.requested} SIP reports returned`, 'Refreshed', refreshedAt || 'Not reported', '', '', ''],
    ['Registration ID (masked)', 'Client', 'Scheme', 'Scheme code', 'Installment amount', 'Frequency', 'Expected next installment', 'Installment count (as reported)', 'Report status'],
    ...rows.map((row) => [
      maskedRegistrationId(row.registrationId),
      row.clientName || 'Not reported',
      row.schemeName || 'Not reported',
      row.schemeCode || 'Not reported',
      Number.isFinite(row.amount) ? row.amount : 'Not reported',
      row.frequency || 'Not reported',
      row.nextInstallmentDate || 'Not reported',
      row.installmentCount || 'Not reported',
      displayStatus(row.status),
    ]),
  ];
  const csv = table.map((line) => line.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dhanvo-sip-book.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const AdminSipBook = ({ token, onUnauthorized }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const loadOverview = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getAdminMfOverview(token, refresh);
      if (!response.success) throw new Error(response.message || 'Unable to load SIP reports.');
      setData(response.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
      } else {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load SIP reports.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const coverage = data?.coverage;
  const sipCoverage = coverage?.reports?.sip || {};
  const coveragePartial = Boolean(
    coverage?.limited
    || Number(sipCoverage.failed) > 0
    || Number(sipCoverage.succeeded) !== Number(sipCoverage.requested),
  );
  const plans = useMemo(
    () => (data?.plans || []).filter((row) => row.type === 'sip'),
    [data],
  );
  const statusCounts = useMemo(() => {
    const counts = new Map();
    plans.forEach((row) => {
      const label = displayStatus(row.status);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()];
  }, [plans]);
  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((row) => {
      const status = displayStatus(row.status);
      if (selectedStatus !== 'All' && status !== selectedStatus) return false;
      if (!query) return true;
      return [
        row.registrationId,
        row.clientName,
        row.schemeName,
        row.schemeCode,
        row.frequency,
        row.status,
        row.installmentCount,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [plans, search, selectedStatus]);

  const noReportsSucceeded = Number(sipCoverage.requested) > 0 && Number(sipCoverage.succeeded) === 0;
  const reportUnavailable = !Number(sipCoverage.succeeded) && !coverage?.attemptedUsers;

  if (loading && !data) {
    return (
      <section className="sip-book" aria-busy="true" aria-label="Loading SIP Book">
        <div className="sip-book-loading"><span className="mf-overview-spinner" />Loading protected NSE SIP reports…</div>
        <div className="sip-book-skeleton" />
        <div className="sip-book-skeleton sip-book-skeleton-table" />
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="sip-book sip-book-empty">
        <AlertTriangle aria-hidden="true" />
        <h2>SIP reports are unavailable</h2>
        <p>{error}</p>
        <button type="button" className="mf-overview-button" onClick={() => loadOverview(true)}>
          <RefreshCw size={15} aria-hidden="true" /> Retry report load
        </button>
      </section>
    );
  }

  return (
    <section className="sip-book" aria-label="SIP registry">
    

      {coveragePartial && (
        <p className="sip-book-caveat">
          Rows include only successful SIP reports. Failed reports and accounts outside the existing refresh cap are excluded.
          Expected installments are not confirmed bank debits.
        </p>
      )}

      {error && (
        <div className="mf-overview-inline-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Refresh failed. Showing the last successful response. {error}</span>
        </div>
      )}

      <div className="sip-book-toolbar">
        <div className="sip-book-count">
          <span className="sip-book-eyebrow">NSE registration report</span>
          <strong>{noReportsSucceeded || reportUnavailable ? '—' : plans.length}</strong>
          <span>{noReportsSucceeded || reportUnavailable ? 'rows unavailable' : `SIP ${plans.length === 1 ? 'plan' : 'plans'} returned`}</span>
        </div>
        <div className="sip-book-actions">
          <button
            type="button"
            className="mf-overview-button"
            onClick={() => loadOverview(true)}
            disabled={refreshing}
            aria-label="Refresh SIP reports"
          >
            <RefreshCw size={15} aria-hidden="true" className={refreshing ? 'mf-spin' : ''} />
            {refreshing ? 'Checking reports…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="mf-overview-button sip-book-export"
            onClick={() => downloadCsv(plans, sipCoverage, data?.lastUpdated)}
            disabled={!plans.length}
          >
            <Download size={15} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      <section className="sip-book-status" aria-label="SIP plan statuses">
        <div className="sip-book-status-heading">
          <div><span className="sip-book-eyebrow">As returned by NSE</span><h2>Status summary</h2></div>
          <span>{coveragePartial ? 'Partial coverage' : 'Counts reflect loaded report rows'}</span>
        </div>
        {statusCounts.length ? (
          <div className="sip-book-status-list">
            {statusCounts.map(([status, count]) => (
              <button
                type="button"
                key={status}
                className={`sip-book-status-item${selectedStatus === status ? ' is-selected' : ''}`}
                onClick={() => setSelectedStatus((current) => current === status ? 'All' : status)}
                aria-pressed={selectedStatus === status}
              >
                <span>{status}</span><strong>{count}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="sip-book-no-status">
            {noReportsSucceeded || reportUnavailable
              ? 'Status counts are unavailable because no SIP reports returned.'
              : 'No SIP report rows were returned for the covered accounts.'}
          </p>
        )}
      </section>

      <section className="sip-book-registry" aria-labelledby="sip-book-registry-title">
        <div className="sip-book-registry-heading">
          <div><span className="sip-book-eyebrow">Read-only registry</span><h2 id="sip-book-registry-title">SIP plans</h2></div>
          <div className="sip-book-controls">
            <div className="sip-book-filter" role="group" aria-label="Filter SIP status">
              <button type="button" className={selectedStatus === 'All' ? 'is-selected' : ''} onClick={() => setSelectedStatus('All')} aria-pressed={selectedStatus === 'All'}>All</button>
              {statusCounts.map(([status]) => (
                <button type="button" key={status} className={selectedStatus === status ? 'is-selected' : ''} onClick={() => setSelectedStatus(status)} aria-pressed={selectedStatus === status}>{status}</button>
              ))}
            </div>
            <label className="sip-book-search">
              <Search size={15} aria-hidden="true" />
              <span className="sr-only">Search SIP plans</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client, scheme or ID" />
            </label>
          </div>
        </div>
        <div className="sip-book-table-wrap">
          <table className="sip-book-table">
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Client</th>
                <th>Scheme</th>
                <th>Installment</th>
                <th>Frequency</th>
                <th>Next expected</th>
                <th>Count reported</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((row, index) => (
                <tr key={`${row.registrationId || row.schemeCode || row.schemeName}-${index}`}>
                  <td><span className="sip-book-id">{maskedRegistrationId(row.registrationId)}</span></td>
                  <td>{row.clientName || 'Not reported'}</td>
                  <td>
                    <span className="sip-book-scheme">{row.schemeName || 'Not reported'}</span>
                    {row.schemeCode && <small className="sip-book-scheme-code">Code {row.schemeCode}</small>}
                  </td>
                  <td className="sip-book-amount">{money(row.amount)}</td>
                  <td>{row.frequency || 'Not reported'}</td>
                  <td>{dateLabel(row.nextInstallmentDate)}</td>
                  <td>{row.installmentCount || 'Not reported'}</td>
                  <td><span className={`sip-book-badge ${displayStatus(row.status) === 'Other / not reported' ? 'is-other' : ''}`}>{displayStatus(row.status)}</span></td>
                </tr>
              ))}
              {!filteredPlans.length && (
                <tr>
                  <td colSpan="8" className="sip-book-table-empty">
                    {search || selectedStatus !== 'All'
                      ? 'No returned SIP plans match these filters.'
                      : noReportsSucceeded || reportUnavailable
                        ? 'SIP report rows are unavailable; this is not a verified zero-plan count.'
                        : coveragePartial
                          ? 'No SIP rows were found in successful reports; overall coverage remains partial.'
                          : 'No SIP report rows were returned for the covered accounts.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="sip-book-footer">
          <span>{filteredPlans.length} of {plans.length} returned rows</span>
          <span>Amounts are per reported installment · no debit controls · registration IDs are masked</span>
        </footer>
      </section>
      <p className="sip-book-disclosure">Mandate details, invested totals, debit outcomes, and step-up values are not reported in this NSE registry.</p>
    </section>
  );
};

export default AdminSipBook;
