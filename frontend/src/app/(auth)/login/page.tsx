'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Droplets, AlertCircle, Eye, EyeOff } from 'lucide-react';

const DEMO_CREDENTIALS = [
  { label: 'Institution Admin', email: 'admin@hospital.com', password: 'password123', role: 'institution_admin' },
  { label: 'Campaign Operator', email: 'operator@redcross.com', password: 'password123', role: 'campaign_operator' },
  { label: 'Donor', email: 'donor@example.com', password: 'password123', role: 'donor' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #0F172A 100%)' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 text-white">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#C41E3A' }}>
            <Droplets className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">B-Live</span>
        </div>
        <h1 className="text-4xl font-bold leading-tight mb-4">
          AI-Powered Blood Shortage Prevention
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed mb-10">
          Real-time forecasting, intelligent donor targeting, and campaign management to prevent blood shortages before they occur.
        </p>
        <div className="space-y-4">
          {[
            { icon: '🧬', title: 'Predictive Analytics', desc: 'ML-driven shortage forecasting up to 30 days ahead' },
            { icon: '🎯', title: 'Smart Targeting', desc: 'AI matches donors by blood type, location, and eligibility' },
            { icon: '📊', title: 'Live Dashboard', desc: 'Real-time monitoring across all blood centers' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <div className="font-semibold text-white">{f.title}</div>
                <div className="text-slate-400 text-sm">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C41E3A' }}>
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">B-Live</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to your account to continue</p>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                  style={{ '--tw-ring-color': '#C41E3A' } as React.CSSProperties}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-white font-semibold transition-all disabled:opacity-60"
                style={{ background: loading ? '#9b1a2e' : '#C41E3A' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Demo Credentials</p>
              <div className="space-y-2">
                {DEMO_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.role}
                    onClick={() => fillDemo(cred)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-[#C41E3A] hover:bg-red-50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#C41E3A]">{cred.label}</span>
                      <span className="text-xs text-gray-400">{cred.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
