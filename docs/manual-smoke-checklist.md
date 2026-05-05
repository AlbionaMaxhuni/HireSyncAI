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
