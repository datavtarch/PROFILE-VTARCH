---
name: vercel-deploy
description: Prepare and verify deployment from GitHub to Vercel for the task manager. Use when adding deployment files, environment variables, build configuration, GitHub/Vercel setup notes, or debugging Vercel build/runtime issues.
---

# Vercel Deploy

Keep deployment boring: build locally, document env vars, and avoid leaking secrets.

## Workflow

1. Read `/docs/architecture.md` and `/docs/deploy-guide.md`.
2. Confirm the app builds with the same command Vercel will run.
3. Keep `.env.example` current with variable names only.
4. Confirm `.env.local` and real secrets are ignored by git.
5. For API/webhook routes, confirm server-only variables are not imported by client components.
6. Run `scripts/predeploy-check.ps1 -Root <repo-root>` before deploy handoff.

## Automation

Use `scripts/predeploy-check.ps1` to check common Vercel/Supabase deployment readiness.
