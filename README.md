# 🚀 HireSync AI - Interview Question Generator

HireSync AI është një platformë e fuqizuar nga Inteligjenca Artificiale që ndihmon rekrutuesit të gjenerojnë pyetje teknike për intervista pune. Ky projekt fokusohet në implementimin e një sistemi të sigurt autentifikimi duke perdorur **Supabase Auth** dhe **Next.js**.

## 🛠️ Teknologjitë e Përdorura
- **Framework:** Next.js 14 (App Router)
- **Autentifikimi:** Supabase Auth
- **Stilimi:** Tailwind CSS
- **Ikonat:** Lucide React
- **Gjuha:** TypeScript

## ✨ Veçoritë (Features)
- [x] **Sign Up:** Regjistrim me Email, Password dhe Emër.
- [x] **Login:** Qasje e sigurt me validim të dhënash.
- [x] **Forgot Password:** Sistem i plotë për resetimin e fjalëkalimit përmes email-it.
- [x] **Protected Routes:** Dashboard-i është i aksesueshëm vetëm për përdoruesit e kyçur.
- [x] **Persistent Session:** Përdoruesi mbetet i kyçur edhe pas rifreskimit të faqes.
- [x] **AI Dashboard:** Gjenerim i pyetjeve me Skeleton Loading dhe funksionin "Copy to Clipboard".

## 🛡️ Refleksioni mbi Autentifikimin (Pika 5 e detyrës)

### 1. Çfarë mësova për autentifikimin?
Mësova se autentifikimi nuk përfundon te forma e login-it. Menaxhimi i sesionit përmes `onAuthStateChange` dhe ruajtja e gjendjes së përdoruesit në një **React Context** janë kritike për një eksperiencë të mirë (UX) dhe siguri.

### 2. Si e menaxhon React gjendjen e user-it?
React përdor **Context API** për të krijuar një "Global State" (AuthContext). Kjo lejon që informacioni i përdoruesit të jetë i disponueshëm në të gjithë aplikacionin pa pasur nevojë të kalojmë props në çdo komponent (Prop Drilling).

### 3. Çfarë rreziqesh sigurie duhet të kesh parasysh?
- **XSS Attacks:** Duhet kujdes me ruajtjen e tokens.
- **Brute Force:** Nevojitet validim i fortë në server-side (të cilin Supabase e bën automatikisht).
- **Leakage:** Mosshfaqja e mesazheve specifike si "Ky email nuk ekziston" për të parandaluar User Enumeration.

## 🚀 Si ta rritni projektin lokal
1. Clone repository: `git clone [linku-yt]`
2. Install dependencies: `npm install`
3. Shto `.env.local` me çelësat e Supabase.
4. Run: `npm run dev`
