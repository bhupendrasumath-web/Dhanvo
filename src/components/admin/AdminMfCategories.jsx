import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import {
  getAdminMfCategorySettings,
  updateAdminMfCategorySetting,
} from '../../services/adminApi';
import { getUniqueSchemeCodesForCategory } from '../../../backend/utils/mfCategories.js';

const Toggle = ({ checked, disabled, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    className={`admin-mf-toggle${checked ? ' is-on' : ''}`}
    disabled={disabled}
    onClick={() => onChange(!checked)}
  >
    <span className="admin-mf-toggle-thumb" />
  </button>
);

const AdminMfCategories = ({ token, onUnauthorized }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveDetail, setSaveDetail] = useState('');
  const [busyKeys, setBusyKeys] = useState({});
  const [search, setSearch] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchCollapsedCategories, setSearchCollapsedCategories] = useState({});

  const loadSettings = useCallback(async (refresh = false) => {
    setError('');
    setSaveError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getAdminMfCategorySettings(token, refresh);
      if (!response.success) throw new Error(response.message || 'Unable to load publication settings.');
      setData(response.data);
      setSavedAt(null);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
      } else {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load publication settings.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async (type, id, enabled) => {
    const key = `${type}:${id || 'featured-picks'}`;
    const bulkCodes = type === 'category-funds'
      ? new Set(getUniqueSchemeCodesForCategory(data?.schemes || [], id))
      : null;
    setBusyKeys((current) => ({ ...current, [key]: true }));
    setSaveError('');
    setSaveDetail('');
    try {
      const response = await updateAdminMfCategorySetting(token, { type, id, enabled });
      if (!response.success) throw new Error(response.message || 'Unable to save this setting.');
      const detail = type === 'category-funds'
        ? `${response.data?.updatedCount ?? bulkCodes.size} unique funds updated`
        : '';
      setData((current) => {
        if (!current) return current;
        if (type === 'featured-picks') return { ...current, featuredPicksEnabled: enabled };
        if (type === 'category') {
          return {
            ...current,
            categories: current.categories.map((category) => (
              category.id === id ? { ...category, enabled } : category
            )),
          };
        }
        if (type === 'collection') {
          return {
            ...current,
            collections: current.collections.map((collection) => (
              collection.id === id ? { ...collection, enabled } : collection
            )),
          };
        }
        if (type === 'fund') {
          return {
            ...current,
            schemes: current.schemes.map((scheme) => (
              scheme.schemeCode === id ? { ...scheme, fundEnabled: enabled } : scheme
            )),
          };
        }
        if (type === 'category-funds') {
          return {
            ...current,
            schemes: current.schemes.map((scheme) => (
              bulkCodes.has(scheme.schemeCode) ? { ...scheme, fundEnabled: enabled } : scheme
            )),
          };
        }
        return current;
      });
      setSaveDetail(detail);
      setSavedAt(new Date());
      try {
        window.localStorage.setItem('dhanvo:mf-publication-updated', String(Date.now()));
      } catch {
        // Storage can be unavailable in private browsing; the Explorer also refreshes on focus.
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onUnauthorized('Your admin session is no longer valid. Sign in again with your admin credentials.');
      } else {
        setSaveError(requestError.response?.data?.message || requestError.message || 'Unable to save this setting.');
      }
    } finally {
      setBusyKeys((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.schemes || [];
    return (data?.schemes || []).filter((scheme) => [
      scheme.name,
      scheme.schemeCode,
      scheme.isin,
      scheme.amcName,
      scheme.schemeCategory,
      scheme.schemeSubCategory,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [data, search]);

  const unclassifiedSchemes = filteredSchemes.filter((scheme) => !scheme.categoryIds.length);
  const otherAutoExpands = Boolean(search.trim()) && unclassifiedSchemes.length > 0;
  const otherExpanded = otherAutoExpands
    ? !searchCollapsedCategories.other
    : Boolean(expandedCategories.other);
  const totalPublished = data?.schemes.filter((scheme) => scheme.fundEnabled).length || 0;
  const formatSaved = Object.keys(busyKeys).length
    ? 'Saving changes…'
    : saveError
      ? 'Save failed · previous settings retained'
      : savedAt
        ? `${saveDetail ? `${saveDetail} · ` : ''}Saved at ${savedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
        : 'All changes are saved';

  if (loading && !data) {
    return <div className="admin-mf-state" role="status">Loading protected settings and NSE schemes…</div>;
  }

  return (
    <div className="admin-mf-categories">
      <section className="admin-mf-intro">
        <div className="admin-mf-intro-mark"><ShieldCheck aria-hidden="true" /></div>
        <div className="admin-mf-intro-copy">
          <p>Explorer publication controls</p>
          <h2>Manage what investors can browse</h2>
          <span>The category switch controls Explorer availability. Individual fund switches and bulk controls save per-scheme visibility separately, so turning a category off never resets its saved fund choices.</span>
        </div>
        <button
          type="button"
          className="admin-mf-refresh"
          onClick={() => loadSettings(true)}
          disabled={refreshing || Object.keys(busyKeys).length > 0}
        >
          <RefreshCw aria-hidden="true" className={refreshing ? 'is-spinning' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh catalogue'}
        </button>
      </section>

      {error && (
        <div className="admin-mf-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => loadSettings()}>Retry</button>
        </div>
      )}
      {saveError && (
        <div className="admin-mf-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{saveError} The previous saved setting is still shown.</span>
        </div>
      )}

      {data && (
        <>
          <div className="admin-mf-summary">
            <div><span>NSE schemes in catalogue</span><strong>{data.schemes.length.toLocaleString('en-IN')}</strong></div>
            <div><span>Individually enabled</span><strong>{totalPublished.toLocaleString('en-IN')}</strong></div>
            <div className={`admin-mf-saved${saveError ? ' has-error' : ''}`} role="status" aria-live="polite">
              {saveError ? <AlertTriangle aria-hidden="true" /> : Object.keys(busyKeys).length ? <RefreshCw aria-hidden="true" className="is-spinning" /> : <Check aria-hidden="true" />}
              <span>{formatSaved}</span>
            </div>
          </div>

          <section className="admin-mf-featured" aria-labelledby="admin-mf-featured-title">
            <div className="admin-mf-featured-heading">
              <div className="admin-mf-section-icon"><Star aria-hidden="true" /></div>
              <div>
                <p className="admin-mf-kicker">Curated discovery</p>
                <h2 id="admin-mf-featured-title">Featured collections &amp; picks</h2>
                <span>Control the existing Explorer collections and its category-spread “Funds by Dhanvo” selection.</span>
              </div>
            </div>
            <div className="admin-mf-featured-picks">
              <div>
                <strong>Funds by Dhanvo</strong>
                <span>One Regular scheme each from ELSS, Index Funds and Debt where available, then alphabetical fill.</span>
              </div>
              <Toggle
                checked={data.featuredPicksEnabled}
                disabled={Boolean(busyKeys['featured-picks:featured-picks'])}
                label={`${data.featuredPicksEnabled ? 'Disable' : 'Enable'} Funds by Dhanvo featured picks`}
                onChange={(enabled) => updateSetting('featured-picks', '', enabled)}
              />
            </div>
            <div className="admin-mf-collection-grid">
              {data.collections.map((collection) => (
                <div className="admin-mf-collection-row" key={collection.id}>
                  <div>
                    <strong>{collection.label}</strong>
                    <span>{collection.schemeCount.toLocaleString('en-IN')} matching NSE schemes</span>
                  </div>
                  <span className={`admin-mf-state-pill${collection.enabled ? ' is-enabled' : ''}`}>
                    {collection.enabled ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    {collection.enabled ? 'Published' : 'Hidden'}
                  </span>
                  <Toggle
                    checked={collection.enabled}
                    disabled={Boolean(busyKeys[`collection:${collection.id}`])}
                    label={`${collection.enabled ? 'Hide' : 'Publish'} ${collection.label} collection`}
                    onChange={(enabled) => updateSetting('collection', collection.id, enabled)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="admin-mf-catalogue" aria-labelledby="admin-mf-catalogue-title">
            <div className="admin-mf-catalogue-heading">
              <div>
                <p className="admin-mf-kicker">Fixed Explorer taxonomy</p>
                <h2 id="admin-mf-catalogue-title">Categories &amp; schemes</h2>
                <span>Disabling a category hides its schemes and removes its filter from the public Explorer. Scheme overrides are retained if NSE temporarily drops a scheme.</span>
              </div>
              <label className="admin-mf-search">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSearchCollapsedCategories({});
                  }}
                  placeholder="Search schemes, AMC or code"
                  aria-label="Search NSE schemes"
                />
              </label>
            </div>

            <div className="admin-mf-category-list">
              {data.categories.map((category) => {
                const schemes = filteredSchemes.filter((scheme) => scheme.categoryIds.includes(category.id));
                const schemesId = `admin-mf-category-${category.id}-schemes`;
                const searchAutoExpands = Boolean(search.trim()) && schemes.length > 0;
                const isExpanded = searchAutoExpands
                  ? !searchCollapsedCategories[category.id]
                  : Boolean(expandedCategories[category.id]);
                const schemeCodes = getUniqueSchemeCodesForCategory(data.schemes, category.id);
                const enabledCount = data.schemes.filter(
                  (scheme) => scheme.categoryIds.includes(category.id)
                    && schemeCodes.includes(scheme.schemeCode)
                    && scheme.fundEnabled,
                ).length;
                const bulkKey = `category-funds:${category.id}`;
                const anyBulkBusy = Object.keys(busyKeys).some((key) => key.startsWith('category-funds:'));
                const categoryHasBusyFund = data.schemes.some(
                  (scheme) => scheme.categoryIds.includes(category.id)
                    && busyKeys[`fund:${scheme.schemeCode}`],
                );
                return (
                  <article className={`admin-mf-category${isExpanded ? '' : ' is-collapsed'}`} key={category.id}>
                    <header className="admin-mf-category-header">
                      <div className="admin-mf-category-title">
                        <span className="admin-mf-category-mark">{category.label.slice(0, 1)}</span>
                        <div>
                          <h3>{category.label}</h3>
                          <span>{category.schemeCount.toLocaleString('en-IN')} NSE schemes</span>
                        </div>
                        <button
                          type="button"
                          className="admin-mf-category-collapse"
                          aria-expanded={isExpanded}
                          aria-controls={schemesId}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.label} fund details`}
                          onClick={() => {
                            if (searchAutoExpands) {
                              setSearchCollapsedCategories((current) => ({
                                ...current,
                                [category.id]: !current[category.id],
                              }));
                            } else {
                              setExpandedCategories((current) => ({
                                ...current,
                                [category.id]: !current[category.id],
                              }));
                            }
                          }}
                        >
                          <ChevronDown aria-hidden="true" />
                        </button>
                      </div>
                      <div className="admin-mf-category-control">
                        <span className={`admin-mf-state-pill${category.enabled ? ' is-enabled' : ''}`}>
                          {category.enabled ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                          {category.enabled ? 'Visible in Explorer' : 'Hidden from Explorer'}
                        </span>
                        <Toggle
                          checked={category.enabled}
                          disabled={Boolean(busyKeys[`category:${category.id}`])}
                          label={`${category.enabled ? 'Disable' : 'Enable'} ${category.label} category`}
                          onChange={(enabled) => updateSetting('category', category.id, enabled)}
                        />
                      </div>
                    </header>
                    {!category.enabled && (
                      <p className="admin-mf-category-notice">This category’s filter and matching schemes are currently hidden from investors.</p>
                    )}
                    <div className="admin-mf-category-bulk">
                      <div>
                        <strong>Individual fund visibility</strong>
                        <span>
                          {enabledCount.toLocaleString('en-IN')} of {schemeCodes.length.toLocaleString('en-IN')} unique matching funds enabled.
                          {' '}Bulk changes do not change this category’s Explorer on/off state; search does not limit the bulk scope.
                        </span>
                      </div>
                      <div className="admin-mf-category-bulk-actions">
                        <button
                          type="button"
                          className="admin-mf-bulk-button"
                          disabled={!schemeCodes.length || anyBulkBusy || categoryHasBusyFund}
                          onClick={() => updateSetting('category-funds', category.id, true)}
                        >
                          {busyKeys[bulkKey] ? 'Updating…' : 'Enable all funds'}
                        </button>
                        <button
                          type="button"
                          className="admin-mf-bulk-button is-secondary"
                          disabled={!schemeCodes.length || anyBulkBusy || categoryHasBusyFund}
                          onClick={() => updateSetting('category-funds', category.id, false)}
                        >
                          {busyKeys[bulkKey] ? 'Updating…' : 'Hide all funds'}
                        </button>
                      </div>
                    </div>
                    <div className="admin-mf-scheme-list" id={schemesId} hidden={!isExpanded}>
                      {isExpanded && (schemes.length ? (
                        schemes.map((scheme, schemeIndex) => {
                          const duplicate = scheme.duplicateSchemeCode;
                          const toggleKey = `fund:${scheme.schemeCode}`;
                          const schemeBulkBusy = scheme.categoryIds.some(
                            (categoryId) => busyKeys[`category-funds:${categoryId}`],
                          );
                          return (
                            <div className="admin-mf-scheme-row" key={`${category.id}-${scheme.schemeCode}-${scheme.isin}-${schemeIndex}`}>
                              <div className="admin-mf-scheme-copy">
                                <strong title={scheme.name}>{scheme.name}</strong>
                                <span>{[scheme.amcName, `Code ${scheme.schemeCode}`, scheme.plan, scheme.option].filter(Boolean).join(' · ')}</span>
                                {duplicate && <small>Duplicate NSE scheme code — individual control is unavailable to avoid changing multiple records.</small>}
                              </div>
                              <span
                                className={`admin-mf-state-pill admin-mf-scheme-visibility${!category.enabled ? ' is-category-hidden' : ''}`}
                                title={`Individual scheme setting: ${scheme.fundEnabled ? 'visible' : 'hidden'}; ${category.enabled ? 'category enabled' : 'category disabled'}.`}
                              >
                                <span>Explorer: {!category.enabled ? 'Hidden · category off' : scheme.fundEnabled ? 'Visible' : 'Hidden · individual'}</span>
                                <span>Saved fund: {scheme.fundEnabled ? 'Enabled' : 'Hidden'}</span>
                              </span>
                              <Toggle
                                checked={scheme.fundEnabled}
                                disabled={!scheme.hasSchemeCode || duplicate || Boolean(busyKeys[toggleKey]) || Boolean(schemeBulkBusy)}
                                label={`Individual scheme visibility: ${scheme.fundEnabled ? 'visible' : 'hidden'} for ${scheme.name}${category.enabled ? '' : '. Category is disabled, so this scheme remains hidden in Explorer'}`}
                                onChange={(enabled) => updateSetting('fund', scheme.schemeCode, enabled)}
                              />
                            </div>
                          );
                        })
                      ) : (
                        <p className="admin-mf-empty">No NSE schemes match this category and search.</p>
                      ))}
                    </div>
                  </article>
                );
              })}

              {unclassifiedSchemes.length > 0 && (
                <article className={`admin-mf-category${otherExpanded ? '' : ' is-collapsed'}`}>
                  <header className="admin-mf-category-header">
                    <div className="admin-mf-category-title">
                      <span className="admin-mf-category-mark">•</span>
                      <div>
                        <h3>Other / unclassified</h3>
                        <span>{unclassifiedSchemes.length.toLocaleString('en-IN')} schemes outside the fixed filters</span>
                      </div>
                      <button
                        type="button"
                        className="admin-mf-category-collapse"
                        aria-expanded={otherExpanded}
                        aria-controls="admin-mf-category-other-schemes"
                        aria-label={`${otherExpanded ? 'Collapse' : 'Expand'} Other / unclassified fund details`}
                        onClick={() => {
                          if (otherAutoExpands) {
                            setSearchCollapsedCategories((current) => ({
                              ...current,
                              other: !current.other,
                            }));
                          } else {
                            setExpandedCategories((current) => ({
                              ...current,
                              other: !current.other,
                            }));
                          }
                        }}
                      >
                        <ChevronDown aria-hidden="true" />
                      </button>
                    </div>
                  </header>
                  <div
                    className="admin-mf-scheme-list"
                    id="admin-mf-category-other-schemes"
                    hidden={!otherExpanded}
                  >
                    {otherExpanded && unclassifiedSchemes.map((scheme, schemeIndex) => (
                      <div className="admin-mf-scheme-row" key={`other-${scheme.schemeCode}-${scheme.isin}-${schemeIndex}`}>
                        <div className="admin-mf-scheme-copy">
                          <strong title={scheme.name}>{scheme.name}</strong>
                          <span>{[scheme.amcName, `Code ${scheme.schemeCode}`, scheme.plan, scheme.option].filter(Boolean).join(' · ')}</span>
                        </div>
                        <span className={`admin-mf-state-pill${scheme.fundEnabled ? ' is-enabled' : ''}`}>
                          {scheme.fundEnabled ? 'Visible' : 'Hidden'}
                        </span>
                        <Toggle
                          checked={scheme.fundEnabled}
                          disabled={!scheme.hasSchemeCode || scheme.duplicateSchemeCode || Boolean(busyKeys[`fund:${scheme.schemeCode}`])}
                          label={`Individual scheme visibility: ${scheme.fundEnabled ? 'visible' : 'hidden'} for ${scheme.name}`}
                          onChange={(enabled) => updateSetting('fund', scheme.schemeCode, enabled)}
                        />
                      </div>
                    ))}
                  </div>
                </article>
              )}
              {!filteredSchemes.length && (
                <div className="admin-mf-empty">No NSE schemes match “{search}”. Try a different search.</div>
              )}
            </div>
          </section>
          <p className="admin-mf-source">NSE scheme catalogue · refreshed {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('en-IN') : 'time not reported'} · settings stored in PostgreSQL</p>
        </>
      )}
    </div>
  );
};

export default AdminMfCategories;
