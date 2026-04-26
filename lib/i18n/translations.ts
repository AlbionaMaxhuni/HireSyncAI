export type Language = 'en' | 'sq'

type TranslationRule = {
  en: RegExp
  sq: RegExp
  toSq: (match: RegExpMatchArray) => string
  toEn: (match: RegExpMatchArray) => string
}

export const supportedLanguages: Array<{ code: Language; shortLabel: string; label: string }> = [
  { code: 'en', shortLabel: 'EN', label: 'English' },
  { code: 'sq', shortLabel: 'SQ', label: 'Shqip' },
]

export function normalizeI18nText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

const exactTranslations: Record<string, string> = {
  Account: 'Llogaria',
  'Account status': 'Statusi i llogarisë',
  'Account, company, and security': 'Llogaria, kompania dhe siguria',
  'Access': 'Qasja',
  'Access role': 'Roli i qasjes',
  Active: 'Aktiv',
  'Active admins in this workspace': 'Adminët aktivë në këtë workspace',
  'Add a teammate': 'Shto një anëtar ekipi',
  'Add company': 'Shto kompaninë',
  'Add context': 'Shto kontekst',
  'Add owner': 'Shto pronarin',
  'Add the person behind this workspace.': 'Shto personin që qëndron pas këtij workspace.',
  'Add the person or team name behind this workspace.': 'Shto personin ose emrin e ekipit që qëndron pas këtij workspace.',
  'Add a website or careers tagline so the public portal feels credible.':
    'Shto një website ose tagline karriere që portali publik të duket i besueshëm.',
  'Add a website or tagline so the public portal feels credible.':
    'Shto një website ose tagline që portali publik të duket i besueshëm.',
  'Add company profile': 'Shto profilin e kompanisë',
  'Advanced stages': 'Fazat e avancuara',
  'After applying': 'Pas aplikimit',
  'After sign in': 'Pas kyçjes',
  'AI queue': 'Radha e AI-së',
  'All candidates': 'Të gjithë kandidatët',
  'All current candidates have scores.': 'Të gjithë kandidatët aktualë kanë pikëzim.',
  'All jobs': 'Të gjitha pozitat',
  'All roles in the workspace': 'Të gjitha rolet në workspace',
  'All scores': 'Të gjitha pikët',
  'All stages': 'Të gjitha fazat',
  Analytics: 'Analitika',
  'Analytics becomes useful after you add roles and start collecting candidates.':
    'Analitika bëhet e dobishme pasi të shtosh role dhe të fillosh të mbledhësh kandidatë.',
  'Application': 'Aplikimi',
  'Application received': 'Aplikimi u pranua',
  Applications: 'Aplikimet',
  'Application step': 'Hapi i aplikimit',
  'Applied': 'Aplikuar',
  'Applied means your CV reached the team safely.':
    'Aplikuar do të thotë që CV-ja jote ka arritur te ekipi me sukses.',
  'Apply only when ready': 'Apliko vetëm kur je gati',
  'Apply securely': 'Apliko në mënyrë të sigurt',
  'Archived': 'Arkivuar',
  'A cleaner front door for the hiring workspace.': 'Një hyrje më e pastër për workspace-in e punësimit.',
  'A concise summary of the current workspace account.': 'Një përmbledhje e shkurtër e llogarisë aktuale të workspace-it.',
  'A PDF or DOCX CV up to 5 MB': 'Një CV PDF ose DOCX deri në 5 MB',
  'A professional front door for the hiring workspace.': 'Një hyrje profesionale për workspace-in e punësimit.',
  'A published role is what candidates actually see and apply to.':
    'Një rol i publikuar është ajo që kandidatët e shohin dhe ku aplikojnë.',
  'A simple, professional sign-in flow for the public portal and the private hiring workspace.':
    'Një rrjedhë e thjeshtë dhe profesionale kyçjeje për portalin publik dhe workspace-in privat të punësimit.',
  'Admin dashboard': 'Paneli i adminit',
  'Admin workspace': 'Workspace i adminit',
  'Admin workspace access': 'Qasje në workspace-in e adminit',
  'Avg score': 'Mesatarja e pikëve',
  'Average across scored candidates': 'Mesatarja e kandidatëve të pikëzuar',
  'Back to sign in': 'Kthehu te kyçja',
  'Best starting point': 'Pika më e mirë e nisjes',
  'Better account behavior': 'Sjellje më e mirë e llogarisë',
  'Browse first': 'Shfleto së pari',
  'Browse jobs': 'Shfleto pozitat',
  'Browse more roles': 'Shfleto më shumë role',
  'Browse roles first': 'Shfleto rolet së pari',
  'Browse roles, apply clearly, and track your status.':
    'Shfleto rolet, apliko qartë dhe ndiq statusin tënd.',
  'Bulk upload': 'Ngarkim masiv',
  'By role': 'Sipas rolit',
  'Candidate account': 'Llogari kandidati',
  'Candidate application': 'Aplikim kandidati',
  'Candidate list': 'Lista e kandidatëve',
  'Candidate path': 'Rruga e kandidatit',
  'Candidate pipeline': 'Pipeline i kandidatëve',
  Candidates: 'Kandidatët',
  'Candidates attached to jobs': 'Kandidatët e lidhur me pozitat',
  'Candidates can come back and see whether the application is applied, in review, or moving forward.':
    'Kandidatët mund të kthehen dhe të shohin nëse aplikimi është dërguar, në shqyrtim, apo po ecën përpara.',
  'Candidates can read the role first, then create an account only when they want to submit an application and track progress.':
    'Kandidatët mund ta lexojnë rolin së pari, pastaj të krijojnë llogari vetëm kur duan të dërgojnë aplikim dhe të ndjekin progresin.',
  'Candidates can review roles calmly, and the team enters the private workspace only when needed. The result feels simpler, more real, and more professional.':
    'Kandidatët mund t’i shohin rolet qetësisht, ndërsa ekipi hyn në workspace privat vetëm kur duhet. Rezultati ndihet më i thjeshtë, më real dhe më profesional.',
  'Careers tagline': 'Tagline e karrierës',
  'Check queue health and source mix before going deeper into the numbers.':
    'Kontrollo shëndetin e radhës dhe burimet para se të hysh më thellë në numra.',
  'Check status': 'Kontrollo statusin',
  'Check back soon.': 'Kontrollo përsëri së shpejti.',
  'Checking session...': 'Duke kontrolluar sesionin...',
  'Checking your current session...': 'Duke kontrolluar sesionin aktual...',
  'Choose a PDF or DOCX file': 'Zgjidh një file PDF ose DOCX',
  'Clear': 'Pastro',
  'Clear filters': 'Pastro filtrat',
  'Collaboration': 'Bashkëpunimi',
  'Company context': 'Konteksti i kompanisë',
  'Company identity': 'Identiteti i kompanisë',
  'Company name': 'Emri i kompanisë',
  'Company profile': 'Profili i kompanisë',
  'Company profile not configured yet': 'Profili i kompanisë ende nuk është konfiguruar',
  'Company website': 'Website i kompanisë',
  'Complete company profile': 'Plotëso profilin e kompanisë',
  'Confirm password': 'Konfirmo fjalëkalimin',
  Continue: 'Vazhdo',
  'Continue to your private hiring workspace with one focused, secure login flow.':
    'Vazhdo te workspace privat i punësimit me një rrjedhë të fokusuar dhe të sigurt kyçjeje.',
  'Conversion': 'Konvertimi',
  'Copy email': 'Kopjo emailin',
  'Copy link': 'Kopjo linkun',
  'Could not copy invite email.': 'Nuk mund të kopjohej emaili i ftesës.',
  'Could not copy invite link.': 'Nuk mund të kopjohej linku i ftesës.',
  'Could not submit your application.': 'Nuk mund të dërgohej aplikimi.',
  'Create': 'Krijo',
  'Create account': 'Krijo llogari',
  'Create access': 'Krijo qasje',
  'Create an invite for the teammate email.': 'Krijo një ftesë për emailin e anëtarit të ekipit.',
  'Create candidate access': 'Krijo qasje kandidati',
  'Create first job': 'Krijo pozitën e parë',
  'Create invite': 'Krijo ftesë',
  'Create new role': 'Krijo rol të ri',
  'Create or publish a role': 'Krijo ose publiko një rol',
  'Create role': 'Krijo rol',
  'Create team access': 'Krijo qasje ekipi',
  'Create workspace access': 'Krijo qasje në workspace',
  'Create your first role brief on the right side to start receiving and organizing candidates.':
    'Krijo përshkrimin e parë të rolit në anën e djathtë për të filluar pranimin dhe organizimin e kandidatëve.',
  'Creating invite...': 'Duke krijuar ftesën...',
  'Creating job...': 'Duke krijuar pozitën...',
  'Current hiring team': 'Ekipi aktual i punësimit',
  'Current pipeline': 'Pipeline aktual',
  'Current workspace members': 'Anëtarët aktualë të workspace-it',
  'Dashboard': 'Paneli',
  'Decide the next stage and keep the pipeline updated after each review.':
    'Vendos fazën tjetër dhe mbaje pipeline-in të përditësuar pas çdo shqyrtimi.',
  Delete: 'Fshi',
  'Delete this job and its linked candidates?': 'Ta fshij këtë pozitë dhe kandidatët e lidhur me të?',
  'Direct entry': 'Hyrje direkte',
  Done: 'Përfunduar',
  Draft: 'Draft',
  'Draft (recommended)': 'Draft (e rekomanduar)',
  'Draft role': 'Rol draft',
  'Email': 'Email',
  Error: 'Gabim',
  'Every profile in the pipeline': 'Çdo profil në pipeline',
  'Everyone with active access to jobs, candidates, notes, and analytics in this workspace.':
    'Të gjithë me qasje aktive në pozita, kandidatë, shënime dhe analitikë në këtë workspace.',
  'Explore jobs': 'Shfleto pozitat',
  'Explore open roles': 'Shfleto rolet e hapura',
  'Failed': 'Dështuar',
  'Featured roles': 'Rolet e veçuara',
  'Filtered pipeline': 'Pipeline i filtruar',
  Filters: 'Filtrat',
  'Final': 'Finale',
  'Final Review': 'Shqyrtim final',
  'Finish the application clearly.': 'Përfundo aplikimin qartë.',
  'First-time setup': 'Konfigurimi fillestar',
  'Focus review': 'Shqyrtim i fokusuar',
  'Focused review': 'Shqyrtim i fokusuar',
  'Forgot password': 'Kam harruar fjalëkalimin',
  'For candidates': 'Për kandidatët',
  'For hiring teams': 'Për ekipet e punësimit',
  'Full name': 'Emri i plotë',
  'Go back to roles': 'Kthehu te rolet',
  'Hiring analytics': 'Analitika e punësimit',
  'Hiring owner': 'Pronari i punësimit',
  'Hiring team': 'Ekipi i punësimit',
  'Hiring team owner': 'Pronari i ekipit të punësimit',
  'Hiring teams continue to the private workspace.': 'Ekipet e punësimit vazhdojnë te workspace privat.',
  'Hiring workspace': 'Workspace i punësimit',
  'HireSync AI keeps hiring clear for teams and simple for candidates.':
    'HireSync AI e mban punësimin të qartë për ekipet dhe të thjeshtë për kandidatët.',
  'HireSync Studio': 'HireSync Studio',
  'HireSync workspace': 'HireSync workspace',
  'Hired': 'Punësuar',
  'How applying works': 'Si funksionon aplikimi',
  'How team access works': 'Si funksionon qasja e ekipit',
  'How to read this page': 'Si lexohet kjo faqe',
  'How to use this workspace': 'Si përdoret ky workspace',
  'If you are a candidate, start with the jobs page. If you are the hiring team, start with the admin workspace.':
    'Nëse je kandidat, fillo nga faqja e pozitave. Nëse je ekipi i punësimit, fillo nga workspace i adminit.',
  'In progress': 'Në progres',
  'In review': 'Në shqyrtim',
  'Interview': 'Intervistë',
  'Interview / Final': 'Intervistë / Finale',
  'Interview+': 'Intervistë+',
  'Interview, final review, or hired': 'Intervistë, shqyrtim final ose punësuar',
  'Interview, final, or hired': 'Intervistë, finale ose punësuar',
  'Invite': 'Ftesë',
  'Invite created. Copy the link below and share it with your teammate.':
    'Ftesa u krijua. Kopjo linkun më poshtë dhe ndajeni me anëtarin e ekipit.',
  'Invite email copied.': 'Emaili i ftesës u kopjua.',
  'Invite flow': 'Rrjedha e ftesës',
  'Invite link copied.': 'Linku i ftesës u kopjua.',
  'Invite links not accepted yet': 'Linket e ftesave ende të papranuara',
  'Invite revoked.': 'Ftesa u anulua.',
  'Invite teammates into the same hiring workspace, keep access visible, and share a cleaner admin flow with real companies.':
    'Fto anëtarë në të njëjtin workspace të punësimit, mbaje qasjen të dukshme dhe ndaj një rrjedhë admini më të pastër me kompani reale.',
  'Invite workflow': 'Rrjedha e ftesës',
  'Job': 'Pozita',
  'Job created successfully.': 'Pozita u krijua me sukses.',
  'Job deleted.': 'Pozita u fshi.',
  'Job moved back to draft.': 'Pozita u kthye në draft.',
  'Job published.': 'Pozita u publikua.',
  'Job title': 'Titulli i pozitës',
  Jobs: 'Pozitat',
  'Jobs, candidates, and hiring activity in one place.':
    'Pozitat, kandidatët dhe aktiviteti i punësimit në një vend.',
  'Jobs stay visible before login so visitors understand the opportunity first.':
    'Pozitat mbeten të dukshme para login-it që vizitorët ta kuptojnë mundësinë së pari.',
  'Join the workspace with the invited email.': 'Bashkohu në workspace me emailin e ftuar.',
  'Join your hiring team workspace securely.': 'Bashkohu në mënyrë të sigurt në workspace-in e ekipit të punësimit.',
  'Joined': 'U bashkua',
  'Keep both the hiring owner and the company identity current so candidates understand who is hiring.':
    'Mbaje të përditësuar pronarin e punësimit dhe identitetin e kompanisë që kandidatët ta kuptojnë kush po punëson.',
  'Keep the brief simple and useful': 'Mbaje përshkrimin të thjeshtë dhe të dobishëm',
  'Keep the hiring workspace credible: clear owner identity, clear company profile, and secure account recovery.':
    'Mbaje workspace-in e punësimit të besueshëm: identitet i qartë i pronarit, profil i qartë i kompanisë dhe rikuperim i sigurt i llogarisë.',
  'Keep the list clean: draft roles stay private, published roles are visible to candidates.':
    'Mbaje listën të pastër: draftet mbeten private, rolet e publikuara janë të dukshme për kandidatët.',
  'Keep the next step obvious.': 'Mbaje hapin tjetër të qartë.',
  'Keep this simple. Add only the information the hiring team actually needs to review you clearly.':
    'Mbaje të thjeshtë. Shto vetëm informacionin që ekipi i punësimit ka nevojë për të të shqyrtuar qartë.',
  'Latest activity': 'Aktiviteti i fundit',
  'Latest jobs': 'Pozitat e fundit',
  'Link-based': 'Bazuar në link',
  'Live': 'Live',
  Loading: 'Duke u ngarkuar',
  'Loading authentication...': 'Duke ngarkuar autentikimin...',
  Location: 'Lokacioni',
  'Log out': 'Dil',
  'Log out and switch': 'Dil dhe ndërro llogari',
  'Logged out. You can continue with another account.': 'Dole nga llogaria. Mund të vazhdosh me një llogari tjetër.',
  'Manual share until email delivery is connected': 'Shpërndarje manuale derisa dërgimi me email të lidhet',
  'Manage jobs': 'Menaxho pozitat',
  Member: 'Anëtar',
  Members: 'Anëtarët',
  Needed: 'Duhet',
  Next: 'Hapi tjetër',
  'Next actions': 'Veprimet e radhës',
  'No candidate is waiting in queue.': 'Asnjë kandidat nuk është në radhë.',
  'No candidates match the selected filters': 'Asnjë kandidat nuk përputhet me filtrat e zgjedhur',
  'No collaboration notes have been added yet.': 'Ende nuk është shtuar asnjë shënim bashkëpunimi.',
  'No email': 'Pa email',
  'No email available': 'Email i padisponueshëm',
  'No email stored': 'Nuk ka email të ruajtur',
  'No jobs are published in the workspace yet.': 'Ende nuk ka pozita të publikuara në workspace.',
  'No jobs created yet': 'Ende nuk është krijuar asnjë pozitë',
  'No jobs match this search': 'Asnjë pozitë nuk përputhet me këtë kërkim',
  'No login barrier': 'Pa pengesë login-i',
  'No members yet': 'Ende nuk ka anëtarë',
  'No notes added yet.': 'Ende nuk ka shënime.',
  'No pending invites': 'Nuk ka ftesa në pritje',
  'No processing failures right now.': 'Nuk ka dështime procesimi për momentin.',
  'No recent sign-in data': 'Nuk ka të dhëna të fundit të kyçjes',
  'No roles are available right now. Check back soon.':
    'Nuk ka role të disponueshme për momentin. Kontrollo përsëri së shpejti.',
  'No source data available yet.': 'Ende nuk ka të dhëna burimi.',
  'Not available': 'Nuk është e disponueshme',
  'Not scored': 'Pa pikëzim',
  Notes: 'Shënime',
  'Note coverage': 'Mbulimi me shënime',
  'Open': 'Hap',
  'Open a role to upload CVs, process candidates, and manage that pipeline.':
    'Hap një rol për të ngarkuar CV, për të procesuar kandidatë dhe për të menaxhuar pipeline-in.',
  'Open a profile': 'Hap një profil',
  'Open candidates': 'Hap kandidatët',
  'Open email draft': 'Hap draftin e emailit',
  'Open invite links': 'Linket e hapura të ftesave',
  'Open jobs': 'Hap pozitat',
  'Open pipeline': 'Hap pipeline-in',
  'Open role': 'Hap rolin',
  'Open roles': 'Rolet e hapura',
  'Open roles first.': 'Rolet e hapura së pari.',
  'Open settings': 'Hap cilësimet',
  'Open the pipeline, process CVs, and move strong candidates forward.':
    'Hap pipeline-in, proceso CV-të dhe shty përpara kandidatët e fortë.',
  'Open the role and understand the fit before doing anything else.':
    'Hap rolin dhe kupto përshtatjen para se të bësh ndonjë gjë tjetër.',
  'Optional note': 'Shënim opsional',
  'Optional note only if it adds useful context': 'Shënim opsional vetëm nëse shton kontekst të dobishëm',
  Overview: 'Përmbledhje',
  Owner: 'Pronar',
  'Owner name': 'Emri i pronarit',
  Password: 'Fjalëkalimi',
  'Password reset': 'Rivendosja e fjalëkalimit',
  'Password reset email sent.': 'Emaili për rivendosjen e fjalëkalimit u dërgua.',
  'Password reset link sent. Check your inbox.': 'Linku për rivendosjen e fjalëkalimit u dërgua. Kontrollo inbox-in.',
  'Password rules': 'Rregullat e fjalëkalimit',
  Pending: 'Në pritje',
  'Pending invites': 'Ftesa në pritje',
  People: 'Njerëzit',
  'Please sign in to continue to the page you requested.': 'Ju lutem kyçuni për të vazhduar te faqja që kërkuat.',
  'Please upload your CV before submitting.': 'Ju lutem ngarkoni CV-në para dërgimit.',
  Pipeline: 'Pipeline',
  'Processing failed': 'Procesimi dështoi',
  'Processing queue': 'Radha e procesimit',
  'Processing:': 'Procesimi:',
  'Profile and company details': 'Profili dhe detajet e kompanisë',
  'Progress': 'Progresi',
  Progressed: 'Të avancuar',
  Promising: 'Premtues',
  Protected: 'I mbrojtur',
  'Protected routes are active for admin pages': 'Rrugët e mbrojtura janë aktive për faqet e adminit',
  'Public context': 'Konteksti publik',
  'Public jobs, guided applications, and a focused admin workspace.':
    'Pozita publike, aplikime të udhëzuara dhe workspace admin i fokusuar.',
  'Public portal': 'Portali publik',
  'Public roles': 'Role publike',
  'Published': 'Publikuar',
  'Published immediately': 'Publiko menjëherë',
  'Published jobs': 'Pozita të publikuara',
  'Published role': 'Rol i publikuar',
  'Published roles are the real starting point of the hiring flow.':
    'Rolet e publikuara janë pika reale e nisjes së rrjedhës së punësimit.',
  'Publish': 'Publiko',
  'Publish a role': 'Publiko një rol',
  'Publish role': 'Publiko rolin',
  'Publish at least one role before sharing the portal.':
    'Publiko të paktën një rol para se ta ndash portalin.',
  'Queued': 'Në radhë',
  Queue: 'Radha',
  'Reading job details stays public so the first step feels simple.':
    'Leximi i detajeve të pozitës mbetet publik që hapi i parë të ndihet i thjeshtë.',
  Recruiter: 'Rekruter',
  'Recruiting team': 'Ekip rekrutimi',
  'Recruiters and hiring teams enter the private workspace only when they need to manage jobs, candidates, and team access.':
    'Rekruterët dhe ekipet e punësimit hyjnë në workspace privat vetëm kur duhet të menaxhojnë pozita, kandidatë dhe qasje ekipi.',
  'Recruiters keep candidates, notes, and AI support in one disciplined workspace.':
    'Rekruterët mbajnë kandidatët, shënimet dhe mbështetjen AI në një workspace të disiplinuar.',
  'Recent candidates and stages': 'Kandidatët dhe fazat e fundit',
  'Recent roles': 'Rolet e fundit',
  'Rejected': 'Refuzuar',
  Remove: 'Hiq',
  'Removing...': 'Duke hequr...',
  Reset: 'Rivendos',
  'Reset filters': 'Rivendos filtrat',
  'Reset your password': 'Rivendos fjalëkalimin',
  Results: 'Rezultatet',
  'Return only when needed': 'Kthehu vetëm kur duhet',
  'Return to the role page and complete the application form.':
    'Kthehu te faqja e rolit dhe plotëso formularin e aplikimit.',
  Revoke: 'Anulo',
  'Revoking...': 'Duke anuluar...',
  'Review candidates, process CVs, and move strong profiles forward.':
    'Shqyrto kandidatët, proceso CV-të dhe shty përpara profilet e forta.',
  'Review in progress': 'Shqyrtimi është në progres',
  'Review role': 'Shqyrto rolin',
  'Review the AI summary, skills, red flags, and resume in one place.':
    'Lexo përmbledhjen AI, aftësitë, sinjalet e kuqe dhe CV-në në një vend.',
  'Review the candidate pipeline': 'Shqyrto pipeline-in e kandidatëve',
  'Review the role and make sure it fits.': 'Shqyrto rolin dhe sigurohu që të përshtatet.',
  Role: 'Roli',
  'Role list': 'Lista e roleve',
  Roles: 'Rolet',
  'Roles at a glance': 'Rolet me një shikim',
  'Roles currently visible to candidates': 'Rolet që aktualisht janë të dukshme për kandidatët',
  'Roles live now': 'Role aktive tani',
  'Route protection': 'Mbrojtja e route-ve',
  Save: 'Ruaj',
  'Save changes': 'Ruaj ndryshimet',
  'Saving...': 'Duke ruajtur...',
  'Screen': 'Shqyrtim',
  'Screening': 'Shqyrtim',
  'Screening, interview, and final show how far the application moved.':
    'Shqyrtimi, intervista dhe finalja tregojnë sa larg ka ecur aplikimi.',
  'Screening, interview, or final': 'Shqyrtim, intervistë ose finale',
  'Screening, interview, or final review': 'Shqyrtim, intervistë ose shqyrtim final',
  Search: 'Kërko',
  'Search by name, email, job, or skill': 'Kërko sipas emrit, emailit, pozitës ose aftësisë',
  'Search jobs by title or description': 'Kërko pozita sipas titullit ose përshkrimit',
  'Secure access': 'Qasje e sigurt',
  'Secure authentication for both hiring teams and candidates.':
    'Autentikim i sigurt për ekipet e punësimit dhe kandidatët.',
  Security: 'Siguria',
  'Send invite': 'Dërgo ftesën',
  'Send reset email': 'Dërgo email për rivendosje',
  'Send reset link': 'Dërgo linkun e rivendosjes',
  'Sending...': 'Duke dërguar...',
  'Sending reset link...': 'Duke dërguar linkun e rivendosjes...',
  'Session detected': 'U gjet sesion',
  Settings: 'Cilësimet',
  'Set company profile': 'Vendos profilin e kompanisë',
  'Set the company name candidates will see.': 'Vendos emrin e kompanisë që do ta shohin kandidatët.',
  'Shortlisted': 'Të përzgjedhur',
  'Sign in': 'Kyçu',
  'Sign in only at the moment you want to upload your CV.': 'Kyçu vetëm në momentin kur dëshiron të ngarkosh CV-në.',
  'Sign in only when needed': 'Kyçu vetëm kur duhet',
  'Sign in only when you are ready to apply.': 'Kyçu vetëm kur je gati të aplikosh.',
  'Sign in required': 'Kërkohet kyçja',
  'Sign in to apply': 'Kyçu për të aplikuar',
  'Sign in to continue your application': 'Kyçu për të vazhduar aplikimin',
  'Sign in to HireSync AI': 'Kyçu në HireSync AI',
  'Sign in to join the workspace': 'Kyçu për t’u bashkuar në workspace',
  'Simple entry flow': 'Rrjedhë e thjeshtë hyrjeje',
  'Simple hiring flow': 'Rrjedhë e thjeshtë punësimi',
  'Some candidates still need scoring context.': 'Disa kandidatë ende kanë nevojë për kontekst pikëzimi.',
  'Some CVs are still waiting for processing.': 'Disa CV janë ende duke pritur procesimin.',
  'Source mix': 'Përzierja e burimeve',
  'Stage distribution': 'Shpërndarja sipas fazave',
  'Stage view': 'Pamja sipas fazave',
  'Start from the jobs page, choose a role that fits, then apply from that role page.':
    'Fillo nga faqja e pozitave, zgjidh një rol që përshtatet, pastaj apliko nga ajo faqe.',
  'Start here': 'Fillo këtu',
  'Start with a draft. Publish it only when the brief is clean and candidate-ready.':
    'Fillo me draft. Publikoje vetëm kur përshkrimi është i qartë dhe gati për kandidatët.',
  'Start with a job brief. Once candidates arrive, the rest of the admin panel becomes useful automatically.':
    'Fillo me një përshkrim pozite. Pasi të vijnë kandidatët, pjesa tjetër e panelit bëhet automatikisht e dobishme.',
  'Start with the role, not the login screen.': 'Fillo me rolin, jo me ekranin e login-it.',
  Status: 'Statusi',
  Submitted: 'Dërguar',
  'Submit application': 'Dërgo aplikimin',
  'Submitting application...': 'Duke dërguar aplikimin...',
  Success: 'Sukses',
  'Team': 'Ekipi',
  'Team access': 'Qasje e ekipit',
  'Team access works': 'Si funksionon qasja e ekipit',
  'Team invites should feel simple and trustworthy. Sign in or create an account with the invited email address to join the workspace.':
    'Ftesat e ekipit duhet të ndihen të thjeshta dhe të besueshme. Kyçu ose krijo llogari me emailin e ftuar për t’u bashkuar në workspace.',
  'Team member removed.': 'Anëtari i ekipit u hoq.',
  'Teammate email': 'Emaili i anëtarit të ekipit',
  'The goal is to keep the first action clear, not crowded.':
    'Qëllimi është që veprimi i parë të jetë i qartë, jo i ngarkuar.',
  'The hiring workspace stays private while the public job portal remains simple for candidates.':
    'Workspace i punësimit mbetet privat ndërsa portali publik i pozitave mbetet i thjeshtë për kandidatët.',
  'The link will be sent to the current account email and will redirect back into your secure reset flow.':
    'Linku do të dërgohet te emaili aktual i llogarisë dhe do të kthejë te rrjedha e sigurt e rivendosjes.',
  'The product feels much clearer once company details are filled in and one role is public.':
    'Produkti ndihet shumë më i qartë pasi plotësohen detajet e kompanisë dhe një rol është publik.',
  'The stage counts below react to the current filters so you can narrow the list without losing context.':
    'Numrat e fazave më poshtë reagojnë ndaj filtrave aktualë, që ta ngushtosh listën pa humbur kontekstin.',
  'The system checks that the account email matches the invite.':
    'Sistemi kontrollon që emaili i llogarisë përputhet me ftesën.',
  'The team is reviewing fit, experience, and the next best follow-up step.':
    'Ekipi po shqyrton përshtatjen, përvojën dhe hapin më të mirë vijues.',
  'The team invite could not be completed. Make sure you signed in with the same email address that received the invite.':
    'Ftesa e ekipit nuk mund të kompletohej. Sigurohu që je kyçur me të njëjtin email që e ka pranuar ftesën.',
  'The workspace owner cannot be removed here.': 'Pronari i workspace-it nuk mund të hiqet këtu.',
  'These fields make the public jobs page look like a real company page instead of an empty demo.':
    'Këto fusha e bëjnë faqen publike të pozitave të duket si faqe reale kompanie, jo si demo bosh.',
  'These links remain valid until they are accepted or revoked.':
    'Këto linke mbeten valide derisa të pranohen ose anulohen.',
  'These stages mean the application moved beyond initial review toward a hiring decision.':
    'Këto faza tregojnë se aplikimi ka kaluar përtej shqyrtimit fillestar drejt një vendimi punësimi.',
  'This account does not have admin workspace access. You can still manage your job applications here.':
    'Kjo llogari nuk ka qasje në workspace-in e adminit. Aplikimet e tua mund t’i menaxhosh këtu.',
  'This is the candidate starting point: browse roles, open one, and apply only when you are ready.':
    'Kjo është pika e nisjes për kandidatin: shfleto role, hape njërin dhe apliko vetëm kur je gati.',
  'This is the fastest way to understand if the pipeline is balanced or stuck.':
    'Kjo është mënyra më e shpejtë për të kuptuar nëse pipeline është i balancuar apo i bllokuar.',
  'This is the fastest way to understand what is happening right now.':
    'Kjo është mënyra më e shpejtë për të kuptuar çfarë po ndodh tani.',
  'This page is meant to stay simple: just status, role, and progress.':
    'Kjo faqe është menduar të mbetet e thjeshtë: vetëm statusi, roli dhe progresi.',
  'This page shows only the information a candidate actually needs after applying: status, progress, and the role they applied for.':
    'Kjo faqe shfaq vetëm informacionin që kandidati ka nevojë pas aplikimit: statusin, progresin dhe rolin ku ka aplikuar.',
  'This page should be straightforward: filter the pipeline, open a profile, then move the right people forward.':
    'Kjo faqe duhet të jetë e drejtpërdrejtë: filtro pipeline-in, hap një profil dhe shtyj përpara kandidatët e duhur.',
  'This page should feel simple: create a role, publish it when ready, then open it to manage applicants.':
    'Kjo faqe duhet të ndihet e thjeshtë: krijo një rol, publikoje kur është gati, pastaj hape për të menaxhuar aplikantët.',
  'This workspace is still empty': 'Ky workspace është ende bosh',
  'Track every application in one place.': 'Ndiq çdo aplikim në një vend.',
  'Track your status': 'Ndiq statusin tënd',
  'Try another combination of stage, job, or score filters to broaden the list.':
    'Provo një kombinim tjetër të fazës, pozitës ose pikëve për ta zgjeruar listën.',
  'Try another keyword or clear the search to see every role again.':
    'Provo një fjalë tjetër ose pastro kërkimin për t’i parë përsëri të gjitha rolet.',
  'Under 60': 'Nën 60',
  Unscored: 'Pa pikëzim',
  'Unscored candidates': 'Kandidatë pa pikëzim',
  'Unnamed admin': 'Admin pa emër',
  'Unnamed candidate': 'Kandidat pa emër',
  'Unnamed team member': 'Anëtar ekipi pa emër',
  'Unknown job': 'Pozitë e panjohur',
  'Update company': 'Përditëso kompaninë',
  'Upload your CV': 'Ngarko CV-në',
  'Upload your CV and send the application in one simple step.':
    'Ngarko CV-në dhe dërgo aplikimin me një hap të thjeshtë.',
  'Upload your CV and track the status later from your account.':
    'Ngarko CV-në dhe ndiq statusin më vonë nga llogaria jote.',
  'Use one account to apply and track your application status.':
    'Përdor një llogari për të aplikuar dhe për të ndjekur statusin e aplikimit.',
  'Use one clean entry point for applications and hiring workspace access.':
    'Përdor një pikë hyrjeje të pastër për aplikimet dhe qasjen në workspace-in e punësimit.',
  'Use one clean entry point for workspace access and recruiting collaboration.':
    'Përdor një pikë hyrjeje të pastër për qasje në workspace dhe bashkëpunim rekrutimi.',
  'Use search, job, stage, or score to narrow the pipeline fast.':
    'Përdor kërkimin, pozitën, fazën ose pikët për ta ngushtuar pipeline-in shpejt.',
  'Use the actions above to continue or switch account.':
    'Përdor veprimet më sipër për të vazhduar ose për të ndërruar llogari.',
  'Use the invited email address so the workspace can attach your account to the team correctly.':
    'Përdor emailin e ftuar që workspace ta lidhë saktë llogarinë me ekipin.',
  'Use the job page to review applicants, process CVs, and move people forward.':
    'Përdor faqen e pozitës për të shqyrtuar aplikantët, procesuar CV-të dhe shtyrë njerëzit përpara.',
  'Use the secure reset flow when you want to rotate or recover the password for this account.':
    'Përdor rrjedhën e sigurt të rivendosjes kur dëshiron ta ndryshosh ose rikuperosh fjalëkalimin e kësaj llogarie.',
  'Use the same email address that received the invite to join this team workspace.':
    'Përdor të njëjtën adresë emaili që ka marrë ftesën për t’u bashkuar në këtë workspace ekipi.',
  'View all roles': 'Shiko të gjitha rolet',
  'View my applications': 'Shiko aplikimet e mia',
  Visibility: 'Dukshmëria',
  'Waiting for AI processing': 'Në pritje të procesimit me AI',
  'Watch progress': 'Ndiq progresin',
  'Weak match': 'Përputhje e dobët',
  'We will send you a secure link so you can get back into the workspace quickly.':
    'Do të të dërgojmë një link të sigurt që të kthehesh shpejt në workspace.',
  'What needs action': 'Çfarë kërkon veprim',
  'What needs attention': 'Çfarë kërkon vëmendje',
  'What to prepare': 'Çfarë të përgatitësh',
  'Where candidates are now': 'Ku janë kandidatët tani',
  Workspace: 'Hapësira',
  'Workspace access': 'Qasje në workspace',
  'Workspace account': 'Llogaria e workspace-it',
  'Workspace invite': 'Ftesë workspace-i',
  'Workspace invite accepted successfully.': 'Ftesa e workspace-it u pranua me sukses.',
  'Workspace invite email sent successfully.': 'Emaili i ftesës së workspace-it u dërgua me sukses.',
  'Workspace not available yet': 'Workspace ende nuk është i disponueshëm',
  'Workspace not loaded yet': 'Workspace ende nuk është ngarkuar',
  'Workspace profile updated successfully.': 'Profili i workspace-it u përditësua me sukses.',
  'Workspace progress': 'Progresi i workspace-it',
  'Your application is safely stored in the hiring pipeline.':
    'Aplikimi yt është ruajtur në mënyrë të sigurt në pipeline-in e punësimit.',
  'Your application reached the team and is safely inside the pipeline.':
    'Aplikimi yt arriti te ekipi dhe është i sigurt brenda pipeline-it.',
  'Your full name': 'Emri yt i plotë',
  'Your full name and email': 'Emri yt i plotë dhe emaili',
  'Your invite will connect this account to the workspace automatically.':
    'Ftesa jote do ta lidhë automatikisht këtë llogari me workspace-in.',
  'You are already logged in. Continue with this account or log out if you want to switch to another one.':
    'Tashmë je i/e kyçur. Vazhdo me këtë llogari ose dil nëse dëshiron të kalosh në një tjetër.',
  'You can review the role freely. We only ask you to sign in when you are ready to apply.':
    'Mund ta shqyrtosh rolin lirisht. Kërkojmë kyçjen vetëm kur je gati të aplikosh.',
  'You have logged out successfully.': 'Dole nga llogaria me sukses.',
  'You have not submitted any applications yet.': 'Ende nuk ke dërguar asnjë aplikim.',
  'You land inside the hiring team workspace without manual setup.':
    'Hyn në workspace-in e ekipit të punësimit pa konfigurim manual.',
  'You cannot remove your own access from here.': 'Nuk mund ta heqësh qasjen tënde nga këtu.',
  '1. Add candidates': '1. Shto kandidatë',
  '2. Process the queue': '2. Proceso radhën',
  '3. Move stages': '3. Lëviz fazat',
  '1. Read the summary and CV first.': '1. Lexo së pari përmbledhjen dhe CV-në.',
  '2. Decide the next stage and update it.': '2. Vendos fazën tjetër dhe përditësoje.',
  '3. Save a note before moving on.': '3. Ruaj një shënim para se të vazhdosh.',
  'Add candidate': 'Shto kandidat',
  'Add candidate manually': 'Shto kandidat manualisht',
  'AI assessment': 'Vlerësim me AI',
  'AI has not generated a screening summary for this profile yet.':
    'AI ende nuk ka gjeneruar përmbledhje shqyrtimi për këtë profil.',
  'AI processing completed for the current queue.': 'Procesimi me AI u përfundua për radhën aktuale.',
  'Adding candidate...': 'Duke shtuar kandidatin...',
  'Back to candidates': 'Kthehu te kandidatët',
  'Back to jobs': 'Kthehu te pozitat',
  'Best for large batches of CVs that already belong to this role.':
    'Më e mira për grupe të mëdha CV-sh që i përkasin këtij roli.',
  'Best for one candidate at a time when you already have the resume text or recruiter notes.':
    'Më e mira për një kandidat në një kohë kur e ke tekstin e CV-së ose shënimet e rekruterit.',
  'Bulk upload resumes': 'Ngarko CV-të masivisht',
  'Candidate added and analyzed successfully.': 'Kandidati u shtua dhe u analizua me sukses.',
  'Candidate added successfully.': 'Kandidati u shtua me sukses.',
  'Candidate added, but AI analysis was skipped. Review it manually for now.':
    'Kandidati u shtua, por analiza me AI u anashkalua. Për tani shqyrtoje manualisht.',
  'Candidate deleted.': 'Kandidati u fshi.',
  'Candidate email sent successfully.': 'Emaili për kandidatin u dërgua me sukses.',
  'Candidate name': 'Emri i kandidatit',
  'Candidate not found.': 'Kandidati nuk u gjet.',
  'Candidate outreach': 'Komunikimi me kandidatin',
  'Candidate profile': 'Profili i kandidatit',
  'Capture interview impressions, concerns, or evidence for your next stage decision.':
    'Ruaj përshtypjet e intervistës, shqetësimet ose provat për vendimin e fazës tjetër.',
  'Could not analyze candidate.': 'Nuk mund të analizohej kandidati.',
  'Could not copy email draft.': 'Nuk mund të kopjohej drafti i emailit.',
  'Could not create secure resume link.': 'Nuk mund të krijohej linku i sigurt i CV-së.',
  'Could not log you out cleanly': 'Nuk mund të të nxirrnim pastër nga llogaria',
  'Could not process queued candidates.': 'Nuk mund të procesoheshin kandidatët në radhë.',
  'Could not retry failed candidates.': 'Nuk mund të provoheshin përsëri kandidatët e dështuar.',
  'Could not send candidate email.': 'Nuk mund të dërgohej emaili për kandidatin.',
  'Create a new password': 'Krijo fjalëkalim të ri',
  'Delete candidate': 'Fshi kandidatin',
  'Delete this candidate profile?': 'Ta fshij këtë profil kandidati?',
  'Email address': 'Adresa e emailit',
  'Email draft copied.': 'Drafti i emailit u kopjua.',
  'Executive summary': 'Përmbledhje ekzekutive',
  'How to manage this role': 'Si menaxhohet ky rol',
  'How to use this profile': 'Si përdoret ky profil',
  'Import PDF or DOCX files directly into this job. The system now tries to analyze them automatically, and anything left over can still be processed from the queue.':
    'Importo file PDF ose DOCX direkt në këtë pozitë. Sistemi tani provon t’i analizojë automatikisht, ndërsa çdo gjë e mbetur mund të procesohet nga radha.',
  'Internal notes': 'Shënime të brendshme',
  'Interview prompts': 'Pyetje për intervistë',
  'Logged out': 'Dole nga llogaria',
  'Logging you out': 'Duke të nxjerrë nga llogaria',
  'Match score': 'Pikët e përputhjes',
  'No candidates in this stage.': 'Nuk ka kandidatë në këtë fazë.',
  'No internal notes yet. Start documenting the review so the decision trail stays visible.':
    'Ende nuk ka shënime të brendshme. Fillo të dokumentosh shqyrtimin që gjurma e vendimit të mbetet e dukshme.',
  'No interview prompts generated yet.': 'Ende nuk ka pyetje interviste të gjeneruara.',
  'No original resume was uploaded for this candidate.': 'Nuk është ngarkuar CV origjinale për këtë kandidat.',
  'No structured skills yet.': 'Ende nuk ka aftësi të strukturuara.',
  'Not extracted yet': 'Ende nuk është nxjerrë',
  'Not linked to a job': 'Nuk është i lidhur me pozitë',
  'Not processed': 'Nuk është procesuar',
  'Not provided': 'Nuk është dhënë',
  'Open CV': 'Hap CV-në',
  'Open strong candidates or change their stage directly from the board.':
    'Hap kandidatët e fortë ose ndrysho fazën e tyre direkt nga bordi.',
  'Paste resume text or recruiter summary': 'Vendos tekstin e CV-së ose përmbledhjen e rekruterit',
  'Password updated': 'Fjalëkalimi u përditësua',
  'Prepare a clean status update email based on the candidate\'s current pipeline stage.':
    'Përgatit një email të qartë statusi bazuar në fazën aktuale të kandidatit në pipeline.',
  'Preparing your recovery session...': 'Duke përgatitur sesionin e rikuperimit...',
  'Processing state': 'Gjendja e procesimit',
  Processing: 'Procesimi',
  'Recovery link needed': 'Duhet link rikuperimi',
  Refresh: 'Rifresko',
  'Recommended next step: careful rejection review.': 'Hapi i rekomanduar: shqyrtim i kujdesshëm për refuzim.',
  'Recommended next step: interview.': 'Hapi i rekomanduar: intervistë.',
  'Recommended next step: screening review.': 'Hapi i rekomanduar: shqyrtim fillestar.',
  Reviewed: 'Të shqyrtuar',
  'Run AI queue': 'Nise radhën e AI-së',
  'Run AI screening so summaries, skills, and score become visible.':
    'Nise shqyrtimin me AI që përmbledhjet, aftësitë dhe pikët të bëhen të dukshme.',
  'Save note': 'Ruaj shënimin',
  'Saving note...': 'Duke ruajtur shënimin...',
  'Search by name, email or skill': 'Kërko sipas emrit, emailit ose aftësisë',
  'Send email now': 'Dërgo emailin tani',
  'Sending email...': 'Duke dërguar emailin...',
  'Seniority pending': 'Senioriteti në pritje',
  'Skills surfaced': 'Aftësitë e gjetura',
  Source: 'Burimi',
  'Stage control': 'Kontrolli i fazës',
  'Start with queued CVs, then review summaries and move candidates one stage at a time. AI should assist, not replace the final decision.':
    'Fillo me CV-të në radhë, pastaj shqyrto përmbledhjet dhe lëviz kandidatët nga një fazë në tjetrën. AI duhet të ndihmojë, jo ta zëvendësojë vendimin final.',
  Subject: 'Subjekti',
  'The profile may have been deleted or is no longer accessible in this workspace.':
    'Profili mund të jetë fshirë ose nuk është më i qasshëm në këtë workspace.',
  'This candidate does not have an email address yet.': 'Ky kandidat ende nuk ka adresë emaili.',
  'This page works only from a valid password reset email. Request a new reset link if this recovery session has expired.':
    'Kjo faqe funksionon vetëm nga një email valid për rivendosje fjalëkalimi. Kërko një link të ri nëse ky sesion rikuperimi ka skaduar.',
  'Unassigned job': 'Pozitë e pacaktuar',
  'Updating password...': 'Duke përditësuar fjalëkalimin...',
  'Useful for referrals, direct outreach, or importing a profile before the original CV is available. Pasted resume text is analyzed immediately when possible.':
    'E dobishme për rekomandime, komunikim direkt ose importim profili para se CV-ja origjinale të jetë e disponueshme. Teksti i CV-së analizohet menjëherë kur është e mundur.',
  'We are clearing your active session and taking you back to the secure login screen.':
    'Po pastrojmë sesionin aktiv dhe po të kthejmë te ekrani i sigurt i login-it.',
  'Write a structured note for the team...': 'Shkruaj një shënim të strukturuar për ekipin...',
  'Your password has been updated. We are taking you back to the sign-in page now.':
    'Fjalëkalimi yt u përditësua. Tani po të kthejmë te faqja e kyçjes.',
  '1. Check pipeline stage distribution first.': '1. Kontrollo së pari shpërndarjen e fazave të pipeline-it.',
  '2. Look at queued or failed processing before deeper analysis.':
    '2. Shiko procesimet në radhë ose të dështuara para analizës më të thellë.',
  '3. Compare roles only after the top-level signals make sense.':
    '3. Krahaso rolet vetëm pasi sinjalet kryesore të jenë të qarta.',
  '1. Create an invite for the teammate email.': '1. Krijo një ftesë për emailin e anëtarit të ekipit.',
  '2. They sign in with that same email address.': '2. Ata kyçen me të njëjtën adresë emaili.',
  '3. Once accepted, they appear here as an active workspace member.':
    '3. Pasi pranohet ftesa, ata shfaqen këtu si anëtarë aktivë të workspace-it.',
  '1. Set company profile': '1. Vendos profilin e kompanisë',
  '2. Create and publish a job': '2. Krijo dhe publiko një pozitë',
  '3. Review incoming candidates': '3. Shqyrto kandidatët që vijnë',
  'A simpler control panel for hiring: see what needs attention, move faster between jobs and candidates, and keep the important signals visible.':
    'Një panel më i thjeshtë kontrolli për punësim: shiko çfarë kërkon vëmendje, lëviz më shpejt mes pozitave dhe kandidatëve, dhe mbaji sinjalet kryesore të dukshme.',
  'Add company name, website, and tagline so the portal looks real.':
    'Shto emrin e kompanisë, website-in dhe tagline që portali të duket real.',
  'Candidates trust the portal more when the company name and tagline are real.':
    'Kandidatët i besojnë më shumë portalit kur emri i kompanisë dhe tagline janë reale.',
  'Create a secure invite link for a recruiter and share it manually. This keeps the app usable now, even before full email automation is connected.':
    'Krijo një link të sigurt ftese për një rekruter dhe ndaje manualisht. Kjo e mban aplikacionin të përdorshëm edhe para se automatizimi i emailit të lidhet plotësisht.',
  'Do these first': 'Bëji këto së pari',
  'Follow these three steps in order. If the app feels confusing, start here every time.':
    'Ndiqi këta tre hapa me radhë. Nëse aplikacioni duket i paqartë, fillo këtu çdo herë.',
  'Keep this page practical: first understand the pipeline, then check operational issues, then compare jobs.':
    'Mbaje këtë faqe praktike: së pari kupto pipeline-in, pastaj kontrollo problemet operative, pastaj krahaso pozitat.',
  'Look here first if you are not sure what to do next.':
    'Shiko këtu së pari nëse nuk je i sigurt çfarë të bësh më pas.',
  'Manual Entry': 'Hyrje manuale',
  'Bulk Upload': 'Ngarkim masiv',
  'Career Site': 'Faqja e karrierës',
  'Preview public portal': 'Shiko portalin publik',
  'Process CVs, check scores, and move good candidates to the next stage.':
    'Proceso CV-të, kontrollo pikët dhe kalo kandidatët e mirë në fazën tjetër.',
  'Published jobs are the real starting point of the hiring flow.':
    'Pozitat e publikuara janë pika reale e nisjes së rrjedhës së punësimit.',
  'Total profiles tracked': 'Profile gjithsej të ndjekura',
  'Total profiles under review': 'Profile gjithsej në shqyrtim',
  'These are the most important actions for a new workspace. Everything else can wait.':
    'Këto janë veprimet më të rëndësishme për një workspace të ri. Çdo gjë tjetër mund të presë.',
  'Use this table only after the pipeline and queue look healthy.':
    'Përdore këtë tabelë vetëm pasi pipeline-i dhe radha të duken në rregull.',
}

const supplementalTranslations: Record<string, string> = {
  '1. Check status': '1. Kontrollo statusin',
  '2. Watch progress': '2. Ndiq progresin',
  '3. Return only when needed': '3. Kthehu vetëm kur duhet',
  '1. Create role': '1. Krijo rolin',
  '2. Publish role': '2. Publiko rolin',
  '3. Open role': '3. Hap rolin',
  '1. Filter the list': '1. Filtro listën',
  '2. Open a profile': '2. Hap një profil',
  '3. Move the candidate': '3. Lëvize kandidatin',
  '60 and above': '60 e lart',
  '80 and above': '80 e lart',
  'A cleaner list with the most useful information surfaced first.':
    'Një listë më e pastër me informacionin më të dobishëm të shfaqur së pari.',
  'About this hiring team': 'Rreth këtij ekipi punësimi',
  'Access should feel calm and clear for candidates, not like a barrier before they even understand the role.':
    'Qasja duhet të ndihet e qetë dhe e qartë për kandidatët, jo si pengesë para se ta kuptojnë rolin.',
  'Account created. Check your email to verify your account and continue.':
    'Llogaria u krijua. Kontrollo emailin për ta verifikuar llogarinë dhe për të vazhduar.',
  'Add a short note about availability, portfolio, or what makes you a strong fit.':
    'Shto një shënim të shkurtër për disponueshmërinë, portfolion ose pse je përshtatje e fortë.',
  'Add context for the hiring team': 'Shto kontekst për ekipin e punësimit',
  Applicants: 'Aplikantët',
  'Application flow': 'Rrjedha e aplikimit',
  'At least 8 characters': 'Të paktën 8 karaktere',
  'At least one letter': 'Të paktën një shkronjë',
  'At least one number': 'Të paktën një numër',
  Attention: 'Vëmendje',
  'Authentication starts only when applying or entering the internal admin area.':
    'Autentikimi fillon vetëm kur aplikon ose kur hyn në zonën e brendshme të adminit.',
  Availability: 'Disponueshmëria',
  'Back to open roles': 'Kthehu te rolet e hapura',
  'Back to roles': 'Kthehu te rolet',
  Brief: 'Përshkrimi',
  'Building thoughtful software with a small, focused team.':
    'Ndërtojmë software të menduar mirë me një ekip të vogël dhe të fokusuar.',
  'Choose files': 'Zgjidh file-t',
  'City or country': 'Qyteti ose shteti',
  'Cleaner product entry': 'Hyrje më e pastër në produkt',
  'Close toast': 'Mbyll njoftimin',
  'Copy message': 'Kopjo mesazhin',
  'Create a job first. That is the main starting point of the whole workspace.':
    'Krijo një pozitë së pari. Kjo është pika kryesore e nisjes për të gjithë workspace-in.',
  'Create job': 'Krijo pozitë',
  'Create the first invite to turn this into a shared hiring workspace.':
    'Krijo ftesën e parë që ta kthesh këtë në një workspace të përbashkët punësimi.',
  Created: 'Krijuar',
  'Describe responsibilities, must-have skills, experience level, and what success looks like in the role.':
    'Përshkruaj përgjegjësitë, aftësitë e domosdoshme, nivelin e përvojës dhe si duket suksesi në rol.',
  'Drag and drop PDF or DOCX files here. Multiple files are supported.':
    'Tërhiq dhe lësho këtu file PDF ose DOCX. Mbështeten disa file njëkohësisht.',
  'Edit settings': 'Ndrysho cilësimet',
  Expires: 'Skadon',
  'Explain what this person will own.': 'Shpjego çfarë do të mbulojë ky person.',
  'Full name is required.': 'Emri i plotë është i detyrueshëm.',
  'Hide password': 'Fsheh fjalëkalimin',
  'HireSync keeps the public side easy for candidates and the private side focused for the hiring team.':
    'HireSync e mban anën publike të thjeshtë për kandidatët dhe anën private të fokusuar për ekipin e punësimit.',
  'If the role fits, the application is simple: sign in, upload your CV, and submit.':
    'Nëse roli përshtatet, aplikimi është i thjeshtë: kyçu, ngarko CV-në dhe dërgo aplikimin.',
  'Invite teammates only when the workspace is ready to share.':
    'Fto anëtarë ekipi vetëm kur workspace-i është gati për t’u ndarë.',
  'is now in the pipeline. You can track it from your applications page.':
    'tani është në pipeline. Mund ta ndjekësh nga faqja e aplikimeve.',
  'Last sent': 'Dërguar së fundi',
  'Last sign in': 'Kyçja e fundit',
  'List the must-have skills and level.': 'Shëno aftësitë e domosdoshme dhe nivelin.',
  'Minimum 30 characters. A clearer brief gives better AI summaries and a cleaner pipeline.':
    'Minimumi 30 karaktere. Një përshkrim më i qartë jep përmbledhje më të mira nga AI dhe pipeline më të pastër.',
  'Move to': 'Kalo në',
  'Move to draft': 'Kthe në draft',
  'My applications': 'Aplikimet e mia',
  'New password': 'Fjalëkalimi i ri',
  'No candidate records were created.': 'Nuk u krijua asnjë rekord kandidati.',
  'No candidates yet': 'Ende nuk ka kandidatët',
  'No explicit red flags were returned by the model.':
    'Modeli nuk ktheu sinjale të qarta rreziku.',
  'No jobs yet': 'Ende nuk ka pozita',
  'Not found': 'Nuk u gjet',
  'Note added.': 'Shënimi u shtua.',
  'Once accepted, the workspace access is attached automatically.':
    'Pasi pranohet, qasja në workspace lidhet automatikisht.',
  'Once applications arrive, this area becomes the fastest way to open the right profile.':
    'Kur të vijnë aplikimet, kjo zonë bëhet mënyra më e shpejtë për të hapur profilin e duhur.',
  'Open admin workspace': 'Hap workspace-in e adminit',
  'Open Jobs and create or publish a role.': 'Hap Pozitat dhe krijo ose publiko një rol.',
  'Open opportunities': 'Mundësi të hapura',
  'Open opportunity': 'Hap mundësinë',
  'Open roles remain public. Sign in is only for applying, tracking applications, or entering the hiring workspace.':
    'Rolet e hapura mbeten publike. Kyçja është vetëm për aplikim, ndjekje të aplikimeve ose hyrje në workspace-in e punësimit.',
  'Partial match': 'Përputhje e pjesshme',
  'Password must include at least one letter.': 'Fjalëkalimi duhet të ketë të paktën një shkronjë.',
  'Password must include at least one number.': 'Fjalëkalimi duhet të ketë të paktën një numër.',
  'Password updated successfully. You can sign in with your new password.':
    'Fjalëkalimi u përditësua me sukses. Mund të kyçesh me fjalëkalimin e ri.',
  "Passwords don't match.": 'Fjalëkalimet nuk përputhen.',
  'PDF / DOCX / max 5 MB each': 'PDF / DOCX / maksimumi 5 MB secili',
  'PDF or DOCX only, maximum 5 MB': 'Vetëm PDF ose DOCX, maksimumi 5 MB',
  'Please upload only PDF or DOCX files.': 'Ju lutem ngarkoni vetëm file PDF ose DOCX.',
  Posted: 'Publikuar',
  'Processing...': 'Duke procesuar...',
  'Publish only when the role is ready to be visible on the public jobs page.':
    'Publiko vetëm kur roli është gati të shfaqet në faqen publike të pozitave.',
  'Read the AI summary, skills, red flags, and resume in one place.':
    'Lexo përmbledhjen nga AI, aftësitë, sinjalet e rrezikut dhe CV-në në një vend.',
  'Read the role first and decide if it fits.': 'Lexo rolin së pari dhe vendos nëse përshtatet.',
  'Read the role, sign in only when needed, then apply and track progress.':
    'Lexo rolin, kyçu vetëm kur duhet, pastaj apliko dhe ndiq progresin.',
  Ready: 'Gati',
  'Refine profile': 'Përmirëso profilin',
  'Retry failed': 'Riprovo të dështuara',
  'Retry or review failed candidate analysis.':
    'Riprovo ose shqyrto analizat e dështuara të kandidatëve.',
  'Risk signals': 'Sinjalet e rrezikut',
  'Salary expectation': 'Pritshmëria e pagës',
  'Save new password': 'Ruaj fjalëkalimin e ri',
  'Say what you want to confirm in interviews.':
    'Shëno çfarë dëshiron të konfirmosh në intervista.',
  'Senior Product Designer': 'Senior Product Designer',
  Seniority: 'Senioriteti',
  'Set the company name shown on public job pages.':
    'Vendos emrin e kompanisë që shfaqet në faqet publike të pozitave.',
  'Show password': 'Shfaq fjalëkalimin',
  'Sign in is only required for applying and tracking your status. Open roles remain public so candidates can explore first.':
    'Kyçja kërkohet vetëm për aplikim dhe ndjekje të statusit. Rolet e hapura mbeten publike që kandidatët të eksplorojnë së pari.',
  Signals: 'Sinjalet',
  'Signed in': 'I/e kyçur',
  'Simple hiring flow': 'Rrjedhë e thjeshtë punësimi',
  'Something went wrong.': 'Diçka shkoi keq.',
  'Start with the role, not the login screen.': 'Fillo me rolin, jo me ekranin e login-it.',
  'Strong match': 'Përputhje e fortë',
  'Team member': 'Anëtar ekipi',
  'Team members should not need manual setup. The workspace invite connects the account after sign in or sign up with the correct email.':
    'Anëtarët e ekipit nuk duhet të kenë nevojë për konfigurim manual. Ftesa e workspace-it e lidh llogarinë pas kyçjes ose regjistrimit me emailin e saktë.',
  'That page is not available.': 'Ajo faqe nuk është e disponueshme.',
  'The application panel on the right is the only place where the candidate needs to act.':
    'Paneli i aplikimit në të djathtë është vendi i vetëm ku kandidati duhet të veprojë.',
  'The role may have been removed, or the link no longer points to an active page in the workspace.':
    'Roli mund të jetë hequr, ose linku nuk çon më te një faqe aktive në workspace.',
  'This page is meant to help you understand the role before you decide to apply.':
    'Kjo faqe është për të të ndihmuar ta kuptosh rolin para se të vendosësh të aplikosh.',
  'This page is the candidate starting point: browse roles, open one, and apply only when you are ready.':
    'Kjo faqe është pika e nisjes për kandidatin: shfleto rolet, hape njërin dhe apliko vetëm kur je gati.',
  'Track the status later from your applications page.':
    'Ndiq statusin më vonë nga faqja e aplikimeve.',
  Unknown: 'E panjohur',
  'Unknown processing error': 'Gabim i panjohur procesimi',
  'Uploading...': 'Duke ngarkuar...',
  'Use a secure password so you can return to the hiring workspace or your applications without friction.':
    'Përdor një fjalëkalim të sigurt që të kthehesh në workspace-in e punësimit ose te aplikimet pa pengesa.',
  'Use bulk upload for CV files or add one profile manually.':
    'Përdor ngarkimin masiv për file CV ose shto një profil manualisht.',
  'Use the workspace in three steps.': 'Përdore workspace-in në tre hapa.',
  User: 'Përdorues',
  'View all roles': 'Shiko të gjitha rolet',
  'View my applications': 'Shiko aplikimet e mia',
  'Visit company website': 'Vizito website-in e kompanisë',
  'When you create invite links, they will appear here with copy and revoke actions.':
    'Kur krijon linke ftese, ato do të shfaqen këtu me veprime për kopjim dhe anulim.',
  'Why sign in here': 'Pse të kyçesh këtu',
  'Work email': 'Emaili i punës',
  'Write the title and a clear brief. The job starts private by default.':
    'Shkruaj titullin dhe një përshkrim të qartë. Pozita nis private si parazgjedhje.',
  'Your application': 'Aplikimi yt',
  'Anyone can read roles before creating an account or sharing personal details.':
    'Çdokush mund t’i lexojë rolet para se të krijojë llogari ose të ndajë të dhëna personale.',
  'Sign in, upload a CV, and send a simple application without extra friction.':
    'Kyçu, ngarko CV-në dhe dërgo një aplikim të thjeshtë pa pengesa shtesë.',
  'Create roles, review candidates, and keep the pipeline in one private workspace.':
    'Krijo role, shqyrto kandidatët dhe mbaje pipeline-in në një workspace privat.',
  Apply: 'Apliko',
  Browse: 'Shfleto',
  'Browse roles first, then sign in only when you are ready to apply.':
    'Shfleto rolet së pari, pastaj kyçu vetëm kur je gati të aplikosh.',
  'Demo flow': 'Rrjedha e demos',
  'For the final demo, this is the clean path: prepare the company, publish a role, then review candidates.':
    'Për demon finale, kjo është rruga e pastër: përgatit kompaninë, publiko një rol, pastaj shqyrto kandidatët.',
  'Recommended workspace flow': 'Rrjedha e rekomanduar e workspace-it',
  'Review role': 'Shqyrto rolin',
  Track: 'Ndiq',
  'Reading job details stays public so the first step feels simple.':
    'Leximi i detajeve të pozitës mbetet publik që hapi i parë të ndihet i thjeshtë.',
  'Sign in only at the moment you want to upload your CV.':
    'Kyçu vetëm në momentin kur dëshiron të ngarkosh CV-në.',
  'Roles live now': 'Role aktive tani',
  'A modern hiring workspace for jobs, candidate review, AI-assisted screening, and team collaboration.':
    'Një workspace modern për pozita, shqyrtim kandidatësh, screening me ndihmë të AI-së dhe bashkëpunim ekipi.',
  'Candidates continue to roles and applications.': 'Kandidatët vazhdojnë te rolet dhe aplikimet.',
  'Could not send workspace invite.': 'Nuk mund të dërgohej ftesa e workspace-it.',
  'Hiring Team': 'Ekipi i punësimit',
  'HireSync user': 'Përdorues HireSync',
  'not started': 'ende pa filluar',
  'Prepare a clean status update email based on the candidate&apos;s current pipeline stage.':
    'Përgatit një email të qartë statusi bazuar në fazën aktuale të kandidatit në pipeline.',
  'This account does not have admin workspace access. You can still manage your job applications here.':
    'Kjo llogari nuk ka qasje në workspace-in e adminit. Mund t’i menaxhosh ende aplikimet e tua këtu.',
  'The team invite could not be completed. Make sure you signed in with the same email address that received the invite.':
    'Ftesa e ekipit nuk mund të përfundohej. Sigurohu që je kyçur me të njëjtën adresë emaili që e ka pranuar ftesën.',
  'This role is published from a structured hiring workspace designed to keep the application process clear and professional.':
    'Ky rol është publikuar nga një workspace i strukturuar punësimi, i ndërtuar për ta mbajtur procesin e aplikimit të qartë dhe profesional.',
  'Upload failed': 'Ngarkimi dështoi',
  'Upload your CV': 'Ngarko CV-në',
  'Upload your CV and track the status from your account later.':
    'Ngarko CV-në dhe ndiq statusin më vonë nga llogaria jote.',
  'Upload your CV and track the status later from your account.':
    'Ngarko CV-në dhe ndiq statusin më vonë nga llogaria jote.',
  'User session not found.': 'Sesioni i përdoruesit nuk u gjet.',
  'A focused control room for the hiring workflow: jobs, candidates, queue health, and recent activity.':
    'Një qendër kontrolli e fokusuar për rrjedhën e punësimit: pozita, kandidatë, shëndeti i radhës dhe aktiviteti i fundit.',
  'Across all roles': 'Në të gjitha rolet',
  Action: 'Veprim',
  Actions: 'Veprimet',
  'Active review': 'Shqyrtim aktiv',
  'AI processing': 'Procesimi me AI',
  All: 'Të gjitha',
  'All profiles': 'Të gjitha profilet',
  'All roles': 'Të gjitha rolet',
  Company: 'Kompania',
  'Applications will appear here once candidates apply.':
    'Aplikimet do të shfaqen këtu pasi kandidatët të aplikojnë.',
  Candidate: 'Kandidati',
  'Create a role to start the hiring workflow.': 'Krijo një rol për ta nisur rrjedhën e punësimit.',
  'Create as draft, then publish when ready.': 'Krijoje si draft, pastaj publikoje kur të jetë gati.',
  'Create the first role to start receiving candidates.':
    'Krijo rolin e parë për të filluar pranimin e kandidatëve.',
  'Create, publish, and manage roles from one table-first workspace.':
    'Krijo, publiko dhe menaxho role nga një workspace i ndërtuar rreth tabelës.',
  'Creating...': 'Duke krijuar...',
  Drafts: 'Draftet',
  'Filter, compare, and open candidate profiles from one table.':
    'Filtro, krahaso dhe hap profile kandidatësh nga një tabelë e vetme.',
  'Filtered view': 'Pamje e filtruar',
  'Live roles': 'Role aktive',
  'Needs attention': 'Kërkon vëmendje',
  'New role': 'Rol i ri',
  'No roles match this search': 'Asnjë rol nuk përputhet me këtë kërkim',
  'No roles yet': 'Ende nuk ka role',
  'Not started': 'Ende pa filluar',
  'Pipeline distribution': 'Shpërndarja e pipeline-it',
  'Private roles': 'Role private',
  'Recent candidates': 'Kandidatët e fundit',
  Score: 'Pikët',
  'Screening to final': 'Nga screening deri në finale',
  'Search candidates': 'Kërko kandidatë',
  'Search roles': 'Kërko role',
  Stage: 'Faza',
  'Total profiles': 'Profile gjithsej',
  'Try another keyword or clear the search.': 'Provo një fjalë tjetër ose pastro kërkimin.',
  'Try another stage, job, score, or search keyword.':
    'Provo një fazë, pozitë, pikëzim ose fjalë kërkimi tjetër.',
  'Visible to candidates': 'Të dukshme për kandidatët',
  'Waiting for processing': 'Në pritje të procesimit',
}

const allTranslations: Record<string, string> = {
  ...exactTranslations,
  ...supplementalTranslations,
}

const reverseTranslations = Object.fromEntries(
  Object.entries(allTranslations).map(([english, albanian]) => [normalizeI18nText(albanian), english])
) as Record<string, string>

const translationRules: TranslationRule[] = [
  {
    en: /^(\d+) result\(s\)$/,
    sq: /^(\d+) rezultat\(e\)$/,
    toSq: ([, count]) => `${count} rezultat(e)`,
    toEn: ([, count]) => `${count} result(s)`,
  },
  {
    en: /^(\d+) candidate\(s\)$/,
    sq: /^(\d+) kandidat\(ë\)$/,
    toSq: ([, count]) => `${count} kandidat(ë)`,
    toEn: ([, count]) => `${count} candidate(s)`,
  },
  {
    en: /^Created: (\d+) candidate\(s\)\.$/,
    sq: /^Krijuar: (\d+) kandidat\(ë\)\.$/,
    toSq: ([, count]) => `Krijuar: ${count} kandidat(ë).`,
    toEn: ([, count]) => `Created: ${count} candidate(s).`,
  },
  {
    en: /^Analyzed automatically: (\d+)\.$/,
    sq: /^Analizuar automatikisht: (\d+)\.$/,
    toSq: ([, count]) => `Analizuar automatikisht: ${count}.`,
    toEn: ([, count]) => `Analyzed automatically: ${count}.`,
  },
  {
    en: /^Still queued: (\d+)\.$/,
    sq: /^Ende në radhë: (\d+)\.$/,
    toSq: ([, count]) => `Ende në radhë: ${count}.`,
    toEn: ([, count]) => `Still queued: ${count}.`,
  },
  {
    en: /^Skipped: (.+)$/,
    sq: /^Anashkaluar: (.+)$/,
    toSq: ([, reason]) => `Anashkaluar: ${reason}`,
    toEn: ([, reason]) => `Skipped: ${reason}`,
  },
  {
    en: /^Processing issue: (.+)$/,
    sq: /^Problem procesimi: (.+)$/,
    toSq: ([, reason]) => `Problem procesimi: ${reason}`,
    toEn: ([, reason]) => `Processing issue: ${reason}`,
  },
  {
    en: /^(\d+) candidate\(s\) match the current filters$/,
    sq: /^(\d+) kandidat\(ë\) përputhen me filtrat aktualë$/,
    toSq: ([, count]) => `${count} kandidat(ë) përputhen me filtrat aktualë`,
    toEn: ([, count]) => `${count} candidate(s) match the current filters`,
  },
  {
    en: /^(\d+) candidates$/,
    sq: /^(\d+) kandidatë$/,
    toSq: ([, count]) => `${count} kandidatë`,
    toEn: ([, count]) => `${count} candidates`,
  },
  {
    en: /^(\d+) candidates have notes$/,
    sq: /^(\d+) kandidatë kanë shënime$/,
    toSq: ([, count]) => `${count} kandidatë kanë shënime`,
    toEn: ([, count]) => `${count} candidates have notes`,
  },
  {
    en: /^(\d+) candidate\(s\) \| (\d+)%$/,
    sq: /^(\d+) kandidat\(ë\) \| (\d+)%$/,
    toSq: ([, count, percentage]) => `${count} kandidat(ë) | ${percentage}%`,
    toEn: ([, count, percentage]) => `${count} candidate(s) | ${percentage}%`,
  },
  {
    en: /^Manual Entry: (\d+)$/,
    sq: /^Hyrje manuale: (\d+)$/,
    toSq: ([, count]) => `Hyrje manuale: ${count}`,
    toEn: ([, count]) => `Manual Entry: ${count}`,
  },
  {
    en: /^Bulk Upload: (\d+)$/,
    sq: /^Ngarkim masiv: (\d+)$/,
    toSq: ([, count]) => `Ngarkim masiv: ${count}`,
    toEn: ([, count]) => `Bulk Upload: ${count}`,
  },
  {
    en: /^Career Site: (\d+)$/,
    sq: /^Faqja e karrierës: (\d+)$/,
    toSq: ([, count]) => `Faqja e karrierës: ${count}`,
    toEn: ([, count]) => `Career Site: ${count}`,
  },
  {
    en: /^(\d+) draft job\(s\) still private$/,
    sq: /^(\d+) pozitë\(a\) draft ende private$/,
    toSq: ([, count]) => `${count} pozitë(a) draft ende private`,
    toEn: ([, count]) => `${count} draft job(s) still private`,
  },
  {
    en: /^(\d+) published job\(s\) visible to candidates\.$/,
    sq: /^(\d+) pozitë\(a\) të publikuara të dukshme për kandidatët\.$/,
    toSq: ([, count]) => `${count} pozitë(a) të publikuara të dukshme për kandidatët.`,
    toEn: ([, count]) => `${count} published job(s) visible to candidates.`,
  },
  {
    en: /^(\d+) progressed$/,
    sq: /^(\d+) të avancuar$/,
    toSq: ([, count]) => `${count} të avancuar`,
    toEn: ([, count]) => `${count} progressed`,
  },
  {
    en: /^(\d+) queued$/,
    sq: /^(\d+) në radhë$/,
    toSq: ([, count]) => `${count} në radhë`,
    toEn: ([, count]) => `${count} queued`,
  },
  {
    en: /^(\d+)\/(\d+) ready$/,
    sq: /^(\d+)\/(\d+) gati$/,
    toSq: ([, ready, total]) => `${ready}/${total} gati`,
    toEn: ([, ready, total]) => `${ready}/${total} ready`,
  },
  {
    en: /^Created (.+)$/,
    sq: /^Krijuar (.+)$/,
    toSq: ([, date]) => `Krijuar ${date}`,
    toEn: ([, date]) => `Created ${date}`,
  },
  {
    en: /^Posted (.+)$/,
    sq: /^Publikuar (.+)$/,
    toSq: ([, date]) => `Publikuar ${date}`,
    toEn: ([, date]) => `Posted ${date}`,
  },
  {
    en: /^Joined (.+)$/,
    sq: /^U bashkua (.+)$/,
    toSq: ([, date]) => `U bashkua ${date}`,
    toEn: ([, date]) => `Joined ${date}`,
  },
  {
    en: /^Applied (.+)$/,
    sq: /^Aplikuar (.+)$/,
    toSq: ([, date]) => `Aplikuar ${date}`,
    toEn: ([, date]) => `Applied ${date}`,
  },
  {
    en: /^Expires (.+)$/,
    sq: /^Skadon (.+)$/,
    toSq: ([, date]) => `Skadon ${date}`,
    toEn: ([, date]) => `Expires ${date}`,
  },
  {
    en: /^Last sent (.+)$/,
    sq: /^Dërguar së fundi (.+)$/,
    toSq: ([, date]) => `Dërguar së fundi ${date}`,
    toEn: ([, date]) => `Last sent ${date}`,
  },
  {
    en: /^Last note activity was on (.+)\.$/,
    sq: /^Aktiviteti i fundit i shënimeve ishte më (.+)\.$/,
    toSq: ([, date]) => `Aktiviteti i fundit i shënimeve ishte më ${date}.`,
    toEn: ([, date]) => `Last note activity was on ${date}.`,
  },
  {
    en: /^Last note activity: (.+)$/,
    sq: /^Aktiviteti i fundit i shënimeve: (.+)$/,
    toSq: ([, date]) => `Aktiviteti i fundit i shënimeve: ${date}`,
    toEn: ([, date]) => `Last note activity: ${date}`,
  },
  {
    en: /^(.+) session active$/,
    sq: /^Sesioni (.+) është aktiv$/,
    toSq: ([, role]) => `Sesioni ${translateText(role, 'sq')} është aktiv`,
    toEn: ([, role]) => `${translateText(role, 'en')} session active`,
  },
  {
    en: /^Processing: (.+)$/,
    sq: /^Procesimi: (.+)$/,
    toSq: ([, status]) => `Procesimi: ${translateText(status, 'sq')}`,
    toEn: ([, status]) => `Processing: ${translateText(status, 'en')}`,
  },
  {
    en: /^Move to (.+)$/,
    sq: /^Kalo në (.+)$/,
    toSq: ([, stage]) => `Kalo në ${translateText(stage, 'sq')}`,
    toEn: ([, stage]) => `Move to ${translateText(stage, 'en')}`,
  },
  {
    en: /^Candidate moved to (.+)\.$/,
    sq: /^Kandidati kaloi në (.+)\.$/,
    toSq: ([, stage]) => `Kandidati kaloi në ${translateText(stage, 'sq')}.`,
    toEn: ([, stage]) => `Candidate moved to ${translateText(stage, 'en')}.`,
  },
  {
    en: /^(\d+) failed candidate\(s\) moved back to queue\.$/,
    sq: /^(\d+) kandidat\(ë\) të dështuar u kthyen në radhë\.$/,
    toSq: ([, count]) => `${count} kandidat(ë) të dështuar u kthyen në radhë.`,
    toEn: ([, count]) => `${count} failed candidate(s) moved back to queue.`,
  },
]

function withOriginalSpacing(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? ''
  const trailing = source.match(/\s*$/)?.[0] ?? ''
  return `${leading}${translated}${trailing}`
}

function translateNormalizedText(normalized: string, language: Language) {
  const exact = language === 'sq' ? allTranslations[normalized] : reverseTranslations[normalized]
  if (exact) return exact

  for (const rule of translationRules) {
    const match = normalized.match(language === 'sq' ? rule.en : rule.sq)
    if (match) return language === 'sq' ? rule.toSq(match) : rule.toEn(match)
  }

  return null
}

export function translateText(value: string, language: Language) {
  const normalized = normalizeI18nText(value)
  if (!normalized) return value

  const translated = translateNormalizedText(normalized, language)
  return translated ? withOriginalSpacing(value, translated) : value
}
