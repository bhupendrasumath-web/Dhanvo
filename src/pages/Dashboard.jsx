import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AccountStatusCard from '../components/dashboard/AccountStatusCard';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardSubnav from '../components/dashboard/DashboardSubnav';
import AllotmentActivity from '../components/dashboard/AllotmentActivity';
import ExploreFunds from '../components/dashboard/ExploreFunds';
import FatcaForm from '../components/dashboard/FatcaForm';
import { DematTradingScreen, MoreDashboardScreen, UnlistedSharesScreen } from '../components/dashboard/InvestmentScreens';
import MarketOverview from '../components/dashboard/MarketOverview';
import PlanManagementPage from '../components/dashboard/PlanManagementPage';
import PortfolioOverview from '../components/dashboard/PortfolioOverview';
import Sidebar from '../components/dashboard/Sidebar';
import WatchlistPage from '../components/dashboard/WatchlistPage';
import WatchlistWidget from '../components/dashboard/WatchlistWidget';
import '../components/dashboard/dashboard.css';

const mainTabRoutes = ['unlisted', 'demat', 'insurance', 'calculators', 'planning', 'strategy'];
const subTabRoutes = ['explore', 'overview', 'watchlist', 'sips', 'swp', 'stp', 'activity'];
const dashboardRoutes = [...mainTabRoutes, ...subTabRoutes];

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeParts = location.pathname
    .replace(/^\/dashboard\/?/, '')
    .split('/')
    .filter(Boolean);
  const currentRoute = routeParts[0] || 'explore';
  const activeTab = mainTabRoutes.includes(currentRoute) ? currentRoute : 'overview';
  const activeSubTab = subTabRoutes.includes(currentRoute) ? currentRoute : 'explore';
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistError, setWatchlistError] = useState('');
  const [watchlistUpdatingCode, setWatchlistUpdatingCode] = useState('');
  const [accountStatus, setAccountStatus] = useState(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [statusRefreshError, setStatusRefreshError] = useState('');
  const [authorizationLinkLoading, setAuthorizationLinkLoading] = useState(false);
  const [authorizationLinkError, setAuthorizationLinkError] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [kycRetryLoading, setKycRetryLoading] = useState(false);
  const [kycRetryError, setKycRetryError] = useState('');
  const [kycVerificationUrl, setKycVerificationUrl] = useState('');
  useEffect(() => {
    if (routeParts.length === 0 || routeParts.length > 1 || !dashboardRoutes.includes(currentRoute)) {
      navigate('/dashboard/explore', { replace: true });
    }
  }, [currentRoute, navigate, routeParts.length]);

  const status = String(accountStatus?.nseStatus || user?.nseStatus || 'PENDING').toUpperCase();
  const kycCheckFailed = [
    accountStatus?.nseStatusRemark,
    accountStatus?.nseStatusDetails?.primaryHolderKycStatus,
    accountStatus?.nseStatusDetails?.primaryHolderKycRemarks,
  ].some((value) => /KYC.*(CHECK\s+)?FAILED|FAILED.*KYC/i.test(String(value || '')));
  const loadAccountStatus = useCallback(async () => {
    const response = await api.get('/auth/account-opening-status');
    if (response.data?.success) {
      setAccountStatus(response.data.data);
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Unable to load account status');
  }, []);

  const refreshNseStatus = async () => {
    setStatusRefreshing(true);
    setStatusRefreshError('');
    try {
      await loadAccountStatus();
    } catch (error) {
      setStatusRefreshError(error.response?.data?.message || error.message || 'Unable to refresh NSE status.');
    } finally {
      setStatusRefreshing(false);
    }
  };

  const getNseAuthorizationLink = async () => {
    setAuthorizationLinkLoading(true);
    setAuthorizationLinkError('');
    setAuthorizationUrl('');
    try {
      const response = await api.post('/auth/client-authorization-link');
      const link = response.data?.data?.authorizationUrl;
      if (!response.data?.success || !link) {
        throw new Error(response.data?.message || 'NSE did not return an authorization link.');
      }
      setAuthorizationUrl(link);
    } catch (error) {
      const isRouteMissing = error.response?.status === 404
        && /route not found/i.test(String(error.response?.data?.message || ''));
      setAuthorizationLinkError(isRouteMissing
        ? 'NSE authorization links are not available on the server yet. Please contact Dhanvo support while the backend is updated.'
        : error.response?.data?.message || error.message || 'Unable to retrieve your NSE authorization link.');
    } finally {
      setAuthorizationLinkLoading(false);
    }
  };

  const loadWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const response = await api.get('/mutual-funds/watchlist');
      if (!response.data?.success || !Array.isArray(response.data?.data?.schemes)) {
        throw new Error(response.data?.message || 'Unable to load your saved watchlist.');
      }
      setWatchlist(response.data.data.schemes);
      setWatchlistError('');
    } catch (error) {
      setWatchlistError(error.response?.data?.message || error.message || 'Unable to load your saved watchlist.');
    } finally {
      setWatchlistLoading(false);
    }
  }, []);

  const toggleWatchlistScheme = useCallback(async (fund) => {
    const schemeCode = String(fund.schemeCode || '');
    setWatchlistUpdatingCode(schemeCode);
    setWatchlistError('');
    try {
      const isSaved = watchlist.some((scheme) => scheme.schemeCode === schemeCode);
      const response = isSaved
        ? await api.delete(`/mutual-funds/watchlist/${encodeURIComponent(schemeCode)}`)
        : await api.post('/mutual-funds/watchlist', { schemeCode });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update your mutual-fund watchlist.');
      }
      if (isSaved) {
        if (response.data?.data?.removedSchemeCode !== schemeCode) {
          throw new Error(response.data?.message || 'Unable to remove this scheme from your watchlist.');
        }
        setWatchlist((current) => current.filter((scheme) => scheme.schemeCode !== schemeCode));
      } else {
        if (!Array.isArray(response.data?.data)) {
          throw new Error(response.data?.message || 'Unable to add this scheme to your watchlist.');
        }
        setWatchlist(response.data.data);
      }
    } catch (error) {
      const message = error.response?.data?.message
        || error.message
        || 'Unable to update your mutual-fund watchlist.';
      setWatchlistError(message);
    } finally {
      setWatchlistUpdatingCode('');
    }
  }, [watchlist]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    const refreshAccountStatus = async () => {
      try {
        await loadAccountStatus();
      } catch {
        // The authenticated user snapshot remains available as a fallback.
      }
    };

    refreshAccountStatus();
    const interval = setInterval(refreshAccountStatus, 30000);
    return () => {
      clearInterval(interval);
    };
  }, [loadAccountStatus]);

  const retryAadhaarKyc = async () => {
    const pan = String(accountStatus?.pan || user?.pan || '').trim().toUpperCase();
    const mobile = String(user?.phone || user?.mobile || '').trim();
    const email = String(user?.email || '').trim();

    if (!pan || !mobile || !email) {
      setKycRetryError('Your PAN, mobile number, or email is missing. Please contact support to retry KYC.');
      return;
    }

    setKycRetryLoading(true);
    setKycRetryError('');
    setKycVerificationUrl('');

    try {
      const response = await api.post('/auth/init-ekyc', { pan, mobile, email });
      const data = response.data?.data || {};

      if (data.verified || data.alreadyVerified) {
        await loadAccountStatus();
        return;
      }

      const verificationUrl = data.verificationUrl || data.ekycLink || data.link || '';
      if (!verificationUrl) {
        throw new Error('NSE did not return an Aadhaar eKYC link. Please try again shortly.');
      }

      setKycVerificationUrl(verificationUrl);
    } catch (error) {
      setKycRetryError(error.response?.data?.message || error.message || 'Unable to start Aadhaar eKYC.');
    } finally {
      setKycRetryLoading(false);
    }
  };

  const selectSubTab = (tab) => {
    navigate(`/dashboard/${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectMainTab = (tab) => {
    navigate(tab === 'overview' ? '/dashboard/explore' : `/dashboard/${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSelectedScreen = () => {
    if (activeTab === 'unlisted') {
      return <UnlistedSharesScreen />;
    }
    if (activeTab === 'demat') {
      return <DematTradingScreen />;
    }
    if (['insurance', 'calculators', 'planning', 'strategy'].includes(activeTab)) {
      return <MoreDashboardScreen page={activeTab} />;
    }

    if (activeSubTab === 'explore') {
      return (
        <ExploreFunds
          onNavigate={selectSubTab}
          canInvest={status === 'ACTIVE'}
          watchlistSchemeCodes={new Set(watchlist.map((scheme) => scheme.schemeCode))}
          watchlistUpdatingCode={watchlistUpdatingCode}
          watchlistLoading={watchlistLoading}
          watchlistError={watchlistError}
          onRetryWatchlist={loadWatchlist}
          onToggleWatchlist={toggleWatchlistScheme}
        />
      );
    }
    if (activeSubTab === 'watchlist') {
      return (
        <WatchlistPage
          schemes={watchlist}
          isLoading={watchlistLoading}
          loadError={watchlistError}
          updatingSchemeCode={watchlistUpdatingCode}
          onRetry={loadWatchlist}
          onRemoveScheme={toggleWatchlistScheme}
          onBrowseSchemes={() => selectSubTab('explore')}
        />
      );
    }
    if (['sips', 'swp', 'stp'].includes(activeSubTab)) {
      return <PlanManagementPage planType={activeSubTab} />;
    }
    if (activeSubTab === 'activity') {
      return <AllotmentActivity />;
    }

    return (
      <>
        <DashboardHeader
          onViewActivity={() => selectSubTab('activity')}
          onExploreFunds={() => selectSubTab('explore')}
        />
        <PortfolioOverview onViewActivity={() => selectSubTab('activity')} />
        <section className="dash-investment-grid" aria-label="Your investments and market tools">
          <AllotmentActivity compact onViewAll={() => selectSubTab('activity')} />
          <div className="dash-side-widgets">
            <WatchlistWidget
              schemes={watchlist}
              isLoading={watchlistLoading}
              id="dashboard-watchlist"
              loadError={watchlistError}
              onRetry={loadWatchlist}
              onViewWatchlist={() => selectSubTab('watchlist')}
              onBrowseSchemes={() => selectSubTab('explore')}
            />
            <MarketOverview />
          </div>
        </section>
        {accountStatus?.nseUccRegistered && status !== 'ACTIVE' && accountStatus.fatcaStatus !== 'SUBMITTED' && (
          <FatcaForm user={user} prefill={accountStatus.fatcaPrefill} onSubmitted={(data) => setAccountStatus((current) => ({
            ...current,
            ...data,
            fatcaStatus: 'SUBMITTED',
          }))} />
        )}
        <footer className="dash-footer"><span>DHANVO</span><span>Invest with clarity.</span></footer>
      </>
    );
  };

  return (
    <div className="dashboard-page">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={selectMainTab}
      />
      {activeTab === 'overview' && <DashboardSubnav activeTab={activeSubTab} onChange={selectSubTab} />}
      <main className="dash-main">
        {loading ? (
          <div className="dash-loading" role="status" aria-label="Loading dashboard">
            <span className="dash-loading-mark"><span /></span>
            <p>Preparing your overview</p>
          </div>
        ) : (
          <div className="dash-content">
            {status !== 'ACTIVE' && (
              <AccountStatusCard
                user={user}
                status={status}
                remark={accountStatus?.nseStatusRemark}
                statusDetails={accountStatus?.nseStatusDetails}
                onRefreshStatus={refreshNseStatus}
                statusRefreshing={statusRefreshing}
                statusRefreshError={statusRefreshError}
                onGetAuthorizationLink={getNseAuthorizationLink}
                authorizationLinkLoading={authorizationLinkLoading}
                authorizationLinkError={authorizationLinkError}
                authorizationUrl={authorizationUrl}
                showKycRetry={kycCheckFailed}
                onRetryKyc={retryAadhaarKyc}
                kycRetryLoading={kycRetryLoading}
                kycRetryError={kycRetryError}
                kycVerificationUrl={kycVerificationUrl}
              />
            )}
            {renderSelectedScreen()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
