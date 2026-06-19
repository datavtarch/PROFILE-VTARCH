---
name: bug-fixing
description: Diagnose, fix, and verify bugs in the task manager. Use when the user reports errors, broken flows, failed builds, failed deploys, auth issues, Supabase policy errors, Telegram report issues, or UI regressions.
---

# Bug Fixing

Fix the smallest verified cause and prove the behavior works again.

## Workflow

1. Reproduce or inspect the failure from logs, screenshots, tests, or user steps.
2. Identify the likely layer: UI, auth, database/RLS, API route, deploy config, or Telegram.
3. Read the relevant `/docs` file before changing behavior.
4. Make the narrowest code change that addresses the cause.
5. Run the smallest meaningful verification first, then broader checks if risk is higher.
6. If the bug exposes a missing rule, update the relevant doc or checklist.
7. In the final report, state cause, fix, and verification.
