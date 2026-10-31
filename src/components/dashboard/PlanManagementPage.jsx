import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleHelp, Repeat2, WalletCards, X } from 'lucide-react';
import DashboardScreenHeader from './DashboardScreenHeader';
import api from '../../services/api';

const planDetails = {
  sips: {
    key: 'sips',
    type: 'sip',
    eyebrow: 'Systematic investments',
    title: 'Your SIPs',
    description: 'View and manage SIP registrations returned by NSE MFSS.',
    emptyTitle: 'No SIP registrations found',
    emptyDescription: 'When you register a SIP through Dhanvo, its NSE registration and status will appear here.',
    action: 'New SIP',
    icon: CalendarDays,
  },
  swp: {
    key: 'swps',
    type: 'swp',
    eyebrow: 'Regular withdrawals',
    title: 'Your SWPs',
    description: 'View and manage SWP registrations returned by NSE MFSS.',
    emptyTitle: 'No SWP registrations found',
    emptyDescription: 'Your NSE SWP registrations will appear here when available.',
    action: 'New SWP',
    icon: WalletCards,
  },
  stp: {
    key: 'stps',
    type: 'stp',
    eyebrow: 'Scheduled transfers',
    title: 'Your STPs',
    description: 'View and manage STP registrations returned by NSE MFSS.',
    emptyTitle: 'No STP registrations found',
    emptyDescription: 'Your NSE STP registrations will appear here when available.',
    action: 'New STP',
    icon: Repeat2,
  },
};

const frequencies = {
  sip: ['MONTHLY', 'QUARTERLY', 'SEMI-ANNUALLY', 'ANNUALLY'],
  stp: ['MONTHLY', 'WEEKLY', 'FORTNIGHTLY', 'QUARTERLY', 'SEMI-ANNUAL', 'ANNUAL'],
  swp: ['MONTHLY', 'WEEKLY', 'FORTNIGHTLY', 'QUARTERLY', 'SEMI-ANNUAL', 'ANNUAL'],
};

const nextStartDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.message || fallback
);

const formatCurrency = (value) => {
  const amount = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
};

const formatDisplayDate = (value) => {
  const date = String(value || '').trim();
  if (!date) return 'Date unavailable';
  const dmy = date.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const parsed = dmy
    ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    : new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const displayPlanStatus = (value) => String(value || 'STATUS UNAVAILABLE').replace(/_/g, ' ');

const PlanManagementPage = ({ planType }) => {
  const plan = planDetails[planType] || planDetails.sips;
  const PlanIcon = plan.icon;
  const [registrations, setRegistrations] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemesError, setSchemesError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyRegistrationId, setBusyRegistrationId] = useState('');
  const [form, setForm] = useState({
    schemeCode: '',
    fromSchemeCode: '',
    toSchemeCode: '',
    amount: '5000',
    installmentCount: '12',
    frequencyType: 'MONTHLY',
    startDate: nextStartDate(),
    mandateId: '',
    folioNumber: '',
    confirmed: false,
  });

  const availableSchemes = useMemo(
    () => schemes.filter((scheme) => scheme.plan === 'Regular'),
    [schemes],
  );
  const sipSchemes = useMemo(
    () => availableSchemes.filter((scheme) => scheme.purchaseEligible && scheme.amcCode),
    [availableSchemes],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setSchemesError('');
    const [plansResult, schemesResult] = await Promise.allSettled([
      api.get('/mutual-funds/plans'),
      api.get('/mutual-funds/schemes'),
    ]);
    if (plansResult.status === 'fulfilled'
      && plansResult.value.data?.success
      && Array.isArray(plansResult.value.data?.data?.[plan.key])) {
      setRegistrations(plansResult.value.data.data[plan.key]);
    } else {
      const error = plansResult.status === 'rejected'
        ? plansResult.reason
        : new Error(plansResult.value.data?.message || 'NSE returned invalid plan data.');
      setLoadError(getErrorMessage(error, `Unable to load your NSE ${plan.type.toUpperCase()} registrations.`));
      setRegistrations([]);
    }

    if (schemesResult.status === 'fulfilled'
      && schemesResult.value.data?.success
      && Array.isArray(schemesResult.value.data?.data?.schemes)) {
      setSchemes(schemesResult.value.data.data.schemes);
    } else {
      const error = schemesResult.status === 'rejected'
        ? schemesResult.reason
        : new Error(schemesResult.value.data?.message || 'NSE returned invalid scheme data.');
      setSchemesError(getErrorMessage(error, 'Unable to load schemes for a new plan.'));
      setSchemes([]);
    }

    setLoading(false);
  }, [plan.key, plan.type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      frequencyType: frequencies[plan.type][0],
      startDate: nextStartDate(),
      confirmed: false,
    }));
  }, [plan.type]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      schemeCode: sipSchemes[0]?.schemeCode || '',
      fromSchemeCode: availableSchemes[0]?.schemeCode || '',
      toSchemeCode: availableSchemes.find((scheme) => scheme.schemeCode !== availableSchemes[0]?.schemeCode)?.schemeCode || '',
    }));
  }, [availableSchemes, sipSchemes]);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    setSaving(true);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await api.post(`/mutual-funds/plans/${plan.type}`, {
        schemeCode: form.schemeCode,
        fromSchemeCode: form.fromSchemeCode,
        toSchemeCode: form.toSchemeCode,
        amount: form.amount,
        installmentCount: form.installmentCount,
        frequencyType: form.frequencyType,
        startDate: form.startDate,
        mandateId: form.mandateId,
        folioNumber: form.folioNumber,
        confirmed: form.confirmed,
      });
      if (!response.data?.success || response.data?.data?.status !== 'REG_SUCCESS') {
        throw new Error(response.data?.message || 'NSE did not confirm the plan registration.');
      }
      const registrationId = response.data.data.registrationId;
      setActionSuccess(
        registrationId
          ? `${plan.type.toUpperCase()} registration accepted by NSE. Registration number: ${registrationId}.`
          : `${plan.type.toUpperCase()} registration accepted by NSE.`,
      );
      setIsCreating(false);
      setForm((current) => ({ ...current, confirmed: false }));
      await loadData();
    } catch (error) {
      setActionError(getErrorMessage(error, `Unable to register your NSE ${plan.type.toUpperCase()} plan.`));
    } finally {
      setSaving(false);
    }
  };

  const cancelPlan = async (registration) => {
    const label = `${plan.type.toUpperCase()} ${registration.registrationId}`;
    if (!window.confirm(`Cancel ${label} with NSE? This action may stop future scheduled transactions.`)) return;
    setBusyRegistrationId(registration.registrationId);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await api.post(
        `/mutual-funds/plans/${plan.type}/${encodeURIComponent(registration.registrationId)}/cancel`,
        { confirmed: true },
      );
      if (!response.data?.success || response.data?.data?.status !== 'CAN_SUCCESS') {
        throw new Error(response.data?.message || 'NSE did not confirm the plan cancellation.');
      }
      setActionSuccess(`${label} cancellation accepted by NSE.`);
      await loadData();
    } catch (error) {
      setActionError(getErrorMessage(error, `Unable to cancel your NSE ${plan.type.toUpperCase()} plan.`));
    } finally {
      setBusyRegistrationId('');
    }
  };

  const isStp = plan.type === 'stp';
  const schemeOptions = plan.type === 'sip' ? sipSchemes : availableSchemes;
  const hasAvailableSchemes = isStp ? availableSchemes.length > 1 : schemeOptions.length > 0;

  return (
    <>
      <DashboardScreenHeader
        eyebrow={plan.eyebrow}
        title={plan.title}
        description={plan.description}
        actionLabel={plan.action}
        actionTitle={plan.action}
        onAction={() => {
          setActionError('');
          setActionSuccess('');
          setIsCreating(true);
        }}
      />
      {actionError && <p className="dash-plan-message is-error" role="alert">{actionError}</p>}
      {actionSuccess && <p className="dash-plan-message is-success" role="status">{actionSuccess}</p>}

      {isCreating && (
        <section className="dash-plan-form-panel" aria-labelledby="dash-plan-form-title">
          <div className="dash-plan-form-heading">
            <div>
              <p className="dash-screen-eyebrow">NSE MFSS registration</p>
              <h2 id="dash-plan-form-title">Set up a {plan.type.toUpperCase()}</h2>
              <p>NSE validates scheme rules, dates, folio and available mandates before accepting the registration.</p>
            </div>
            <button
              type="button"
              className="dash-watchlist-picker-close"
              onClick={() => setIsCreating(false)}
              aria-label="Close plan registration form"
            >
              <X size={17} />
            </button>
          </div>
          {schemesError ? (
            <div className="dash-watchlist-error" role="alert">
              <span>{schemesError}</span>
              <button type="button" onClick={loadData} disabled={loading}>Retry</button>
            </div>
          ) : (
            <form className="dash-plan-form" onSubmit={submitPlan}>
              {isStp ? (
                <>
                  <label>
                    From scheme
                    <select name="fromSchemeCode" value={form.fromSchemeCode} onChange={updateField} required>
                      {availableSchemes.map((scheme) => <option key={scheme.schemeCode} value={scheme.schemeCode}>{scheme.name} · {scheme.schemeCode}</option>)}
                    </select>
                  </label>
                  <label>
                    To scheme
                    <select name="toSchemeCode" value={form.toSchemeCode} onChange={updateField} required>
                      {availableSchemes.filter((scheme) => scheme.schemeCode !== form.fromSchemeCode).map((scheme) => (
                        <option key={scheme.schemeCode} value={scheme.schemeCode}>{scheme.name} · {scheme.schemeCode}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label className="is-wide">
                  Scheme
                  <select name="schemeCode" value={form.schemeCode} onChange={updateField} required>
                    {schemeOptions.map((scheme) => <option key={scheme.schemeCode} value={scheme.schemeCode}>{scheme.name} · {scheme.schemeCode}</option>)}
                  </select>
                </label>
              )}
              {!hasAvailableSchemes && (
                <p className="dash-plan-schemes-empty is-wide" role="status">
                  {plan.type === 'sip'
                    ? 'No active regular schemes with confirmed NSE SIP purchase eligibility and AMC codes are available.'
                    : isStp
                      ? 'At least two active regular schemes are required to set up an STP.'
                      : 'No active regular schemes are available from NSE MFSS.'}
                </p>
              )}
              <label>
                {plan.type === 'swp' ? 'Withdrawal amount per installment' : 'Amount per installment'}
                <input name="amount" type="number" min="1" max="99999999999.99" step="0.01" value={form.amount} onChange={updateField} required />
              </label>
              <label>
                Frequency
                <select name="frequencyType" value={form.frequencyType} onChange={updateField} required>
                  {frequencies[plan.type].map((frequency) => <option key={frequency} value={frequency}>{frequency.replace(/-/g, ' ')}</option>)}
                </select>
              </label>
              <label>
                Start date
                <input name="startDate" type="date" min={nextStartDate()} value={form.startDate} onChange={updateField} required />
              </label>
              <label>
                {plan.type === 'swp' ? 'Number of withdrawals' : isStp ? 'Number of transfers' : 'Number of installments'}
                <input name="installmentCount" type="number" min="1" max="9999" step="1" value={form.installmentCount} onChange={updateField} required />
              </label>
              {plan.type !== 'sip' && (
                <label>
                  NSE folio number
                  <input name="folioNumber" inputMode="numeric" maxLength="15" value={form.folioNumber} onChange={updateField} placeholder="Required for physical folios" />
                </label>
              )}
              {plan.type === 'sip' && (
                <label>
                  Approved NSE mandate ID (optional)
                  <input name="mandateId" inputMode="numeric" maxLength="15" value={form.mandateId} onChange={updateField} placeholder="Enter an approved mandate ID" />
                </label>
              )}
              <label className="dash-plan-confirm">
                <input name="confirmed" type="checkbox" checked={form.confirmed} onChange={updateField} required />
                <span>I authorize Dhanvo to submit this {plan.type.toUpperCase()} registration to NSE. The schedule is subject to NSE/AMC acceptance and applicable scheme rules.</span>
              </label>
              <div className="dash-plan-form-actions">
                <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
                <button type="submit" disabled={saving || !form.confirmed || !hasAvailableSchemes}>
                  {saving ? 'Sending to NSE…' : `Submit ${plan.type.toUpperCase()} to NSE`}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {loadError ? (
        <div className="dash-watchlist-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={loadData} disabled={loading}>Retry</button>
        </div>
      ) : loading ? (
        <section className="dash-plan-empty" role="status">Loading your NSE registrations…</section>
      ) : registrations.length ? (
        <section className="dash-plan-list" aria-label={`${plan.title} registered with NSE`}>
          {registrations.map((registration) => {
            const isInactive = /CANCEL|INACTIVE|COMPLETE|REJECT|FAIL|EXPIRE/i.test(registration.status);
            return (
              <article key={registration.registrationId} className="dash-plan-row">
                <div className="dash-plan-row-icon"><PlanIcon size={18} /></div>
                <div className="dash-plan-row-main">
                  <h2>{registration.schemeName || (isStp
                    ? `${registration.fromSchemeCode || 'Source scheme'} → ${registration.toSchemeCode || 'Target scheme'}`
                    : registration.schemeCode || `${plan.type.toUpperCase()} plan`)}</h2>
                  <p>{isStp
                    ? `${registration.fromSchemeCode || '—'} → ${registration.toSchemeCode || '—'}`
                    : registration.schemeCode || 'NSE scheme code unavailable'}</p>
                  <small>Registration {registration.registrationId} · Starts {formatDisplayDate(registration.startDate)}</small>
                </div>
                <div className="dash-plan-row-meta">
                  <strong>{formatCurrency(registration.amount)}</strong>
                  <span>{registration.frequency || 'Frequency unavailable'} · {displayPlanStatus(registration.status)}</span>
                  {registration.installmentCount && <small>{registration.installmentCount} installments</small>}
                </div>
                {!isInactive && (
                  <button
                    type="button"
                    className="dash-plan-cancel"
                    disabled={Boolean(busyRegistrationId)}
                    onClick={() => cancelPlan(registration)}
                  >
                    {busyRegistrationId === registration.registrationId ? 'Cancelling…' : 'Cancel plan'}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="dash-plan-empty" aria-labelledby="dash-plan-empty-title">
          <span className="dash-plan-empty-icon"><PlanIcon size={22} aria-hidden="true" /></span>
          <span className="dash-plan-empty-help"><CircleHelp size={14} aria-hidden="true" /> NSE MFSS registrations</span>
          <h2 id="dash-plan-empty-title">{plan.emptyTitle}</h2>
          <p>{plan.emptyDescription}</p>
          <div className="dash-plan-state-label"><span /> No registrations reported by NSE</div>
        </section>
      )}
    </>
  );
};

export default PlanManagementPage;
