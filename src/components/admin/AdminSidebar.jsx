import {
  BarChart3,
  ChartNoAxesCombined,
  ClipboardList,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  MousePointerClick,
  SlidersHorizontal,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

const AdminSidebar = ({ activeSection, setActiveSection, isOpen, onClose, onLogout }) => {
  const overviewItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },

    { id: 'tracker', label: 'Status Tracker', icon: ClipboardList },
    { id: 'reports', label: 'Reports & Analytics', icon: ChartNoAxesCombined },
  ];

  const businessItems = [
    { id: 'clients', label: 'User Accounts', icon: Users },
    { id: 'leads', label: 'User Leads', icon: MousePointerClick },
    { id: 'demat', label: 'Demat Requests', icon: WalletCards },
    // { id: 'tickets', label: 'Support Tickets', icon: ReceiptText },
  ];

  const fundsItems = [
    { id: 'mfhub', label: 'MF Overview', icon: BarChart3 },
    { id: 'sip', label: 'SIP', icon: TrendingUp },
    { id: 'lumpsum', label: 'Lumpsum', icon: Gift },
    { id: 'swp', label: 'SWP', icon: FileText },
    { id: 'stp', label: 'STP', icon: FileText },
    { id: 'redemptions', label: 'Redemptions', icon: TrendingUp },
  ];

  const adminItems = [
    { id: 'mfCategories', label: 'Mutual Fund Categories', icon: SlidersHorizontal },
    { id: 'uccOverview', label: 'Account Metrics', icon: ChartNoAxesCombined },
    // { id: 'panChecks', label: 'PAN KYC Checks', icon: ShieldCheck },
    // { id: 'team', label: 'Team & Roles', icon: Users },
    // { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
    // { id: 'cms', label: 'Website CMS', icon: FileText },
    // { id: 'settings', label: 'Company Settings', icon: BriefcaseBusiness },
    // { id: 'logins', label: 'Login Activity', icon: ClipboardList, badge: 3 },
    // { id: 'activity', label: 'Activity Log', icon: TrendingUp },
  ];

  const renderNav = (items, title) => (
    <div className="nav-group" key={title}>
      <h6>{title}</h6>
      {items.map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          type="button"
          onClick={() => { setActiveSection(id); onClose?.(); }}
          className={activeSection === id ? 'active' : ''}
          style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', font: 'inherit', padding: '9px 10px', borderRadius: '10px' }}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
          {badge ? <span className="nav-badge">{badge}</span> : null}
        </button>
      ))}
    </div>
  );

  return (
    <aside className="side">
      <div className="flex items-center justify-between gap-3 px-2">
        <a href="#/dashboard" className="brand" style={{ padding: '4px 8px 18px' }}>
          <span className="mark">D</span>
          <span>
            <b>Dhanvo</b>
            <small>Admin Console</small>
          </span>
        </a>
        <button className="icon-btn sm lg:hidden" onClick={onClose} aria-label="Close admin navigation" style={{ background: 'transparent', borderColor: 'rgba(159,179,200,.2)', color: 'white' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="nav" style={{ padding: '0 3px' }}>
        {renderNav(overviewItems, 'Overview')}
        {renderNav(businessItems, 'Business')}
        {renderNav(fundsItems, 'Mutual Funds')}
        {renderNav(adminItems, 'Administration')}
      </nav>

      <div className="side-foot" style={{ marginTop: 'auto', padding: '16px 12px 10px' }}>
        <div className="side-company" style={{ color: '#d8e4f0', fontSize: '0.78rem', lineHeight: 1.5, opacity: 0.9 }}>
          <div>Dhanlakshya Securities Pvt. Ltd.</div>
          <a href="https://www.dhanvo.in" target="_blank" rel="noreferrer" style={{ color: '#c9d5e4', textDecoration: 'none' }}>www.dhanvo.in</a>
        </div>
        <button onClick={onLogout} className="nav" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 10px', border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
