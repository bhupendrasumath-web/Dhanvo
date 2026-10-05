import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-dark-950 flex items-center justify-center z-50">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gradient-orb gradient-orb-green w-96 h-96 -top-48 -left-48" />
        <div className="gradient-orb gradient-orb-cyan w-96 h-96 -bottom-48 -right-48" />
      </div>

      {/* Loading Content */}
      <div className="relative flex flex-col items-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 p-[2px]"
          >
            <div className="w-full h-full bg-dark-950 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-amber-400" />
            </div>
          </motion.div>
          
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-amber-500 rounded-2xl blur-2xl opacity-30 animate-pulse" />
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <h2 className="text-3xl font-display font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent mb-1">
          </h2>
          <p className="text-dark-500 text-xs tracking-widest mb-2">DHANVO</p>
          <p className="text-dark-400">Loading your experience...</p>
        </motion.div>

        {/* Loading Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 w-48 h-1 bg-dark-800 rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;
