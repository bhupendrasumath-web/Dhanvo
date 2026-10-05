import { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { ADMIN_CREDENTIALS } from './adminData';

const AdminLogin = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (email.trim().toLowerCase() !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
      setError('Invalid admin credentials.');
      return;
    }

    localStorage.setItem('dhanvo_admin_session', 'active');
    setError('');
    onSuccess();
  };

  return (
    <main className="min-h-screen bg-dark-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-300 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-dark-950" /></div>
          <div><p className="text-white text-xl font-display font-bold">DHANVO / CONTROL</p><p className="text-dark-500 text-xs uppercase tracking-[0.2em]">Administrator access</p></div>
        </div>

        <form onSubmit={submit} className="bg-dark-900/70 border border-dark-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          <div className="mb-7"><p className="text-primary-400 text-xs uppercase tracking-[0.18em] font-semibold">Secure workspace</p><h1 className="text-3xl text-white font-display font-bold mt-2">Admin sign in</h1><p className="text-dark-400 mt-2">Monitor onboarding, users and operations from one place.</p></div>
          <label className="block mb-4"><span className="text-dark-300 text-sm">Email ID</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@dhanvo.in" className="mt-2 w-full px-4 py-3 rounded-xl bg-dark-800/70 border border-dark-700 text-white outline-none focus:border-primary-500/60" autoComplete="username" /></label>
          <label className="block mb-5"><span className="text-dark-300 text-sm">Password</span><div className="relative mt-2"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin password" className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-800/70 border border-dark-700 text-white outline-none focus:border-primary-500/60" autoComplete="current-password" /></div></label>
          {error && <p className="text-accent-rose text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full btn-primary py-3 flex items-center justify-center gap-2">Enter control panel <ArrowRight className="w-4 h-4" /></button>
          <p className="text-dark-600 text-xs mt-5 text-center">Frontend-only admin guard. Use protected server authorization before handling real user data.</p>
        </form>
      </div>
    </main>
  );
};

export default AdminLogin;
