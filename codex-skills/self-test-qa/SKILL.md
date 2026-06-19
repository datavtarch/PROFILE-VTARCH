---
name: self-test-qa
description: Run focused self-checks before declaring work complete. Use after implementing features, fixing bugs, changing UI, changing Supabase access, editing deployment config, or preparing a commit/PR.
---

# Self-Test QA

Verify the changed behavior, not just that files were edited.

## Workflow

1. Read `/docs/test-checklist.md`.
2. Identify which user flows changed.
3. Run local checks available in the repo:
   - install/build/lint/test commands from package scripts when present
   - `scripts/check-project.ps1` for baseline project hygiene
4. For auth or data changes, include data isolation checks.
5. For UI changes, inspect mobile and desktop behavior if a dev server is available.
6. Report what passed and what could not be run.

## Automation

Use `scripts/check-project.ps1 -Root <repo-root>` to check expected docs, skill folders, and common secret leaks.
