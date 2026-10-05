import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const WatchlistWidget = ({ stocks }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl">
    <div className="flex items-center justify-between p-6 border-b border-dark-700/50"><h3 className="text-lg font-semibold text-white">Watchlist</h3><button className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">+ Add Stock</button></div>
    <div className="divide-y divide-dark-700/50">
      {stocks.map((stock, index) => <div key={index} className="flex items-center justify-between gap-3 p-4 hover:bg-dark-800/30 transition-colors cursor-pointer"><div className="min-w-0"><p className="text-white font-medium truncate">{stock.symbol}</p><p className="text-dark-400 text-sm truncate">{stock.name}</p></div><div className="text-right shrink-0"><p className="text-white font-mono">₹{stock.price.toLocaleString()}</p><p className={`text-sm flex items-center justify-end ${stock.change >= 0 ? 'text-primary-400' : 'text-accent-rose'}`}>{stock.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}{stock.change >= 0 ? '+' : ''}{stock.changePercent}%</p></div></div>)}
    </div>
  </motion.div>
);

export default WatchlistWidget;
