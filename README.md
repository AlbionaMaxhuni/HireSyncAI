# HireSync AI

HireSync AI is a full-stack recruitment assistant built to help recruiters create jobs, upload resumes, process candidates with AI, and review ranked results in one workspace.

## Live Demo

Live URL: https://hire-sync-ai-nine.vercel.app

## What The Project Does

The app supports this recruiter flow:

1. Sign in securely with Supabase Auth.
2. Create a job with title and description.
3. Upload multiple PDF or DOCX resumes.
4. Queue and process candidates through AI analysis.
5. Review candidate score, red flags, interview questions, and shortlist status.

## Main Features

- Recruiter authentication with protected routes
- Job creation and job-based candidate management
- Bulk resume upload to Supabase Storage
- Resume parsing for PDF and DOCX files
- AI-based candidate scoring and interview question generation
- Candidate leaderboard with processing states
- Retry flow for failed candidate processing

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: Next.js Route Handlers
- Database/Auth/Storage: Supabase
- AI Integration: OpenRouter
- Deployment: Vercel

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

3. Create a `.env.local` file and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. Run the development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`

## Required Environment Variables

These variables are required for local development and deployment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`

The API routes already return clear error responses when critical environment variables are missing.

## Debug, Review & Hardening Pass

This project was improved with a focused review pass covering bug fixing, UX feedback, cleanup, and documentation.

### 1. Bug Fixed

- Fixed the failed-candidate retry flow.
- The `retry-failed` API route now correctly validates the job, finds failed candidates for that job, moves them back to `queued`, and clears the previous processing error.

### 2. UX / Feedback Improved

- Improved feedback on the job detail page by adding a visible `Retry failed` action.
- Updated the processing message so it matches the real behavior: queue processing runs automatically until the queue is empty.
- Existing loading/disabled states continue to reduce duplicate submits during processing.

### 3. Refactor / Cleanup

- Replaced several unsafe `any` usages with safer typing.
- Added small reusable error-message helpers to simplify repeated error handling.
- Improved parser typing and cleanup in the resume parsing flow.
- Cleaned up smaller lint issues so the project now passes `npm run lint`.

### 4. README Update

- Rewrote the README for clearer setup instructions, environment variables, project overview, and review-pass summary.

## Quality Notes

The project now includes handling for several edge cases:

- unauthenticated users are redirected to login
- failed requests show user-facing feedback
- missing database data is handled with safe fallbacks in multiple pages
- missing environment variables return explicit API errors
- failed candidate processing can be retried from the UI

## Verification

```bash
npm run lint
```

Lint passes after the latest cleanup.
