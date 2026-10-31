import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const getToday = () => new Date().toISOString().slice(0, 10);
const getDefaultStart = () => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

const formatDate = (value) => {
  const text = String(value || '').trim();
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const parsed = dmy
    ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    : new Date(text);
  return Number.isNaN(parsed.getTime())
    ? String(value || 'Date unavailable')
    : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (value) => {
  const amount = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
};

const getErrorMessage = (error) => (
  error.response?.data?.message || error.message || 'Unable to load allotment activity.'
);

const AllotmentActivity = ({ compact = false, onViewAll }) => {
  const [fromDate, setFromDate] = useState(getDefaultStart);
  const [toDate, setToDate] = useState(getToday);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const rangeError = useMemo(() => {
    if (!fromDate || !toDate) return 'Choose both an activity start and end date.';
    if (fromDate > toDate) return 'The start date must be on or before the end date.';
    if (toDate > getToday()) return 'The end date cannot be in the future.';
    if ((new Date(`${toDate}T00:00:00Z`) - new Date(`${fromDate}T00:00:00Z`)) / 86400000 > 30) {
      return 'NSE allows a maximum 30-day date gap per request.';
    }
    return '';
  }, [fromDate, toDate]);

  const loadActivity = useCallback(async () => {
    if (rangeError) {
      setError(rangeError);
      setActivity([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/mutual-funds/activity', {
        params: { fromDate, toDate },
      });
      if (!response.data?.success || !Array.isArray(response.data?.data?.activity)) {
        throw new Error(response.data?.message || 'NSE returned invalid allotment activity.');
      }
      setActivity(response.data.data.activity);
      setLastUpdated(response.data.data.lastUpdated || '');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, rangeError, toDate]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const rows = compact ? activity.slice(0, 5) : activity;
  const setDate = (setter) => (event) => setter(event.target.value);

  return (
    <section
      id={compact ? 'dashboard-holdings' : undefined}
      className={`dash-panel dash-activity-panel${compact ? ' is-compact' : ''}`}
      aria-labelledby="dash-activity-title"
    >
      <div className="dash-panel-heading">
        <div>
          <p className="dash-panel-kicker">NSE MFSS · ALLOTMENT REPORT</p>
          <h2 id="dash-activity-title">{compact ? 'Recent allotments' : 'Investment activity'}</h2>
        </div>
        <button type="button" className="dash-activity-refresh" onClick={loadActivity} disabled={loading || Boolean(rangeError)} aria-label="Refresh NSE allotment activity" title="Refresh activity">
          <RefreshCw size={15} className={loading ? 'is-spinning' : ''} />
        </button>
      </div>

      {!compact && (
        <div className="dash-activity-filters">
          <label>
            From
            <input type="date" value={fromDate} max={toDate || getToday()} onChange={setDate(setFromDate)} />
          </label>
          <label>
            To
            <input type="date" value={toDate} min={fromDate} max={getToday()} onChange={setDate(setToDate)} />
          </label>
          <span>Maximum 30-day date gap</span>
        </div>
      )}

      <p className="dash-activity-disclaimer">
        Allotments reported by NSE for {formatDate(fromDate)} – {formatDate(toDate)}. This activity is not a consolidated holdings or portfolio valuation.
      </p>

      {error ? (
        <div className="dash-watchlist-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadActivity} disabled={loading || Boolean(rangeError)}>Retry</button>
        </div>
      ) : loading ? (
        <div className="dash-activity-state" role="status">Loading your NSE activity…</div>
      ) : rows.length ? (
        <div className="dash-activity-list">
          {rows.map((row, index) => (
            <article className="dash-activity-row" key={`${row.orderId || row.schemeCode}-${row.orderDate}-${index}`}>
              <span className="dash-activity-icon"><Activity size={16} aria-hidden="true" /></span>
              <div className="dash-activity-row-copy">
                <strong>{row.schemeName || row.schemeCode || 'Mutual fund allotment'}</strong>
                <small>{row.transactionType || row.orderType || 'NSE allotment'} · {formatDate(row.orderDate)}{row.folioNumber ? ` · Folio ${row.folioNumber}` : ''}</small>
                {row.orderId && <small>Order {row.orderId}</small>}
              </div>
              <div className="dash-activity-row-value">
                <strong>{formatCurrency(row.amount)}</strong>
                <small>{row.allottedUnits ? `${row.allottedUnits} units` : row.allottedNav ? `NAV ₹${row.allottedNav}` : 'Allotment reported'}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dash-activity-state">
          No allotments were reported by NSE for this date range.
        </div>
      )}

      <div className="dash-activity-footer">
        {lastUpdated && <small>Report retrieved {formatDate(lastUpdated)}</small>}
        {compact && onViewAll && (
          <button type="button" onClick={onViewAll}>View all activity</button>
        )}
      </div>
    </section>
  );
};

export default AllotmentActivity;
