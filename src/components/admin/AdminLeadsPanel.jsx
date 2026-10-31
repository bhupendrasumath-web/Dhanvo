import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Download, Mail, Phone, Search, UsersRound, X } from 'lucide-react';
import { getAdminLeads } from '../../services/adminApi';

const PAGE_SIZE = 20;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const csvValue = (value) => {
  const safeValue = /^[=+\-@]/.test(String(value ?? '')) ? `'${value}` : value;
  return `"${String(safeValue ?? '').replace(/"/g, '""')}"`;
};

const AdminLeadsPanel = ({ token, onUnauthorized }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, onboardingStarted: 0, complete: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [selectedLead, setSelectedLead] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    getAdminLeads(token, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: debouncedSearch,
      status: statusFilter,
    }).then((response) => {
      if (requestId !== requestIdRef.current) return;
      if (!response?.success || !response.data || !Array.isArray(response.data.leads)) {
        throw new Error(response?.message || 'The server returned invalid user lead data.');
      }
      setLeads(response.data.leads);
      setMetrics(response.data.metrics || { total: 0, onboardingStarted: 0, complete: 0 });
      setTotal(response.data.total || 0);
    }).catch((requestError) => {
      if (requestId !== requestIdRef.current) return;
      if (requestError.response?.status === 401) {
        onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
        return;
      }
      setLeads([]);
      setTotal(0);
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load user leads.');
    }).finally(() => {
      if (requestId === requestIdRef.current) setLoading(false);
    });

    return () => {
      requestIdRef.current += 1;
    };
  }, [debouncedSearch, onUnauthorized, page, retryCount, statusFilter, token]);

  useEffect(() => {
    if (!selectedLead) return undefined;
    closeButtonRef.current?.focus();
    const handleDialogKeys = (event) => {
      if (event.key === 'Escape') {
        setSelectedLead(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('a[href], button:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeys);
    return () => {
      document.removeEventListener('keydown', handleDialogKeys);
      window.requestAnimationFrame(() => openerRef.current?.focus());
    };
  }, [selectedLead]);

  const exportCsv = () => {
    const columns = ['User ID', 'Name', 'Email', 'Phone', 'Lead stage', 'Account opening status', 'NSE status', 'PAN verified', 'UCC registered', 'Joined'];
    const records = leads.map((lead) => [
      lead.id,
      lead.name,
      lead.email,
      lead.phone,
      lead.stage,
      lead.accountOpeningStatus,
      lead.nseStatus,
      lead.isVerified ? 'Yes' : 'No',
      lead.nseUccRegistered ? 'Yes' : 'No',
      formatDate(lead.createdAt),
    ]);
    const csv = [columns, ...records].map((row) => row.map(csvValue).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dhanvo-user-leads.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const pageCount = Math.ceil(total / PAGE_SIZE);
  const kpis = useMemo(() => [
    { label: 'All user leads', value: metrics.total, note: 'Everyone who created an account', icon: UsersRound, tone: 'navy' },
    { label: 'Onboarding started', value: metrics.onboardingStarted, note: 'Users progressing through setup', icon: Phone, tone: 'gold' },
    { label: 'Account complete', value: metrics.complete, note: 'NSE account is active', icon: Mail, tone: 'teal' },
  ], [metrics]);

  return (
    <section className="admin-leads" aria-label="User leads">
      <div className="admin-leads-disclosure" role="note">
        <span className="admin-leads-disclosure-mark" aria-hidden="true">i</span>
        <p><strong>Live user leads</strong> — all registered users appear here, from account creation through completed NSE onboarding.</p>
      </div>

      <div className="admin-leads-kpis">
        {kpis.map(({ label, value, note, icon: Icon, tone }) => (
          <article className={`admin-leads-kpi admin-leads-kpi-${tone}`} key={label}>
            <div className="admin-leads-kpi-top"><span>{label}</span><Icon size={17} aria-hidden="true" /></div>
            <div className="admin-leads-kpi-value">{value}</div>
            <p>{note}</p>
          </article>
        ))}
      </div>

      <section className="admin-leads-registry" aria-label="Registered user leads">
        <div className="admin-leads-registry-head">
          <div>
            <span className="admin-leads-eyebrow">Registry</span>
            <h2>User leads <span>{total}</span></h2>
            <p>Search every user who has created an account and review their onboarding progress.</p>
          </div>
          <button type="button" className="admin-leads-export" onClick={exportCsv} disabled={!leads.length || loading}>
            <Download size={15} aria-hidden="true" /> Export this page
          </button>
        </div>

        <div className="admin-leads-controls">
          <label className="admin-leads-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search user leads</span>
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search name, email, phone or user ID" />
          </label>
          <label className="admin-leads-select">
            <span>Onboarding progress</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }} aria-label="Filter user leads by onboarding progress">
              <option value="all">All user leads</option>
              <option value="account-created">Account created</option>
              <option value="onboarding-started">Onboarding started</option>
              <option value="complete">Account complete</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="admin-leads-disclosure admin-leads-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setRetryCount((current) => current + 1)}>Retry</button>
          </div>
        )}

        <div className="admin-leads-table-wrap" aria-busy={loading}>
          <table className="admin-leads-table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">User ID</th>
                <th scope="col">Phone</th>
                <th scope="col">Onboarding</th>
                <th scope="col">Joined</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="admin-leads-empty"><strong>Loading user leads…</strong></td></tr>
              ) : leads.length ? leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div className="admin-leads-person">
                      <span className="admin-leads-avatar" aria-hidden="true">{String(lead.name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                      <span><strong>{lead.name}</strong><small>{lead.email}</small></span>
                    </div>
                  </td>
                  <td>#{lead.id}</td>
                  <td>{lead.phone || '—'}</td>
                  <td><span className={`admin-leads-status admin-leads-status-${lead.stage}`}>{lead.stage === 'complete' ? 'Account complete' : lead.stage === 'onboarding-started' ? 'Onboarding started' : 'Account created'}</span></td>
                  <td><span className="admin-leads-date">{formatDate(lead.createdAt)}</span></td>
                  <td>
                    <button type="button" className="admin-leads-view" onClick={(event) => { openerRef.current = event.currentTarget; setSelectedLead(lead); }} aria-label={`View user lead ${lead.name}`}>
                      View <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="admin-leads-empty"><strong>{error ? 'User leads could not be loaded' : 'No user leads found'}</strong><span>{error ? 'Retry after checking the server connection.' : 'Newly registered users will appear here.'}</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-leads-mobile-list" aria-busy={loading}>
          {loading ? (
            <div className="admin-leads-mobile-empty"><strong>Loading user leads…</strong></div>
          ) : leads.length ? leads.map((lead) => (
            <article className="admin-leads-mobile-card" key={lead.id}>
              <div className="admin-leads-mobile-card-top">
                <div className="admin-leads-person">
                  <span className="admin-leads-avatar" aria-hidden="true">{String(lead.name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <span><strong>{lead.name}</strong><small>{lead.email}</small></span>
                </div>
                <span className={`admin-leads-status admin-leads-status-${lead.stage}`}>{lead.stage === 'complete' ? 'Complete' : lead.stage === 'onboarding-started' ? 'In progress' : 'Account created'}</span>
              </div>
              <div className="admin-leads-mobile-card-meta">
                <span><small>User ID</small><strong>#{lead.id}</strong></span>
                <span><small>Phone</small><strong>{lead.phone || '—'}</strong></span>
                <span><small>Joined</small><strong>{formatDate(lead.createdAt)}</strong></span>
              </div>
              <div className="admin-leads-mobile-card-foot">
                <span className="admin-leads-no-due">User account</span>
                <button type="button" className="admin-leads-view" onClick={(event) => { openerRef.current = event.currentTarget; setSelectedLead(lead); }}>
                  View <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </article>
          )) : (
            <div className="admin-leads-mobile-empty">
              <strong>{error ? 'User leads could not be loaded' : 'No user leads found'}</strong>
              <span>{error ? 'Retry after checking the server connection.' : 'Newly registered users will appear here.'}</span>
            </div>
          )}
        </div>

        <div className="admin-leads-registry-foot">
          <span>Showing {total ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} users</span>
          <span className="admin-leads-pagination">
            <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading} aria-label="Previous page"><ArrowLeft size={14} /></button>
            <span>Page {total ? page + 1 : 0} of {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page + 1 >= pageCount || loading} aria-label="Next page"><ArrowRight size={14} /></button>
          </span>
        </div>
      </section>

      {selectedLead && (
        <div className="admin-leads-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLead(null); }}>
          <section className="admin-leads-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-leads-dialog-title" tabIndex="-1">
            <div className="admin-leads-dialog-head">
              <div><span className="admin-leads-eyebrow">User lead · #{selectedLead.id}</span><h2 id="admin-leads-dialog-title">{selectedLead.name}</h2></div>
              <button type="button" ref={closeButtonRef} className="admin-leads-dialog-close" onClick={() => setSelectedLead(null)} aria-label="Close user details"><X size={18} /></button>
            </div>
            <p className="admin-leads-dialog-note">{selectedLead.stage === 'complete' ? 'This user has completed account onboarding and has an active NSE account.' : selectedLead.stage === 'onboarding-started' ? 'This user has started account onboarding, but the NSE account is not active yet.' : 'This user created an account but has not started account onboarding yet.'}</p>
            <dl className="admin-leads-dialog-details">
              <div><dt>Email</dt><dd>{selectedLead.email || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{selectedLead.phone || '—'}</dd></div>
              <div><dt>Account opening</dt><dd>{selectedLead.accountOpeningStatus}</dd></div>
              <div><dt>NSE status</dt><dd>{selectedLead.nseStatus}</dd></div>
              <div><dt>PAN verified</dt><dd>{selectedLead.isVerified ? 'Yes' : 'No'}</dd></div>
              <div><dt>UCC registered</dt><dd>{selectedLead.nseUccRegistered ? 'Yes' : 'No'}</dd></div>
              <div><dt>FATCA</dt><dd>{selectedLead.fatcaStatus}</dd></div>
              <div><dt>Joined</dt><dd>{formatDate(selectedLead.createdAt)}</dd></div>
            </dl>
            {selectedLead.email && <a className="admin-leads-email" href={`mailto:${selectedLead.email}`}><Mail size={15} aria-hidden="true" /> Compose email <ArrowRight size={14} aria-hidden="true" /></a>}
            {selectedLead.phone && <a className="admin-leads-email" href={`tel:${selectedLead.phone}`}><Phone size={15} aria-hidden="true" /> Call user <ArrowRight size={14} aria-hidden="true" /></a>}
          </section>
        </div>
      )}
    </section>
  );
};

export default AdminLeadsPanel;
