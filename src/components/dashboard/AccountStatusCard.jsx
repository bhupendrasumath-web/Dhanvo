import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

const AccountStatusCard = ({
  user,
  status,
  remark,
  showKycRetry = false,
  onRetryKyc,
  kycRetryLoading = false,
  kycRetryError = '',
  kycVerificationUrl = '',
  statusDetails = {},
  onRefreshStatus,
  statusRefreshing = false,
  statusRefreshError = '',
  onGetAuthorizationLink,
  authorizationLinkLoading = false,
  authorizationLinkError = '',
  authorizationUrl = '',
}) => {
  const statusRemark = remark || user?.nseStatusRemark || 'NSE registration requires attention.';
  const authorizationStatus = String(statusDetails.authStatus || '').trim().toUpperCase();
  const uccStatus = String(statusDetails.uccStatus || '').trim().toUpperCase();
  const clientReviewPending = status === 'ACTION_REQUIRED'
    && uccStatus === 'INACTIVE'
    && (authorizationStatus === 'REVIEW' || /client review is pending/i.test(statusRemark));
  const authorizationPending = status === 'ACTION_REQUIRED'
    && /client authorization\s*\/\s*AOF\s*\/\s*eLog is pending/i.test(statusRemark);
  const displayRemark = clientReviewPending
    ? 'NSE has marked the UCC inactive while client review is pending.'
    : authorizationPending
    ? 'NSE authorization is pending. Please check your mailbox for an authorization email and complete the required action.'
    : statusRemark;
  const isActive = status === 'ACTIVE';
  const needsAction = status === 'FAILED' || status === 'ACTION_REQUIRED';
  const title = isActive
    ? 'Account opening completed'
    : status === 'FAILED'
      ? 'Registration failed'
      : status === 'ACTION_REQUIRED'
        ? 'Action required for activation'
        : 'Account under verification';

  return (
    <section className={`dash-account-status${isActive ? ' is-active' : ''}${needsAction ? ' needs-action' : ''}`} aria-label="NSE account status">
      <span className="dash-status-symbol">
        {isActive ? <CheckCircle2 size={19} /> : needsAction ? <CircleAlert size={19} /> : <Clock3 size={19} />}
      </span>
      <div className="dash-status-message">
        <p className="dash-status-kicker">NSE account status <span>{isActive ? 'Active' : needsAction ? 'Action required' : 'In progress'}</span></p>
        <h2>{title}</h2>
        <p>{isActive ? 'Your NSE client registration is active and linked to this account.' : needsAction ? displayRemark : 'Your UCC has been registered and is awaiting NSE / Depository validation.'}</p>
      </div>
      <div className="dash-uc-code">
        <span>CLIENT CODE / UCC</span>
        <strong>{user?.nseClientCode || 'Pending'}</strong>
      </div>
      {!isActive && (
        <div className="dash-account-status-actions">
          {clientReviewPending && (
            <>
              <p>
                NSE’s API guide provides a UCC authorization link. Open it to complete any investor authorization requested by NSE.
                If it does not resolve the review, Dhanvo support must follow up with NSE; the dashboard cannot activate a UCC manually.
              </p>
              <button type="button" onClick={onGetAuthorizationLink} disabled={authorizationLinkLoading}>
                {authorizationLinkLoading ? <Loader2 size={15} className="dash-spin" /> : <ExternalLink size={15} />}
                {authorizationLinkLoading ? 'Getting NSE link...' : 'Get NSE authorization link'}
              </button>
              {authorizationUrl && (
                <a href={authorizationUrl} target="_blank" rel="noopener noreferrer">
                  Open NSE authorization page <ArrowUpRight size={14} />
                </a>
              )}
              {authorizationLinkError && <p className="dash-kyc-retry-error" role="alert">{authorizationLinkError}</p>}
              <a href="mailto:support@dhanvo.in?subject=NSE%20client%20review%20pending">
                Contact Dhanvo support <ArrowUpRight size={14} />
              </a>
            </>
          )}
          {onRefreshStatus && (
            <>
              <button type="button" onClick={onRefreshStatus} disabled={statusRefreshing}>
                {statusRefreshing ? <Loader2 size={15} className="dash-spin" /> : <RefreshCw size={15} />}
                {statusRefreshing ? 'Refreshing NSE status...' : 'Refresh NSE status'}
              </button>
              {statusRefreshError && <p className="dash-kyc-retry-error" role="alert">{statusRefreshError}</p>}
            </>
          )}
        </div>
      )}
      {showKycRetry && (
        <div className="dash-kyc-retry">
          <p>NSE could not confirm your KYC. You can generate a fresh Aadhaar eKYC link and retry verification.</p>
          <button type="button" onClick={onRetryKyc} disabled={kycRetryLoading}>
            {kycRetryLoading ? <Loader2 size={15} className="dash-spin" /> : <RefreshCw size={15} />}
            {kycRetryLoading ? 'Generating link...' : 'Retry Aadhaar eKYC'}
          </button>
          {kycRetryError && <p className="dash-kyc-retry-error" role="alert">{kycRetryError}</p>}
          {kycVerificationUrl && (
            <a href={kycVerificationUrl} target="_blank" rel="noopener noreferrer">
              Open Aadhaar eKYC link <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      )}
    </section>
  );
};

export default AccountStatusCard;
