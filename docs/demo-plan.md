# HireSync AI Demo Plan

## 1. Project Summary

**Project:** HireSync AI  
**What it is:** A candidate-first hiring platform with a public job portal and a private admin workspace for recruitment teams.  
**Who it serves:** Companies and hiring teams that want a simpler way to publish jobs, receive many applications, and use AI to help screen and organize candidates faster.

**Live URL:** https://hire-sync-ai-nine.vercel.app  
**Live status:** Verified with HTTP `200` on April 24, 2026.

## 2. Main Demo Flow (5-7 Minutes)

### 0:00 - 0:45 | Problem and value
- Explain the problem: companies lose time reviewing CVs manually, tracking applicants in scattered places, and moving candidates through the pipeline.
- Present the solution: HireSync AI combines public applications, AI-assisted screening, pipeline management, analytics, and team collaboration in one workspace.

### 0:45 - 1:45 | Public candidate experience
- Open the landing page and explain the candidate-first approach.
- Go to `/jobs` and show that open roles are public.
- Open one published job and show the application panel.
- Explain that candidates can browse first and sign in only when they are ready to apply.

### 1:45 - 2:30 | Candidate follow-up view
- Open `/applications`.
- Show how a candidate can track application status without seeing internal admin details.
- Point out the stage progress and processing status.

### 2:30 - 4:30 | Admin workspace core flow
- Open `/admin` and show the dashboard overview.
- Open `/admin/jobs` and show draft vs published jobs.
- Open one job detail page and explain:
  - bulk upload or manual candidate entry
  - AI processing queue
  - retry flow for failed processing
  - grouped pipeline stages
- Open `/admin/candidates` or one candidate detail page and show:
  - score
  - skills / summary / red flags
  - interview questions
  - notes and outreach actions

### 4:30 - 5:30 | Team and reporting
- Open `/admin/team` and show workspace-based team invites.
- Open `/admin/analytics` and show the simplified hiring metrics.
- Explain that the app is designed for a real company workspace, not just a single-user demo.

### 5:30 - 6:30 | Short technical explanation
- Explain that the app is built with Next.js App Router.
- Explain that Supabase handles authentication, database, storage, and row-level security.
- Explain that AI processing reads CV content, compares it to the job, and returns scoring and structured review data.
- Explain that the project now uses a workspace model so jobs, candidates, notes, and team access stay scoped correctly.

### 6:30 - 7:00 | Close
- Repeat the core value: less manual screening, clearer pipeline visibility, and a more professional experience for both candidates and hiring teams.

## 3. Technical Parts To Explain Briefly

- Public portal and admin workspace are separated so the product is easier to understand for both user types.
- Supabase Auth + RLS protect admin data and keep candidate access limited to their own application data.
- Workspace tables support company/team structure instead of a fragile single-admin setup.
- AI screening pipeline processes queued candidates and stores score, skills, summary, red flags, and interview questions.
- Deployment is on Vercel, with the app using environment variables for Supabase, OpenRouter, and optional email delivery.

## 4. What I Checked Before The Demo

### Already checked
- `README.md` updated to reflect the current version of the app.
- `docs/demo-plan.md` prepared with a concrete presentation flow.
- Live URL responds successfully: `https://hire-sync-ai-nine.vercel.app` returned HTTP `200` on April 24, 2026.
- Local quality checks:
  - `npm run lint`
  - `npm run build`

### To confirm again right before presenting
- One published job exists on the live app.
- At least one candidate application exists for the demo.
- Admin account can sign in successfully.
- Candidate account can sign in successfully.
- Workspace settings show company name / website / tagline.
- The main admin pages load without missing data states.

## 5. Plan B If The Live Demo Fails

1. Use the local project with `npm run dev`.
2. Present the same flow in the same order using local data.
3. If authentication or network is unstable, show prepared screenshots of:
   - landing page
   - jobs page
   - admin dashboard
   - candidate detail page
   - analytics page
4. Continue explaining the architecture and value using the UI and code structure instead of waiting on the live app.

## 6. Presenter Notes

- Keep the demo focused on one strong story, not every feature.
- Avoid spending too much time on setup details or SQL.
- Show one public flow and one admin flow clearly.
- When discussing AI, present it as decision support, not full automation.
