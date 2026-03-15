'use client';
import { useState } from 'react';

export default function Home() {
  // Hapi 1: Krijimi i state-eve sipas udhëzuesit [cite: 54, 62, 63]
  const [input, setInput] = useState(''); // Çfarë shkruan user-i
  const [loading, setLoading] = useState(false); // Gjendja e ngarkimit
  const [response, setResponse] = useState(''); // Përgjigja e AI
  const [error, setError] = useState(''); // Gabimet

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validim bazë: Mos dërgo request nëse inputi është i zbrazët [cite: 71]
    if (!input.trim()) return;

    // Fillo loading dhe pastro gjendjet e vjetra [cite: 73, 74, 75, 342]
    setLoading(true);
    setError('');
    setResponse('');

    try {
      // Thirrja e API-së lokale (Backend) [cite: 77, 335]
      const res = await fetch('/api/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input, description: '' }),
      });

      if (!res.ok) {
        throw new Error(`Gabim nga serveri: ${res.status}`); // [cite: 83]
      }

      const data = await res.json();
      setResponse(data.questions); // Shfaq përgjigjen e AI [cite: 85]
    } catch (err: any) {
      setError(err.message || 'Diçka shkoi gabim. Provo përsëri.'); // [cite: 87]
    } finally {
      setLoading(false); // Gjithmonë ndalo loading në fund [cite: 90, 311]
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">HireSync AI</h1>

      {/* 1. GJENDJA: INPUT [cite: 17, 96] */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Shkruaj titullin e punës këtu..."
          className="w-full p-3 border rounded-lg h-32 resize-none"
          disabled={loading} // Çaktivizohet gjatë loading [cite: 104]
        />
        <button
          type="submit"
          disabled={loading || !input.trim()} // Parandalon klikimet e shumëfishta [cite: 107, 322]
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Duke menduar...' : 'Gjenero Pyetjet'}
        </button>
      </form>

      {/* 2. GJENDJA: LOADING [cite: 17, 116] */}
      {loading && (
        <div className="mt-6 flex items-center gap-3 text-gray-500">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span>AI po gjeneron pyetjet tuaja...</span>
        </div>
      )}

      {/* RESPONSE STATE - E stilizuar si lista profesionale */}
{response && !loading && (
  <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <span className="bg-green-500 w-2 h-6 rounded-full"></span>
      Pyetjet e sugjeruara për intervistë:
    </h2>
    <div className="grid gap-4">
      {response.split(/\d\./).filter(q => q.trim()).map((question, index) => (
        <div 
          key={index} 
          className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
        >
          <div className="flex gap-3">
            <span className="font-bold text-blue-600">{index + 1}.</span>
            <p className="text-gray-700 leading-relaxed">{question.trim()}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
    </main>
  );
}