# 🚀 HireSync AI - Intelligent Recruitment & Candidate Ranking

**HireSync AI** është një platformë "Full-stack" e fuqizuar nga Inteligjenca Artificiale, e krijuar për të transformuar procesin e rekrutimit. Aplikacioni automatizon analizën e CV-ve, krahason aftësitë e kandidatëve me kërkesat e punës dhe gjeneron një renditje inteligjente të aplikantëve më të mirë.

---

## 🌐 Live Demo
Projekti është i deplojuar dhe mund të vizitohet live këtu:  
👉 **[HireSync AI - Live on Vercel](https://hire-sync-ai-nine.vercel.app)**

---

## 🎯 Si funksionon HireSync AI?

Sistemi ndjek një rrjedhë logjike të strukturuar për të optimizuar punën e rekrutuesve:

1.  **Skanimi Inteligjent:** Sistemi pranon CV-të dhe nxjerr informacionet kyçe përmes AI.
2.  **Krahasimi me Job Description:** AI analizon përputhshmërinë e kandidatit me pozicionin specifik.
3.  **Vlerësimi (Scoring):** Çdo kandidat merr një pikëzim (score) bazuar në algoritmet e AI.
4.  **Renditja (Ranking):** Sistemi gjeneron automatikisht listën e "Top Candidates".
5.  **Feedback-u i Detajuar:** Shpjegime specifike për pikat e forta dhe fushat për përmirësim.

---

## ✨ Karakteristikat Kryesore (Features)

- **AI-Powered Screening:** Analizë automatike duke përdorur modele si GPT-4/Claude përmes OpenRouter.
- **Candidate Ranking Logic:** Renditje automatike sipas meritës.
- **Real-time Persistence:** Ruajtja e plotë e të dhënave në Supabase.
- **Row Level Security (RLS):** Siguri maksimale – rekrutuesit shohin vetëm të dhënat e tyre.
- **Mobile Responsive:** Ndërfaqe moderne me Tailwind CSS.

---

## 🛠️ Teknologjitë (Tech Stack)

| Shtylla | Teknologjia |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), Tailwind CSS, Framer Motion |
| **Backend & Auth** | Supabase SSR, PostgreSQL |
| **AI Integration** | OpenRouter API (LLM Orchestration) |
| **Infrastructure** | Vercel (Deployment) |

---

## 🛡️ Robustness & Edge Case Handling

Ky projekt shkon përtej funksionalitetit bazë duke trajtuar raste kritike (Edge Cases) për të garantuar stabilitetin e UI:

* **Handling Null Responses:** Përdorimi i *Nullish Coalescing* `(data ?? [])` për të parandaluar crash-et e UI në rast se databaza kthen përgjigje boshe ose ka probleme rrjeti.
* **Relational Integrity:** Implementimi i *Optional Chaining* për të menaxhuar rastet kur një kandidat është i lidhur me një pozicion pune (Job) që mund të jetë fshirë.
* **Graceful Error Recovery:** Përdorimi i blloqeve `try-catch-finally` për të kapur dështimet e API-së, duke i njoftuar përdoruesit përmes *Toast notifications* në vend të "Runtime Crash".
* **Safe Loading States:** Menaxhimi i gjendjeve të ngarkimit për të parandaluar "infinite loading" gjatë dështimeve të kërkesave asinkrone.

---

## 🔒 Siguria e të Dhënave

Projekti zbaton **PostgreSQL RLS Policies**:
- Aksesi kontrollohet përmes `auth.uid()`, duke siguruar privatësi totale midis rekrutuesve të ndryshëm.

---

## 🚀 Instalimi Lokalisht

1. **Klononi repozitorin:**
   ```bash
   git clone [https://github.com/AlbionaMaxhuni/HireSyncAI.git](https://github.com/AlbionaMaxhuni/HireSyncAI.git)