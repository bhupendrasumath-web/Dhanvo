import { useState } from 'react';
import { ArrowRight, LockKeyhole, MoonStar, ShieldCheck, SunMedium } from 'lucide-react';

const AdminLogin = ({ onSuccess, notice = '', theme = 'light', onToggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSuccess(email.trim(), password);
      setPassword('');
    } catch (loginError) {
      setError(loginError.response?.data?.message || loginError.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth-l">
        <a className="brand" href="#/login">
          <span className="mark">D</span>
          <span>
            <b>Dhanvo</b>
            <small>Admin Console</small>
          </span>
        </a>

        <div>
          <span className="eyebrow"><ShieldCheck className="h-4 w-4" /> Admin access</span>
          <h1>Run Dhanvo with <span>clarity &amp; control.</span></h1>
          <p>One console for clients, partners, mutual funds, unlisted shares, insurance, payouts and compliance — built for the leadership of Dhanlakshya Securities Pvt. Ltd.</p>
        </div>

        <div className="reg-row">
          <span>NSE · Member</span>
          <span>BSE · Member</span>
          <span>AMFI Registered MFD</span>
        </div>
      </div>

      <div className="auth-r">
        {onToggleTheme && (
          <button type="button" className="theme-fab icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </button>
        )}

        <div className="auth-card">
          <div className="join-card" style={{ padding: '26px 28px', borderRadius: '22px' }}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--admin-gold)]">Secure workspace</p>
            <h2 style={{ marginTop: '10px' }}>Sign in</h2>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">Sign in with the admin credentials configured for this server.</p>

            <form onSubmit={submit} className="fgrid" style={{ marginTop: '22px' }}>
              <label className="fld wide">
                <span>Email</span>
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@dhanvo.in" autoComplete="username" />
              </label>

              <label className="fld wide">
                <span>Password</span>
                <div style={{ position: 'relative' }}>
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" style={{ position: 'absolute', left: 14, top: '50%' }} />
                  <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" autoComplete="current-password" style={{ paddingLeft: 40 }} />
                </div>
              </label>

              {(error || notice) && <p role="alert" className="fld wide" style={{ color: '#B4442F', fontWeight: 700 }}>{error || notice}</p>}

              <button type="submit" disabled={submitting} className="btn primary block wide" style={{ width: '100%', marginTop: '6px' }}>
                {submitting ? 'Verifying…' : 'Sign in'}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-[var(--admin-muted)]">
              Access is verified by the admin authentication service. Dashboard data is loaded from the protected backend.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminLogin;
