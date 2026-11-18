---
name: code-review
description: Systematic code review checklist for diffs, PRs, or recently changed files. Use before committing or merging, or whenever asked to review code.
---

# Code Review

Review the code that actually changed, verify every claim before reporting it, and rank findings by severity.

## 1. Scope

- If the caller didn't name specific files, determine scope from `git status` / `git diff` (staged + unstaged). If there is no git repo or no diff, review the files the caller named.
- Read each changed file with enough surrounding context to understand callers and call sites, not just the diff hunk in isolation.

## 2. Checklist

Work through each category. Skip categories that genuinely don't apply — don't force a finding.

- **Correctness** — logic errors, off-by-one, wrong operator, null/undefined/empty-collection handling, incorrect async/await or race conditions, error paths that swallow failures.
- **Security** — injection (SQL/command/XSS), secrets committed in code, unsafe deserialization, missing authz/authn checks, path traversal, unsanitized user input reaching a sink.
- **Simplicity** — unnecessary abstraction, dead code, duplicated logic that should be shared, over-engineered solutions for the actual requirement.
- **Performance** — obvious N+1 queries, unbounded loops/recursion, blocking calls on a hot path, needless re-computation.
- **Test coverage** — new branches/edge cases without a test; existing tests weakened or deleted to make code pass.

## 3. Verify before reporting

For every candidate issue, trace the concrete failure scenario: what input or state makes it actually break, and what the observable wrong behavior is. Do not report speculative "this could theoretically be a problem" items without a traced scenario.

Mark each surviving finding:
- `CONFIRMED` — you traced the exact failure path.
- `PLAUSIBLE` — likely a real issue but you couldn't fully trace/reproduce the triggering condition.

If nothing survives verification, report zero findings rather than padding with nitpicks.

## 4. Report

Rank findings most-severe first. If the `ReportFindings` tool is available, call it once with the verified findings using its schema (`file`, `line`, `summary`, `failure_scenario`, `short_summary`, `category`, `verdict`). If that tool is not available, output the same information as a concise markdown list in the same order.

Do not also restate the findings as prose when `ReportFindings` is used — the structured call is the output.
