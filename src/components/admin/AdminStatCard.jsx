const toneClasses = { cyan: 'border-accent-cyan/25 text-accent-cyan', amber: 'border-accent-amber/25 text-accent-amber', green: 'border-accent-emerald/25 text-accent-emerald', violet: 'border-violet-400/25 text-violet-300' };

const AdminStatCard = ({ label, value, delta, tone = 'cyan' }) => <div className={`bg-dark-900/65 border rounded-2xl p-5 ${toneClasses[tone] || toneClasses.cyan}`}><p className="text-dark-400 text-sm">{label}</p><p className="mt-3 text-3xl font-display font-bold text-white">{value}</p><p className="mt-2 text-xs text-current">{delta}</p></div>;

export default AdminStatCard;
