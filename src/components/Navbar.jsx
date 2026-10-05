import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, ChevronDown, 
  BarChart3, Wallet, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assests/logo.png'; // ✅ your logo

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  const navLinks = [
    { 
      name: 'Products', 
      href: '#',
      dropdown: [
        { name: 'Mutual Funds', icon: Wallet, description: 'Automated SIPs & lump-sum investing' },
        { name: 'Unlisted Shares (Pre-IPO)', icon: BarChart3, description: 'Curated high-growth opportunities' },
        { name: 'Insurance', icon: Award, description: 'Life & health insurance products' },
        { name: 'Strategy Builder', icon: BarChart3, description: 'F&O payoff charts & analytics' },
      ]
    },
    { name: 'Calculators', href: '/calculator' },
    { name: 'Become A Partner', href: '/partner' },
    { name: 'Open Free Demat', href: '/openfreedemat' },
    { name: 'Contact-Us', href: '/contact' },  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* 🔥 Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src={logo}
              alt="Dhanvo Logo"
              className="h-24 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <div 
                key={link.name}
                className="relative"
                onMouseEnter={() => link.dropdown && setActiveDropdown(link.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {link.dropdown ? (
                  <button className="flex items-center space-x-1 px-4 py-2 text-dark-300 hover:text-white transition-colors">
                    <span>{link.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === link.name ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <Link 
                    to={link.href}
                    className="px-4 py-2 text-dark-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                )}

                {/* Dropdown */}
                {/* Dropdown */}
<AnimatePresence>
  {link.dropdown && activeDropdown === link.name && (
    <div className="fixed top-[5.25rem] left-0 right-0 flex justify-center pointer-events-none z-50">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-auto w-max bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl p-3"
      >
        <div className="flex items-stretch gap-1">
          {link.dropdown.map((item, idx) => (
            <Link
              key={item.name}
              to={item.link || '#'}
              className={`flex flex-col items-center text-center px-5 py-3 rounded-xl hover:bg-dark-800 transition-all group min-w-[120px] ${idx < link.dropdown.length - 1 ? 'border-r border-dark-700/60' : ''}`}
            >
              <div className="w-10 h-10 bg-dark-800 group-hover:bg-amber-500/10 rounded-lg flex items-center justify-center transition-colors mb-2">
                <item.icon className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-white font-semibold text-xs leading-tight mb-0.5">
                {item.name}
              </div>
              <div className="text-[10px] text-dark-400 leading-snug">
                {item.description}
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
              </div>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="btn-ghost">
                  Dashboard
                </Link>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center text-dark-950 font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <button onClick={logout} className="text-dark-400 hover:text-white transition-colors">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  Login
                </Link>
                <Link to="/signup" className="bg-blue-500 px-6 py-3 rounded-xl font-bold">
                  Open Account
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-dark-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-dark-900 border-t border-dark-800"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <div key={link.name}>
                  {link.dropdown ? (
                    <div className="space-y-2">
                      <div className="text-dark-400 text-sm font-medium uppercase tracking-wider">
                        {link.name}
                      </div>
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.name}
                          to="#"
                          className="flex items-center space-x-3 p-3 rounded-xl hover:bg-dark-800 transition-colors"
                        >
                          <item.icon className="w-5 h-5 text-amber-400" />
                          <span className="text-white">{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      to={link.href}
                      className="block py-3 text-white hover:text-primary-400 transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}
              
              <div className="pt-4 border-t border-dark-800 space-y-3">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="btn-primary w-full text-center block">
                      Dashboard
                    </Link>
                    <button onClick={logout} className="btn-secondary w-full">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-secondary w-full text-center block">
                      Login
                    </Link>
                    <Link to="/signup" className="bg-blue-500 px-6 py-3 rounded-xl font-bold block text-center">
                      Open Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;