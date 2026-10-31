import { motion } from 'framer-motion';
import { Bookmark, Compass } from 'lucide-react';

const formatNav = (value) => (
  value === null || value === undefined || value === ''
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
);

const WatchlistWidget = ({
  schemes,
  id,
  isLoading,
  loadError,
  onRetry,
  onViewWatchlist,
  onBrowseSchemes,
}) => (
  <motion.section id={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="dash-panel" aria-labelledby="watchlist-title">
    <div className="dash-panel-heading">
      <div>
        <p className="dash-panel-kicker">KEEP AN EYE ON</p>
        <h2 id="watchlist-title">Watchlist <span>{schemes.length}</span></h2>
      </div>
      <button type="button" className="dash-watchlist-action" onClick={onBrowseSchemes}>
        <Compass size={15} /> Explore funds
      </button>
    </div>
    {loadError && <p className="dash-watchlist-load-error" role="alert">{loadError}</p>}
    <div className="dash-widget-list">
      {isLoading ? (
        <div className="dash-mf-widget-empty" role="status">Loading saved schemes…</div>
      ) : loadError ? (
        <div className="dash-mf-widget-empty">
          <p>Saved schemes could not be loaded.</p>
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      ) : schemes.length ? schemes.slice(0, 4).map((scheme, index) => (
        <article key={scheme.schemeCode} className="dash-mf-widget-row">
          <span className={`dash-watch-initial initial-${index % 4}`}>
            {(scheme.amcName || scheme.name || 'MF').slice(0, 1).toUpperCase()}
          </span>
          <div className="dash-watch-name">
            <strong>{scheme.name}</strong>
            <small>{scheme.amcName || scheme.schemeCode}</small>
          </div>
          <div className="dash-mf-widget-nav">
            <strong>{formatNav(scheme.nav)}</strong>
            <small>{scheme.navDate || 'NAV date unavailable'}</small>
          </div>
        </article>
      )) : (
        <div className="dash-mf-widget-empty">
          <Bookmark size={16} />
          <p>Your mutual-fund watchlist is empty.</p>
        </div>
      )}
    </div>
    <button type="button" className="dash-view-all" onClick={loadError || schemes.length ? onViewWatchlist : onBrowseSchemes}>
      {loadError || schemes.length ? 'View watchlist' : 'Explore funds'} <span aria-hidden="true">→</span>
    </button>
  </motion.section>
);

export default WatchlistWidget;
