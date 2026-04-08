'use client'

import AppShell from '@/components/layout/AppShell'

export default function CandidatesPage() {
  // Krijojmë një variabël që qëllimisht është NULL
  const apiResponse: any = null;

  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Candidates Management</h1>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="mb-4 text-slate-600">Below is the list of candidates fetched from the API:</p>
          
          {/* CRASH-I NDODH KËTU: */}
          {/* Po tentojmë të bëjmë .map() mbi diçka që është NULL */}
          <div className="space-y-2">
            {apiResponse.map((c: any) => (
              <div key={c.id} className="p-2 bg-slate-100 italic">
                {c.full_name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}