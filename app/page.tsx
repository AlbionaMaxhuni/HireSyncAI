'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, LogOut, Clipboard, Check, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]); // Shtohet për Historikun
  
  const supabase = createClient();
  const router = useRouter();

  // 1. Kontrollo Autentifikimin dhe Ngarko Historikun (Pika: Data Persists)
  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?message=auth_required');
      } else {
        setUser(user);
        fetchHistory(user.id); // Merr mesazhet e vjetra
      }
    };
    getSession();
  }, [router]);

  // 2. Funksioni për të marrë historikun nga Databaza (Pika: RLS)
  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setHistory(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login?method=logout');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  // 3. Funksioni i gjenerimit që tani edhe RUAJTJEN (Pika: Mesazhet ruhen)
  const generateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      // KETU: Thirrja e API-t tënd ekzistues të AI
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();
      const aiResponse = data.questions || data.text; // Varet si e kthen API yt

      setResponse(aiResponse);

      // KETU: RUAJTJA NE DATABAZE (Kritike për 100 pikë)
      if (user) {
        const { error } = await supabase
          .from('jobs')
          .insert([
            { 
              title: input, 
              description: aiResponse, 
              user_id: user.id 
            }
          ]);
        
        if (!error) fetchHistory(user.id); // Rifresko listën e historikut
      }

    } catch (err) {
      console.error("Error generating:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Sparkles size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">HireSync<span className="text-blue-600">AI</span></span>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogOut size={22} />
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Expert Interviewing, <br />
            <span className="text-blue-600 italic">Simplified.</span>
          </h1>
        </div>

        {/* Input Form */}
        <form onSubmit={generateQuestions} className="relative group mb-12">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full px-8 py-6 bg-white border border-slate-200 rounded-[32px] shadow-xl shadow-blue-900/5 outline-none focus:border-blue-500 transition-all text-lg font-medium pr-40"
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-3 top-3 bottom-3 px-8 bg-slate-900 text-white rounded-[24px] font-bold hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Generate"}
          </button>
        </form>

        {/* AI Response Area */}
        {response && (
          <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-blue-900/5 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-50">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Generated Questions</h3>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
              >
                {copying ? <Check size={16} /> : <Clipboard size={16} />}
                {copying ? "Copied!" : "Copy All"}
              </button>
            </div>
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
                {response}
              </div>
            </div>
          </div>
        )}

        {/* Historiku (Pika: Data Persists) */}
        {!response && history.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-4">Recent History</h3>
            <div className="grid gap-4">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setResponse(item.description)}
                  className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer transition-all shadow-sm hover:shadow-md"
                >
                  <p className="font-bold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}