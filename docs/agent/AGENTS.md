# Agent Instructions

This project uses **GitHub Issues** for issue tracking.

## Quick Reference

```bash
gh issue list --state open                    # Find available work
gh issue view <number>                        # View issue details
gh issue edit <number> --add-assignee @me     # Claim work
gh issue close <number> --comment "Done"      # Complete work
gh issue comment <number> --body "Status..."  # Post progress updates
```

## Issue Dependencies

Use explicit dependency links in every scoped issue:
- `Blocked by #<issue>`
- `Blocks #<issue>`

Operational rules:
- Apply `blocked` label when prerequisites are open.
- Apply `has-dependents` label when the issue gates others.
- Keep workflow status in sync (`Ready`, `Blocked`, `In Progress`, `Done`).
- Default: do not start `In Progress` while declared blockers are open.
- Exception: if a blocker advisory is stale/incorrect, proceed opportunistically and fix dependency links/labels in the same work cycle.

Recommended parent/child pattern:
- Parent issue tracks outcome and acceptance criteria.
- Child issues track concrete implementation/test/doc tasks.
- Parent includes a checklist linking child issues.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
- When multiple developers are active, commit and push meaningful incremental improvements as they are validated (do not batch too long locally).

## Documentation Hygiene

- If you encounter **inaccurate or outdated docs** while working, fix them immediately.
- Don't leave stale information in `docs/` — correct it or remove it.
- Docs should reflect the actual state of the code, not aspirational or historical states.
