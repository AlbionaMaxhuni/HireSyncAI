# HireSync AI

HireSync AI is a full-stack hiring platform that combines a public candidate experience with a private admin workspace for recruiters. The goal is to reduce manual CV screening, keep the hiring pipeline organized, and make the product feel polished for both candidates and companies.

## Live Demo

- Live URL: https://hire-sync-ai-nine.vercel.app
- Verified responding with HTTP `200` on April 24, 2026

## What The Project Does

The app supports two connected flows:

### Candidate flow

1. Browse published jobs without creating an account first.
2. Open a job detail page and apply with a CV.
3. Sign in only when needed.
4. Track application status from a simple `/applications` view.

### Hiring team flow

1. Sign in to a private admin workspace.
2. Create jobs and keep them as `draft` or `published`.
3. Add candidates through public applications, manual entry, or bulk upload.
4. Run AI processing on queued candidates.
5. Review score, skills, summary, red flags, interview questions, notes, and pipeline stage.
6. Manage team access and view lightweight hiring analytics.

## Current Product Scope

- Public landing page and public jobs portal
- Candidate application flow and application tracking page
- Workspace-based admin dashboard
- Job management with `draft / published / archived` states
- Candidate management, filtering, notes, and stage updates
- AI-assisted resume screening
- Queue processing and retry flow for failed analysis
- Workspace team invites
- Candidate and team outreach helpers
- Analytics overview for jobs, notes, and candidate stages

## Tech Stack

- Frontend: Next.js App Router, React, Tailwind CSS
- Backend: Next.js Route Handlers
- Database/Auth/Storage: Supabase
- AI Integration: OpenRouter
- Optional Email Delivery: Resend
- Deployment: Vercel

## Database And Security Notes

The project now uses a workspace-based structure instead of a single-admin model.

- `workspaces`, `workspace_members`, and `workspace_invites` support team access
- `jobs`, `candidates`, and `candidate_notes` are linked to a workspace
- Supabase Row Level Security is used to scope access correctly
- `profiles` stores the canonical app role and basic identity data

Relevant migrations live in [`supabase/migrations`](supabase/migrations):

- [`20260423_hiresync_database_foundation.sql`](supabase/migrations/20260423_hiresync_database_foundation.sql)
- [`20260423_hiresync_company_profile.sql`](supabase/migrations/20260423_hiresync_company_profile.sql)
- [`20260423_hiresync_workspace_foundation.sql`](supabase/migrations/20260423_hiresync_workspace_foundation.sql)
- [`20260424_hiresync_email_delivery.sql`](supabase/migrations/20260424_hiresync_email_delivery.sql)

## Local Setup

1. Clone the repository:

```bash
git clone https://github.com/AlbionaMaxhuni/HireSyncAI.git
cd HireSyncAI
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="HireSync AI <noreply@your-domain.com>"
```

4. Apply the Supabase migrations in `supabase/migrations`.

5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`

## Environment Variables

### Required

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`

### Optional

- `RESEND_API_KEY`
- `EMAIL_FROM`

If the optional email variables are missing, the app can still be used with the manual draft/copy communication flow.

## Demo Preparation

The demo plan for the final presentation is in [`docs/demo-plan.md`](docs/demo-plan.md).

Recommended routes for the presentation:

- `/`
- `/jobs`
- `/applications`
- `/admin`
- `/admin/jobs`
- `/admin/candidates`
- `/admin/team`
- `/admin/analytics`

## Verification

Commands used during the latest readiness pass:

```bash
npm run lint
npm run build
```

The live deployment URL was also checked and returned HTTP `200` on April 24, 2026.
