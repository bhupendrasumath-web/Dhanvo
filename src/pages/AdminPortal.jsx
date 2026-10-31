import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList, PackageCheck, ShieldCheck, Target, UsersRound, WalletCards, X } from 'lucide-react';
import AdminHeader from '../components/admin/AdminHeader';
import AdminLogin from '../components/admin/AdminLogin';
import AdminDashboardSections from '../components/admin/AdminDashboardSections';
import AdminOperationsPanel from '../components/admin/AdminOperationsPanel';
import AdminPanChecksTable from '../components/admin/AdminPanChecksTable';
import BusinessReferencePanel from '../components/admin/BusinessReferencePanel';
import AdminMfOverview from '../components/admin/AdminMfOverview';
import AdminSipBook from '../components/admin/AdminSipBook';
import AdminRedemptions from '../components/admin/AdminRedemptions';
import AdminMfCategories from '../components/admin/AdminMfCategories';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminUsersTable from '../components/admin/AdminUsersTable';
import AdminStatusTracker from '../components/admin/AdminStatusTracker';
import AdminReportsAnalytics from '../components/admin/AdminReportsAnalytics';
import AdminLeadsPanel from '../components/admin/AdminLeadsPanel';
import { adminHelpItems } from '../components/admin/adminData';
import { getAdminDashboard, getAdminPanChecks, getAdminUser, getAdminUserActivity, getAdminUsers, loginAdmin } from '../services/adminApi';

const metricCards = (metrics = {}) => [
  { label: 'Total AUM', value: '', note: '', icon: WalletCards, destination: 'clients', destinationLabel: 'client accounts' },
  { label: 'Monthly SIP book', value: '', note: '', icon: ChartNoAxesCombined, destination: 'mfhub', destinationLabel: 'mutual fund hub' },
  {
    label: 'Clients',
    value: metrics.registeredUsers ?? '',
    note: metrics.verifiedUsers == null ? '' : `${metrics.verifiedUsers} KYC verified`,
    icon: UsersRound,
    destination: 'clients',
    destinationLabel: 'client accounts',
  },
  { label: 'Active partners', value: '', note: '', icon: BriefcaseBusiness, destination: 'partners', destinationLabel: 'partners' },
  {
    label: 'Leads',
    value: metrics.registeredUsers ?? '',
    note: metrics.registeredUsers == null ? '' : 'registered user leads',
    icon: Target,
    destination: 'leads',
    destinationLabel: 'leads',
  },
  { label: 'Demat in progress', value: '', note: '', icon: ClipboardList, destination: 'demat', destinationLabel: 'demat requests' },
  { label: 'Insurance premium', value: '', note: '', icon: ShieldCheck, destination: 'insurance', destinationLabel: 'insurance' },
  { label: 'Unlisted orders open', value: '', note: '', icon: PackageCheck, destination: 'uorders', destinationLabel: 'unlisted orders' },
];

const shiftDate = (value, days) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const ADMIN_SESSION_KEY = 'dhanvo_admin_token';

const AdminPortal = () => {
  const [session, setSession] = useState(() => {
    const token = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    return token ? { token } : null;
  });
  const [authNotice, setAuthNotice] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [userDestination, setUserDestination] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const detailDialogRef = useRef(null);
  const detailCloseButtonRef = useRef(null);
  const reviewTriggerRef = useRef(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityHasLoaded, setActivityHasLoaded] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [userActivity, setUserActivity] = useState([]);
  const [activityRange, setActivityRange] = useState(() => {
    const today = new Date();
    const toDate = today.toISOString().slice(0, 10);
    const fromDate = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    return { fromDate, toDate };
  });
  const [userPage, setUserPage] = useState({ total: 0, limit: 50, offset: 0, search: '', filter: 'all' });
  const [panChecks, setPanChecks] = useState([]);
  const [panChecksLoading, setPanChecksLoading] = useState(false);
  const [panChecksError, setPanChecksError] = useState('');
  const [panChecksPage, setPanChecksPage] = useState({ total: 0, limit: 50, offset: 0, verified: 'all' });
  const [activityDateError, setActivityDateError] = useState('');

  const refreshDashboard = useCallback(async (token) => {
    if (!token) return;
    setRefreshing(true);
    setError('');
    try {
      const response = await getAdminDashboard(token);
      if (!response.success) throw new Error(response.message || 'Unable to load dashboard');
      setDashboard(response.data);
      setUsers(response.data.users || []);
      setUserPage({ ...(response.data.userPage || { total: response.data.metrics?.registeredUsers ?? 0, limit: 50, offset: 0 }), search: '', filter: 'all' });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setSession(null);
        setDashboard(null);
        setSelectedUser(null);
        setError('');
        setAuthNotice('Your previous admin session is no longer valid. Sign in again with your admin credentials.');
      } else {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load admin data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.token) return undefined;
    setLoading(true);
    refreshDashboard(session.token);
    return undefined;
  }, [session, refreshDashboard]);

  const signIn = async (email, password) => {
    const response = await loginAdmin(email, password);
    const token = response?.data?.token;
    if (!response?.success || !token) {
      throw new Error(response?.message || 'The server did not issue an admin session.');
    }
    setDashboard(null);
    setError('');
    setAuthNotice('');
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, token);
    setSession({ token });
  };

  const signOut = useCallback((notice = '') => {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setSession(null);
    setDashboard(null);
    setSelectedUser(null);
    setError('');
    setAuthNotice(notice);
  }, []);

  const loadUserPage = async (offset, search = userPage.search, filter = userPage.filter || 'all') => {
    if (!session?.token) return;
    setUsersLoading(true);
    setError('');
    try {
      const response = await getAdminUsers(session.token, { limit: userPage.limit, offset, search, filter });
      if (!response.success) throw new Error(response.message || 'Unable to load users');
      setUsers(response.data.users);
      setUserPage({ ...response.data, search, filter });
    } catch (requestError) {
      if (requestError.response?.status === 401) signOut('Your admin session is no longer valid. Sign in again with your admin credentials.');
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load user records.');
    } finally {
      setUsersLoading(false);
    }
  };

  const navigateSection = (section) => {
    setActiveSection(section);
    setUserDestination(null);
    if (section === 'clients') {
      setUserPage((current) => ({ ...current, offset: 0, search: '', filter: 'all' }));
      loadUserPage(0, '', 'all');
    }
  };

  const loadPanCheckPage = async (offset, verified = panChecksPage.verified) => {
    if (!session?.token) return;
    setPanChecksLoading(true);
    setPanChecksError('');
    try {
      const response = await getAdminPanChecks(session.token, { limit: panChecksPage.limit, offset, verified });
      if (!response.success) throw new Error(response.message || 'Unable to load PAN KYC checks');
      setPanChecks(response.data.checks || []);
      setPanChecksPage({ ...response.data, verified });
    } catch (requestError) {
      setPanChecks([]);
      if (requestError.response?.status === 401) signOut('Your admin session is no longer valid. Sign in again with your admin credentials.');
      setPanChecksError(requestError.response?.data?.message || requestError.message || 'Unable to load PAN KYC check rows.');
    } finally {
      setPanChecksLoading(false);
    }
  };

  const openMetricDestination = (card) => {
    setError('');
    if (card.destination === 'ucc-overview') {
      setUserDestination(null);
      setActiveSection('uccOverview');
      return;
    }
    if (card.destination === 'pan-checks') {
      setUserDestination(null);
      setActiveSection('panChecks');
      setPanChecksPage((current) => ({ ...current, offset: 0, verified: 'all' }));
      loadPanCheckPage(0, 'all');
      return;
    }
    setActiveSection('users');
    setUserDestination(card.label);
    setUserPage((current) => ({ ...current, search: '', offset: 0, filter: card.filter }));
    loadUserPage(0, '', card.filter);
  };

  useEffect(() => {
    if (!selectedUser) return undefined;
    detailCloseButtonRef.current?.focus();
    const dialog = detailDialogRef.current;
    const handleDialogKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedUser(null);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      if (reviewTriggerRef.current?.isConnected) reviewTriggerRef.current.focus();
      reviewTriggerRef.current = null;
    };
  }, [selectedUser]);

  const reviewUser = async (userId, trigger) => {
    if (!session?.token) return;
    reviewTriggerRef.current = trigger || null;
    setSelectedUser(null);
    setUserActivity([]);
    setActivityError('');
    setActivityHasLoaded(false);
    setDetailLoading(true);
    try {
      const response = await getAdminUser(session.token, userId);
      if (!response.success) throw new Error(response.message || 'Unable to load user record');
      setSelectedUser(response.data);
      await refreshUserActivity(userId);
    } catch (requestError) {
      if (requestError.response?.status === 401) signOut('Your admin session is no longer valid. Sign in again with your admin credentials.');
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load user record.');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshUserActivity = async (userId = selectedUser?.id, range = activityRange) => {
    if (!session?.token || !userId) return;
    const from = new Date(`${range.fromDate}T00:00:00.000Z`);
    const to = new Date(`${range.toDate}T00:00:00.000Z`);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to || ((to - from) / 86400000) + 1 > 30) {
      setActivityDateError('Choose a valid date range of at most 30 calendar days.');
      return;
    }
    setActivityDateError('');
    setActivityLoading(true);
    setActivityError('');
    setActivityHasLoaded(false);
    try {
      const response = await getAdminUserActivity(session.token, userId, range);
      if (!response.success) throw new Error(response.message || 'Unable to load NSE allotment activity.');
      setUserActivity(response.data.activity || []);
    } catch (requestError) {
      setUserActivity([]);
      if (requestError.response?.status === 401) signOut('Your admin session is no longer valid. Sign in again with your admin credentials.');
      setActivityError(requestError.response?.data?.message || requestError.message || 'Unable to load NSE allotment activity.');
    } finally {
      setActivityLoading(false);
      setActivityHasLoaded(true);
    }
  };

  if (!session) return <AdminLogin onSuccess={signIn} notice={authNotice} />;

  const metrics = dashboard?.metrics || {};
  const isInitialLoad = loading && !dashboard;
  const dashboardMetrics = metricCards(metrics);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const sectionCopy = {
    dashboard: ['Dhanvo operations', 'All-time account metrics and server-protected operations.'],
    overview: ['Control room', 'All-time account metrics and server-protected operations.'],
    tracker: ['Status Tracker', 'Review protected user account-onboarding records and their reported PAN, UCC, account-opening, and FATCA statuses.'],
    reports: ['Reports & Analytics', 'All-time registered account and recorded PAN check counts.'],
    mfhub: ['MF Overview', 'Protected NSE plan registrations and recent allotment activity. Metrics cover only reports returned for registered-UCC accounts.'],
    mfCategories: ['Mutual Fund Categories', 'Manage the fixed Explorer categories, individual NSE schemes, and featured collections published to investors.'],
    sip: ['SIP Book', 'Systematic Investment Plans — live report fields only. Expected installments are not confirmed bank debits.'],
    redemptions: ['Redemptions', 'Reported redemption and switch-out activity from NSE allotment reports — not pending redemption requests.'],
    partners: ['Partner network', 'Reference landing area for partner onboarding and relationships.'],
    leads: ['User leads', 'Review every registered user and track account-onboarding progress.'],
    demat: ['Demat requests', 'Reference landing area for application and activation workflows.'],
    insurance: ['Insurance', 'Reference landing area for policy servicing and premium review.'],
    uorders: ['Unlisted orders', 'Reference landing area for unlisted order follow-up.'],
    uccOverview: ['UCC registration', 'All-time database counts for registered and unregistered UCC accounts.'],
    users: ['Users & UCC', 'Search account onboarding records and review an individual account.'],
    clients: ['User accounts', 'Search protected database user accounts and review an individual account.'],
    panChecks: ['PAN KYC checks', 'Review paginated KYC check rows with masked investor identifiers.'],
    investments: ['Investments', 'Select an account to view its NSE allotment activity for a chosen date range. This is not a global activity feed or current holdings view.'],
  }[activeSection] || ['Dhanvo operations', 'All-time account metrics and server-protected operations.'];
  const userTableTitle = userDestination
    ? userDestination === 'UCC coverage' ? 'UCC coverage · user accounts' : `${userDestination} · accounts`
    : activeSection === 'clients' ? 'User accounts' : 'Users & UCC';
  const userTableDescription = userDestination === 'UCC coverage'
    ? `${metrics.registeredUcc ?? '—'} accounts have a registered UCC; ${metrics.unregisteredUcc ?? '—'} do not. Browse the complete paginated user list.`
    : userDestination
      ? `All-time KPI destination. The paginated list below is filtered to ${userDestination.toLowerCase()}.`
      : activeSection === 'clients'
        ? 'Protected database user accounts. These account records do not include client AUM or business analytics.'
        : 'Search account onboarding records and review an individual account.';

  return (
    <div className="app" style={{ minHeight: '100vh' }}>
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={navigateSection}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={signOut}
      />
      {sidebarOpen && <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close admin overlay" />}
      <div className="main">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} onRefresh={() => refreshDashboard(session.token)} refreshing={refreshing} onSignOut={signOut} />
        <main className="view" style={{ maxWidth: 1320 }}>
          {activeSection !== 'dashboard' && (
            <div className="phead">
              <div>
                <div className="kicker">                {activeSection === 'leads' ? 'Business · user leads' : activeSection === 'mfCategories' ? 'Administration · Explorer publication' : 'Dhanvo operations'}</div>
                <h1>{sectionCopy[0]}</h1>
                <p>{sectionCopy[1]}</p>
              </div>
              <div className="acts">
                <span className="btn ghost sm">
                  {activeSection === 'leads' ? 'Server-authenticated' : ['partners', 'demat', 'insurance', 'uorders'].includes(activeSection) ? 'Reference view' : activeSection === 'mfCategories' ? 'Protected settings' : ['mfhub', 'sip', 'redemptions'].includes(activeSection) ? 'Live NSE reports' : 'Server-authenticated'}
                </span>
              </div>
            </div>
          )}

          {error && !['users', 'clients', 'investments'].includes(activeSection) && (
            <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-[rgba(180,68,47,0.18)] bg-[var(--admin-bad-bg)] p-4 text-sm text-[var(--admin-bad)]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => refreshDashboard(session.token)} className="text-xs font-semibold underline">Retry</button>
            </div>
          )}

          {(activeSection === 'dashboard' || activeSection === 'overview') && (
            <div className="mb-6 dashboard-shell">
              <section className="dashboard-hero">
                <div className="dashboard-hero-copy">
                  <h2>{greeting}, <span>Dhanvo</span></h2>
                  <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Dhanlakshya Securities Pvt. Ltd. · Admin console</p>
                </div>
                <div className="dashboard-hero-actions">
                  <button type="button" className="gold-pill" onClick={() => navigateSection('partners')}>
                    <BriefcaseBusiness size={16} aria-hidden="true" />
                    <span>Add partner</span>
                  </button>
                  <button type="button" className="light-pill" onClick={() => navigateSection('leads')}>
                    <Target size={16} aria-hidden="true" />
                    <span>Leads</span>
                  </button>
                </div>
              </section>

              <div className="dashboard-grid">
                {dashboardMetrics.map((card) => {
                  const Icon = card.icon;
                  return (
                  <button
                    key={card.label}
                    type="button"
                    className="dashboard-stat dashboard-stat-action"
                    onClick={() => navigateSection(card.destination)}
                    aria-label={`${card.label}${card.value !== '' ? `: ${card.value}` : ''}${card.note ? `. ${card.note}` : ''}. Open ${card.destinationLabel}.`}
                  >
                    <div className="dashboard-stat-header">
                      <span className="dashboard-stat-icon" aria-hidden="true"><Icon /></span>
                      <span>{card.label}</span>
                    </div>
                    <div className="dashboard-stat-value">{card.value}</div>
                    <div className="dashboard-stat-note">{card.note}</div>
                  </button>
                  );
                })}
              </div>

              <AdminDashboardSections
                recentUsers={dashboard?.users || []}
                onViewAllUsers={() => navigateSection('leads')}
                onViewStatusTracker={() => navigateSection('tracker')}
                failedAccountProcesses={dashboard?.metrics?.failedAccountProcesses}
                attentionLoading={loading || refreshing || !dashboard}
                attentionUnavailable={Boolean(error)}
              />
            </div>
          )}

          {activeSection === 'leads' && <AdminLeadsPanel token={session.token} onUnauthorized={signOut} />}

          {activeSection === 'mfhub' && <AdminMfOverview token={session.token} onUnauthorized={signOut} onOpenSipBook={() => navigateSection('sip')} />}
          {activeSection === 'sip' && <AdminSipBook token={session.token} onUnauthorized={signOut} />}
          {activeSection === 'redemptions' && <AdminRedemptions token={session.token} onUnauthorized={signOut} />}
          {activeSection === 'mfCategories' && <AdminMfCategories token={session.token} onUnauthorized={signOut} />}

          {['partners', 'demat', 'insurance', 'uorders'].includes(activeSection) && (
            <BusinessReferencePanel section={activeSection} onBack={() => navigateSection('dashboard')} />
          )}

          {activeSection === 'uccOverview' && (
            <section className="admin-record-card">
              <div className="admin-record-header">
                <div>
                  <p className="admin-record-kicker">All-time account metrics</p>
                  <h2>UCC registration</h2>
                  <p className="admin-record-description">Database account counts for UCC registration. Select a view below to browse the full paginated user registry.</p>
                </div>
              </div>
              <div className="admin-coverage-grid">
                {[
                  { label: 'All registered users', value: metrics.registeredUsers ?? '—', note: 'All-time account total', filter: 'all' },
                  { label: 'UCC registered', value: metrics.registeredUcc ?? '—', note: 'All-time user accounts', filter: 'ucc-registered' },
                  { label: 'UCC not registered', value: metrics.unregisteredUcc ?? '—', note: 'All-time user accounts', filter: 'ucc-unregistered' },
                ].map((item) => (
                  <article className="admin-coverage-tile" key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.note}</small>
                    </div>
                    <button
                      type="button"
                      className="admin-coverage-action"
                      onClick={() => openMetricDestination({ label: item.label, filter: item.filter })}
                    >
                      View records <ArrowUpRight aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {(activeSection === 'clients' || activeSection === 'users' || activeSection === 'investments') && (
            <div className="space-y-6">
              <AdminUsersTable
                users={users}
                loading={isInitialLoad || usersLoading}
                unavailable={Boolean(error)}
                onReview={reviewUser}
                reviewLabel={activeSection === 'investments' ? 'View investments' : 'Review'}
                title={activeSection === 'investments' ? 'Select account for investment activity' : userTableTitle}
                description={activeSection === 'investments' ? sectionCopy[1] : userTableDescription}
                error={error}
                onRetry={() => loadUserPage(userPage.offset, userPage.search, userPage.filter || 'all')}
                onSearch={(search) => loadUserPage(0, search)}
                search={userPage.search}
                filter={userPage.filter || 'all'}
                onFilterChange={(filter) => {
                  setUserDestination(null);
                  setUserPage((current) => ({ ...current, offset: 0, search: '', filter }));
                  loadUserPage(0, '', filter);
                }}
                total={userPage.total}
                limit={userPage.limit}
                offset={userPage.offset}
                onPageChange={(offset) => loadUserPage(offset, userPage.search, userPage.filter || 'all')}
              />
            </div>
          )}

          {activeSection === 'panChecks' && (
            <AdminPanChecksTable
              checks={panChecks}
              loading={panChecksLoading}
              unavailable={Boolean(panChecksError)}
              error={panChecksError}
              onRetry={() => loadPanCheckPage(panChecksPage.offset, panChecksPage.verified)}
              verified={panChecksPage.verified}
              total={panChecksPage.total}
              limit={panChecksPage.limit}
              offset={panChecksPage.offset}
              onVerifiedChange={(verified) => {
                setPanChecksPage((current) => ({ ...current, offset: 0, verified }));
                loadPanCheckPage(0, verified);
              }}
              onPageChange={(offset) => loadPanCheckPage(offset, panChecksPage.verified)}
            />
          )}

          {activeSection === 'tracker' && <AdminStatusTracker token={session.token} onUnauthorized={signOut} />}
          {activeSection === 'reports' && <AdminReportsAnalytics metrics={dashboard?.metrics} onNavigate={navigateSection} />}

          {activeSection === 'overview' && <AdminOperationsPanel userCount={metrics.registeredUsers} refreshedAt={dashboard?.refreshedAt} helpItems={adminHelpItems} />}
        </main>
      </div>

      {detailLoading && <div role="status" className="fixed bottom-5 right-5 z-[60] rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-3 text-sm text-[var(--admin-muted)] shadow-xl">Loading protected user record…</div>}
      {selectedUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
          <section ref={detailDialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-user-title" tabIndex="-1" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--admin-gold)]">Protected user record</p><h2 id="admin-user-title" className="mt-2 font-display text-2xl font-bold text-[var(--admin-text)]">{selectedUser.name}</h2></div>
              <button ref={detailCloseButtonRef} type="button" onClick={() => setSelectedUser(null)} aria-label="Close user details" className="rounded-lg p-2 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"><X className="h-5 w-5" /></button>
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Account ID</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">{selectedUser.id}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Email</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">{selectedUser.email}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Phone</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">•••• {selectedUser.phoneLastFour}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">NSE UCC</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">{selectedUser.nseUccRegistered ? 'Registered' : 'Not registered'}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Account status</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">{selectedUser.accountOpeningStatus || 'Pending'}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">PAN verification</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">{selectedUser.isVerified ? 'Verified' : 'Not verified'}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">FATCA status</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">{(selectedUser.fatcaStatus || 'NOT_SUBMITTED').replaceAll('_', ' ')}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Joined</dt><dd className="mt-1 text-sm text-[var(--admin-text)]">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '—'}</dd></div>
            </dl>
            <p className="mt-6 border-t border-[var(--admin-line)] pt-4 text-xs leading-relaxed text-[var(--admin-muted)]">Sensitive identity fields, credentials, OTPs, and raw verification responses are not available in this view.</p>
            <section className="mt-6 border-t border-[var(--admin-line)] pt-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--admin-gold)]">NSE allotment activity</p><h3 className="mt-1 text-lg font-semibold text-[var(--admin-text)]">Activity in chosen date range</h3></div>
                <form onSubmit={(event) => { event.preventDefault(); refreshUserActivity(selectedUser.id); }} className="flex flex-wrap items-end gap-2">
                  <label className="text-[11px] text-[var(--admin-muted)]">From<input required type="date" value={activityRange.fromDate} min={shiftDate(activityRange.toDate, -29)} max={activityRange.toDate} onChange={(event) => setActivityRange((range) => ({ ...range, fromDate: event.target.value }))} className="mt-1 block rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-2)] px-2 py-1.5 text-xs text-[var(--admin-text)]" /></label>
                  <label className="text-[11px] text-[var(--admin-muted)]">To<input required type="date" value={activityRange.toDate} max={shiftDate(activityRange.fromDate, 29) < new Date().toISOString().slice(0, 10) ? shiftDate(activityRange.fromDate, 29) : new Date().toISOString().slice(0, 10)} min={activityRange.fromDate} onChange={(event) => setActivityRange((range) => ({ ...range, toDate: event.target.value }))} className="mt-1 block rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-2)] px-2 py-1.5 text-xs text-[var(--admin-text)]" /></label>
                  <button type="submit" disabled={activityLoading} className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--admin-gold)] hover:text-[var(--admin-text)] disabled:opacity-50">{activityLoading ? 'Loading…' : 'Refresh'}</button>
                </form>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--admin-muted)]">NSE allotment statement activity only—not current holdings, portfolio valuation, or returns. The selected range includes both dates and is limited to 30 calendar days.</p>
              {activityDateError && <p role="alert" className="mt-3 text-sm text-[var(--admin-bad)]">{activityDateError}</p>}
              {activityError && <p role="alert" className="mt-3 rounded-lg border border-[rgba(180,68,47,0.18)] bg-[var(--admin-bad-bg)] p-3 text-sm text-[var(--admin-bad)]">{activityError}</p>}
              {activityLoading && <p role="status" className="mt-4 text-sm text-[var(--admin-muted)]">Loading NSE allotment activity…</p>}
              {!activityLoading && activityHasLoaded && !activityError && userActivity.length === 0 && <p className="mt-4 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-2)] p-4 text-sm text-[var(--admin-muted)]">No NSE allotment activity found for this date range.</p>}
              {!activityLoading && userActivity.length > 0 && (
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {userActivity.map((item, index) => (
                    <article key={`${item.orderId}-${item.schemeCode}-${index}`} className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-2)] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-[var(--admin-text)]">{item.schemeName || item.schemeCode || 'NSE scheme'}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{item.orderDate || item.date || 'Date unavailable'}{item.orderId ? ` · Order ${item.orderId}` : ''}</p></div><span className="rounded-md bg-[rgba(29,111,100,0.12)] px-2 py-1 text-xs font-semibold text-[var(--admin-ok)]">{item.transactionType || item.orderType || 'Allotment'}</span></div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                        <div><dt className="text-[var(--admin-muted)]">Amount</dt><dd className="mt-0.5 text-[var(--admin-text)]">{item.amount || '—'}</dd></div>
                        <div><dt className="text-[var(--admin-muted)]">Allotted units</dt><dd className="mt-0.5 text-[var(--admin-text)]">{item.allottedUnits || '—'}</dd></div>
                        <div><dt className="text-[var(--admin-muted)]">Allotted NAV</dt><dd className="mt-0.5 text-[var(--admin-text)]">{item.allottedNav || '—'}</dd></div>
                        <div><dt className="text-[var(--admin-muted)]">Folio</dt><dd className="mt-0.5 text-[var(--admin-text)]">{item.folioNumber || '—'}</dd></div>
                        <div><dt className="text-[var(--admin-muted)]">Settlement</dt><dd className="mt-0.5 text-[var(--admin-text)]">{item.settlementType || '—'}</dd></div>
                        <div><dt className="text-[var(--admin-muted)]">Updated</dt><dd className="mt-0.5 text-[var(--admin-text)]">{item.lastUpdated || '—'}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
