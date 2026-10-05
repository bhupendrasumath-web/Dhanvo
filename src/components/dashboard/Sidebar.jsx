import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Settings, LogOut, Home, LineChart, Briefcase, History, HelpCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const menuItems = [
  { id: 'overview', icon: Home, label: 'Overview' },
  { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
  { id: 'watchlist', icon: LineChart, label: 'Watchlist' },
  { id: 'orders', icon: History, label: 'Orders' },
];

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900/95 backdrop-blur-xl border-r border-dark-800 h-screen flex flex-col transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 border-b border-dark-800">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <TrendingUp className="w-6 h-6 text-dark-950" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-display font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">धनवो</span>
            <span className="text-[9px] text-dark-400 -mt-1 tracking-wider">DHANVO</span>
          </div>
        </Link>
        <button type="button" onClick={onClose} className="md:hidden absolute top-5 right-4 p-2 text-dark-400 hover:text-white" aria-label="Close navigation">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => { setActiveTab(item.id); onClose?.(); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-dark-400 hover:text-white hover:bg-dark-800/50'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 pt-8 border-t border-dark-800">
          <ul className="space-y-2">
            <li><button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800/50 transition-all"><Settings className="w-5 h-5" /><span className="font-medium">Settings</span></button></li>
            <li><button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800/50 transition-all"><HelpCircle className="w-5 h-5" /><span className="font-medium">Help & Support</span></button></li>
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t border-dark-800">
        <div className="flex items-center space-x-3 p-3 bg-dark-800/50 rounded-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center text-dark-950 font-semibold">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-dark-500 text-sm truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-dark-400 hover:text-accent-rose transition-colors" title="Logout"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
