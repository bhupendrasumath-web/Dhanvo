import { useState } from 'react';
import AdminHeader from '../components/admin/AdminHeader';
import AdminLogin from '../components/admin/AdminLogin';
import AdminOperationsPanel from '../components/admin/AdminOperationsPanel';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminStatCard from '../components/admin/AdminStatCard';
import AdminUsersTable from '../components/admin/AdminUsersTable';
import { activityFeed, adminHelpItems, adminMetrics, adminUsers } from '../components/admin/adminData';

const AdminPortal = () => {
  const [authenticated, setAuthenticated] = useState(localStorage.getItem('dhanvo_admin_session') === 'active');
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!authenticated) return <AdminLogin onSuccess={() => setAuthenticated(true)} />;

  return <div className="min-h-screen bg-dark-950 text-white flex"><AdminSidebar activeSection={activeSection} setActiveSection={setActiveSection} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />{sidebarOpen && <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close admin overlay" />}<main className="flex-1 min-w-0"><AdminHeader onMenuClick={() => setSidebarOpen(true)} /><div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-primary-400 text-xs uppercase tracking-[0.2em]">Dhanvo operations</p><h2 className="text-3xl sm:text-4xl font-display font-bold mt-2">Control room</h2><p className="text-dark-400 mt-2">A focused view of onboarding health, user activity and investment operations.</p></div><span className="px-3 py-2 rounded-lg bg-accent-emerald/10 text-accent-emerald text-xs border border-accent-emerald/20">System operational</span></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{adminMetrics.map((metric) => <AdminStatCard key={metric.label} {...metric} />)}</div><div className="space-y-6"><AdminUsersTable users={adminUsers} /><AdminOperationsPanel activity={activityFeed} helpItems={adminHelpItems} /></div></div></main></div>;
};

export default AdminPortal;
