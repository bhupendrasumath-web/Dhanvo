import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const StatsCard = ({ title, value, change, changePercent, icon: Icon, iconBg, isPositive }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-6">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}><Icon className="w-6 h-6 text-white" /></div>
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-sm font-medium ${isPositive ? 'bg-primary-500/10 text-primary-400' : 'bg-accent-rose/10 text-accent-rose'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}<span>{changePercent}</span>
      </div>
    </div>
    <h3 className="text-dark-400 text-sm mb-1">{title}</h3>
    <p className="text-2xl font-display font-bold text-white">{value}</p>
    <p className={`text-sm mt-1 ${isPositive ? 'text-primary-400' : 'text-accent-rose'}`}>{change} today</p>
  </motion.div>
);

export default StatsCard;
