import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { TrendingUp, LogOut, Search, Bell, ShoppingCart, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const menuItems = [
  { id: 'overview', label: 'Mutual Funds' },
  { id: 'unlisted', label: 'Unlisted Shares' },
  { id: 'demat', label: 'Demat/Trading Account' },
];

const moreItems = [
  { id: 'insurance', label: 'Insurance' },
  { id: 'calculators', label: 'Calculators' },
  { id: 'planning', label: 'Financial Planning' },
  { id: 'strategy', label: 'Strategy Builder' },
];

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const isMoreActive = moreItems.some(({ id }) => id === activeTab);
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'D';

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!moreRef.current?.contains(event.target)) setMoreOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };

    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <>
      <header className="dash-nav">
        <div className="dash-nav-inner">
          <Link to="/" className="dash-brand" aria-label="Dhanvo home">
            <span className="dash-brand-mark"><TrendingUp size={21} strokeWidth={2.2} /></span>
            <span className="dash-brand-copy"><strong>धनवो</strong><small>DHANVO</small></span>
          </Link>
          <nav className="dash-nav-links" aria-label="Dashboard navigation">
            {menuItems.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-current={activeTab === id ? 'page' : undefined}
                onClick={() => {
                  setActiveTab(id);
                  setMoreOpen(false);
                }}
                className={`dash-nav-link${activeTab === id ? ' active' : ''}`}
              >
                <span>{label}</span>
                {id === 'unlisted' && <span className="dash-ipo-tag">PRE-IPO</span>}
              </button>
            ))}
            <div className="dash-more-wrap" ref={moreRef}>
              <button
                type="button"
                className={`dash-nav-link${isMoreActive ? ' active' : ''}`}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-current={isMoreActive ? 'page' : undefined}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <span>More</span>
                <ChevronDown size={13} className={moreOpen ? 'rotated' : ''} />
              </button>
              {moreOpen && (
                <div className="dash-more-menu" role="menu" aria-label="More dashboard pages">
                  {moreItems.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitem"
                      className={activeTab === id ? 'active' : ''}
                      aria-current={activeTab === id ? 'page' : undefined}
                      onClick={() => {
                        setActiveTab(id);
                        setMoreOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
          <label className="dash-nav-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search investments"
            />
          </label>
          <button type="button" className="dash-cart-button" disabled title="Cart is not available yet" aria-label="Cart">
            <ShoppingCart size={15} />
            <span>0</span>
          </button>
          <button type="button" className="dash-nav-notifications" aria-label="Notifications" title="Notifications">
            <Bell size={17} />
            <span />
          </button>
          <div className="dash-nav-account">
            <div className="dash-avatar" aria-hidden="true">{initials}</div>
            <div className="dash-account-copy">
              <span>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Investor'}</span>
              <small>{user?.email}</small>
            </div>
            <button type="button" className="dash-logout" onClick={handleLogout} aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Sidebar;
