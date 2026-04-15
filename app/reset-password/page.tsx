'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 p-8 md:p-12 border border-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">New Password</h2>
          <p className="text-slate-400 font-medium text-sm italic">Set your new secure password below</p>
        </div>

        {success ? (
          <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center text-green-500"><CheckCircle2 size={60} /></div>
            <h3 className="text-xl font-bold">Password Updated!</h3>
            <p className="text-slate-500 text-sm">Redirecting you to login...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-[11px] font-bold flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="New Password" 
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none focus:bg-white focus:border-blue-500 transition-all text-sm font-medium" 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none focus:bg-white focus:border-blue-500 transition-all text-sm font-medium" 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
            </div>

            <button disabled={loading} className="group w-full bg-slate-900 text-white py-4 rounded-[20px] font-bold text-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl">
              <span>{loading ? 'Updating...' : 'Save Password'}</span>
              {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
