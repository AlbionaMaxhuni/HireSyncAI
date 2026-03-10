"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Këtu i dërgojmë të dhënat në Supabase
    const { error } = await supabase
      .from("jobs")
      .insert([{ title, description }]);

    setLoading(false);
    if (error) {
      setMessage("Gabim: " + error.message);
    } else {
      setMessage("✅ Puna u shtua me sukses!");
      setTitle("");
      setDescription("");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-10">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Shto një Pozicion Pune</h1>
        
        <form onSubmit={handleAddJob} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titulli i Punës</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="p.sh. Software Engineer"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Përshkrimi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={4}
              placeholder="Shkruaj detajet e punës..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-gray-400"
          >
            {loading ? "Duke u ruajtur..." : "Ruaj Punën"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm font-medium text-green-600">{message}</p>}
      </div>
    </main>
  );
}