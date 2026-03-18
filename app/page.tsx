'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { BotMessageSquare, Sparkles, AlertCircle, LoaderCircle, LogOut } from 'lucide-react';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // AI Generation States
  const [input, setInput] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [response, setResponse] = useState(''); 
  const [error, setError] = useState(''); 

  // 1. Protected Route: Redirect to login if no user
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 2. Functional Logout Button
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired. Please sign in again.");
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      setResponse(data.questions); 

    } catch (err: any) {
      if (err.message.includes("fetch failed") || err.name === "TypeError") {
        setError("No internet connection. Please check your network.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false); 
    }
  };

  // Professional Loading State
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <LoaderCircle className="animate-spin h-10 w-10 text-blue-600" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans text-slate-900">
      
      {/* PROFESSIONAL NAVBAR */}
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-12 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-sm sticky top-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-blue-200 shadow-lg">
            H
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">HireSync AI</span>
            <span className="font-semibold text-slate-800">{user.email}</span>
          </div>
        </div>
        
        {/* Functional Logout Button */}
        <button 
          onClick={handleLogout}
          className="group flex items-center gap-2.5 bg-slate-50 text-slate-600 px-6 py-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-300 font-bold border border-slate-100"
        >
          <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
          <span>Sign Out</span>
        </button>
      </nav>

      <main className="max-w-4xl mx-auto">
        
        {/* HERO SECTION */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10">
            <BotMessageSquare size={44} />
          </div>
          <h1 className="text-5xl font-extrabold text-slate-950 mb-4 tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
            HireSync AI Interviewer
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl font-medium leading-relaxed">
            Generate targeted technical interview questions for any role in seconds. Powered by advanced AI.
          </p>
        </div>

        {/* INPUT FORM (State 1) */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-[28px] shadow-2xl shadow-slate-200/50 border border-slate-100">
          <div className="relative group">
            <Sparkles className="absolute left-5 top-5 text-blue-400 group-focus-within:text-blue-600 transition-colors" size={24} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter job title and key technologies (e.g., Senior React Developer with Node.js experience)..."
              className="w-full p-5 pl-14 border border-slate-200 rounded-2xl h-40 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-lg leading-relaxed shadow-inner bg-slate-50"
              disabled={loading}
            />
          </div>
          
          {/* Functional Submit Button */}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-5 rounded-2xl font-bold text-xl shadow-lg shadow-blue-200 hover:shadow-2xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <LoaderCircle className="animate-spin h-6 w-6" />
                <span>Generating questions...</span>
              </>
            ) : (
              <>
                <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />
                <span>Generate Questions</span>
              </>
            )}
          </button>
        </form>

        {/* LOADING STATE (State 2) */}
        {loading && (
          <div className="mt-12 bg-white p-8 rounded-[28px] shadow-xl shadow-slate-100 border border-slate-100 animate-pulse">
            <div className="flex gap-4 items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
            <div className="space-y-4">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
          </div>
        )}

        {/* ERROR HANDLING (State 4) */}
        {error && !loading && (
          <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex justify-between items-center shadow-lg shadow-red-500/10">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-red-500" />
              <div className="flex flex-col">
                <strong className="font-bold text-red-900">Error:</strong>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
            <button 
              onClick={() => setError('')} 
              className="bg-red-200 hover:bg-red-300 rounded-full w-9 h-9 flex items-center justify-center text-red-700 font-bold transition-colors shadow"
            >
              ✕
            </button>
          </div>
        )}

        {/* RESPONSE STATE (State 3) */}
        {response && !loading && (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
              <Sparkles size={26} className="text-green-500" />
              Suggested Interview Questions:
            </h2>
            <div className="space-y-6">
              {response.split(/\d\./).filter(q => q.trim()).map((question, index) => (
                <div 
                  key={index} 
                  className="p-6 bg-white border border-slate-100 rounded-[20px] shadow-md shadow-slate-100 hover:shadow-xl hover:scale-[1.005] transition-all border-l-4 border-l-blue-600 flex items-start gap-4"
                >
                  <span className="flex-shrink-0 w-10 h-10 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg mt-1 shadow-inner border border-blue-100">
                    {index + 1}
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium pt-1 text-lg">
                    {question.trim()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* PROFESSIONAL FOOTER */}
      <footer className="mt-20 border-t border-slate-100 pt-10 pb-6 text-center">
        <p className="text-sm font-semibold text-slate-400uppercase tracking-widest mb-1">HireSync AI Interviewer</p>
        <p className="text-xs text-slate-400">© 2024 Mitrovica. All rights reserved.</p>
      </footer>
    </div>
  );
}