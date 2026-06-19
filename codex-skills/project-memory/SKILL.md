---
name: project-memory
description: Maintain project knowledge for the personal task manager. Use when Codex needs to remember or update product decisions, architecture, database design, UI rules, test expectations, deployment notes, Telegram plans, or any durable project context before making changes.
---

# Project Memory

Use the repo's `/docs` folder as the durable project memory. Read the smallest relevant document before changing code or decisions.

## Workflow

1. Read the relevant `/docs` file before acting:
   - Product scope: `/docs/product-requirements.md`
   - Architecture: `/docs/architecture.md`
   - Database: `/docs/database-design.md`
   - Supabase security: `/docs/supabase-security.md`
   - UI: `/docs/ui-guidelines.md`
   - Testing: `/docs/test-checklist.md`
   - Deploy: `/docs/deploy-guide.md`
   - Telegram: `/docs/telegram-report.md`
2. If a task changes a durable decision, update the related doc in the same change.
3. Keep docs short and operational. Prefer decisions, constraints, and checklists over long explanations.
4. Never store secrets, access tokens, or private user data in project memory.
