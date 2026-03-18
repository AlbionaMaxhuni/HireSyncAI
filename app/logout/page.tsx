'use client';
import Link from 'next/link';
import { CheckCircle2, LogIn } from 'lucide-react';

export default function LogoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl shadow-slate-200/50 p-12 text-center border border-slate-100">
        
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center animate-bounce-short">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
          Logged out successfully!
        </h1>
        <p className="text-slate-500 mb-10 font-medium">
          You have been signed out of your account. See you soon!
        </p>

        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-slate-200"
        >
          <LogIn size={20} />
          Sign In Again
        </Link>
        
        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-slate-400 hover:text-blue-600 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}