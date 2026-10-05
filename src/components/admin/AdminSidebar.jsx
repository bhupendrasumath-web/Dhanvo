import { useNavigate } from 'react-router-dom';
import { Activity, BarChart3, FileText, LayoutDashboard, LogOut, Settings, Users, X } from 'lucide-react';

const AdminSidebar = ({ activeSection, setActiveSection, isOpen, onClose }) => {
  const navigate = useNavigate();
  const items = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users & UCC', icon: Users },
    { id: 'investments', label: 'Investments', icon: BarChart3 },
    { id: 'activity', label: 'Audit activity', icon: Activity },
  ];

  const logout = () => {
    localStorage.removeItem('dhanvo_admin_session');
    navigate('/tradexadmin2025');
  };

  return <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-800 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="p-5 border-b border-dark-800 flex items-center justify-between"><div><p className="text-white text-lg font-display font-bold">DHANVO</p><p className="text-primary-400 text-[10px] tracking-[0.2em] uppercase">Admin control</p></div><button className="lg:hidden text-dark-400" onClick={onClose} aria-label="Close admin navigation"><X className="w-5 h-5" /></button></div>
    <nav className="p-3 flex-1"><p className="px-3 pt-3 pb-2 text-[10px] text-dark-600 uppercase tracking-[0.2em]">Workspace</p>{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setActiveSection(id); onClose?.(); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${activeSection === id ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}><Icon className="w-4 h-4" />{label}</button>)}</nav>
    <div className="p-3 border-t border-dark-800"><button onClick={logout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-dark-400 hover:text-accent-rose hover:bg-dark-800/60"><LogOut className="w-4 h-4" />Sign out</button></div>
  </aside>;
};

export default AdminSidebar;
