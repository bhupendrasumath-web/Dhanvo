import { useEffect, useState } from 'react';
import { Eye, Search } from 'lucide-react';

const AdminUsersTable = ({
  users = [],
  loading,
  unavailable,
  error,
  onRetry,
  onReview,
  reviewLabel = 'Review',
  title = 'Users & UCC',
  description = 'Search and review account onboarding records.',
  filter = 'all',
  onFilterChange,
  onSearch,
  search = '',
  total = 0,
  limit = 50,
  offset = 0,
  onPageChange,
}) => {
  const [query, setQuery] = useState(search);

  useEffect(() => setQuery(search), [search]);

  return (
    <section className="admin-record-card">
      <div className="admin-record-header">
        <div>
          <p className="admin-record-kicker">Onboarding registry</p>
          <h2>{title}</h2>
          <p className="admin-record-description">{description}</p>
        </div>
        <div className="admin-record-tools">
          <label className="admin-filter-control">
            <span>Account status</span>
            <select value={filter} onChange={(event) => onFilterChange(event.target.value)}>
              <option value="all">All users</option>
              <option value="ucc-registered">UCC registered</option>
              <option value="ucc-unregistered">UCC not registered</option>
              <option value="pan-verified">PAN verified</option>
              <option value="pan-unverified">PAN not verified</option>
            </select>
          </label>
          <form onSubmit={(event) => { event.preventDefault(); onSearch(query.trim()); }} className="admin-search-form">
            <label className="sr-only" htmlFor="admin-user-search">Search users by name, email or account ID</label>
            <div className="admin-search-input">
              <Search aria-hidden="true" />
              <input
                id="admin-user-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users"
              />
            </div>
            <button type="submit">Search</button>
          </form>
        </div>
      </div>

      {error && (
        <div role="alert" className="admin-record-error">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      )}

      <div className="admin-record-table-wrap">
        <table className="admin-record-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Onboarding</th>
              <th>Joined</th>
              <th>{reviewLabel}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="4" className="admin-record-message">Loading user records…</td></tr>}
            {!loading && unavailable && <tr><td colSpan="4" className="admin-record-message">User records are unavailable until the server configuration is complete.</td></tr>}
            {!loading && !unavailable && users.length === 0 && <tr><td colSpan="4" className="admin-record-message">No user records found for this filter.</td></tr>}
            {!loading && users.map((user) => {
              const name = user.name || 'Unknown user';
              const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
              const status = user.nseUccRegistered ? 'UCC active' : user.nseStatus || user.accountOpeningStatus || 'Pending';

              return (
                <tr key={user.id}>
                  <td>
                    <div className="admin-user-cell">
                      <span className="admin-record-avatar" aria-hidden="true">{initials}</span>
                      <span>
                        <strong>{name}</strong>
                        <small>{user.email}</small>
                        <small>•••• {user.phoneLastFour || '—'}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${user.nseUccRegistered ? 'is-positive' : 'is-pending'}`}>
                      <span />
                      {status}{user.isVerified ? ' · PAN verified' : ' · PAN not verified'}
                    </span>
                  </td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <button type="button" onClick={(event) => onReview(user.id, event.currentTarget)} className="admin-record-action">
                      <Eye aria-hidden="true" />
                      {reviewLabel}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-record-footer">
        <span>{total === 0 ? 'No matching records' : `Showing ${offset + 1}–${Math.min(offset + limit, total)} of ${total}`}</span>
        <div>
          <button type="button" onClick={() => onPageChange(Math.max(offset - limit, 0))} disabled={loading || offset === 0}>Previous</button>
          <button type="button" onClick={() => onPageChange(offset + limit)} disabled={loading || offset + limit >= total}>Next</button>
        </div>
      </div>
    </section>
  );
};

export default AdminUsersTable;
