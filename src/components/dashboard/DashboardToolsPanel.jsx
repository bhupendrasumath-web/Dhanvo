const DashboardToolsPanel = ({ title = 'Products & Tools', onNavigate }) => {
  const tools = [
    { label: 'NFO Live', disabled: true },
    { label: 'Import Funds', disabled: true },
    { label: 'File Tax', disabled: true },
    { label: 'Compare Funds', disabled: true },
    { label: 'SIP Calculator', disabled: true },
    { label: 'Mutual Fund Screener', disabled: true },
  ];

  return (
    <div className="dash-explore-side-card dash-explore-tools-card">
      <h4>{title}</h4>
      {tools.map(({ label, disabled }) => (
        <button
          key={label}
          type="button"
          className="dash-explore-tool-link"
          disabled={disabled}
          title={disabled ? `${label} is not available yet` : undefined}
          aria-label={disabled ? `${label} is not available yet` : label}
          onClick={undefined}
        >
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default DashboardToolsPanel;
