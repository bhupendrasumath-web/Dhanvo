import { useEffect, useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AccountStatusCard from '../components/dashboard/AccountStatusCard';
import FatcaForm, { FatcaSubmitted } from '../components/dashboard/FatcaForm';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import HoldingsList from '../components/dashboard/HoldingsList';
import MarketOverview from '../components/dashboard/MarketOverview';
import Sidebar from '../components/dashboard/Sidebar';
import StatsCard from '../components/dashboard/StatsCard';
import WatchlistWidget from '../components/dashboard/WatchlistWidget';
import { holdings, indices, portfolioStats, watchlist } from '../components/dashboard/dashboardData';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);
  const status = String(accountStatus?.nseStatus || user?.nseStatus || 'PENDING').toUpperCase();
  const stats = portfolioStats(user);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAccountStatus = async () => {
      try {
        const response = await api.get('/auth/account-opening-status');
        if (mounted && response.data?.success) {
          setAccountStatus(response.data.data);
        }
      } catch {
        // The authenticated user snapshot remains available as a fallback.
      }
    };

    loadAccountStatus();
    const interval = setInterval(loadAccountStatus, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-dark-950">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button type="button" aria-label="Close navigation overlay" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />}

      <main className="flex-1 min-w-0 overflow-auto">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-4 sm:p-6">
          <AccountStatusCard user={user} status={status} remark={accountStatus?.nseStatusRemark} />
          {accountStatus?.nseUccRegistered && status !== 'ACTIVE' && accountStatus.fatcaStatus === 'SUBMITTED' && (
            <FatcaSubmitted remark={accountStatus.fatcaRemark} />
          )}
          {accountStatus?.nseUccRegistered && status !== 'ACTIVE' && accountStatus.fatcaStatus !== 'SUBMITTED' && (
            <FatcaForm user={user} prefill={accountStatus.fatcaPrefill} onSubmitted={(data) => setAccountStatus((current) => ({
              ...current,
              ...data,
              fatcaStatus: 'SUBMITTED',
            }))} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatsCard title="Total Portfolio Value" value={`₹${stats.totalValue.toLocaleString()}`} change={`+₹${stats.todayPL.toLocaleString()}`} changePercent="+2.01%" icon={Wallet} iconBg="bg-gradient-to-br from-primary-500 to-accent-emerald" isPositive />
            <StatsCard title="Total Investment" value={`₹${stats.invested.toLocaleString()}`} change="+₹5,000" changePercent="+0.5%" icon={PieChart} iconBg="bg-gradient-to-br from-accent-cyan to-blue-500" isPositive />
            <StatsCard title="Total Returns" value={`₹${stats.returns.toLocaleString()}`} change="+₹1,456" changePercent="+33.3%" icon={TrendingUp} iconBg="bg-gradient-to-br from-accent-amber to-orange-500" isPositive />
            <StatsCard title="Today's P&L" value={`₹${stats.todayPL.toLocaleString()}`} change="+₹2,456" changePercent="+2.01%" icon={BarChart3} iconBg="bg-gradient-to-br from-purple-500 to-pink-500" isPositive />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><HoldingsList holdings={holdings} /></div>
            <div className="space-y-6"><WatchlistWidget stocks={watchlist} /><MarketOverview indices={indices} /></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
