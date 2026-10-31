import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getAdminRedemptionsLifetime } from '../../services/adminApi';

const money = (value) => (
  Number.isFinite(value)
    ? new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
    : 'Unavailable'
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

const activityType = (row) => (
  [row.transactionType, row.orderType].filter(Boolean).join(' · ') || 'Not reported'
);

const csvCell = (value) => {
  const text = String(value ?? '');
  const safeText = /^[\s\u0000-\u001F\u007F]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const downloadCsv = (rows, data, reportCoverage, coverageState) => {
  const windowLabel = data?.window
    ? `${data.window.fromDate || 'Not reported'} to ${data.window.toDate || 'Not reported'}`
    : 'Not reported';
  const coverage = data?.coverage || {};
  const accountCoverage = coverage.accounts || {};
  const chunkCoverage = coverage.chunks || {};
  const table = [
    ['Dhanvo · NSE redemption and switch-out activity'],
    ['Report scope', 'Lifetime'],
    ['Covered activity dates', windowLabel],
    ['Activity report coverage', coverageState],
    ['Accounts fully covered', `${accountCoverage.succeeded ?? '—'} of ${accountCoverage.requested ?? '—'}`],
    ['Activity chunks returned', `${reportCoverage.succeeded ?? '—'} of ${reportCoverage.requested ?? '—'}`],
    ['Failed activity chunks', chunkCoverage.failed ?? '—'],
    ['Registered accounts outside 20-account cap', Math.max(0, (coverage.eligibleUsers || 0) - (coverage.attemptedUsers || 0))],
    ['Refreshed', data?.lastUpdated || 'Not reported'],
    ['Client', 'Scheme', 'Reported transaction/order type', 'Reported amount (INR)', 'Report date', 'Report indicator'],
    ...rows.map((row) => [
      row.clientName || 'Not reported',
      row.schemeName || 'Not reported',
      activityType(row),
      Number.isFinite(row.amount) ? row.amount : 'Not reported',
      row.date || 'Not reported',
      'Reported',
    ]),
  ];
  const csv = table.map((line) => line.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dhanvo-redemptions.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const AdminRedemptions = ({ token, onUnauthorized }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const loadOverview = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getAdminRedemptionsLifetime(token, refresh);
      if (!response.success) throw new Error(response.message || 'Unable to load lifetime NSE activity reports.');
      setData(response.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
      } else {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load lifetime NSE activity reports.');
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
  const reportCoverage = coverage?.reports?.activity || {};
  const succeeded = Number(reportCoverage.succeeded) || 0;
  const requested = Number(reportCoverage.requested) || 0;
  const attemptedUsers = Number(coverage?.attemptedUsers) || 0;
  const eligibleUsers = Number(coverage?.eligibleUsers) || 0;
  const accountReports = coverage?.accounts || {};
  const incompleteAccountCount = Number(accountReports.failed) || 0;
  const incompleteChunkCount = Number(coverage?.chunks?.failed) || 0;
  const activities = useMemo(
    () => (data?.activity || []).filter((row) => row.category === 'redemption'),
    [data],
  );
  const reportsUnavailable = !attemptedUsers || !requested || !succeeded;
  const coveragePartial = Boolean(
    coverage?.limited
    || Number(reportCoverage.failed) > 0
    || succeeded !== requested
    || attemptedUsers !== eligibleUsers
    || incompleteAccountCount > 0,
  );
  const coverageState = reportsUnavailable
    ? 'Unavailable'
    : coveragePartial
      ? `Partial · ${succeeded} of ${requested} activity chunks returned`
      : `Verified · ${succeeded} of ${requested} activity chunks returned`;
  const activityTypes = useMemo(
    () => [...new Set(activities.map(activityType).filter((type) => type !== 'Not reported'))].sort(),
    [activities],
  );
  const filteredActivities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activities.filter((row) => {
      if (selectedType !== 'All' && activityType(row) !== selectedType) return false;
      if (!query) return true;
      return [
        row.clientName,
        row.schemeName,
        row.transactionType,
        row.orderType,
        Number.isFinite(row.amount) ? row.amount : '',
        row.date,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [activities, search, selectedType]);

  const knownAmounts = activities.filter((row) => Number.isFinite(row.amount));
  const reportedAmountTotal = knownAmounts.reduce((sum, row) => sum + row.amount, 0);
  const amountUnavailable = reportsUnavailable || !knownAmounts.length && activities.length > 0;
  const amountPartial = coveragePartial || knownAmounts.length < activities.length;
  const totalAmountLabel = amountUnavailable
    ? 'Unavailable'
    : `${money(reportedAmountTotal)}${amountPartial ? ' · partial' : ' · verified'}`;
  const countLabel = reportsUnavailable
    ? 'Unavailable'
    : `${activities.length}${coveragePartial ? ' · partial' : ' reported'}`;
  const refreshedDate = data?.lastUpdated ? new Date(data.lastUpdated) : null;
  const refreshedAt = refreshedDate && !Number.isNaN(refreshedDate.getTime())
    ? refreshedDate.toLocaleString('en-IN')
    : 'unavailable';
  const hasFilters = Boolean(search.trim()) || selectedType !== 'All';

  if (loading && !data) {
    return (
      <section className="admin-redemptions" aria-busy="true" aria-label="Loading redemption activity">
        <div className="admin-redemptions-loading"><span className="mf-overview-spinner" />Loading protected NSE activity reports…</div>
        <div className="admin-redemptions-skeleton" />
        <div className="admin-redemptions-skeleton admin-redemptions-skeleton-table" />
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="admin-redemptions admin-redemptions-empty">
        <AlertTriangle aria-hidden="true" />
        <h2>Redemption reports are unavailable</h2>
        <p>{error}</p>
        <button type="button" className="mf-overview-button" onClick={() => loadOverview()}>
          <RefreshCw size={15} aria-hidden="true" /> Retry report load
        </button>
      </section>
    );
  }

  return (
    <section className="admin-redemptions" aria-label="Reported redemption activity">
      {error && (
        <div className="mf-overview-inline-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Refresh failed. Showing the last successful response. {error}</span>
        </div>
      )}

      <p className="redemptions-caveat">
        Lifetime coverage starts at each account’s NSE UCC registration date (or account creation date) and runs through the report date. NSE requests are split into consecutive chunks of up to 30 days; refresh is capped at 20 accounts.
      </p>
      {coveragePartial && (
        <p className="redemptions-caveat">
          Partial coverage: {incompleteAccountCount} selected accounts were incomplete and {incompleteChunkCount} activity chunks failed; {Math.max(0, eligibleUsers - attemptedUsers)} registered accounts were outside the 20-account cap. Rows and totals include only returned report chunks.
        </p>
      )}
      {coveragePartial && (
        <details className="redemptions-coverage-details">
          <summary>View incomplete account and date coverage</summary>
          {eligibleUsers > attemptedUsers && (
            <p>{eligibleUsers - attemptedUsers} eligible registered account(s) were outside the 20-account cap and were not requested.</p>
          )}
          {(coverage?.incompleteAccounts || []).map((account, index) => (
            <p key={`${account.clientName}-${account.fromDate || 'unknown'}-${index}`}>
              <strong>{account.clientName}</strong>
              {' · '}
              {account.fromDate
                ? `${dateLabel(account.fromDate)} – ${dateLabel(account.toDate)}`
                : 'Account start date unavailable'}
              {account.invalidStartDate ? ' · invalid lifetime start date' : ''}
              {account.failedChunks ? ` · ${account.failedChunks} failed chunk(s)` : ''}
            </p>
          ))}
          {(coverage?.chunks?.incomplete || []).map((chunk, index) => (
            <p key={`${chunk.clientName}-${chunk.fromDate}-${index}`}>
              {chunk.clientName}: {dateLabel(chunk.fromDate)} – {dateLabel(chunk.toDate)} could not be loaded.
            </p>
          ))}
        </details>
      )}
      {reportsUnavailable && (
        <p className="redemptions-caveat is-unavailable">
          No activity reports are available to verify a zero. Check report coverage or refresh before interpreting totals.
        </p>
      )}

      <section className="redemptions-summary" aria-label="Reported redemption summary">
        <div className="redemptions-period">
          <span className="redemptions-eyebrow">Lifetime · NSE activity</span>
          <strong>{data?.window
            ? `${dateLabel(data.window.fromDate)} – ${dateLabel(data.window.toDate)}`
            : 'Unavailable'}</strong>
          <small>{data?.window ? 'Per-account history through this report date' : 'Lifetime report dates unavailable'}</small>
        </div>
        <div className="redemptions-metrics">
          <div>
            <span className="redemptions-eyebrow">Activity rows</span>
            <strong>{countLabel}</strong>
            <small>Redemption and switch-out records returned</small>
          </div>
          <div>
            <span className="redemptions-eyebrow">Reported amount · INR</span>
            <strong>{totalAmountLabel}</strong>
            <small>Sum of amounts present in returned reports</small>
          </div>
        </div>
        <div className="redemptions-summary-note">
          <strong>Report records only</strong>
          <span>{attemptedUsers} of {eligibleUsers} eligible accounts checked · {accountReports.succeeded || 0} fully covered.</span>
          <span>Redemption initiation and bank-credit status are not available here.</span>
        </div>
      </section>

      <section className="redemptions-registry" aria-labelledby="redemptions-registry-title">
        <div className="redemptions-registry-heading">
          <div>
            <span className="redemptions-eyebrow">NSE allotment activity</span>
            <h2 id="redemptions-registry-title">Reported activity</h2>
          </div>
          <div className="redemptions-actions">
            <button
              type="button"
              className="mf-overview-button"
              onClick={() => loadOverview(true)}
              disabled={refreshing}
              aria-label="Refresh redemption reports"
            >
              <RefreshCw size={15} aria-hidden="true" className={refreshing ? 'mf-spin' : ''} />
              {refreshing ? 'Checking reports…' : 'Refresh'}
            </button>
            <button
              type="button"
              className="mf-overview-button redemptions-export"
              onClick={() => downloadCsv(filteredActivities, data, reportCoverage, coverageState)}
              disabled={!activities.length}
            >
              <Download size={15} aria-hidden="true" /> Export CSV
            </button>
          </div>
        </div>

        <div className="redemptions-controls">
          <label className="redemptions-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search reported redemption activity</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search client, scheme or reported value"
            />
          </label>
          <label className="redemptions-type-filter">
            <span>Reported type</span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              <option value="All">All reported types</option>
              {activityTypes.map((type) => <option value={type} key={type}>{type}</option>)}
            </select>
          </label>
        </div>

        <div className="redemptions-table-wrap">
          <table className="redemptions-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Scheme</th>
                <th>Reported transaction / order type</th>
                <th>Reported amount</th>
                <th>Report date</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((row, index) => (
                <tr key={`${row.clientName || 'client'}-${row.date || 'date'}-${row.schemeName || 'scheme'}-${index}`}>
                  <td>{row.clientName || 'Not reported'}</td>
                  <td><span className="redemptions-scheme">{row.schemeName || 'Not reported'}</span></td>
                  <td>{activityType(row)}</td>
                  <td className="redemptions-amount">{money(row.amount)}</td>
                  <td>{dateLabel(row.date)}</td>
                  <td><span className="redemptions-reported">Reported</span></td>
                </tr>
              ))}
              {!filteredActivities.length && (
                <tr>
                  <td colSpan="6" className="redemptions-table-empty">
                    {hasFilters
                      ? 'No reported activity matches these filters.'
                      : reportsUnavailable
                        ? 'Activity rows are unavailable; this is not a verified zero-redemption count.'
                        : coveragePartial
                          ? 'No redemption rows were returned by successful reports; overall coverage remains partial.'
                          : 'No redemption or switch-out rows were reported in the covered activity reports.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="redemptions-footer">
          <span>{filteredActivities.length} of {activities.length} returned rows</span>
          <span>Only redemption/redeem/switch-out activity · no payment controls or bank-credit confirmation</span>
        </footer>
      </section>
    </section>
  );
};

export default AdminRedemptions;
