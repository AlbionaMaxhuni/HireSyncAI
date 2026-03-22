'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  LogOut, Sparkles, PlusCircle, Search, 
  CheckCircle2, Copy, ClipboardCheck, Loader2
} from 'lucide-react';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [input, setInput] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [response, setResponse] = useState(''); 
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // FIX: Kontrollojmë nëse jemi në proces resetimi (URL përmban #access_token)
    const isResetting = window.location.hash.includes('access_token');
    
    if (!authLoading && !user && !isResetting) {
      router.replace('/login?message=auth_required');
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login?method=logout';
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast("Copied!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('/api/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResponse(data.questions); 
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false); 
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-blue-600 opacity-20" size={40} />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border bg-white border-blue-100 text-blue-700 font-bold text-sm">
            <CheckCircle2 size={18} /> {toast.msg}
          </div>
        </div>
      )}

      <nav className="sticky top-4 z-50 max-w-5xl mx-auto px-4 mt-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-lg rounded-[28px] px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold italic">H</div>
            <span className="font-black text-xl tracking-tight">HireSync<span className="text-blue-600">AI</span></span>
          </div>
          <button onClick={handleLogout} className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-2xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 mt-16 text-center">
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">Expert Interviewing, <br/><span className="text-blue-600">Simplified.</span></h1>
        
        <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 border border-slate-100 p-2 mb-10 mt-10">
          <form onSubmit={handleSubmit} className="flex items-center p-2">
            <Search className="ml-4 text-slate-300" size={24} />
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Senior Frontend Engineer" className="w-full p-4 outline-none font-bold text-slate-700 bg-transparent" />
            <button disabled={loading || !input.trim()} className="bg-slate-900 text-white px-8 py-5 rounded-[30px] font-black hover:bg-blue-600 transition-all shadow-lg">
              {loading ? 'Thinking...' : 'Generate'}
            </button>
          </form>
        </div>

        <div className="space-y-4 text-left">
          {loading && [1, 2, 3].map((n) => (
            <div key={n} className="p-8 bg-white border border-slate-50 rounded-[32px] animate-pulse flex gap-6">
              <div className="w-10 h-10 bg-slate-100 rounded-full" />
              <div className="flex-1 space-y-3"><div className="h-4 bg-slate-100 rounded w-3/4" /><div className="h-4 bg-slate-50 rounded w-1/2" /></div>
            </div>
          ))}

          {!response && !loading && (
            <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[50px] text-slate-200 font-black uppercase tracking-[0.2em] text-[10px]">Awaiting input</div>
          )}

          {response && !loading && response.split(/\d\./).filter(q => q.trim()).map((question, index) => (
            <div key={index} className="group p-8 bg-white border border-slate-100 rounded-[32px] hover:border-blue-500 hover:shadow-2xl transition-all flex justify-between items-start gap-6">
               <div className="flex gap-6">
                  <span className="text-blue-600 font-black text-2xl opacity-10 italic">0{index + 1}</span>
                  <p className="text-slate-700 font-bold leading-relaxed">{question.trim()}</p>
               </div>
               <button onClick={() => handleCopy(question.trim(), index)} className={`p-3 rounded-2xl transition-all ${copiedIndex === index ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white'}`}>
                 {copiedIndex === index ? <ClipboardCheck size={18} /> : <Copy size={18} />}
               </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}