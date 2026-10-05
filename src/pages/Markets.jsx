import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Search, Filter,
  ArrowUpRight, ArrowDownRight, BarChart3, Star,
  ChevronDown, RefreshCw, Grid, List
} from 'lucide-react';
import api from '../services/api';

// Market Index Card
const IndexCard = ({ index }) => {
  const isPositive = index.change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-6 hover:border-primary-500/30 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-dark-400 text-sm">{index.symbol}</p>
          <h3 className="text-lg font-semibold text-white">{index.name}</h3>
        </div>
        <div className={`p-2 rounded-lg ${isPositive ? 'bg-primary-500/10' : 'bg-accent-rose/10'}`}>
          {isPositive ? (
            <TrendingUp className="w-5 h-5 text-primary-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-accent-rose" />
          )}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-display font-bold text-white font-mono">
            {index.price.toLocaleString()}
          </p>
          <p className={`text-sm mt-1 flex items-center ${isPositive ? 'text-primary-400' : 'text-accent-rose'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
            {isPositive ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent.toFixed(2)}%)
          </p>
        </div>
        
        {/* Mini Chart Placeholder */}
        <div className="w-24 h-12">
          <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            <path
              d={isPositive 
                ? "M0 40 Q20 35, 40 30 T80 15 T100 10"
                : "M0 10 Q20 15, 40 25 T80 35 T100 40"
              }
              stroke={isPositive ? '#22c55e' : '#f43f5e'}
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

// Stock Table Row
const StockRow = ({ stock, index, viewMode }) => {
  const isPositive = stock.change >= 0;

  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03 }}
        className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-xl p-4 hover:border-primary-500/30 hover:bg-dark-800/50 transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center font-mono text-sm text-white font-semibold">
              {stock.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="text-white font-medium">{stock.symbol}</p>
              <p className="text-dark-500 text-xs truncate max-w-[120px]">{stock.name}</p>
            </div>
          </div>
          <button className="p-1.5 text-dark-500 hover:text-accent-amber transition-colors">
            <Star className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-mono font-semibold text-white">
              ₹{stock.price.toLocaleString()}
            </p>
            <p className={`text-sm flex items-center ${isPositive ? 'text-primary-400' : 'text-accent-rose'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </p>
          </div>
          <button className="px-3 py-1.5 bg-primary-500/10 text-primary-400 text-sm font-medium rounded-lg hover:bg-primary-500/20 transition-colors">
            Trade
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-dark-700/50 hover:bg-dark-800/30 transition-colors cursor-pointer"
    >
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center font-mono text-sm text-white font-semibold">
            {stock.symbol.slice(0, 2)}
          </div>
          <div>
            <p className="text-white font-medium">{stock.symbol}</p>
            <p className="text-dark-500 text-sm">{stock.name}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <p className="text-white font-mono font-semibold">₹{stock.price.toLocaleString()}</p>
      </td>
      <td className="py-4 px-6">
        <p className={`flex items-center font-mono ${isPositive ? 'text-primary-400' : 'text-accent-rose'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {isPositive ? '+' : ''}{stock.change.toFixed(2)}
        </p>
      </td>
      <td className="py-4 px-6">
        <span className={`px-2.5 py-1 rounded-lg text-sm font-medium ${
          isPositive ? 'bg-primary-500/10 text-primary-400' : 'bg-accent-rose/10 text-accent-rose'
        }`}>
          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </span>
      </td>
      <td className="py-4 px-6">
        <p className="text-dark-300 font-mono">{(stock.volume / 1000000).toFixed(2)}M</p>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 bg-primary-500 text-dark-950 text-sm font-semibold rounded-lg hover:bg-primary-400 transition-colors">
            Buy
          </button>
          <button className="px-4 py-2 bg-dark-700 text-white text-sm font-medium rounded-lg hover:bg-dark-600 transition-colors">
            Sell
          </button>
          <button className="p-2 text-dark-400 hover:text-accent-amber transition-colors">
            <Star className="w-5 h-5" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

// Main Markets Page
const Markets = () => {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('symbol');

  const filters = [
    { id: 'all', label: 'All Stocks' },
    { id: 'gainers', label: 'Top Gainers' },
    { id: 'losers', label: 'Top Losers' },
    { id: 'most-active', label: 'Most Active' },
  ];

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      // Try to fetch from API, fallback to mock data
      const [overviewRes, stocksRes] = await Promise.all([
        api.get('/market/overview').catch(() => null),
        api.get('/market/stocks').catch(() => null)
      ]);

      if (overviewRes?.data?.success && stocksRes?.data?.success) {
        setMarketData({
          indices: overviewRes.data.data.indices,
          stocks: stocksRes.data.data,
          topGainers: overviewRes.data.data.topGainers,
          topLosers: overviewRes.data.data.topLosers
        });
      } else {
        // Use mock data
        setMarketData({
          indices: [
            { symbol: 'NIFTY50', name: 'Nifty 50', price: 21834.45, change: 156.30, changePercent: 0.72 },
            { symbol: 'SENSEX', name: 'BSE Sensex', price: 72186.09, change: 498.72, changePercent: 0.70 },
            { symbol: 'BANKNIFTY', name: 'Bank Nifty', price: 46234.80, change: -89.45, changePercent: -0.19 },
            { symbol: 'NIFTYIT', name: 'Nifty IT', price: 38456.25, change: 234.56, changePercent: 0.61 }
          ],
          stocks: [
            { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2456.75, change: 34.50, changePercent: 1.42, volume: 8945632 },
            { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3892.40, change: -12.30, changePercent: -0.31, volume: 2341567 },
            { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1678.90, change: 23.45, changePercent: 1.42, volume: 5678234 },
            { symbol: 'INFY', name: 'Infosys', price: 1534.25, change: 18.90, changePercent: 1.25, volume: 4123890 },
            { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1023.55, change: -8.65, changePercent: -0.84, volume: 6789123 },
            { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2567.80, change: 45.30, changePercent: 1.79, volume: 1234567 },
            { symbol: 'SBIN', name: 'State Bank of India', price: 634.25, change: 12.40, changePercent: 1.99, volume: 12456789 },
            { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1234.50, change: -5.60, changePercent: -0.45, volume: 3456789 },
            { symbol: 'ITC', name: 'ITC Limited', price: 467.35, change: 8.90, changePercent: 1.94, volume: 9876543 },
            { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', price: 1789.60, change: 28.75, changePercent: 1.63, volume: 2345678 },
            { symbol: 'LT', name: 'Larsen & Toubro', price: 3456.80, change: -23.45, changePercent: -0.67, volume: 1567890 },
            { symbol: 'AXISBANK', name: 'Axis Bank', price: 1098.45, change: 15.30, changePercent: 1.41, volume: 4567890 },
            { symbol: 'WIPRO', name: 'Wipro', price: 478.90, change: 6.45, changePercent: 1.37, volume: 3456789 },
            { symbol: 'ASIANPAINT', name: 'Asian Paints', price: 2890.55, change: -34.20, changePercent: -1.17, volume: 890123 },
            { symbol: 'MARUTI', name: 'Maruti Suzuki', price: 10456.30, change: 189.45, changePercent: 1.85, volume: 567890 },
            { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 789.65, change: 23.80, changePercent: 3.11, volume: 15678234 }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStocks = () => {
    if (!marketData?.stocks) return [];

    let filtered = [...marketData.stocks];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(stock =>
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case 'gainers':
        filtered = filtered.filter(s => s.change > 0).sort((a, b) => b.changePercent - a.changePercent);
        break;
      case 'losers':
        filtered = filtered.filter(s => s.change < 0).sort((a, b) => a.changePercent - b.changePercent);
        break;
      case 'most-active':
        filtered = filtered.sort((a, b) => b.volume - a.volume);
        break;
      default:
        break;
    }

    return filtered;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredStocks = getFilteredStocks();

  return (
    <main className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold text-white mb-2">Markets</h1>
          <p className="text-dark-400">Track real-time market data and explore stocks</p>
        </motion.div>

        {/* Market Indices */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {marketData?.indices?.map((index, i) => (
            <IndexCard key={i} index={index} />
          ))}
        </div>

        {/* Filters & Search */}
        <div className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stocks by name or symbol..."
                className="w-full pl-12 pr-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-dark-500 outline-none focus:border-primary-500/50 transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 lg:pb-0">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeFilter === filter.id
                      ? 'bg-primary-500 text-dark-950'
                      : 'bg-dark-800/50 text-dark-400 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-dark-700 text-white' : 'text-dark-500 hover:text-white'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-dark-700 text-white' : 'text-dark-500 hover:text-white'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={fetchMarketData}
                className="p-2 text-dark-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stocks Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStocks.map((stock, index) => (
              <StockRow key={stock.symbol} stock={stock} index={index} viewMode="grid" />
            ))}
          </div>
        ) : (
          <div className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50 bg-dark-800/30">
                    <th className="text-left py-4 px-6 text-dark-400 font-medium">Stock</th>
                    <th className="text-left py-4 px-6 text-dark-400 font-medium">Price</th>
                    <th className="text-left py-4 px-6 text-dark-400 font-medium">Change</th>
                    <th className="text-left py-4 px-6 text-dark-400 font-medium">% Change</th>
                    <th className="text-left py-4 px-6 text-dark-400 font-medium">Volume</th>
                    <th className="text-left py-4 px-6 text-dark-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock, index) => (
                    <StockRow key={stock.symbol} stock={stock} index={index} viewMode="list" />
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStocks.length === 0 && (
              <div className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">No stocks found matching your search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default Markets;
