# Demo Plan - HireSync AI

## 1. Çka është projekti dhe kujt i shërben

Projekti im quhet **HireSync AI**.  
Ky është një aplikacion për hiring/rekrutim që i ndihmon kompanitë ose ekipet e HR-it me i menaxhu vendet e punës, aplikimet dhe kandidatët në një vend.

Ideja kryesore e projektit është kjo:
- kandidati mundet me i pa pozitat e hapura dhe me apliku ma lehtë
- admini ose kompania mundet me i menaxhu kandidatët ma mirë
- AI përdoret si ndihmë për me i analizu CV-të dhe me e lehtësu filtrimin fillestar

Ky projekt i shërben sidomos:
- kompanive që pranojnë shumë aplikime
- ekipeve të HR-it
- rekruterëve që duan një mënyrë ma të organizuar për me i trajtu kandidatët

**Live URL:** https://hire-sync-ai-nine.vercel.app

## 2. Flow kryesor që do ta demonstroj

Në demo nuk dua me i tregu krejt pjesët e projektit, por dua me u fokusu në flow-n kryesor që e shpjegon më së miri vlerën e aplikacionit.

### Hapi 1 - Landing page dhe jobs
- Fillimisht do ta hap faqen kryesore.
- Do të tregoj që përdoruesi mundet me i pa job-et publike.
- Pastaj do të kaloj te faqja `/jobs` për me tregu listën e pozitave.

### Hapi 2 - Aplikimi si kandidat
- Do ta hap një pozitë të publikuar.
- Do ta tregoj pjesën ku kandidati mundet me apliku.
- Këtu do ta shpjegoj që kandidati nuk ka nevojë menjëherë me u futë në sistem vetëm për me i pa pozitat.

### Hapi 3 - Statusi i aplikimeve
- Pastaj do ta tregoj faqen `/applications`.
- Këtu do të shpjegoj që kandidati mundet me e pa statusin e aplikimit të vet.
- Kjo pjesë e bën eksperiencën më të qartë për kandidatin.

### Hapi 4 - Admin workspace
- Pastaj do të kaloj te `/admin`.
- Do ta tregoj dashboard-in dhe faktin që admini i ka të gjitha në një vend.

### Hapi 5 - Menaxhimi i job-eve
- Te `/admin/jobs` do të tregoj si krijohen job-et.
- Do të përmend edhe statuset si `draft` dhe `published`.
- Kjo e tregon që job-et nuk dalin menjëherë publike pa kontroll.

### Hapi 6 - Kandidatët dhe AI screening
- Te një job i caktuar ose te `/admin/candidates` do t’i tregoj kandidatët.
- Këtu do ta shpjegoj:
  - score
  - skills
  - summary
  - red flags
  - interview questions
- Kjo është pjesa ku shihet përdorimi i AI-it në projekt.

### Hapi 7 - Team dhe analytics
- Në fund do të tregoj shkurt `/admin/team` dhe `/admin/analytics`.
- Këtu do të përmend që projekti nuk është vetëm për një admin, por është menduar si sistem për kompani reale.

## 3. Cilat pjesë teknike do t’i shpjegoj shkurt

Pjesët teknike nuk dua me i zgjat shumë, por do t’i përmend këto:

- Projekti është ndërtuar me **Next.js**
- Për databazë, auth dhe storage kam përdorur **Supabase**
- Për analizën e CV-ve kam përdorur **AI integration**
- Projekti i ka të ndara pjesët për kandidatë dhe admin
- Të dhënat janë të organizuara me `workspace`, `jobs`, `candidates` dhe `notes`

Pra, ideja është me tregu që projekti nuk është vetëm vizual, por ka edhe logjikë reale prapa.

## 4. Çfarë kam kontrolluar para demos

Para prezantimit do t’i kontrolloj këto:

- README a është i përditësuar
- `docs/demo-plan.md` a është gati
- live URL a punon
- a ekziston të paktën një job i publikuar
- a ekziston të paktën një kandidat për demo
- a punon login për admin
- a punon login për kandidat
- a hapen faqet kryesore pa error

Kontrollet teknike që i kam bërë:
- `npm run lint`
- `npm run build`

## 5. Plani B nëse live demo dështon

Nëse live demo nuk punon, atëherë do ta përdor këtë plan:

1. Do ta hap projektin lokal me `npm run dev`
2. Do ta tregoj të njëjtin flow në lokal
3. Nëse ka problem me internet ose login, do të kem screenshot-e të gatshme nga:
   - faqja kryesore
   - jobs page
   - admin dashboard
   - candidates page
   - analytics page
4. Nëse duhet, do ta shpjegoj logjikën e projektit edhe përmes kodit dhe strukturës së databazës

## 6. Si dua ta prezantoj

Gjatë prezantimit dua:
- me fol qartë dhe shkurt
- me u fokusu te pjesa kryesore e projektit
- mos me humb në detaje të tepërta
- me tregu qartë vlerën praktike të aplikacionit

Qëllimi im është që profesori ta kuptojë:
- çfarë problemi zgjidh projekti
- si funksionon në praktikë
- pse kjo ide mundet me qenë e dobishme për kompani reale
