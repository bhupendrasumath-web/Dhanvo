import { useState } from 'react';
import { Bell, Menu, Plus, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DashboardHeader = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 px-4 sm:px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center gap-3 sm:gap-6 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <button type="button" onClick={onMenuClick} className="md:hidden shrink-0 p-2 -ml-2 text-dark-400 hover:text-white" aria-label="Open navigation"><Menu className="w-5 h-5" /></button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white truncate">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.firstName}!</h1>
            <p className="text-dark-400 truncate">Here's your trading overview</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search stocks..." className="w-64 pl-12 pr-4 py-2.5 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-dark-500 outline-none focus:border-primary-500/50 transition-all" />
          </div>
          <button className="relative p-2.5 sm:p-3 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-400 hover:text-white transition-colors"><Bell className="w-5 h-5" /><span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full" /></button>
          <button className="btn-primary py-2.5 px-3 sm:px-4 flex items-center gap-2"><Plus className="w-5 h-5" /><span className="hidden sm:inline">Add Funds</span></button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
