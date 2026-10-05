import { ArrowUpRight, CircleHelp, Database, FileText } from 'lucide-react';

const dotClasses = {
	amber: 'bg-accent-amber',
	green: 'bg-accent-emerald',
	cyan: 'bg-accent-cyan',
};

const AdminOperationsPanel = ({ activity, helpItems }) => <div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><section className="bg-dark-900/65 border border-dark-800 rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between mb-5"><div><p className="text-primary-400 text-xs uppercase tracking-[0.16em]">System pulse</p><h2 className="text-lg text-white font-semibold mt-1">Recent activity</h2></div><ActivityIcon /></div><div className="space-y-4">{activity.map((item) => <div key={item.label} className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${dotClasses[item.tone] || dotClasses.cyan}`} /><div className="min-w-0 flex-1"><p className="text-sm text-white truncate">{item.label}</p><p className="text-xs text-dark-500 truncate">{item.detail}</p></div><span className="text-xs text-dark-400">{item.time}</span></div>)}</div></section><section className="bg-dark-900/65 border border-dark-800 rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3 mb-5"><div className="p-2 rounded-lg bg-primary-500/10 text-primary-400"><CircleHelp className="w-4 h-4" /></div><div><p className="text-primary-400 text-xs uppercase tracking-[0.16em]">Admin help</p><h2 className="text-lg text-white font-semibold mt-1">Operational checklist</h2></div></div><div className="space-y-3">{helpItems.map((item) => <div key={item.title} className="p-3 rounded-xl bg-dark-800/50 border border-dark-800"><p className="text-sm text-white">{item.title}</p><p className="text-xs text-dark-500 mt-1 leading-relaxed">{item.detail}</p></div>)}</div></section></div>;

const ActivityIcon = () => <div className="flex items-center gap-2 text-dark-500"><Database className="w-4 h-4" /><FileText className="w-4 h-4" /><ArrowUpRight className="w-4 h-4" /></div>;

export default AdminOperationsPanel;
