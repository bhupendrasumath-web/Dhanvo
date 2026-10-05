export const ADMIN_CREDENTIALS = {
  email: import.meta.env.VITE_ADMIN_EMAIL || '',
  password: import.meta.env.VITE_ADMIN_PASSWORD || '',
};

export const adminMetrics = [
  { label: 'Registered users', value: '1', delta: 'Live count', tone: 'cyan' },
  { label: 'NSE UCC pending', value: '1', delta: 'Awaiting validation', tone: 'amber' },
  { label: 'PAN KYC checks', value: '32', delta: 'Recorded checks', tone: 'green' },
  { label: 'OTP events', value: '55', delta: 'Recent activity', tone: 'violet' },
];

export const adminUsers = [
  {
    initials: 'HU',
    name: 'Current account holder',
    email: '••••••••@••••••.com',
    status: 'UCC pending',
    ucc: 'Pending',
    joined: '26 Sep 2026',
  },
];

export const activityFeed = [
  { label: 'NSE UCC registration', detail: 'Awaiting Exchange validation', time: 'Live', tone: 'amber' },
  { label: 'PAN KYC checks', detail: '32 records in tradexdb', time: '32', tone: 'green' },
  { label: 'OTP service', detail: 'Signup verification events', time: '55', tone: 'cyan' },
];

export const adminHelpItems = [
  { title: 'Review pending UCC', detail: 'Check NSE reports for Pending, Exported and Active states.' },
  { title: 'Protect admin access', detail: 'Move credentials and admin authorization to the backend before production use.' },
  { title: 'Data operations', detail: 'Add protected admin APIs for users, investments and audit exports.' },
];
