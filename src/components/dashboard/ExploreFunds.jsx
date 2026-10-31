import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  CalendarDays,
  Coins,
  Info,
  Layers3,
  Leaf,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DashboardToolsPanel from './DashboardToolsPanel';
import api from '../../services/api';
import {
  getSchemeCategoryIds,
  getSchemeCategoryLabels,
  MF_PUBLICATION_CATEGORIES,
} from '../../../backend/utils/mfCategories.js';
import { getPurchaseAmountError } from '../../../backend/utils/nsePurchase.js';

const categories = ['All', 'Equity', 'Debt', 'Hybrid', 'ELSS', 'Index Funds'];

const TOP_SCHEME_COUNT = 6;
const CATALOGUE_PAGE_SIZE = 25;
const normalizeSchemeText = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const hasSchemeTerm = (entry, pattern) => entry.collectionText.some((field) => pattern.test(field));
const collections = [
  {
    id: 'equity-funds',
    label: 'Equity Funds',
    description: 'Schemes in the Equity category',
    category: 'Equity',
    icon: TrendingUp,
    matches: (entry) => entry.categories.includes('Equity'),
  },
  {
    id: 'growth-option',
    label: 'Growth Option',
    description: 'Equity schemes with Growth option',
    category: 'Equity',
    icon: CalendarDays,
    matches: (entry) => entry.categories.includes('Equity') && /\bgrowth\b/.test(normalizeSchemeText(entry.fund.option)),
  },
  {
    id: 'gold-silver',
    label: 'Gold & Silver',
    description: 'Precious metals',
    category: 'All',
    icon: Coins,
    matches: (entry) => hasSchemeTerm(entry, /\b(?:gold|silver)\b/),
  },
  {
    id: 'large-cap',
    label: 'Large Cap',
    description: 'Equity schemes marked Large Cap',
    category: 'Equity',
    icon: Building2,
    matches: (entry) => entry.categories.includes('Equity') && hasSchemeTerm(entry, /\blarge cap\b/),
  },
  {
    id: 'mid-cap',
    label: 'Mid Cap',
    description: 'Equity schemes marked Mid Cap',
    category: 'Equity',
    icon: Layers3,
    matches: (entry) => entry.categories.includes('Equity') && hasSchemeTerm(entry, /\bmid cap\b/),
  },
  {
    id: 'small-cap',
    label: 'Small Cap',
    description: 'Equity schemes marked Small Cap',
    category: 'Equity',
    icon: Leaf,
    matches: (entry) => entry.categories.includes('Equity') && hasSchemeTerm(entry, /\bsmall cap\b/),
  },
];
const PAYMENT_MODES = [
  { value: 'UPI', label: 'UPI' },
  { value: 'NETBANKING', label: 'Netbanking' },
];
const isMobileDevice = typeof navigator !== 'undefined'
  && (navigator.userAgentData?.mobile === true || /android|iphone|ipad|ipod/i.test(navigator.userAgent));
const REGULAR_PLAN_CODES = ['R', 'REG', 'REGULAR'];
const publicationCategoryIds = new Map(
  MF_PUBLICATION_CATEGORIES.map(({ id, label }) => [label, id]),
);
const formatRupees = (value) => (
  value === null || value === undefined || value === ''
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 4 })}`
);
const fundClassification = (fund) => [
  fund.schemeType,
  fund.schemeCategory,
  fund.schemeSubCategory,
].filter(Boolean).join(' · ');

const getPurchaseUnavailableReason = (fund) => {
  const isRegularPlan = REGULAR_PLAN_CODES.includes(String(fund.plan || '').trim().toUpperCase());
  if (!isRegularPlan) return 'Only regular plans can be purchased through this distributor.';
  if (!fund.purchaseEligible) return 'NSE is not accepting purchases for this scheme.';
  return '';
};

const getPaginationItems = (pageCount, currentPage) => {
  const pageNumbers = [...new Set([
    1,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    pageCount,
  ].filter((page) => page >= 1 && page <= pageCount))].sort((a, b) => a - b);

  return pageNumbers.reduce((items, page, index) => {
    if (index > 0) {
      const previousPage = pageNumbers[index - 1];
      const gap = page - previousPage;
      if (gap === 2) items.push({ type: 'page', page: previousPage + 1 });
      if (gap > 2) items.push({ type: 'ellipsis', key: `${previousPage}-${page}` });
    }
    items.push({ type: 'page', page });
    return items;
  }, []);
};

const FundSectionTitle = ({ eyebrow, title, infoLabel, action, id }) => (
  <div className="dash-explore-section-title">
    <div className="sh-text">
      <span className="sh-eyebrow">{eyebrow}</span>
      <h2 id={id}>{title}</h2>
    </div>
    <div className="dash-explore-section-actions">
      {action}
      {infoLabel && (
        <span className="dash-explore-section-info" aria-label={infoLabel} title={infoLabel}>
          <Info size={12} aria-hidden="true" />
        </span>
      )}
    </div>
  </div>
);

const FundCard = ({
  fund,
  canInvest,
  isWatchlisted,
  watchlistBusy,
  onToggleWatchlist,
  onInvest,
}) => {
  const classification = fundClassification(fund);
  const options = [fund.plan, fund.option].filter(Boolean).join(' · ');
  const isRegularPlan = REGULAR_PLAN_CODES.includes(String(fund.plan || '').trim().toUpperCase());
  const unavailableReason = canInvest
    ? getPurchaseUnavailableReason(fund)
    : 'Investments will be available after NSE activates your client account.';
  const unavailableReasonId = useId();

  return (
    <article className="dash-explore-fund-card">
      <div className="dash-explore-fund-category">{classification || 'Mutual fund scheme'}</div>
      <h3>{fund.name}</h3>
      <div className="dash-explore-fund-sub">
        {[fund.amcName, options || `Scheme code ${fund.schemeCode}`].filter(Boolean).join(' · ')}
      </div>
      <button
        type="button"
        className={`dash-mf-watch-toggle${isWatchlisted ? ' is-saved' : ''}`}
        aria-pressed={isWatchlisted}
        aria-label={`${isWatchlisted ? 'Remove' : 'Add'} ${fund.name} ${isWatchlisted ? 'from' : 'to'} watchlist`}
        onClick={() => onToggleWatchlist(fund)}
        disabled={watchlistBusy}
      >
        {isWatchlisted ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        {isWatchlisted ? 'Saved to watchlist' : 'Add to watchlist'}
      </button>
      <div className="dash-explore-fund-metrics">
        <span>
          <span className="m-label">Latest NAV</span>
          <span className="m-value">{formatRupees(fund.nav)}</span>
        </span>
        <span>
          <span className="m-label">NAV Date</span>
          <span className="m-value">{fund.navDate || '—'}</span>
        </span>
      </div>
      <button
        type="button"
        className="dash-explore-invest-button"
        disabled={!canInvest || !fund.purchaseEligible || !isRegularPlan}
        aria-describedby={unavailableReason ? unavailableReasonId : undefined}
        onClick={() => onInvest(fund)}
      >
        Invest Now
      </button>
      {unavailableReason && (
        <p className="dash-explore-unavailable-reason" id={unavailableReasonId}>
          {unavailableReason}
        </p>
      )}
    </article>
  );
};

const FundRow = ({
  fund,
  canInvest,
  resultNumber,
  isWatchlisted,
  watchlistBusy,
  onToggleWatchlist,
  onInvest,
}) => {
  const classification = fundClassification(fund);
  const options = [fund.plan, fund.option].filter(Boolean).join(' · ');
  const isRegularPlan = REGULAR_PLAN_CODES.includes(String(fund.plan || '').trim().toUpperCase());
  const unavailableReason = canInvest
    ? getPurchaseUnavailableReason(fund)
    : 'Investments will be available after NSE activates your client account.';
  const unavailableReasonId = useId();

  return (
    <article className="dash-explore-fund-row">
      <div className="dash-explore-row-copy">
        <div className="dash-explore-row-kicker">
          <span className="dash-explore-row-index">{String(resultNumber).padStart(4, '0')}</span>
          <span className="dash-explore-fund-category">{classification || 'Mutual fund scheme'}</span>
        </div>
        <h3>{fund.name}</h3>
        <p>{[fund.amcName, options].filter(Boolean).join(' · ') || 'Scheme details'}</p>
        <div className="dash-explore-row-identifiers">
          <span>Code <b>{fund.schemeCode || '—'}</b></span>
          {fund.isin && <span>ISIN <b>{fund.isin}</b></span>}
        </div>
      </div>
      <div className="dash-explore-row-nav">
        <span>Latest NAV</span>
        <b>{formatRupees(fund.nav)}</b>
        <small>{fund.navDate || 'Date unavailable'}</small>
      </div>
      <div className="dash-explore-row-actions">
        <button
          type="button"
          className={`dash-mf-watch-toggle${isWatchlisted ? ' is-saved' : ''}`}
          aria-pressed={isWatchlisted}
          aria-label={`${isWatchlisted ? 'Remove' : 'Add'} ${fund.name} ${isWatchlisted ? 'from' : 'to'} watchlist`}
          onClick={() => onToggleWatchlist(fund)}
          disabled={watchlistBusy}
        >
          {isWatchlisted ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {isWatchlisted ? 'Saved' : 'Watch'}
        </button>
        <button
          type="button"
          className="dash-explore-invest-button"
          disabled={!canInvest || !fund.purchaseEligible || !isRegularPlan}
          aria-describedby={unavailableReason ? unavailableReasonId : undefined}
          onClick={() => onInvest(fund)}
        >
          Invest Now
        </button>
      </div>
      {unavailableReason && (
        <p className="dash-explore-unavailable-reason" id={unavailableReasonId}>
          {unavailableReason}
        </p>
      )}
    </article>
  );
};

const ExploreFunds = ({
  onNavigate,
  canInvest = true,
  watchlistSchemeCodes,
  watchlistUpdatingCode,
  watchlistLoading,
  watchlistError,
  onRetryWatchlist,
  onToggleWatchlist,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState('');
  const [funds, setFunds] = useState([]);
  const [publication, setPublication] = useState(null);
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [fundsError, setFundsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const screenHeadingRef = useRef(null);
  const resultsListRef = useRef(null);
  const focusResultsAfterPageChange = useRef(false);
  const previousCatalogueState = useRef(catalogueOpen);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshingFunds, setRefreshingFunds] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [upiVpa, setUpiVpa] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderAmountError, setOrderAmountError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const orderDialogRef = useRef(null);
  const investmentAmountError = selectedFund && investmentAmount
    ? getPurchaseAmountError(investmentAmount, selectedFund)
    : '';

  useEffect(() => {
    if (previousCatalogueState.current !== catalogueOpen) {
      screenHeadingRef.current?.focus();
      previousCatalogueState.current = catalogueOpen;
    }
  }, [catalogueOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const refreshCatalogue = () => setRetryCount((count) => count + 1);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshCatalogue();
    };
    const onPublicationUpdate = (event) => {
      if (event.key === 'dhanvo:mf-publication-updated') {
        setFunds([]);
        setPublication(null);
        setLoadingFunds(true);
        refreshCatalogue();
      }
    };
    window.addEventListener('storage', onPublicationUpdate);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('storage', onPublicationUpdate);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (catalogueOpen && !loadingFunds && !fundsError && focusResultsAfterPageChange.current) {
      resultsListRef.current?.focus();
      focusResultsAfterPageChange.current = false;
    }
  }, [catalogueOpen, currentPage, loadingFunds, fundsError]);

  useEffect(() => {
    const dialog = orderDialogRef.current;
    if (selectedFund && dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [selectedFund]);

  const openInvestment = (fund) => {
    setSelectedFund(fund);
    setInvestmentAmount(fund.minPurchaseAmount ? String(fund.minPurchaseAmount) : '');
    setPaymentMode('UPI');
    setUpiVpa('');
    setConfirmedOrder(false);
    setOrderError('');
    setOrderAmountError('');
    setOrderResult(null);
  };

  const submitInvestment = async (event) => {
    event.preventDefault();
    if (!selectedFund || !confirmedOrder || submittingOrder) return;

    setSubmittingOrder(true);
    setOrderError('');
    setOrderAmountError('');
    setOrderResult(null);
    try {
      const response = await api.post('/mutual-funds/orders', {
        schemeCode: selectedFund.schemeCode,
        amount: investmentAmount,
        paymentMode,
        vpa: paymentMode === 'UPI' ? upiVpa.trim() : undefined,
        confirmed: true,
      });
      setOrderResult(response.data?.data || {});
      if (paymentMode === 'UPI' && isMobileDevice && response.data?.data?.paymentUrl) {
        window.location.assign(response.data.data.paymentUrl);
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unable to place this NSE order.';
      const responseData = error.response?.data?.data;
      const isDefinitiveRejection = String(responseData?.orderStatus || '').toUpperCase() === 'TRXN FAILED';
      if (isDefinitiveRejection && /amount.*less than minimum|minimum.*specified for scheme/i.test(message)) {
        const minimumAmount = Number(responseData?.purchaseConstraints?.minimumAmount);
        const amountLabel = `₹${Number(investmentAmount).toLocaleString('en-IN')}`;
        setOrderAmountError(
          Number.isFinite(minimumAmount) && minimumAmount > 0
            ? `NSE rejected ${amountLabel} for ${selectedFund.name}. The current NSE minimum is ₹${minimumAmount.toLocaleString('en-IN')}; enter at least that amount.`
            : `NSE rejected ${amountLabel} for ${selectedFund.name} because it is below the scheme minimum. NSE did not include the exact minimum in its response, and the current scheme data does not provide it. Do not retry this amount; contact Dhanvo support to confirm the exact minimum.`
        );
        setOrderError('');
        setOrderResult(null);
      } else {
        setOrderError(message);
        setOrderResult(isDefinitiveRejection
          ? null
          : responseData?.orderId
            ? { ...responseData, paymentMode }
            : !error.response
              ? { submissionUncertain: true, paymentMode }
              : null);
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  const closeInvestment = () => {
    if (!submittingOrder) setSelectedFund(null);
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadFunds = async () => {
      setLoadingFunds(true);
      setRefreshingFunds(true);
      setFundsError('');
      setFunds([]);
      setLastUpdated('');

      try {
        const response = await api.get('/mutual-funds/schemes', { signal: controller.signal });
        setFunds(response.data?.data?.schemes || []);
        setPublication(response.data?.data?.publication || null);
        setLastUpdated(response.data?.data?.lastUpdated || '');
      } catch (error) {
        if (!controller.signal.aborted) {
          setFundsError(
            error.response?.data?.message
              || error.message
              || 'Unable to load mutual fund schemes.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingFunds(false);
          setRefreshingFunds(false);
        }
      }
    };

    loadFunds();
    return () => controller.abort();
  }, [retryCount]);

  const visibleCategories = useMemo(() => publication ? [
    'All',
    ...categories.slice(1).filter((category) => {
      const id = publicationCategoryIds.get(category);
      return publication?.categoryVisibility?.[id] !== false;
    }),
  ] : ['All'], [publication]);
  const visibleCollections = useMemo(
    () => publication ? collections.filter((collection) => {
      if (publication?.collectionVisibility?.[collection.id] === false) return false;
      const categoryId = publicationCategoryIds.get(collection.category);
      return !categoryId || publication?.categoryVisibility?.[categoryId] !== false;
    }) : [],
    [publication],
  );

  useEffect(() => {
    if (!visibleCategories.includes(selectedCategory)) {
      setSelectedCategory('All');
      setActiveCollectionId('');
    }
  }, [selectedCategory, visibleCategories]);

  const searchableFunds = useMemo(() => funds
    .filter((fund) => REGULAR_PLAN_CODES.includes(String(fund.plan || '').trim().toUpperCase()))
    .filter((fund) => !getSchemeCategoryIds(fund).some(
      (id) => publication?.categoryVisibility?.[id] === false,
    ))
    .map((fund) => {
    const classification = fundClassification(fund);
    return {
      fund,
      categories: getSchemeCategoryLabels(fund),
      searchText: [
        fund.name,
        fund.schemeCode,
        fund.isin,
        fund.amcName,
        classification,
        fund.plan,
        fund.option,
      ].map((value) => String(value || '').toLowerCase()).join(' ').trim(),
      collectionText: [
        fund.schemeType,
        fund.schemeCategory,
        fund.schemeSubCategory,
        fund.option,
        fund.name,
      ].map(normalizeSchemeText),
    };
    }), [funds, publication]);
  const availableCollections = useMemo(
    () => visibleCollections.filter((collection) => (
      loadingFunds
      || searchableFunds.some(collection.matches)
    )),
    [visibleCollections, loadingFunds, searchableFunds],
  );
  const filteredFunds = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    const activeCollection = collections.find((collection) => collection.id === activeCollectionId);
    return searchableFunds.reduce((results, entry) => {
      if (
        (selectedCategory === 'All' || entry.categories.includes(selectedCategory))
        && (!query || entry.searchText.includes(query))
        && (!activeCollection || activeCollection.matches(entry))
      ) {
        results.push(entry.fund);
      }
      return results;
    }, []);
  }, [searchableFunds, debouncedSearchQuery, selectedCategory, activeCollectionId]);
  const featuredFunds = useMemo(() => {
    const picks = [];
    const orderedFunds = [...searchableFunds].sort((first, second) => (
      first.fund.name.localeCompare(second.fund.name, 'en', { sensitivity: 'base' })
    ));
    ['ELSS', 'Index Funds', 'Debt'].forEach((category) => {
      const representative = orderedFunds.find(
        (entry) => entry.categories.includes(category) && !picks.includes(entry.fund),
      );
      if (representative) picks.push(representative.fund);
    });
    orderedFunds.forEach(({ fund }) => {
      if (picks.length < 3 && !picks.includes(fund)) picks.push(fund);
    });
    return picks.slice(0, 3);
  }, [searchableFunds]);
  const openCatalogue = () => {
    focusResultsAfterPageChange.current = true;
    setCurrentPage(1);
    setCatalogueOpen(true);
  };
  const openCollection = (collection) => {
    setActiveCollectionId(collection.id);
    setSelectedCategory(collection.category);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
    openCatalogue();
  };
  const pageCount = Math.ceil(filteredFunds.length / CATALOGUE_PAGE_SIZE);
  const paginationItems = getPaginationItems(pageCount, currentPage);
  useEffect(() => {
    const lastAvailablePage = Math.max(1, pageCount);
    if (currentPage > lastAvailablePage) setCurrentPage(lastAvailablePage);
  }, [currentPage, pageCount]);
  const goToPage = (page) => {
    const nextPage = Math.min(pageCount, Math.max(1, page));
    if (nextPage !== currentPage) {
      focusResultsAfterPageChange.current = true;
      setCurrentPage(nextPage);
    }
  };
  const pageFunds = filteredFunds.slice(
    (currentPage - 1) * CATALOGUE_PAGE_SIZE,
    currentPage * CATALOGUE_PAGE_SIZE,
  );
  const visibleFunds = catalogueOpen ? pageFunds : filteredFunds.slice(0, TOP_SCHEME_COUNT);
  const firstResult = filteredFunds.length ? (currentPage - 1) * CATALOGUE_PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(currentPage * CATALOGUE_PAGE_SIZE, filteredFunds.length);
  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <section className="dash-explore" aria-labelledby="dash-explore-title">
      <header className="dash-explore-heading">
        {catalogueOpen ? (
          <>
            <button
              type="button"
              className="dash-explore-back"
              onClick={() => setCatalogueOpen(false)}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to Explore
            </button>
            <p className="dash-explore-eyebrow">NSE MFSS catalogue</p>
            <h1 id="dash-explore-title" ref={screenHeadingRef} tabIndex="-1">All Mutual Fund Schemes</h1>
            <p className="dash-explore-description">
              Search the full NSE scheme list, then browse results in manageable pages.
            </p>
          </>
        ) : (
          <>
            <p className="dash-explore-eyebrow">Mutual Funds</p>
            <h1 id="dash-explore-title" ref={screenHeadingRef} tabIndex="-1">Explore Mutual Funds</h1>
            <p className="dash-explore-description">Browse mutual fund schemes available through NSE MFSS.</p>
          </>
        )}
      </header>
      <div className={`dash-explore-layout${catalogueOpen ? ' is-catalogue' : ''}`}>
        <div className="dash-explore-main">
          <label className="dash-explore-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              aria-label={catalogueOpen ? 'Search all mutual fund schemes' : 'Search mutual funds'}
              value={searchQuery}
              placeholder="Search by scheme, AMC, code or ISIN"
              onChange={(event) => {
                setCurrentPage(1);
                setActiveCollectionId('');
                setSearchQuery(event.target.value);
              }}
            />
          </label>
          <div className="dash-explore-filters" role="group" aria-label="Filter funds by category">
            {visibleCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={selectedCategory === category ? 'dash-explore-filter is-active' : 'dash-explore-filter'}
                aria-pressed={selectedCategory === category}
                onClick={() => {
                  setCurrentPage(1);
                  setActiveCollectionId('');
                  setSelectedCategory(category);
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <FundSectionTitle
            eyebrow={catalogueOpen ? 'Scheme catalogue' : 'NSE MFSS'}
            title={catalogueOpen
              ? `${filteredFunds.length.toLocaleString('en-IN')} schemes`
              : `Mutual Fund Schemes${loadingFunds || fundsError ? '' : ` (${filteredFunds.length})`}`}
            infoLabel="NAV is the latest value published by the fund and is not an intraday price"
            action={(
              <>
                <button
                  type="button"
                  className="dash-explore-view-all"
                  onClick={() => setRetryCount((count) => count + 1)}
                  disabled={refreshingFunds}
                  aria-label="Refresh mutual fund catalogue"
                >
                  <RefreshCw size={13} aria-hidden="true" className={refreshingFunds ? 'is-spinning' : ''} />
                  {refreshingFunds ? 'Refreshing' : 'Refresh'}
                </button>
                {!catalogueOpen && !loadingFunds && !fundsError && filteredFunds.length > TOP_SCHEME_COUNT && (
                  <button type="button" className="dash-explore-view-all" onClick={openCatalogue}>
                    View all
                  </button>
                )}
              </>
            )}
          />
          {fundsError ? (
            <div className="dash-explore-state" role="alert">
              <p>{fundsError}</p>
              <button type="button" onClick={() => setRetryCount((count) => count + 1)}>Try again</button>
            </div>
          ) : loadingFunds ? (
            <div className="dash-explore-state" role="status">Loading mutual fund schemes from NSE…</div>
          ) : (
            <>
              {updatedLabel && <p className="dash-explore-updated">NSE data refreshed {updatedLabel}</p>}
              {watchlistError && (
                <div className="dash-explore-watchlist-error" role="alert">
                  <span>{watchlistError}</span>
                  <button type="button" onClick={onRetryWatchlist} disabled={watchlistLoading}>Retry</button>
                </div>
              )}
              {catalogueOpen && filteredFunds.length > 0 && (
                <div className="dash-explore-result-bar" aria-live="polite">
                  <span>
                    Showing <b>{firstResult.toLocaleString('en-IN')}–{lastResult.toLocaleString('en-IN')}</b>
                    {' '}of <b>{filteredFunds.length.toLocaleString('en-IN')}</b> schemes
                  </span>
                </div>
              )}
              {catalogueOpen ? (
                <div
                  id="dash-explore-scheme-list"
                  ref={resultsListRef}
                  className="dash-explore-fund-list"
                  role="region"
                  aria-label={`Schemes ${firstResult} through ${lastResult}`}
                  aria-live="polite"
                  tabIndex="-1"
                >
                  {visibleFunds.map((fund, index) => (
                    <FundRow
                      key={`${fund.schemeCode}-${fund.isin}`}
                      fund={fund}
                      canInvest={canInvest}
                      resultNumber={firstResult + index}
                      isWatchlisted={watchlistSchemeCodes.has(fund.schemeCode)}
                      watchlistBusy={watchlistLoading || Boolean(watchlistUpdatingCode)}
                      onToggleWatchlist={onToggleWatchlist}
                      onInvest={openInvestment}
                    />
                  ))}
                </div>
              ) : (
                <div id="dash-explore-scheme-grid" className="dash-explore-fund-grid" aria-live="polite">
                {visibleFunds.map((fund) => (
                  <FundCard
                    key={`${fund.schemeCode}-${fund.isin}`}
                    fund={fund}
                    canInvest={canInvest}
                    isWatchlisted={watchlistSchemeCodes.has(fund.schemeCode)}
                    watchlistBusy={watchlistLoading || Boolean(watchlistUpdatingCode)}
                    onToggleWatchlist={onToggleWatchlist}
                    onInvest={openInvestment}
                  />
                ))}
                </div>
              )}
              {!filteredFunds.length && (
                <div className="dash-explore-state">
                  <p>No schemes match this search or category. Try changing your filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      setSelectedCategory('All');
                      setActiveCollectionId('');
                      setCurrentPage(1);
                    }}
                  >
                    Reset search and filters
                  </button>
                </div>
              )}
              {catalogueOpen && filteredFunds.length > 0 && (
                <nav className="dash-explore-pagination" aria-label="Scheme catalogue pages">
                  <button
                    type="button"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    aria-label="First page"
                  >
                    <ChevronsLeft size={15} aria-hidden="true" />
                    First
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} aria-hidden="true" />
                    Previous
                  </button>
                  <div className="dash-explore-page-numbers" role="group" aria-label="Choose a page">
                    {paginationItems.map((item) => item.type === 'ellipsis' ? (
                      <span key={`ellipsis-${item.key}`} aria-hidden="true">…</span>
                    ) : (
                      <button
                        key={item.page}
                        type="button"
                        className={item.page === currentPage ? 'is-current' : ''}
                        onClick={() => goToPage(item.page)}
                        aria-label={`Page ${item.page.toLocaleString('en-IN')}`}
                        aria-current={item.page === currentPage ? 'page' : undefined}
                      >
                        {item.page.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                  <span>
                    Page <b>{currentPage.toLocaleString('en-IN')}</b> of <b>{pageCount.toLocaleString('en-IN')}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= pageCount}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(pageCount)}
                    disabled={currentPage >= pageCount}
                    aria-label="Last page"
                  >
                    Last
                    <ChevronsRight size={15} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
          {!catalogueOpen && availableCollections.length > 0 && (
            <section className="dash-explore-collections-section" aria-labelledby="dash-explore-collections-title">
              <FundSectionTitle
                eyebrow="Browse by"
                title="Collections"
                id="dash-explore-collections-title"
              />
              <div className="dash-explore-collections">
                {availableCollections.map((collection) => {
                  const Icon = collection.icon;
                  const count = loadingFunds || fundsError
                    ? null
                    : searchableFunds.filter(collection.matches).length;
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      className={`dash-explore-collection${activeCollectionId === collection.id ? ' is-active' : ''}`}
                      aria-label={`${collection.label}: ${collection.description}${count === null ? '' : `, ${count} schemes`}`}
                      aria-pressed={activeCollectionId === collection.id}
                      onClick={() => openCollection(collection)}
                    >
                      <span className="icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                      <span className="t">{collection.label}</span>
                      <span className="dash-explore-collection-meta">
                        {count === null ? collection.description : `${count} ${count === 1 ? 'scheme' : 'schemes'}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {!catalogueOpen && publication && publication.featuredPicksEnabled !== false && (
            <section className="dash-explore-featured" aria-labelledby="dash-explore-featured-title">
              <FundSectionTitle
                eyebrow="Category-spread selection"
                title="Funds by Dhanvo"
                id="dash-explore-featured-title"
                action={!loadingFunds && !fundsError && searchableFunds.length > 0 && (
                  <button
                    type="button"
                    className="dash-explore-view-all"
                    onClick={openCatalogue}
                  >
                    View all <ChevronRight size={14} aria-hidden="true" />
                  </button>
                )}
              />
              <p className="dash-explore-featured-note">
                Prioritizes one Regular scheme each from ELSS, Index Funds, and Debt; fills any remaining places alphabetically. Not ranked.
              </p>
              {fundsError ? (
                <div className="dash-explore-state" role="status">
                  Featured funds will appear when the NSE catalogue is available.
                </div>
              ) : loadingFunds ? (
                <div className="dash-explore-state" role="status">Finding regular-plan schemes…</div>
              ) : featuredFunds.length ? (
                <div className="dash-explore-fund-grid dash-explore-featured-grid">
                  {featuredFunds.map((fund) => (
                    <FundCard
                      key={`${fund.schemeCode}-${fund.isin}`}
                      fund={fund}
                      canInvest={canInvest}
                      isWatchlisted={watchlistSchemeCodes.has(fund.schemeCode)}
                      watchlistBusy={watchlistLoading || Boolean(watchlistUpdatingCode)}
                      onToggleWatchlist={onToggleWatchlist}
                      onInvest={openInvestment}
                    />
                  ))}
                </div>
              ) : (
                <div className="dash-explore-state">
                  No regular-plan schemes are currently available to feature.
                </div>
              )}
            </section>
          )}
        </div>

        {!catalogueOpen && (
          <aside className="dash-explore-sidebar" aria-label="Investment tools">
            <DashboardToolsPanel onNavigate={onNavigate} />
          </aside>
        )}
      </div>
      {selectedFund && (
        <dialog
            ref={orderDialogRef}
            className="dash-mf-order-dialog"
            aria-labelledby="dash-mf-order-title"
            onCancel={(event) => {
              event.preventDefault();
              closeInvestment();
            }}
            onClose={() => setSelectedFund(null)}
          >
            <button
              type="button"
              className="dash-mf-order-close"
              onClick={closeInvestment}
              disabled={submittingOrder}
              aria-label="Close investment order"
            >
              ×
            </button>
            <p className="dash-explore-eyebrow">NSE MFSS purchase</p>
            <h2 id="dash-mf-order-title">{selectedFund.name}</h2>
            <p className="dash-mf-order-nav">
              Latest NAV {formatRupees(selectedFund.nav)} · {selectedFund.navDate || 'Date unavailable'}
            </p>
            {orderResult ? (
              <div className="dash-mf-order-result" role="status">
                <p>
                  {orderError || (orderResult.paymentUrl
                    ? orderResult.paymentMode === 'UPI'
                      ? isMobileDevice
                        ? 'NSE accepted your order. Opening its secure payment page; it will hand off to an installed UPI app when supported by your device.'
                        : 'NSE accepted your order. Scan the QR code or open the secure NSE payment page to complete your UPI payment.'
                      : 'NSE accepted your order. Use the secure NSE link to complete payment.'
                    : 'NSE accepted your order and payment request. Follow the instructions for your selected payment method; contact support if none arrive.')}
                </p>
                <span>Order ID: {orderResult.orderId || 'Not provided by NSE'}</span>
                {orderResult.paymentMode && <span>Payment method: {orderResult.paymentMode}</span>}
                {orderResult.paymentRemark && <p>{orderResult.paymentRemark}</p>}
                {orderResult.submissionUncertain && (
                  <p className="dash-mf-order-warning">
                    The request may have reached NSE, but its response was not received. Do not submit it again until support confirms the order status.
                  </p>
                )}
                {orderResult.paymentMode === 'UPI' && orderResult.paymentUrl && !isMobileDevice && (
                  <div className="dash-mf-payment-qr">
                    <QRCodeSVG
                      value={orderResult.paymentUrl}
                      size={220}
                      level="M"
                      title="Scan to open the secure NSE UPI payment page"
                    />
                    <span>Scan to open the secure NSE payment page</span>
                  </div>
                )}
                {orderResult.paymentUrl && (
                  <a href={orderResult.paymentUrl} target="_blank" rel="noopener noreferrer">
                    Continue to NSE payment
                  </a>
                )}
                {orderError && (
                  <p className="dash-mf-order-warning">
                    Do not place this order again until its status is confirmed with support.
                  </p>
                )}
                <button type="button" onClick={closeInvestment}>Done</button>
              </div>
            ) : (
              <form className="dash-mf-order-form" onSubmit={submitInvestment}>
                <label>
                  Investment amount (₹)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={selectedFund.minPurchaseAmount > 0
                      ? Math.max(1, Number(selectedFund.minPurchaseAmount))
                      : selectedFund.purchaseAmountMultiple > 0
                        ? selectedFund.purchaseAmountMultiple
                        : 1}
                    max={selectedFund.maxPurchaseAmount > 0 ? selectedFund.maxPurchaseAmount : undefined}
                    step={selectedFund.purchaseAmountMultiple > 0 ? selectedFund.purchaseAmountMultiple : '0.01'}
                    required
                    autoFocus
                    value={investmentAmount}
                    aria-invalid={Boolean(investmentAmountError || orderAmountError)}
                    aria-describedby={[
                      investmentAmount && 'dash-mf-amount-limits',
                      (investmentAmountError || orderAmountError) && 'dash-mf-amount-error',
                    ].filter(Boolean).join(' ') || undefined}
                    onChange={(event) => {
                      setInvestmentAmount(event.target.value);
                      setOrderAmountError('');
                    }}
                  />
                </label>
                {investmentAmount && (
                  <p id="dash-mf-amount-limits" className="dash-mf-order-limits">
                    <strong>{selectedFund.name}:</strong>{' '}
                    Minimum {selectedFund.minPurchaseAmount > 0
                      ? `₹${Number(selectedFund.minPurchaseAmount).toLocaleString('en-IN')}`
                      : 'not provided in current NSE scheme data'}
                    {selectedFund.purchaseAmountMultiple > 0
                      && ` · increments of ₹${Number(selectedFund.purchaseAmountMultiple).toLocaleString('en-IN')}`}
                    {' · '}Maximum {selectedFund.maxPurchaseAmount > 0
                      ? `₹${Number(selectedFund.maxPurchaseAmount).toLocaleString('en-IN')}`
                      : 'not specified by NSE'}
                  </p>
                )}
                {(investmentAmountError || orderAmountError) && (
                  <p id="dash-mf-amount-error" className="dash-mf-order-amount-error" role="alert">
                    {orderAmountError || investmentAmountError}
                  </p>
                )}
                <label>
                  Payment method
                  <select
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value)}
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>{mode.label}</option>
                    ))}
                  </select>
                </label>
                {paymentMode === 'UPI' && (
                  <label>
                    UPI ID (VPA)
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      maxLength={255}
                      required
                      value={upiVpa}
                      onChange={(event) => setUpiVpa(event.target.value)}
                      placeholder="name@bank"
                      aria-describedby="dash-mf-upi-note"
                    />
                  </label>
                )}
                <p className="dash-mf-order-limits">
                  {paymentMode === 'UPI'
                    ? 'NSE requires your UPI ID and verified bank account. After acceptance, desktop users can scan the payment QR; phones open NSE’s secure payment page, which may hand off to an installed UPI app.'
                    : 'Use the secure NSE payment page to complete netbanking.'}
                </p>
                {paymentMode === 'UPI' && (
                  <span id="dash-mf-upi-note" className="sr-only">
                    Enter the UPI ID registered for your verified NSE bank account.
                  </span>
                )}
                <label className="dash-mf-order-consent">
                  <input
                    type="checkbox"
                    required
                    checked={confirmedOrder}
                    onChange={(event) => setConfirmedOrder(event.target.checked)}
                  />
                  <span>
                    I authorize Dhanvo to send this purchase order to NSE and initiate the selected payment for this amount.
                  </span>
                </label>
                {orderError && <p className="dash-fatca-error" role="alert">{orderError}</p>}
                <div className="dash-mf-order-actions">
                  <button type="button" onClick={closeInvestment} disabled={submittingOrder}>Cancel</button>
                  <button type="submit" disabled={submittingOrder || !confirmedOrder || Boolean(investmentAmountError || orderAmountError)}>
                    {submittingOrder ? 'Submitting order…' : 'Confirm & place order'}
                  </button>
                </div>
              </form>
            )}
          </dialog>
      )}
    </section>
  );
};

export default ExploreFunds;
