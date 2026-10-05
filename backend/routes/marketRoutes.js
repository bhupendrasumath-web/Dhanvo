import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Mock market data - In production, integrate with real market APIs
const marketData = {
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
  ],
  topGainers: [
    { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 789.65, change: 23.80, changePercent: 3.11 },
    { symbol: 'SBIN', name: 'State Bank of India', price: 634.25, change: 12.40, changePercent: 1.99 },
    { symbol: 'ITC', name: 'ITC Limited', price: 467.35, change: 8.90, changePercent: 1.94 },
    { symbol: 'MARUTI', name: 'Maruti Suzuki', price: 10456.30, change: 189.45, changePercent: 1.85 },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2567.80, change: 45.30, changePercent: 1.79 }
  ],
  topLosers: [
    { symbol: 'ASIANPAINT', name: 'Asian Paints', price: 2890.55, change: -34.20, changePercent: -1.17 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1023.55, change: -8.65, changePercent: -0.84 },
    { symbol: 'LT', name: 'Larsen & Toubro', price: 3456.80, change: -23.45, changePercent: -0.67 },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1234.50, change: -5.60, changePercent: -0.45 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3892.40, change: -12.30, changePercent: -0.31 }
  ]
};

// @desc    Get market overview
// @route   GET /api/market/overview
// @access  Public
router.get('/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      indices: marketData.indices,
      topGainers: marketData.topGainers,
      topLosers: marketData.topLosers,
      marketStatus: 'open',
      lastUpdated: new Date().toISOString()
    }
  });
});

// @desc    Get all stocks
// @route   GET /api/market/stocks
// @access  Public
router.get('/stocks', (req, res) => {
  res.json({
    success: true,
    data: marketData.stocks
  });
});

// @desc    Get stock by symbol
// @route   GET /api/market/stocks/:symbol
// @access  Public
router.get('/stocks/:symbol', (req, res) => {
  const stock = marketData.stocks.find(s => s.symbol === req.params.symbol.toUpperCase());
  
  if (!stock) {
    return res.status(404).json({
      success: false,
      message: 'Stock not found'
    });
  }
  
  res.json({
    success: true,
    data: stock
  });
});

// @desc    Search stocks
// @route   GET /api/market/search
// @access  Public
router.get('/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json({
      success: true,
      data: []
    });
  }
  
  const results = marketData.stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(q.toLowerCase()) ||
    stock.name.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json({
    success: true,
    data: results
  });
});

// @desc    Get indices
// @route   GET /api/market/indices
// @access  Public
router.get('/indices', (req, res) => {
  res.json({
    success: true,
    data: marketData.indices
  });
});

export default router;
