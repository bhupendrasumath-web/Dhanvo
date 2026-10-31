import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import { getAdminUsers, refreshAdminUserNseStatus } from '../../services/adminApi';

const PAGE_SIZE = 100;

const bucketMeta = {
  all: { label: 'All' },
  open: { label: 'Open' },
  progress: { label: 'In progress' },
  failed: { label: 'Failed' },
  complete: { label: 'Complete' },
  unclassified: { label: 'Unclassified' },
};

const bucketClassMap = {
  Open: 'status-tracker-badge status-tracker-badge-open',
  'In progress': 'status-tracker-badge status-tracker-badge-progress',
  Failed: 'status-tracker-badge status-tracker-badge-failed',
  Complete: 'status-tracker-badge status-tracker-badge-complete',
  Unclassified: 'status-tracker-badge status-tracker-badge-unclassified',
};

const statusValue = (value) => {
  if (value == null || String(value).trim() === '') return '—';
  const text = String(value).trim();
  if (text === '—' || text === '-') return '—';
  const normalized = text.toLowerCase().replace(/[_-]+/g, ' ');
  if (['unknown', 'n/a', 'n.a.', 'na', 'not available', 'not applicable', 'none', 'null', 'undefined'].includes(normalized)) {
    return '—';
  }
  return text;
};

const getStage = (user) => {
  const accountStatus = statusValue(user.accountOpeningStatus);
  return accountStatus !== '—' ? accountStatus : statusValue(user.nseStatus);
};

const getBucket = (user) => {
  if (user.nseUccRegistered === true) return 'Complete';

  const statuses = [user.accountOpeningStatus, user.nseStatus]
    .map(statusValue)
    .filter((status) => status !== '—')
    .map((status) => status.toLowerCase());

  if (statuses.some((status) => status === 'failed' || status === 'rejected')) return 'Failed';

  const pendingStatuses = new Set(['pending', 'open', 'not started', 'not_started', 'not-started']);
  if (statuses.some((status) => !pendingStatuses.has(status)) || user.isVerified === true) {
    return 'In progress';
  }

  if (statuses.some((status) => pendingStatuses.has(status))) return 'Open';
  return 'Unclassified';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toCsv = (users) => {
  const headers = [
    'id',
    'name',
    'email',
    'phoneLastFour',
    'isVerified',
    'nseUccRegistered',
    'nseStatus',
    'accountOpeningStatus',
    'fatcaStatus',
    'createdAt',
  ];
  const quote = (value) => {
    const text = String(value ?? '');
    const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.map(quote).join(','),
    ...users.map((user) => headers.map((field) => quote(user[field])).join(',')),
  ];
  return lines.join('\r\n');
};

const AdminStatusTracker = ({ token, onUnauthorized }) => {
  const [selectedBucket, setSelectedBucket] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [syncingUserId, setSyncingUserId] = useState(null);
  const [nseSyncMessage, setNseSyncMessage] = useState(null);

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      if (!token) {
        setUsers([]);
        setTotal(0);
        setError('An authenticated admin session is required to load account records.');
        return;
      }

      setLoading(true);
      setError('');
      setUsers([]);
      setTotal(0);

      try {
        const response = await getAdminUsers(token, {
          limit: PAGE_SIZE,
          offset,
          search: appliedSearch,
        });
        if (!response?.success || !Array.isArray(response?.data?.users)) {
          throw new Error(response?.message || 'The server returned an invalid account-record response.');
        }

        const responseTotal = Number(response.data.total);
        if (!Number.isFinite(responseTotal) || responseTotal < 0) {
          throw new Error('The server returned an invalid account-record total.');
        }

        if (active) {
          setUsers(response.data.users);
          setTotal(responseTotal);
        }
      } catch (requestError) {
        if (!active) return;
        const unauthorized = requestError.response?.status === 401;
        if (unauthorized && onUnauthorized) {
          onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
          return;
        }
        setError(
          requestError.response?.data?.message
            || requestError.message
            || 'Unable to load account records. Please try again.',
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUsers();
    return () => {
      active = false;
    };
  }, [token, onUnauthorized, offset, appliedSearch, retryCount]);

  const counts = useMemo(() => {
    const nextCounts = { all: users.length, open: 0, progress: 0, failed: 0, complete: 0, unclassified: 0 };
    users.forEach((user) => {
      const bucket = getBucket(user);
      if (bucket === 'Open') nextCounts.open += 1;
      if (bucket === 'In progress') nextCounts.progress += 1;
      if (bucket === 'Failed') nextCounts.failed += 1;
      if (bucket === 'Complete') nextCounts.complete += 1;
      if (bucket === 'Unclassified') nextCounts.unclassified += 1;
    });
    return nextCounts;
  }, [users]);

  const visibleUsers = useMemo(
    () => users.filter((user) => selectedBucket === 'all' || getBucket(user) === bucketMeta[selectedBucket].label),
    [users, selectedBucket],
  );

  const handleSearch = (event) => {
    event.preventDefault();
    setOffset(0);
    setAppliedSearch(searchTerm.trim());
  };

  const handleBucketChange = (bucket) => {
    setSelectedBucket(bucket);
    setOffset(0);
  };

  const handleExport = () => {
    const blob = new Blob([`\uFEFF${toCsv(visibleUsers)}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dhanvo-account-onboarding.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNseRefresh = async (user) => {
    setSyncingUserId(user.id);
    setNseSyncMessage(null);
    try {
      const response = await refreshAdminUserNseStatus(token, user.id);
      if (!response?.success || !response?.data) {
        throw new Error(response?.message || 'Unable to verify this account with NSE.');
      }

      const refreshed = response.data;
      setUsers((currentUsers) => currentUsers.map((currentUser) => (
        currentUser.id === user.id
          ? {
            ...currentUser,
            accountOpeningStatus: refreshed.accountOpeningStatus,
            nseStatus: refreshed.nseStatus,
            nseStatusRemark: refreshed.nseStatusRemark,
            nseStatusCheckedAt: refreshed.nseStatusCheckedAt,
            nseUccRegistered: refreshed.nseUccRegistered,
          }
          : currentUser
      )));
      setNseSyncMessage({
        type: 'success',
        text: refreshed.changed
          ? `${user.name}: the NSE report differed from the database (${refreshed.nseStatus}); the database was synchronized.`
          : `${user.name}: NSE status is ${refreshed.nseStatus}, same as the database; no update was needed.`,
      });
    } catch (requestError) {
      if (requestError.response?.status === 401 && onUnauthorized) {
        onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
        return;
      }
      setNseSyncMessage({
        type: 'error',
        text: requestError.response?.data?.message
          || requestError.message
          || 'Unable to verify this account with NSE.',
      });
    } finally {
      setSyncingUserId(null);
    }
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + users.length, total);
  const hasPreviousPage = offset > 0;
  const hasNextPage = offset + users.length < total;

  return (
    <section className="status-tracker-shell" aria-label="Account onboarding status tracker">
      <div className="status-tracker-actions-bar">
        <span>Account-onboarding records · current page</span>
        <button type="button" className="btn ghost" onClick={handleExport} disabled={loading || visibleUsers.length === 0}>
          <Download size={15} />
          Export current rows
        </button>
      </div>

      <div className="status-tracker-filter-heading">Bucket counts · current page</div>
      <div className="status-tracker-filter-row" role="group" aria-label="Filter current page by account status">
        {Object.entries(bucketMeta).map(([key, bucket]) => (
          <button
            key={key}
            type="button"
            aria-pressed={selectedBucket === key}
            className={`status-tracker-chip ${selectedBucket === key ? 'status-tracker-chip-active' : ''}`}
            onClick={() => handleBucketChange(key)}
          >
            {bucket.label} <span>{loading || error ? '—' : counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="status-tracker-card card">
        <div className="status-tracker-toolbar">
          <form className="status-tracker-search-form" onSubmit={handleSearch}>
            <div className="status-tracker-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, email or account ID"
                aria-label="Search account records on the server"
              />
            </div>
            <button type="submit" className="btn ghost sm" disabled={loading}>Search</button>
          </form>
        </div>

        {error && (
          <div className="status-tracker-error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn ghost sm" onClick={() => setRetryCount((count) => count + 1)} disabled={loading}>
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {nseSyncMessage && (
          <div
            className={`status-tracker-nse-message is-${nseSyncMessage.type}`}
            role={nseSyncMessage.type === 'error' ? 'alert' : 'status'}
          >
            {nseSyncMessage.text}
          </div>
        )}

        <div className="status-tracker-table-wrap">
          <table className="status-tracker-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Ref</th>
                <th>Name</th>
                <th>Detail</th>
                <th>Current stage</th>
                <th>Step</th>
                <th>Bucket</th>
                <th>Date</th>
                <th>NSE status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="status-tracker-empty" aria-live="polite">Loading account records…</td></tr>
              ) : error ? (
                <tr><td colSpan="9" className="status-tracker-empty">Account records could not be loaded.</td></tr>
              ) : visibleUsers.length > 0 ? (
                visibleUsers.map((user) => {
                  const bucket = getBucket(user);
                  const details = [
                    `PAN ${user.isVerified === true ? 'verified' : user.isVerified === false ? 'not verified' : '—'}`,
                    `UCC ${user.nseUccRegistered === true ? 'registered' : user.nseUccRegistered === false ? 'not registered' : '—'}`,
                    `FATCA ${statusValue(user.fatcaStatus)}`,
                  ].join(' · ');

                  return (
                    <tr key={user.id}>
                      <td>User account</td>
                      <td className="mono">{statusValue(user.id)}</td>
                      <td><strong>{statusValue(user.name)}</strong></td>
                      <td>{details}</td>
                      <td>{getStage(user)}</td>
                      <td>—</td>
                      <td><span className={bucketClassMap[bucket]}>{bucket}</span></td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="status-tracker-sync-button"
                          onClick={() => handleNseRefresh(user)}
                          disabled={syncingUserId !== null}
                          aria-label={`Check ${user.name} account status with NSE`}
                        >
                          <RefreshCw size={13} aria-hidden="true" className={syncingUserId === user.id ? 'mf-spin' : ''} />
                          {syncingUserId === user.id ? 'Checking…' : 'Check NSE'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="status-tracker-empty">
                    {users.length > 0
                      ? 'No records in this bucket on the current page. Try another page or bucket.'
                      : 'No account records match this search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="status-tracker-footer">
          <p>
            {error
              ? 'Record totals are unavailable until the server responds.'
              : `Showing ${visibleUsers.length} of ${users.length} users on this page · ${total} users match this search. Bucket counts cover the current page only.`}
          </p>
          <nav className="status-tracker-pagination" aria-label="Account record pages">
            <span>{error ? 'Pagination unavailable' : total === 0 ? 'No pages' : `${pageStart}–${pageEnd} of ${total}`}</span>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              disabled={loading || !hasPreviousPage}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
              Previous
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
              disabled={loading || !hasNextPage}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </nav>
        </div>
      </div>
    </section>
  );
};

export default AdminStatusTracker;
