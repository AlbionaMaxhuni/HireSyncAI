# Manual Smoke Checklist

Use this quick pass before publishing a new build.

## Public flow

- Open `/` and confirm the homepage explains both candidate flow and hiring team value.
- Open `/jobs` and confirm published roles load with no broken CTA.
- Open one job detail page and confirm the apply panel explains sign-in clearly.
- Sign in as a candidate and submit one application with a valid PDF or DOCX.
- Open `/applications` and confirm only candidate-facing information is shown.

## Admin flow

- Sign in as an admin and open `/admin`.
- Create a draft role, then publish it.
- Open `/admin/jobs/[id]` and add one manual candidate with a valid email.
- Test one invalid manual candidate email and confirm validation blocks it.
- Open `/admin/team` and create an invite with a valid email.
- Try a duplicate pending invite and confirm it is blocked.
- Remove a recruiter from the workspace and confirm the action succeeds.
- Open `/admin/settings` and confirm there is no billing or upgrade UI.

## Final checks

- Confirm mobile navigation works on `/admin`, `/admin/jobs`, `/admin/candidates`, `/admin/team`, and `/admin/settings`.
- Confirm privacy and terms links work from the public shell.
- Run `npm run lint`.
- Run `npm run build`.

---

# Lista Manuale e Kontrollit

Përdore këtë kontroll të shpejtë para publikimit të një build-i të ri.

## Rrjedha publike

- Hap `/` dhe konfirmo që faqja hyrëse shpjegon si rrjedhën e kandidatit ashtu edhe vlerën për ekipin e rekrutimit.
- Hap `/jobs` dhe konfirmo që pozitat e publikuara ngarkohen pa ndonjë CTA të prishur.
- Hap një faqe detajesh të një pozite dhe konfirmo që paneli i aplikimit e shpjegon qartë hyrjen në sistem.
- Hyr si kandidat dhe dërgo një aplikim me një PDF ose DOCX të vlefshëm.
- Hap `/applications` dhe konfirmo që shfaqet vetëm informacioni i orientuar për kandidatin.

## Rrjedha e adminit

- Hyr si admin dhe hap `/admin`.
- Krijo një pozitë draft dhe më pas publikoje.
- Hap `/admin/jobs/[id]` dhe shto një kandidat manual me një email të vlefshëm.
- Provo një email të pavlefshëm për kandidat manual dhe konfirmo që validimi e bllokon.
- Hap `/admin/team` dhe krijo një ftesë me një email të vlefshëm.
- Provo një ftesë të dyfishtë ende në pritje dhe konfirmo që bllokohet.
- Largo një rekrutues nga workspace dhe konfirmo që veprimi kryhet me sukses.
- Hap `/admin/settings` dhe konfirmo që nuk ka UI për billing ose upgrade.

## Kontrollet finale

- Konfirmo që navigimi mobil funksionon në `/admin`, `/admin/jobs`, `/admin/candidates`, `/admin/team`, dhe `/admin/settings`.
- Konfirmo që linket e privatësisë dhe termave funksionojnë nga public shell.
- Ekzekuto `npm run lint`.
- Ekzekuto `npm run build`.
