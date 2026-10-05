const AccountStatusCard = ({ user, status, remark }) => {
  const statusRemark = remark || user?.nseStatusRemark || 'NSE registration requires attention.';
  const authorizationPending = status === 'ACTION_REQUIRED'
    && /client authorization\s*\/\s*AOF\s*\/\s*eLog is pending/i.test(statusRemark);
  const displayRemark = authorizationPending
    ? 'NSE authorization is pending. Please check your mailbox for an authorization email and complete the required action.'
    : statusRemark;

  return (
    <div className="mb-6 bg-dark-900/60 backdrop-blur-xl border border-primary-500/20 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary-400 text-sm font-medium uppercase tracking-wider">NSE account status</p>
          <h2 className="text-xl font-display font-bold text-white mt-1">{status === 'ACTIVE' ? 'Account opening completed' : status === 'FAILED' ? 'Registration failed' : status === 'ACTION_REQUIRED' ? 'Action required for activation' : 'Account under verification'}</h2>
          <p className="text-dark-400 mt-2">{status === 'ACTIVE' ? 'Your NSE client registration is active and linked to this account.' : status === 'FAILED' || status === 'ACTION_REQUIRED' ? displayRemark : 'Your UCC has been registered and is awaiting NSE/Depository validation.'}</p>
        </div>
        <div className="text-left sm:text-right"><p className="text-dark-500 text-xs uppercase tracking-wider">Client code / UCC</p><p className="text-white font-mono text-lg mt-1">{user?.nseClientCode || 'Pending'}</p><p className="text-primary-400 text-sm mt-1">{status === 'ACTIVE' ? 'NSE active' : status === 'FAILED' ? 'Registration failed' : status === 'ACTION_REQUIRED' ? 'NSE action required' : 'Registration pending'}</p></div>
      </div>
    </div>
  );
};

export default AccountStatusCard;
