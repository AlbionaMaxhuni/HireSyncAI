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

      {/* 3. GJENDJA: ERROR [cite: 17, 124] */}
      {error && !loading && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Gabim:</strong> {error}
        </div>
      )}

      {/* 4. GJENDJA: RESPONSE [cite: 17, 136] */}
      {response && !loading && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="font-semibold text-green-800 mb-2">Pyetjet e gjeneruara:</h2>
          <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </main>
  );
}