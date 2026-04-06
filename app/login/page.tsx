'use client';
import { useState, useLayoutEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail, Lock, User, Eye, EyeOff, Sparkles,
  ChevronRight, AlertCircle, CheckCircle2, ArrowLeft, Info
} from 'lucide-react';

function AuthContent() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // NOTE: Notice = info message (not error). Error = real auth errors.
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useLayoutEffect(() => {
    const method = searchParams.get('method');
    const message = searchParams.get('message');

    // Clear both at start of handling URL messages
    setError('');
    setNotice('');

    // 1) From logout or reset callback hash
    if (method === 'logout' || window.location.hash.includes('access_token')) {
      window.history.replaceState({}, '', '/login');
      return;
    }

    // 2) Not signed in (redirected by middleware)
    if (message === 'auth_required') {
      setNotice('Please sign in to access your dashboard.');

      const timer = setTimeout(() => {
        window.history.replaceState({}, '', '/login');
      }, 500);

      return () => clearTimeout(timer);
    }

    // 3) If URL clean: nothing to do
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) setError(error.message);
    else {
      showToast('Reset link sent! Check your inbox.', 'success');
      setAuthMode('login');
    }
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });

      if (error) setError(error.message);
      else {
        showToast('Check your email!', 'success');
        setAuthMode('login');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans text-slate-900 relative">
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border bg-white border-blue-100 text-blue-700 font-bold text-sm">
            <CheckCircle2 size={18} /> {toast.msg}
          </div>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 p-8 md:p-12 border border-white relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-6">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
            {authMode === 'signup' ? 'Create Account' : authMode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
          </h2>
        </div>

        <form onSubmit={authMode === 'forgot' ? handleResetPassword : handleAuth} className="space-y-5">
          {/* Notice (info) */}
          {notice && (
            <div className="p-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <Info size={14} className="shrink-0 text-slate-500" /> {notice}
            </div>
          )}

          {/* Error (red) */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {authMode === 'signup' && (
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none focus:bg-white focus:border-blue-500 text-sm font-semibold transition-all"
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none focus:bg-white focus:border-blue-500 text-sm font-semibold transition-all"
            />
          </div>

          {authMode !== 'forgot' && (
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none focus:bg-white focus:border-blue-500 text-sm font-semibold transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          {authMode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setAuthMode('forgot'); setError(''); setNotice(''); }}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            disabled={loading}
            className="group w-full bg-slate-900 text-white py-4 rounded-[20px] font-bold text-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{loading ? 'Processing...' : authMode === 'signup' ? 'Sign Up' : authMode === 'forgot' ? 'Send Link' : 'Sign In'}</span>
            {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          {authMode === 'forgot' ? (
            <button
              onClick={() => { setAuthMode('login'); setError(''); setNotice(''); }}
              className="flex items-center justify-center gap-2 w-full text-slate-400 hover:text-blue-600 text-sm font-bold transition-colors"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          ) : (
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setNotice(''); }}
              className="text-blue-600 text-sm font-black hover:text-blue-700 underline underline-offset-4 transition-colors"
            >
              {authMode === 'login' ? "New here? Create Account" : "Already have an account? Sign In"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}