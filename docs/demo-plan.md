# Demo Plan - HireSync AI

## 1. Cka eshte projekti dhe kujt i sherben

HireSync AI eshte nje platforme full-stack per hiring qe ka dy siperfaqe kryesore:

- nje eksperience publike per kandidatet qe duan te shohin pozitat dhe te aplikojne
- nje workspace privat per admin ose rekrutues qe menaxhojne job-et, kandidatet dhe pipeline-in

Projekti i sherben sidomos:

- ekipeve te HR-it
- rekrutuesve
- kompanive te vogla ose ne rritje qe duan proces me te organizuar te hiring-ut

Vlera kryesore e produktit eshte qe e mban procesin e kandidatit te thjeshte, ndersa ekipit te hiring-ut i jep nje vend te vetem per menaxhim, screening dhe koordinim.

**Live URL:** https://hire-sync-ai-nine.vercel.app

## 2. Flow kryesor qe do ta demonstroj

Ne demo do te fokusohem te flow-i me i forte i produktit dhe jo te cdo faqe ne menyre te barabarte.

### Pjesa 1 - Public hiring flow

- Hap faqen `/` dhe shpjegoj shkurt cfare zgjidh produkti
- Kaloj te `/jobs` dhe tregoj pozitat e publikuara
- Hap nje job detail page dhe tregoj si kandidati mund ta kuptoje rolin dhe si aplikohet
- Permend qe kandidati nuk ka nevoje te hyje ne sistem vetem per te pare pozitat

### Pjesa 2 - Candidate experience

- Tregoj qe kandidati mund te aplikoje me CV
- Hap `/applications` dhe tregoj qe kandidati e sheh statusin e aplikimit ne menyre te thjeshte
- E lidh kete me vleren e produktit: transparence me e mire dhe eksperience me e qarte per kandidatin

### Pjesa 3 - Admin workspace

- Kaloj te `/admin` dhe tregoj dashboard-in
- Hap `/admin/jobs` dhe tregoj krijimin ose menaxhimin e nje job-i me state si `draft` dhe `published`
- Hap `/admin/candidates` ose nje faqe job-i specifik dhe tregoj kandidatet, score, skills, summary, red flags dhe interview questions
- Permend qe kjo eshte pjesa ku AI e ndihmon screening-un fillestar

### Pjesa 4 - Team dhe analytics

- Hap `/admin/team` per te treguar se sistemi mbeshtet ekip dhe jo vetem nje admin te vetem
- Hap `/admin/analytics` per te treguar nje overview te pipeline-it dhe aktivitetit te hiring-ut

## 3. Si do ta ndaj prezentimin ne 5-7 minuta

### 0:00 - 0:45 | Hyrja

- Prezantoj shkurt problemin
- Them cfare eshte HireSync AI
- Sqaroj kujt i sherben

### 0:45 - 2:00 | Public flow

- Homepage
- Jobs page
- Job detail page

### 2:00 - 3:00 | Candidate flow

- Application flow
- Applications page

### 3:00 - 5:00 | Admin flow

- Admin dashboard
- Jobs management
- Candidate review dhe AI screening

### 5:00 - 5:45 | Team dhe analytics

- Team access
- Analytics overview

### 5:45 - 6:30 | Technical highlights dhe mbyllja

- Next.js, Supabase, AI integration
- Pse struktura me workspaces e ben projektin me realist
- Mbyllje me vleren praktike te produktit

Ky plan me lejon ta mbaj demo-n brenda 5-7 minutave pa humbur ne detaje te panevojshme.

## 4. Cilat pjese teknike do t'i shpjegoj shkurt

Do t'i permend shkurt vetem pjeset qe japin peshe teknike pa e kthyer prezantimin ne leksion kodi:

- frontend-i eshte ndertuar me Next.js App Router
- backend-i eshte realizuar me Route Handlers
- databaza, auth dhe storage menaxhohen nga Supabase
- projekti ndahet qarte ne candidate flow dhe admin workspace
- AI perdoret per resume screening dhe ndihme ne vleresimin fillestar te kandidateve
- struktura me `workspaces`, `jobs`, `candidates` dhe `candidate_notes` e ben produktin me te afert me nje rast real

## 5. Cfare kam kontrolluar para demos

Para prezantimit kam pergatitur ose kontrolluar keto pika:

- README eshte i perditesuar
- `docs/demo-plan.md` eshte i pergatitur
- live URL eshte vendosur ne dokumentacion
- ekziston nje checklist manuale ne `docs/manual-smoke-checklist.md`
- flow-et kryesore te produktit jane percaktuar qarte per demo
- `npm run lint` kalon
- `npm run build` kalon

Para prezantimit final do te kontrolloj edhe praktikisht:

- qe ka te pakten nje job te publikuar
- qe ekziston nje kandidat per demo
- qe login punon per admin dhe kandidat
- qe faqet kryesore hapen pa error
- qe mobile navigation funksionon ne faqet admin

## 6. Plani B nese live demo deshton

Nese live demo ka problem, do te perdor kete fallback:

1. E hap projektin lokal me `npm run dev`
2. E ndjek te njejtin flow ne lokal
3. Nese ka problem me internet, login ose seed data, mbeshtetem te screenshot-et e pergatitura paraprakisht
4. Nese duhet, e shpjegoj logjiken e produktit permes kodit, routes kryesore dhe struktures se databazes

Screenshot-et qe duhet t'i kem gati:

- homepage
- jobs page
- applications page
- admin dashboard
- candidates page
- analytics page

## 7. Cfare dua te percjell gjate prezantimit

Gjate prezantimit dua te jete e qarte qe:

- e di sakte cfare po demonstroj
- kam zgjedhur flow-in me te mire te produktit
- projekti eshte i kontrolluar dhe i gatshem per prezantim
- di ta shpjegoj vleren e produktit dhe pjesen teknike pa humbur ne detaje

Qellimi nuk eshte vetem te tregoj qe aplikacioni ekziston, por te tregoj qe eshte nje produkt i menduar mire dhe i prezantuar ne menyre profesionale.
