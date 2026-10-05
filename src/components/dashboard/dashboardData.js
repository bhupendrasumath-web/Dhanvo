export const portfolioStats = (user) => ({
  totalValue: user?.accountBalance || 100000,
  invested: 75000,
  returns: 25000,
  todayPL: 2456,
});

export const holdings = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', qty: 50, value: 122837, change: 2.4 },
  { symbol: 'TCS', name: 'Tata Consultancy', qty: 25, value: 97310, change: -0.3 },
  { symbol: 'INFY', name: 'Infosys Ltd', qty: 100, value: 153425, change: 1.2 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', qty: 60, value: 100734, change: 1.8 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', qty: 80, value: 81884, change: -0.5 },
];

export const watchlist = [
  { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 789.65, change: 23.80, changePercent: 3.11 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', price: 478.90, change: 6.45, changePercent: 1.37 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', price: 10456.30, change: 189.45, changePercent: 1.85 },
  { symbol: 'SBIN', name: 'State Bank of India', price: 634.25, change: 12.40, changePercent: 1.99 },
];

export const indices = [
  { symbol: 'NIFTY50', name: 'Nifty 50', value: 21834.45, change: 156.30, changePercent: 0.72 },
  { symbol: 'SENSEX', name: 'BSE Sensex', value: 72186.09, change: 498.72, changePercent: 0.70 },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', value: 46234.80, change: -89.45, changePercent: -0.19 },
];
