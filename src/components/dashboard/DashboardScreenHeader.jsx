const DashboardScreenHeader = ({ eyebrow, title, description, actionLabel, actionTitle, onAction }) => (
  <header className="dash-screen-heading">
    <div>
      <p className="dash-screen-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="dash-screen-description">{description}</p>
    </div>
    {actionLabel && (
      <button
        type="button"
        className={`dash-screen-action${onAction ? ' is-enabled' : ''}`}
        disabled={!onAction}
        title={actionTitle}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    )}
  </header>
);

export default DashboardScreenHeader;
