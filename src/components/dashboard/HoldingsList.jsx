import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Eye, EyeOff, RefreshCw } from 'lucide-react';

const HoldingsList = ({ holdings }) => {
  const [showValues, setShowValues] = useState(true);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl">
      <div className="flex items-center justify-between p-6 border-b border-dark-700/50"><h3 className="text-lg font-semibold text-white">Your Holdings</h3><div className="flex items-center space-x-2"><button onClick={() => setShowValues(!showValues)} className="p-2 text-dark-400 hover:text-white transition-colors">{showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button><button className="p-2 text-dark-400 hover:text-white transition-colors"><RefreshCw className="w-5 h-5" /></button></div></div>
      <div className="divide-y divide-dark-700/50">
        {holdings.map((holding, index) => (
          <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center justify-between gap-3 p-4 hover:bg-dark-800/30 transition-colors">
            <div className="flex items-center space-x-4 min-w-0"><div className="w-12 h-12 shrink-0 bg-dark-800 rounded-xl flex items-center justify-center font-mono text-sm text-white font-semibold">{holding.symbol.slice(0, 2)}</div><div className="min-w-0"><p className="text-white font-medium truncate">{holding.symbol}</p><p className="text-dark-400 text-sm truncate">{holding.name}</p></div></div>
            <div className="text-right shrink-0"><p className="text-white font-mono">{showValues ? `₹${holding.value.toLocaleString()}` : '••••••'}</p><div className="flex items-center justify-end space-x-2"><span className="text-dark-400 text-sm">{holding.qty} shares</span><span className={`text-sm font-medium ${holding.change >= 0 ? 'text-primary-400' : 'text-accent-rose'}`}>{holding.change >= 0 ? '+' : ''}{holding.change}%</span></div></div>
          </motion.div>
        ))}
      </div>
      <div className="p-4 border-t border-dark-700/50"><button className="w-full py-3 text-primary-400 hover:text-primary-300 font-medium flex items-center justify-center space-x-2 transition-colors"><span>View All Holdings</span><ChevronRight className="w-5 h-5" /></button></div>
    </motion.div>
  );
};

export default HoldingsList;
