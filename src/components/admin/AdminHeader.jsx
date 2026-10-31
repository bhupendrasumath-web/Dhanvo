import { LogOut, Menu, RefreshCw, ShieldCheck } from 'lucide-react';

const AdminHeader = ({ onMenuClick, onRefresh, refreshing, onSignOut }) => (
  <header className="top" style={{ padding: '12px 28px', background: '#071d32', borderBottom: '1px solid rgba(156, 176, 198, 0.16)' }}>
    <button type="button" className="icon-btn menu lg:hidden" onClick={onMenuClick} aria-label="Open admin navigation" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: '#edf4ff' }}>
      <Menu className="h-5 w-5" />
    </button>

    <div className="top-right" style={{ marginLeft: 'auto' }}>
      <button type="button" onClick={onRefresh} disabled={refreshing} className="icon-btn" title="Refresh dashboard" aria-label="Refresh dashboard" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: '#edf4ff' }}>
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>

      <div className="user" style={{ paddingRight: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none', color: '#edf4ff' }}>
        <span className="avatar" aria-hidden="true" style={{ background: '#0d5e57', color: '#fff' }}><ShieldCheck className="h-4 w-4" /></span>
        <span className="meta" style={{ display: 'block' }}><b>Admin session</b><span>Authenticated</span></span>
      </div>

      <button type="button" onClick={onSignOut} className="btn ghost sm" style={{ borderRadius: '999px', background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: '#edf4ff', boxShadow: 'none' }}>
        <LogOut className="h-3.5 w-3.5" />
        <span>Sign out</span>
      </button>
    </div>
  </header>
);

export default AdminHeader;
