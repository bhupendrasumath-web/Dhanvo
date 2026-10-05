import { motion } from 'framer-motion';

const MarketOverview = ({ indices }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-6">
    <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold text-white">Market Overview</h3><span className="flex items-center text-primary-400 text-sm"><span className="w-2 h-2 bg-primary-400 rounded-full mr-2 animate-pulse" />Live</span></div>
    <div className="space-y-4">{indices.map((index, i) => <div key={i} className="flex items-center justify-between gap-3 p-4 bg-dark-800/30 rounded-xl"><div className="min-w-0"><p className="text-white font-medium truncate">{index.name}</p><p className="text-dark-400 text-sm">{index.symbol}</p></div><div className="text-right shrink-0"><p className="text-white font-mono">{index.value.toLocaleString()}</p><p className={`text-sm ${index.change >= 0 ? 'text-primary-400' : 'text-accent-rose'}`}>{index.change >= 0 ? '+' : ''}{index.change} ({index.changePercent}%)</p></div></div>)}</div>
  </motion.div>
);

export default MarketOverview;
