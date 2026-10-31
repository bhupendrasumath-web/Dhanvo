const toneClasses = {
  cyan: { card: 'border-[rgba(47,94,140,0.14)] text-[var(--admin-info)]', label: 'text-[var(--admin-muted)]', value: 'text-[var(--admin-text)]' },
  amber: { card: 'border-[rgba(201,151,74,0.18)] text-[var(--admin-warn)]', label: 'text-[var(--admin-muted)]', value: 'text-[var(--admin-text)]' },
  green: { card: 'border-[rgba(29,111,100,0.18)] text-[var(--admin-ok)]', label: 'text-[var(--admin-muted)]', value: 'text-[var(--admin-text)]' },
  violet: { card: 'border-[rgba(109,82,163,0.18)] text-[var(--admin-info)]', label: 'text-[var(--admin-muted)]', value: 'text-[var(--admin-text)]' },
};

const AdminStatCard = ({ label, value, delta, tone = 'cyan' }) => {
  const classes = toneClasses[tone] || toneClasses.cyan;

  return (
    <div className={`admin-panel p-5 ${classes.card}`} aria-label={label}>
      <p className={`text-sm ${classes.label}`}>{label}</p>
      <p className={`mt-3 text-3xl font-display font-bold ${classes.value}`}>{value}</p>
      <p className="mt-2 text-xs text-[var(--admin-muted)]">{delta}</p>
    </div>
  );
};

export default AdminStatCard;
