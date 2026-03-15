'use client';
import { useState } from 'react';

export default function Home() {
  // 1. Definojmë state-et për të menaxhuar 3 gjendjet e AI (Input, Loading, Response) plus Error [cite: 54, 62, 63]
  const [input, setInput] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [response, setResponse] = useState(''); 
  const [error, setError] = useState(''); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validimi: Mos dërgo kërkesë nëse fusha është bosh [cite: 71]
    if (!input.trim()) return;

    // Fillo gjendjen Loading dhe pastro të dhënat e vjetra [cite: 73, 74, 75, 342]
    setLoading(true);
    setError('');
    setResponse('');

    try {
      // Thirrja e API-së lokale (Backend) [cite: 77, 335]
      const res = await fetch('/api/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input }),
      });

      const data = await res.json();

      // Kontrolli nëse serveri kthen gabim (p.sh. 404, 500) [cite: 81, 83]
      if (!res.ok) {
        throw new Error(data.error || `Gabim nga serveri: ${res.status}`);
      }

      setResponse(data.questions); 

   } catch (err: any) {
  // Kontrollojmë nëse gabimi është specifik për dështimin e rrjetit
  if (err.message.includes("fetch failed") || err.name === "TypeError") {
    setError("Nuk keni lidhje me internetin. Ju lutem kontrolloni rrjetin tuaj.");
  } else {
    setError(err.message || "Diçka shkoi gabim. Provo përsëri.");
  }
} finally {
  setLoading(false); 
}
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-blue-900 text-center">HireSync AI</h1>

      {/* GJENDJA 1: INPUT [cite: 17, 96, 352] */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Shkruaj titullin e punës (p.sh. Software Engineer)..."
          className="w-full p-4 border border-gray-200 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
          disabled={loading} // Çaktivizohet gjatë loading [cite: 104, 322]
        />
        <button
          type="submit"
          disabled={loading || !input.trim()} // Parandalon klikimet e tepërta [cite: 107, 357]
          className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-bold shadow-lg"
        >
          {loading ? 'Duke gjeneruar...' : 'Gjenero Pyetjet'}
        </button>
      </form>

      {/* GJENDJA 2: LOADING [cite: 17, 116, 353] */}
      {loading && (
        <div className="mt-8 space-y-4 animate-pulse">
          <div className="flex items-center gap-3 text-blue-600 font-medium justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>AI po përpilon pyetjet...</span>
          </div>
          <div className="h-24 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        </div>
      )}

      {/* GJENDJA 4: ERROR HANDLING (Mesazh specifik) [cite: 17, 124, 355] */}
      {error && !loading && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center shadow-sm">
          <div>
            <strong className="font-bold">Gabim: </strong>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError('')} 
            className="bg-red-200 hover:bg-red-300 rounded-full w-8 h-8 flex items-center justify-center text-red-700 font-bold transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* GJENDJA 3: RESPONSE [cite: 17, 136, 354] */}
      {response && !loading && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2 text-green-700">
            <span className="bg-green-500 w-2 h-6 rounded-full"></span>
            Pyetjet e sugjeruara:
          </h2>
          <div className="space-y-4">
            {/* Ndajmë pyetjet në bazë të numrave për t'i shfaqur si karta [cite: 145] */}
            {response.split(/\d\./).filter(q => q.trim()).map((question, index) => (
              <div 
                key={index} 
                className="p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-600"
              >
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 leading-relaxed font-medium pt-1">
                    {question.trim()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}