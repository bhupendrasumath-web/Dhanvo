import { BookmarkMinus, Compass } from 'lucide-react';
import DashboardScreenHeader from './DashboardScreenHeader';

const formatNav = (value) => (
  value === null || value === undefined || value === ''
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
);

const WatchlistPage = ({
  schemes,
  isLoading,
  loadError,
  updatingSchemeCode,
  onRetry,
  onRemoveScheme,
  onBrowseSchemes,
}) => (
  <>
    <DashboardScreenHeader
      eyebrow="Your saved schemes"
      title="Mutual Fund Watchlist"
      description="Keep track of NSE MFSS schemes and their latest published NAV."
      actionLabel={<><Compass size={14} /> Explore funds</>}
      actionTitle="Browse NSE mutual-fund schemes"
      onAction={onBrowseSchemes}
    />
    {loadError && (
      <div className="dash-watchlist-error" role="alert">
        <span>{loadError}</span>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    )}
    <section className="dash-mf-watchlist-panel" aria-label="Saved mutual-fund schemes">
      <div className="dash-mf-watchlist-heading">
        <div>
          <p className="dash-screen-eyebrow">NSE MFSS · Latest published NAV</p>
          <h2>Saved schemes <span>{isLoading || loadError ? '—' : schemes.length}</span></h2>
        </div>
        <span className="dash-mf-watchlist-market">NAV may not be intraday</span>
      </div>
      {isLoading ? (
        <p className="dash-mf-watchlist-loading" role="status">Loading saved schemes and the latest published NAV…</p>
      ) : loadError ? (
        <p className="dash-mf-watchlist-loading">Saved schemes are unavailable until the watchlist can be loaded.</p>
      ) : schemes.length ? (
        <div className="dash-mf-watchlist-list">
          {schemes.map((scheme) => (
            <article key={scheme.schemeCode} className="dash-mf-watchlist-row">
              <div className="dash-mf-watchlist-name">
                <span className="dash-mf-watchlist-mark" aria-hidden="true">
                  {(scheme.amcName || scheme.name || 'MF').slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h3>{scheme.name}</h3>
                  <p>{[scheme.amcName, scheme.schemeCode].filter(Boolean).join(' · ')}</p>
                  {scheme.schemeCategory && <small>{scheme.schemeCategory}</small>}
                </div>
              </div>
              <div className="dash-mf-watchlist-nav">
                <span>Latest NAV</span>
                <strong>{formatNav(scheme.nav)}</strong>
                <small>{scheme.navDate || 'NAV date unavailable'}</small>
              </div>
              <button
                type="button"
                className="dash-mf-watchlist-remove"
                onClick={() => onRemoveScheme(scheme)}
                disabled={Boolean(updatingSchemeCode)}
                aria-label={`Remove ${scheme.name} from watchlist`}
              >
                <BookmarkMinus size={15} />
                {updatingSchemeCode === scheme.schemeCode ? 'Removing…' : 'Remove'}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="dash-mf-watchlist-empty">
          <span><BookmarkMinus size={20} /></span>
          <h3>No saved schemes yet</h3>
          <p>Save mutual-fund schemes from Explore to see their latest published NSE NAV here.</p>
          <button type="button" onClick={onBrowseSchemes}>
            <Compass size={14} /> Explore mutual funds
          </button>
        </div>
      )}
    </section>
  </>
);

export default WatchlistPage;
