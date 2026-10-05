import { useEffect, useState } from 'react';
import { ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import api from '../../services/api';

countries.registerLocale(en);
const countryOptions = Object.entries(countries.getNames('en'))
  .map(([value, label]) => ({ value, label }))
  .sort((first, second) => first.label.localeCompare(second.label));

const identificationTypeMap = {
  PAN: 'C',
  'PAN CARD': 'C',
  Aadhaar: 'G',
  'UIDAI / AADHAAR': 'G',
  Passport: 'A',
  'Driving License': 'E',
  'Election ID Card': 'B',
  'ID Card': 'D',
  NREGA: 'H',
  Other: 'O',
};

const identityDocumentOptions = Object.keys(identificationTypeMap).map((label) => ({ value: label, label }));

const sourceOfWealthOptions = [
  { label: 'Salary', value: '01' },
  { label: 'Business Income', value: '02' },
  { label: 'Gift', value: '03' },
  { label: 'Ancestral Property', value: '04' },
  { label: 'Rental Income', value: '05' },
  { label: 'Prize Money', value: '06' },
  { label: 'Royalty', value: '07' },
  { label: 'Other', value: '08' },
];

const incomeOptions = [
  { label: 'Below ₹1 Lakh', value: '31' },
  { label: '₹1–5 Lakh', value: '32' },
  { label: '₹5–10 Lakh', value: '33' },
  { label: '₹10–25 Lakh', value: '34' },
  { label: '₹25 Lakh–₹1 Crore', value: '35' },
  { label: 'Above ₹1 Crore', value: '36' },
];

const occupationOptions = [
  { label: 'Business', value: '01', occType: 'B' },
  { label: 'Service', value: '02', occType: 'S' },
  { label: 'Professional', value: '03', occType: 'O' },
  { label: 'Agriculturist', value: '04', occType: 'O' },
  { label: 'Retired', value: '05', occType: 'O' },
  { label: 'Housewife', value: '06', occType: 'O' },
  { label: 'Student', value: '07', occType: 'O' },
  { label: 'Others', value: '08', occType: 'O' },
  { label: 'Doctor', value: '09', occType: 'O' },
  { label: 'Private Sector Service', value: '41', occType: 'S' },
  { label: 'Public Sector Service', value: '42', occType: 'S' },
  { label: 'Forex Dealer', value: '43', occType: 'S' },
  { label: 'Government Service', value: '44', occType: 'S' },
  { label: 'Unknown / Not Applicable', value: '99', occType: 'X' },
];

const getOccupationTypeForCode = (occupationCode) => {
  const code = String(occupationCode || '').trim();
  return occupationOptions.find((option) => option.value === code)?.occType || 'X';
};

const fields = [
  { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: false },
  { name: 'placeOfBirth', label: 'City or town where you were born', placeholder: 'e.g. Jaipur' },
  { name: 'countryOfBirth', label: 'Country where you were born', type: 'select', options: countryOptions },
  { name: 'taxResidenceCountry', label: 'Country where you pay tax', type: 'select', options: countryOptions, help: 'Choose your actual tax-residence country, not your citizenship.' },
  { name: 'tin', label: 'PAN / tax number', placeholder: 'PAN for India; foreign TIN otherwise', help: 'For an India tax resident, PAN is the TIN. For another tax-residence country, enter that country’s TIN.' },
  { name: 'idType', label: 'Type of identity document', type: 'select', options: identityDocumentOptions },
  { name: 'addressType', label: 'Type of address', type: 'select', options: [
    { value: '1', label: 'Residential or business' },
    { value: '2', label: 'Residential' },
    { value: '3', label: 'Business' },
    { value: '4', label: 'Registered office' },
    { value: '5', label: 'Unspecified' },
  ] },
  { name: 'sourceOfWealth', label: 'Main source of your wealth', type: 'select', options: sourceOfWealthOptions },
  { name: 'incomeSlab', label: 'Your annual income range', type: 'select', options: incomeOptions },
  { name: 'pepFlag', label: 'Are you a politically exposed person (PEP)?', type: 'select', options: [
    { value: 'Y', label: 'Yes, I am a PEP' },
    { value: 'N', label: 'No' },
    { value: 'R', label: 'I am related to a PEP' },
  ], help: 'PEP includes certain senior public officials; select related if you are a relative of one.' },
  { name: 'occupationCode', label: 'Your occupation', type: 'select', options: occupationOptions, help: 'Choose the matching NSE occupation code; the category is set automatically.' },
  { name: 'occupationType', label: 'Your occupation category', type: 'select', options: [
    { value: 'S', label: 'Service' },
    { value: 'B', label: 'Business' },
    { value: 'O', label: 'Other' },
    { value: 'X', label: 'Not categorized' },
  ], help: 'This field is auto-filled based on your selected occupation.' },
];

const readSignupForm = () => {
  try {
    return JSON.parse(sessionStorage.getItem('dhanvo_signup_session') || '{}').form || {};
  } catch {
    return {};
  }
};

const dateInputValue = (value) => {
  const date = String(value || '').trim();
  const match = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return date;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
};

const FatcaForm = ({ onSubmitted, user, prefill = {}, initialValues: signupValues = {}, onValuesChange, registrationMode = false }) => {
  const [signupForm] = useState(readSignupForm);
  const accountPan = user?.pan || signupForm.pan || '';
  const occupationDescription = prefill.occupation || signupForm.occupation || '';
  const [values, setValues] = useState(() => {
    const defaults = {
      ...Object.fromEntries(fields.map(({ name }) => [name, ''])),
      countryOfBirth: 'IN',
      taxResidenceCountry: 'IN',
      idType: 'PAN',
      addressType: '2',
      dateOfBirth: dateInputValue(prefill.dateOfBirth || signupForm.dob),
    };
    if (accountPan) {
      defaults.tin = accountPan;
    }
    return {
      ...defaults,
      ...signupValues,
      dateOfBirth: dateInputValue(signupValues.dateOfBirth || defaults.dateOfBirth),
      tin: signupValues.tin || defaults.tin || '',
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  const updateField = (name, value) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === 'taxResidenceCountry') {
        const isIndia = ['IN', 'IND', 'INDIA'].includes(value.trim().toUpperCase());
        if (isIndia && accountPan) next.tin = accountPan;
        if (!isIndia && current.tin === accountPan) next.tin = '';
      }
      if (name === 'occupationCode') {
        next.occupationType = getOccupationTypeForCode(value);
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (registrationMode) return;
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...values,
        idType: identificationTypeMap[values.idType] || values.idType,
      };
      const response = await api.post('/auth/submit-fatca', payload);
      onSubmitted(response.data?.data || {});
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'FATCA submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={registrationMode ? 'card' : 'mb-6 border-y border-primary-500/20 py-6'}>
      {registrationMode ? (
        <div className="card-head">
          <div className="section-title">
            <span className="section-icon"><ArrowUpFromLine size={18} /></span>
            <div>
              <h3>FATCA / CRS Details</h3>
              <p>Complete the required tax-residency and investor details.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg bg-primary-500/10 p-2 text-primary-300"><ArrowUpFromLine size={19} /></div>
          <div>
            <h2 className="text-lg font-semibold text-white">FATCA details</h2>
            <p className="mt-1 text-sm text-dark-400">Your date of birth is filled from signup when available. Required answers are marked *.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={registrationMode ? 'card-body signup-fatca-form' : 'max-w-4xl'}>
        <div className={registrationMode ? 'grid' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
          {fields.map(({ name, label, type = 'text', placeholder, help, required = true, options }) => (
            <label key={name} className={registrationMode ? 'field' : 'block text-sm text-dark-300'}>
              <span
                className={registrationMode ? '' : 'mb-1.5 block'}
                style={registrationMode ? { display: 'block', marginBottom: 6, color: '#354354', fontSize: 10, fontWeight: 800 } : undefined}
              >
                {label}{required && <> <span className="text-red-400" aria-hidden="true">*</span></>}
              </span>
              {type === 'select' ? (
                <select
                  required={required}
                  value={values[name]}
                  disabled={name === 'occupationType'}
                  onChange={(event) => updateField(name, event.target.value)}
                  className={registrationMode ? '' : 'w-full rounded-md border border-dark-700 bg-dark-900 px-3 py-2.5 text-white outline-none focus:border-primary-400 disabled:cursor-not-allowed disabled:opacity-70'}
                >
                  <option value="" disabled>Select an option</option>
                  {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : (
                <input
                  required={required}
                  type={type}
                  placeholder={placeholder}
                  value={values[name]}
                  onChange={(event) => updateField(name, event.target.value)}
                  className={registrationMode ? '' : 'w-full rounded-md border border-dark-700 bg-dark-900 px-3 py-2.5 text-white outline-none focus:border-primary-400'}
                />
              )}
              {(name === 'occupationCode' && occupationDescription) || help ? (
                <span
                  className={registrationMode ? '' : 'mt-1 block text-xs text-dark-500'}
                  style={registrationMode ? { display: 'block', marginTop: 5, color: '#657388', fontSize: 9, lineHeight: 1.45 } : undefined}
                >
                  {name === 'occupationCode' && occupationDescription
                    ? `Occupation on your account: ${occupationDescription}. Choose its matching NSE value.`
                    : help}
                </span>
              ) : null}
            </label>
          ))}
        </div>

        {!registrationMode && error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
        {!registrationMode && (
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2.5 text-sm font-semibold text-dark-950 transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowUpFromLine size={16} />
            {submitting ? 'Submitting to NSE...' : 'Submit FATCA to NSE'}
          </button>
        )}
      </form>
    </section>
  );
};

export const FatcaSubmitted = ({ remark }) => (
  <div className="mb-6 flex items-start gap-3 border-y border-emerald-500/25 py-5 text-sm">
    <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-400" />
    <div>
      <p className="font-medium text-emerald-300">FATCA submitted to NSE</p>
      <p className="mt-1 text-dark-400">{remark || 'Awaiting NSE and RTA validation. The account remains inactive until the report confirms activation.'}</p>
    </div>
  </div>
);

export default FatcaForm;