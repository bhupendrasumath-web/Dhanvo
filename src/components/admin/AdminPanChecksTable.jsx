import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const AdminPanChecksTable = ({
  checks = [],
  loading,
  unavailable,
  error,
  onRetry,
  verified = 'all',
  total = 0,
  limit = 50,
  offset = 0,
  onVerifiedChange,
  onPageChange,
}) => {
  const [filter, setFilter] = useState(verified);

  useEffect(() => setFilter(verified), [verified]);

  return (
    <section className="admin-record-card">
      <div className="admin-record-header">
        <div>
          <p className="admin-record-kicker">Protected verification history</p>
          <h2>PAN KYC check rows</h2>
          <p className="admin-record-description">Each row is one recorded check, not a unique investor. PAN, email, and phone are masked; raw provider responses are not exposed.</p>
        </div>
        <div className="admin-record-tools">
          <label className="admin-filter-control">
            <span>Verification</span>
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                onVerifiedChange(event.target.value);
              }}
            >
              <option value="all">All check rows</option>
              <option value="true">Verified</option>
              <option value="false">Not verified</option>
            </select>
          </label>
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
              <th>Recorded</th>
              <th>PAN</th>
              <th>Investor contact</th>
              <th>KYC status</th>
              <th>Verification</th>
              <th>KRA</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="admin-record-message">Loading protected KYC rows…</td></tr>}
            {!loading && unavailable && <tr><td colSpan="6" className="admin-record-message">PAN KYC records are unavailable. Retry the request or check the server configuration.</td></tr>}
            {!loading && !unavailable && checks.length === 0 && <tr><td colSpan="6" className="admin-record-message">No PAN KYC check rows match this filter.</td></tr>}
            {!loading && checks.map((check) => (
              <tr key={check.id}>
                <td>{check.createdAt ? new Date(check.createdAt).toLocaleString() : '—'}</td>
                <td><span className="admin-masked-value" aria-label="Masked PAN">{check.maskedPan}</span></td>
                <td>
                  <span className="admin-contact-value">{check.maskedEmail}</span>
                  <small>•••• {check.phoneLastFour || '—'}</small>
                </td>
                <td>{check.kycStatus || 'Unknown'}</td>
                <td>
                  <span className={`admin-status-badge ${check.verified ? 'is-positive' : 'is-pending'}`}>
                    <span />
                    {check.verified ? 'Verified' : 'Not verified'}
                  </span>
                </td>
                <td>{check.kraName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !unavailable && checks.length > 0 && (
        <div className="admin-record-footer">
          <span>{`Showing ${offset + 1}–${Math.min(offset + limit, total)} of ${total} check rows`}</span>
          <div>
            <button type="button" onClick={() => onPageChange(Math.max(offset - limit, 0))} disabled={loading || offset === 0}>Previous</button>
            <button type="button" onClick={() => onPageChange(offset + limit)} disabled={loading || offset + limit >= total}>Next</button>
          </div>
        </div>
      )}

      <div className="admin-record-privacy">
        <ShieldCheck aria-hidden="true" />
        <span>Sensitive identifiers stay masked in this view.</span>
      </div>
    </section>
  );
};

export default AdminPanChecksTable;
