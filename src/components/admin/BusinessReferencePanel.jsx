import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Check, FileCheck2, HandCoins, HeartPulse, Layers3, UsersRound } from 'lucide-react';

const sectionDetails = {
  mfhub: {
    title: 'Mutual fund hub',
    eyebrow: 'Mutual funds',
    value: '₹2.68 L',
    detail: '27 active SIPs',
    description: 'Review mutual fund servicing and recurring investment activity.',
    icon: Layers3,
    focus: ['Review SIP registrations and instructions', 'Check servicing exceptions', 'Keep investor records aligned with the relevant scheme'],
  },
  partners: {
    title: 'Partner network',
    eyebrow: 'Partners',
    value: '8',
    detail: '5 applications pending',
    description: 'A reference landing area for partner onboarding and relationship operations.',
    icon: BriefcaseBusiness,
    focus: ['Review submitted partner applications', 'Validate onboarding documents', 'Track partner readiness before activation'],
  },
  leads: {
    title: 'Leads & enquiries',
    eyebrow: 'Business pipeline',
    value: '24',
    detail: '13 new · 2 converted',
    description: 'A reference landing area for enquiry qualification and follow-up.',
    icon: UsersRound,
    focus: ['Qualify newly received enquiries', 'Assign follow-up ownership', 'Record conversion outcomes'],
  },
  demat: {
    title: 'Demat requests',
    eyebrow: 'Demat',
    value: '7',
    detail: '7 activated',
    description: 'A reference landing area for demat application and activation workflows.',
    icon: FileCheck2,
    focus: ['Validate submitted applications', 'Confirm activation evidence', 'Follow up on outstanding document checks'],
  },
  insurance: {
    title: 'Insurance',
    eyebrow: 'Insurance',
    value: '₹7.65 L',
    detail: '18 policies',
    description: 'A reference landing area for policy servicing and premium review.',
    icon: HeartPulse,
    focus: ['Review policy servicing needs', 'Confirm premium collection status', 'Plan follow-up for renewals and customer support'],
  },
  uorders: {
    title: 'Unlisted orders',
    eyebrow: 'Unlisted shares',
    value: '7',
    detail: '₹24.34 L in pipeline',
    description: 'A reference landing area for unlisted order follow-up.',
    icon: HandCoins,
    focus: ['Check order progress', 'Confirm allocation and settlement details', 'Follow up on outstanding confirmations'],
  },
};

const BusinessReferencePanel = ({ section, onBack }) => {
  const item = sectionDetails[section];
  if (!item) return null;

  const Icon = item.icon;

  return (
    <section className="business-reference-panel" aria-labelledby="business-reference-title">
      <header className="business-reference-hero">
        <div className="business-reference-heading">
          <span className="business-reference-icon" aria-hidden="true"><Icon /></span>
          <div>
            <p className="business-reference-eyebrow">{item.eyebrow}</p>
            <h2 id="business-reference-title">{item.title}</h2>
            <p className="business-reference-description">{item.description}</p>
          </div>
        </div>
        <button type="button" className="business-reference-back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Dashboard
        </button>
      </header>

      <div className="business-reference-notice" role="note">
        <span className="business-reference-notice-dot" aria-hidden="true" />
        <span><strong>Reference snapshot</strong> · Values below are user-supplied examples, not live business records.</span>
      </div>

      <div className="business-reference-body">
        <article className="business-reference-metric">
          <p>Indicative KPI</p>
          <strong>{item.value}</strong>
          <span>{item.detail}</span>
        </article>

        <section className="business-reference-workflow" aria-labelledby="business-reference-workflow-title">
          <div className="business-reference-workflow-heading">
            <div>
              <p className="business-reference-eyebrow">Suggested workflow</p>
              <h3 id="business-reference-workflow-title">A practical place to start</h3>
            </div>
            <ArrowUpRight aria-hidden="true" />
          </div>
          <ul>
            {item.focus.map((step) => (
              <li key={step}>
                <span aria-hidden="true"><Check /></span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <p className="business-reference-footnote">Detailed records and actions for this area are not connected to the admin console yet.</p>
        </section>
      </div>
    </section>
  );
};

export default BusinessReferencePanel;
