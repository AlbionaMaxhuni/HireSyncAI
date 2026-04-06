# 🚀 HireSync AI - Intelligent Recruitment & Candidate Ranking

**HireSync AI** është një platformë "Full-stack" e fuqizuar nga Inteligjenca Artificiale, e krijuar për të transformuar procesin e rekrutimit. Aplikacioni automatizon analizën e CV-ve, krahason aftësitë e kandidatëve me kërkesat e punës dhe gjeneron një renditje inteligjente të aplikantëve më të mirë.

---

## 🌐 Live Demo
Projekti është i deplojuar dhe mund të vizitohet live këtu:  
👉 **[HireSync AI - Live on Vercel](https://hire-sync-ai-nine.vercel.app)**

---

## 🎯 Si funksionon HireSync AI?

Aplikacioni ndjek një proces logjik të strukturuar për të ndihmuar rekrutuesit:

1.  **Skanimi Inteligjent:** Sistemi pranon CV-të (tekst/PDF) dhe nxjerr informacionet kyçe.
2.  **Krahasimi me Job Description:** AI analizon përputhshmërinë e kandidatit me pozicionin specifik të punës.
3.  **Vlerësimi (Scoring):** Çdo kandidat merr një pikëzim (score) bazuar në aftësitë teknike, përvojën dhe kualifikimet.
4.  **Renditja (Ranking):** Sistemi gjeneron automatikisht listën e "Top Candidates", duke u dhënë përparësi atyre që plotësojnë më mirë kriteret.
5.  **Feedback-u i Detajuar:** Për çdo kandidat, AI shpjegon pikat e forta dhe fushat ku kandidati ka nevojë për përmirësim.

---

## ✨ Karakteristikat Kryesore (Features)

- **AI-Powered Screening:** Analizë automatike duke përdorur modele të avancuara si GPT-4/Claude përmes OpenRouter.
- **Candidate Ranking Logic:** Renditje automatike e kandidatëve sipas meritës dhe aftësive.
- **Real-time Persistence:** Ruajtja e plotë e të dhënave, punëve dhe historikut të bisedave në Supabase.
- **Row Level Security (RLS):** Siguri maksimale – çdo rekrutues mund të shohë vetëm kandidatët dhe punët e krijuara prej tij.
- **Mobile Responsive:** Ndërfaqe moderne e krijuar me Tailwind CSS që funksionon në çdo pajisje.

---

## 🛠️ Teknologjitë (Tech Stack)

| Shtylla | Teknologjia |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), Tailwind CSS, Framer Motion |
| **Backend & Auth** | Supabase SSR, PostgreSQL |
| **AI Integration** | OpenRouter API (LLM Orchestration) |
| **Infrastructure** | Vercel (Deployment & Edge Functions) |

---

## 🛡️ Siguria e të Dhënave

Projekti zbaton **PostgreSQL RLS Policies** për të garantuar privatësinë:
- Tabela `jobs`, `candidates`, `conversations` dhe `messages` janë të mbrojtura.
- Aksesi kontrollohet përmes `auth.uid()`, duke siguruar që asnjë përdorues i huaj nuk mund të shohë të dhënat e tua përmes API-së.

---

## 🚀 Instalimi Lokalisht

1. **Klononi repozitorin:**
   ```bash
   git clone [https://github.com/AlbionaMaxhuni/HireSyncAI.git](https://github.com/AlbionaMaxhuni/HireSyncAI.git)

Instaloni paketat:

Bash
npm install

Konfiguroni .env.local:
Shtoni URL-në e Supabase, Anon Key dhe OpenRouter API Key.

Starto aplikacionin:

Bash
npm run dev