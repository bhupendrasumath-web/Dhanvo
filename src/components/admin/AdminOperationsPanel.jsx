import { CircleHelp, Database, ShieldCheck } from 'lucide-react';

const AdminOperationsPanel = ({ userCount, refreshedAt, helpItems }) => (
  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <section className="admin-panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-ok-bg)] text-[var(--admin-ok)]">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--admin-gold)]">Live source</p>
          <h2 className="mt-1 text-xl font-display font-bold text-[var(--admin-text)]">Database snapshot</h2>
        </div>
      </div>

      <p className="mt-6 text-4xl font-display font-bold text-[var(--admin-text)]">
        {userCount ?? '?'}
        <span className="ml-2 align-middle text-base font-medium text-[var(--admin-muted)]">registered users</span>
      </p>

      <p className="mt-3 text-xs text-[var(--admin-muted)]">
        {refreshedAt ? `Last refreshed ${new Date(refreshedAt).toLocaleTimeString()}` : 'Waiting for the first successful data request.'}
      </p>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-[rgba(29,111,100,0.18)] bg-[var(--admin-ok-bg)] p-3 text-xs leading-relaxed text-[var(--admin-text)]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--admin-ok)]" />
        User details are returned only after server-side admin token verification.
      </div>
    </section>

    <section className="admin-panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(201,151,74,0.12)] text-[var(--admin-gold)]">
          <CircleHelp className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--admin-gold)]">Admin help</p>
          <h2 className="mt-1 text-xl font-display font-bold text-[var(--admin-text)]">Operational checklist</h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {helpItems.map((item) => (
          <div key={item.title} className="admin-subpanel p-3">
            <p className="text-sm font-semibold text-[var(--admin-text)]">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--admin-muted)]">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default AdminOperationsPanel;
