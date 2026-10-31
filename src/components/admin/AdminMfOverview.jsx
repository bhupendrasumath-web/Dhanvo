import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { getAdminMfOverview } from '../../services/adminApi';

const productTypes = [
  { id: 'sip', label: 'SIP', caption: 'Recurring investment plans' },
  { id: 'lumpsum', label: 'Lumpsum', caption: 'Explicitly matched allotment rows' },
  { id: 'swp', label: 'SWP', caption: 'Systematic withdrawals' },
  { id: 'stp', label: 'STP', caption: 'Systematic transfers' },
  { id: 'redemptions', label: 'Redemptions', caption: 'Reported redemption activity' },
  { id: 'other', label: 'Other activity', caption: 'Transaction type not explicitly matched' },
];

const money = (value) => (
  Number.isFinite(value)
    ? new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
    : 'Unavailable'
);

const reportState = (reports, coverage, type) => {
  const report = reports?.[type];
  if (!report || !coverage) {
    return { status: 'unavailable', label: 'Coverage unavailable' };
  }

  const requested = Number(report.requested) || 0;
  const succeeded = Number(report.succeeded) || 0;
  const attemptedUsers = Number(coverage.attemptedUsers) || 0;
  const eligibleUsers = Number(coverage.eligibleUsers) || 0;
  const unqueriedUsers = Math.max(eligibleUsers - attemptedUsers, 0);
  if (!attemptedUsers) {
    return { status: 'unavailable', label: 'No registered-UCC accounts queried' };
  }
  if (!succeeded && requested) {
    return {
      status: 'unavailable',
      label: `Unavailable · 0 of ${requested} reports returned`,
      succeeded,
      requested,
    };
  }
  if (
    succeeded !== requested
    || attemptedUsers !== eligibleUsers
    || coverage.limited
  ) {
    return {
      status: 'partial',
      label: `Partial · ${succeeded} of ${requested} reports returned${unqueriedUsers ? ` · ${unqueriedUsers} accounts not queried` : ''}`,
      succeeded,
      requested,
    };
  }
  return {
    status: 'verified',
    label: `Verified · ${succeeded} of ${requested} reports returned`,
    succeeded,
    requested,
  };
};

const amountLabel = (value, status, partialAmount = false, zeroLabel = 'verified zero') => {
  if (status === 'unavailable' || value === null || !Number.isFinite(value)) return 'Unavailable';
  if (status === 'partial' || partialAmount) return `${money(value)} · partial`;
  if (value === 0) return `${money(value)} · ${zeroLabel}`;
  return `${money(value)} · verified`;
};

const dateLabel = (value) => {
  if (!value) return 'Date not reported';
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const monthlyAmount = (row) => {
  if (!Number.isFinite(row.amount)) return null;
  const frequency = String(row.frequency || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
  const periodsPerMonth = {
    WEEKLY: 52 / 12,
    FORTNIGHTLY: 26 / 12,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    SEMIANNUAL: 1 / 6,
    SEMIANNUALLY: 1 / 6,
    ANNUAL: 1 / 12,
    ANNUALLY: 1 / 12,
  }[frequency];
  return periodsPerMonth ? row.amount * periodsPerMonth : null;
};

const isInNextWeek = (value) => {
  if (!value) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dueDate = new Date(`${value}T00:00:00.000Z`);
  return dueDate >= today && dueDate <= new Date(today.getTime() + 7 * 86400000);
};

const AdminMfOverview = ({ token, onUnauthorized, onOpenSipBook }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('sip');
  const [search, setSearch] = useState('');

  const loadOverview = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getAdminMfOverview(token, refresh);
      if (!response.success) throw new Error(response.message || 'Unable to load mutual fund reporting.');
      setData(response.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
      } else {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load mutual fund reporting.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const plans = data?.plans || [];
  const activity = data?.activity || [];
  const coverage = data?.coverage;
  const reportCoverage = coverage?.reports || {};
  const planGroups = useMemo(() => Object.fromEntries(
    ['sip', 'stp', 'swp'].map((type) => [type, plans.filter((row) => row.type === type)]),
  ), [plans]);
  const monthlyTotals = useMemo(() => Object.fromEntries(
    ['sip', 'stp', 'swp'].map((type) => [
      type,
      (() => {
        let knownRows = 0;
        const rows = planGroups[type];
        const state = reportState(reportCoverage, coverage, type);
        if (!rows.length) return state.status === 'verified' ? 0 : null;
        const total = planGroups[type].reduce((sum, row) => {
          const value = monthlyAmount(row);
          if (value === null) return sum;
          knownRows += 1;
          return sum + value;
        }, 0);
        return knownRows ? total : null;
      })(),
    ]),
  ), [coverage, planGroups, reportCoverage]);
  const upcoming = useMemo(
    () => planGroups.sip.filter((row) => isInNextWeek(row.nextInstallmentDate)),
    [planGroups],
  );
  const needsAction = useMemo(
    () => plans.filter((row) => row.actionNeeded),
    [plans],
  );
  const topSchemes = useMemo(() => {
    const schemes = new Map();
    planGroups.sip.forEach((row) => {
      const value = monthlyAmount(row);
      if (!row.schemeName || value === null) return;
      schemes.set(row.schemeName, (schemes.get(row.schemeName) || 0) + value);
    });
    return [...schemes.entries()]
      .map(([schemeName, monthlyBook]) => ({ schemeName, monthlyBook }))
      .sort((first, second) => second.monthlyBook - first.monthlyBook)
      .slice(0, 5);
  }, [planGroups.sip]);
  const productCounts = useMemo(() => ({
    sip: planGroups.sip.length,
    stp: planGroups.stp.length,
    swp: planGroups.swp.length,
    lumpsum: activity.filter((row) => row.category === 'lumpsum').length,
    redemptions: activity.filter((row) => row.category === 'redemption').length,
    other: activity.filter((row) => row.category === 'other').length,
  }), [activity, planGroups]);
  const productAmounts = useMemo(() => Object.fromEntries(
    ['lumpsum', 'redemptions', 'other'].map((type) => {
      const category = type === 'redemptions' ? 'redemption' : type;
      const rows = activity.filter((row) => row.category === category);
      const amounts = rows.filter((row) => Number.isFinite(row.amount));
      const state = reportState(reportCoverage, coverage, 'activity');
      return [
        type,
        amounts.length
          ? amounts.reduce((total, row) => total + row.amount, 0)
          : !rows.length && state.status === 'verified' ? 0 : null,
      ];
    }),
  ), [activity, coverage, reportCoverage]);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thisMonthActivity = activity.filter((row) => row.date && new Date(`${row.date}T00:00:00.000Z`) >= monthStart);
  const monthlyActivityRowsWithAmount = thisMonthActivity.filter((row) => Number.isFinite(row.amount));
  const activityCoverage = reportState(reportCoverage, coverage, 'activity');
  const monthlyActivityAmount = monthlyActivityRowsWithAmount.length
    ? monthlyActivityRowsWithAmount.reduce((total, row) => total + row.amount, 0)
    : thisMonthActivity.length ? null : activityCoverage.status === 'verified' ? 0 : null;

  const records = useMemo(() => {
    if (selectedType === 'sip' || selectedType === 'stp' || selectedType === 'swp') {
      return planGroups[selectedType].map((row, index) => ({
        ...row,
        displayType: selectedType.toUpperCase(),
        displayLabel: `${selectedType.toUpperCase()} record ${index + 1}`,
      }));
    }
    const category = selectedType === 'redemptions' ? 'redemption' : selectedType;
    return activity
      .filter((row) => row.category === category)
      .map((row, index) => ({
        ...row,
        displayType: selectedType === 'lumpsum'
          ? 'Lumpsum'
          : selectedType === 'redemptions'
            ? 'Redemption'
            : 'Other activity',
        displayLabel: `${selectedType === 'lumpsum'
          ? 'Lumpsum'
          : selectedType === 'redemptions'
            ? 'Redemption'
            : 'Other activity'} record ${index + 1}`,
      }));
  }, [activity, planGroups, selectedType]);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((row) => [
      row.displayLabel,
      row.schemeName,
      row.status,
      row.frequency,
      row.transactionType,
      row.orderType,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [records, search]);
  const partial = Boolean(coverage?.partial);
  const noEligibleAccounts = !coverage?.attemptedUsers;
  const countDisplay = (value, type) => {
    const state = reportState(reportCoverage, coverage, type);
    return state.status === 'unavailable'
      ? 'Unavailable'
      : `${value} returned${state.status === 'partial' ? ' · partial' : ''}`;
  };
  const planCoverageComplete = ['sip', 'stp', 'swp']
    .every((type) => reportState(reportCoverage, coverage, type).status === 'verified');
  const recordCoverage = reportState(
    reportCoverage,
    coverage,
    ['sip', 'stp', 'swp'].includes(selectedType) ? selectedType : 'activity',
  );
  const supportedPlanMonthly = (type) => {
    const known = planGroups[type].filter((row) => monthlyAmount(row) !== null).length;
    return `${known} of ${planGroups[type].length} rows normalized`;
  };

  if (loading && !data) {
    return (
      <section className="mf-overview" aria-busy="true">
        <div className="mf-overview-loading"><span className="mf-overview-spinner" />Loading protected NSE reports…</div>
        <div className="mf-overview-skeleton" />
        <div className="mf-overview-skeleton mf-overview-skeleton-tall" />
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="mf-overview mf-overview-empty">
        <AlertTriangle aria-hidden="true" />
        <h2>Mutual fund reports are unavailable</h2>
        <p>{error}</p>
        <button type="button" className="mf-overview-button" onClick={() => loadOverview(true)}>
          <RefreshCw size={15} aria-hidden="true" /> Retry report load
        </button>
      </section>
    );
  }

  return (
    <section className="mf-overview" aria-labelledby="mf-overview-title">
      <header className="mf-overview-heading">
        <div>
          <p className="mf-overview-eyebrow">Live NSE reporting · Mutual funds</p>
          <h2 id="mf-overview-title">A measured view of recurring flows.</h2>
          <p>Plan-based commitments and recent allotment activity, based only on reports returned by NSE.</p>
        </div>
        <button
          type="button"
          className="mf-overview-button"
          onClick={() => loadOverview(true)}
          disabled={refreshing}
          aria-label="Refresh live NSE reports"
        >
          <RefreshCw size={15} aria-hidden="true" className={refreshing ? 'mf-spin' : ''} />
          {refreshing ? 'Checking reports…' : 'Refresh reports'}
        </button>
      </header>

      {error && (
        <div className="mf-overview-inline-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Refresh failed. Showing the last successful response. {error}</span>
        </div>
      )}

    

      {partial && (
        <p className="mf-overview-caveat">
          Totals below cover only successfully returned reports for the accounts shown above. Failed reports and accounts outside the refresh cap are excluded.
        </p>
      )}

      <section className="mf-overview-report-lanes" aria-label="NSE report coverage by product">
        <div className="mf-overview-report-lanes-heading">
          <div><span className="mf-overview-label">NSE report desk</span><h3>Product report coverage</h3></div>
          <span>Live request outcomes</span>
        </div>
        <div className="mf-overview-report-lanes-grid">
          {[
            ['sip', 'SIP registrations'],
            ['stp', 'STP registrations'],
            ['swp', 'SWP registrations'],
            ['activity', 'Allotment activity'],
          ].map(([type, label]) => {
            const state = reportState(reportCoverage, coverage, type);
            return (
              <div className={`mf-overview-report-lane is-${state.status}`} key={type}>
                <span>{label}</span>
                <strong>{state.succeeded ?? '—'}<i>/</i>{state.requested ?? '—'}</strong>
                <small>{state.label}</small>
                <b>{state.status === 'verified' ? 'Verified' : state.status === 'partial' ? 'Partial' : 'Unavailable'}</b>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mf-overview-product-desk" aria-label="Products and allotment activity">
        <div className="mf-overview-product-desk-heading">
          <div><span className="mf-overview-label">Product ledger</span><h3>Plan registrations &amp; order activity</h3></div>
          <div className="mf-overview-product-desk-actions">
            <span>Filter records by report type</span>
            {onOpenSipBook && (
              <button type="button" className="mf-overview-sip-link" onClick={onOpenSipBook}>
                Open SIP Book <ArrowUpRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="mf-overview-products" aria-label="Filter overview by product">
          {productTypes.map((product) => {
            const isActivity = ['lumpsum', 'redemptions', 'other'].includes(product.id);
            const count = productCounts[product.id] || 0;
            const value = isActivity ? productAmounts[product.id] : monthlyTotals[product.id];
            const state = reportState(reportCoverage, coverage, isActivity ? 'activity' : product.id);
            const category = product.id === 'redemptions' ? 'redemption' : product.id;
            const rows = isActivity
              ? activity.filter((row) => row.category === category)
              : planGroups[product.id];
            const knownAmountRows = isActivity
              ? rows.filter((row) => Number.isFinite(row.amount)).length
              : rows.filter((row) => monthlyAmount(row) !== null).length;
            const amountRowsArePartial = knownAmountRows < rows.length;
            const hasMonthly = !isActivity && count > 0;
            const countLabel = state.status === 'unavailable' ? '—' : count;
            return (
              <button
                type="button"
                key={product.id}
                className={`mf-overview-product${selectedType === product.id ? ' is-selected' : ''}`}
                onClick={() => { setSelectedType(product.id); setSearch(''); }}
                aria-pressed={selectedType === product.id}
              >
                <span className="mf-overview-product-top"><span>{product.label}</span><ArrowUpRight size={15} aria-hidden="true" /></span>
                <strong>{countLabel}</strong>
                <small>{state.status === 'unavailable' ? 'Rows unavailable' : `${count} rows returned${state.status === 'partial' ? ' · partial' : ''}`}</small>
                <span className="mf-overview-product-value">
                  {isActivity
                    ? `${amountLabel(value, state.status, amountRowsArePartial, 'verified zero matched')} · ${data?.window?.days ?? '—'}d matched`
                    : `${amountLabel(value, state.status, amountRowsArePartial)} / month · plan-based`}
                </span>
                <small>{product.caption}</small>
                <small className={`mf-overview-product-coverage is-${state.status}`}>{state.label}</small>
                {hasMonthly && <small className="mf-overview-normalized">{supportedPlanMonthly(product.id)}</small>}
                {isActivity && productAmounts[product.id] === null && count > 0 && (
                  <small className="mf-overview-normalized">Amounts unavailable in report rows</small>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mf-overview-summary">
        <section className="mf-overview-panel mf-overview-flow" aria-labelledby="mf-flow-title">
          <div className="mf-overview-panel-heading">
            <div><span className="mf-overview-label">Plan-based monthly book</span><h3 id="mf-flow-title">Known recurring flows</h3></div>
            <TrendingUp size={18} aria-hidden="true" />
          </div>
          {['sip', 'stp', 'swp'].map((type) => (
            <div className="mf-overview-flow-row" key={type}>
              <span className={`mf-overview-flow-mark is-${type}`} />
              <div><strong>{type.toUpperCase()}</strong><small>{supportedPlanMonthly(type)}</small></div>
              <b>{amountLabel(
                monthlyTotals[type],
                reportState(reportCoverage, coverage, type).status,
                planGroups[type].filter((row) => monthlyAmount(row) !== null).length < planGroups[type].length,
              )}</b>
            </div>
          ))}
          <div className="mf-overview-panel-footnote">Monthly equivalents use reported frequency only. Unknown frequency or amount is excluded.</div>
        </section>

        <section className="mf-overview-panel mf-overview-activity" aria-labelledby="mf-activity-title">
          <div className="mf-overview-panel-heading">
            <div><span className="mf-overview-label">NSE allotment report</span><h3 id="mf-activity-title">Recent activity</h3></div>
            <CircleDollarSign size={18} aria-hidden="true" />
          </div>
          <div className="mf-overview-activity-amount">
            {amountLabel(
              monthlyActivityAmount,
              activityCoverage.status,
              monthlyActivityRowsWithAmount.length < thisMonthActivity.length,
              'verified zero in matched activity',
            )}
          </div>
          <p>
            {activityCoverage.status === 'unavailable'
              ? 'Activity-row count is unavailable because the allotment report did not return.'
              : `${thisMonthActivity.length} reported activity rows with a parseable date in the current month${activityCoverage.status === 'partial' ? ' · partial coverage' : ''}`}
          </p>
          <small className={`mf-overview-product-coverage is-${activityCoverage.status}`}>{activityCoverage.label}</small>
          <div className="mf-overview-activity-meta">
            <span><ArrowUpRight size={14} aria-hidden="true" /> {countDisplay(productCounts.lumpsum, 'activity')} explicitly identified purchase rows</span>
            <span><ArrowDownRight size={14} aria-hidden="true" /> {countDisplay(productCounts.redemptions, 'activity')} explicitly identified redemption rows</span>
            <span>{countDisplay(productCounts.other, 'activity')} activity rows not explicitly classified</span>
          </div>
          <div className="mf-overview-panel-footnote">
            Activity window: {dateLabel(data?.window?.fromDate)} – {dateLabel(data?.window?.toDate)}. Unclassified NSE transaction codes are not guessed.
          </div>
        </section>
      </div>

      <div className="mf-overview-insights">
        <section className="mf-overview-panel" aria-labelledby="mf-schemes-title">
          <div className="mf-overview-panel-heading">
            <div><span className="mf-overview-label">From SIP registration rows</span><h3 id="mf-schemes-title">Largest monthly scheme plans</h3></div>
            <TrendingUp size={18} aria-hidden="true" />
          </div>
          {topSchemes.length ? (
            <ol className="mf-overview-scheme-list">
              {topSchemes.map((scheme) => {
                const total = topSchemes[0].monthlyBook || 1;
                return (
                  <li key={scheme.schemeName}>
                    <div><span>{scheme.schemeName}</span><strong>{money(scheme.monthlyBook)}</strong></div>
                    <span className="mf-overview-bar"><i style={{ width: `${Math.max(5, scheme.monthlyBook / total * 100)}%` }} /></span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mf-overview-no-data">
              {reportState(reportCoverage, coverage, 'sip').status === 'verified'
                ? 'No scheme names and supported SIP amounts were returned in covered reports.'
                : 'Scheme totals are unavailable or partial because some SIP registration reports did not return.'}
            </p>
          )}
          <div className="mf-overview-panel-footnote">This is normalized SIP plan value, not client holdings or AUM.</div>
        </section>

        <section className="mf-overview-panel" aria-labelledby="mf-upcoming-title">
          <div className="mf-overview-panel-heading">
            <div><span className="mf-overview-label">Next seven days</span><h3 id="mf-upcoming-title">Expected SIP installments</h3></div>
            <CalendarDays size={18} aria-hidden="true" />
          </div>
          {upcoming.length ? (
            <ul className="mf-overview-upcoming">
              {upcoming.slice(0, 5).map((row, index) => (
                <li key={`${row.schemeName}-${row.nextInstallmentDate}-${index}`}>
                  <span className="mf-overview-date">{dateLabel(row.nextInstallmentDate)}</span>
                  <span><strong>{row.schemeName || 'Scheme not reported'}</strong><small>{row.frequency || 'Frequency not reported'}</small></span>
                  <b>{money(row.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mf-overview-no-data">
              {reportState(reportCoverage, coverage, 'sip').status === 'verified'
                ? 'No SIP report rows include a next-installment date in this seven-day window.'
                : 'Upcoming installment data is unavailable or partial because some SIP registration reports did not return.'}
            </p>
          )}
          <div className="mf-overview-panel-footnote">Expected plan installments only; not confirmation of a bank debit.</div>
        </section>
      </div>

      <section className="mf-overview-panel mf-overview-actions" aria-labelledby="mf-actions-title">
        <div className="mf-overview-panel-heading">
          <div><span className="mf-overview-label">Explicit report statuses</span><h3 id="mf-actions-title">Items marked for attention</h3></div>
          <span className={`mf-overview-action-count${needsAction.length ? ' has-items' : ''}`}>
            {planCoverageComplete
              ? `${needsAction.length} items`
              : needsAction.length
                ? `${needsAction.length}+ items · partial`
                : 'Unavailable'}
          </span>
        </div>
        {needsAction.length ? (
          <ul className="mf-overview-action-list">
            {needsAction.slice(0, 8).map((row, index) => (
              <li key={`${row.type}-${row.schemeName}-${index}`}>
                <span className="mf-overview-action-type">{row.type.toUpperCase()}</span>
                <span><strong>{row.schemeName || `${row.type.toUpperCase()} plan`}</strong><small>{row.actionReason}</small></span>
                <b>{row.status || 'Status not reported'}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mf-overview-no-data">
            {planCoverageComplete
              ? 'No plan rows returned an explicit pending, failed, or rejected status or remark.'
              : needsAction.length
                ? 'Flagged rows appear above; additional items may be missing from unavailable reports.'
                : 'Action status is unavailable until all NSE registration reports return.'}
          </p>
        )}
        <div className="mf-overview-panel-footnote">Review indicators only. No approval or retry action is available here.</div>
      </section>

      <section className="mf-overview-records" aria-labelledby="mf-records-title">
        <div className="mf-overview-records-heading">
          <div><span className="mf-overview-label">Live report rows</span><h3 id="mf-records-title">{productTypes.find((item) => item.id === selectedType)?.label} records</h3></div>
          <label className="mf-overview-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search visible records</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search scheme or status" />
          </label>
        </div>
        <div className="mf-overview-table-wrap">
          <table className="mf-overview-table">
            <thead>
              <tr>
                <th>Report row</th><th>Scheme</th><th>Status / transaction</th>
                <th>Frequency / date</th><th>Reported value</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((row, index) => (
                <tr key={`${row.type}-${row.schemeName}-${row.startDate || row.date}-${index}`}>
                  <td><span className="mf-overview-record-type">{row.displayLabel}</span></td>
                  <td>{row.schemeName || 'Not reported'}</td>
                  <td>{row.status || [row.transactionType, row.orderType].filter(Boolean).join(' / ') || 'Not reported'}</td>
                  <td>{row.frequency || dateLabel(row.date || row.nextInstallmentDate)}</td>
                  <td>{money(row.amount)}</td>
                </tr>
              ))}
              {!filteredRecords.length && (
                <tr><td colSpan="5" className="mf-overview-table-empty">
                  {search
                    ? 'No report rows match this search.'
                    : recordCoverage.status === 'unavailable'
                      ? 'Report rows are unavailable for this product.'
                      : recordCoverage.status === 'partial'
                        ? 'No matching rows in returned reports; coverage is partial.'
                        : noEligibleAccounts
                          ? 'No registered-UCC accounts were available for this product report.'
                          : 'No matching report rows were returned for this product.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="mf-overview-records-footer">
          <span>{filteredRecords.length} of {records.length} rows · selected from in-page product filters</span>
          <span>Client names and UCCs are not exposed here.</span>
        </footer>
      </section>

      {partial && (
        <details className="mf-overview-report-detail">
          <summary>Report coverage and failures</summary>
          <div>
            {['sip', 'stp', 'swp', 'activity'].map((type) => (
              <span key={type}>{type.toUpperCase()}: {reportCoverage[type]?.succeeded || 0} succeeded · {reportCoverage[type]?.failed || 0} failed</span>
            ))}
          </div>
        </details>
      )}
    </section>
  );
};

export default AdminMfOverview;
