# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — ESLint over the whole project (flat config in `eslint.config.js`)
- `npm test` — run the Vitest suite once (`vitest run`)
- `npx vitest run tests/date.test.js -t "<test name>"` — run a single test

This repo has no backend and no routing — it's a single static page (`index.html`) loading one JS entry module.

## Architecture

FlowBoard (플로우보드) is a client-only kanban/todo board. It was ported from a single-file Claude Artifact HTML page into this Vite project; `sample/*.png` are reference screenshots of that original Artifact design, not part of the app.

- `index.html` — markup only. Loads `src/style.css` and `src/main.js` (as an ES module). No inline styles or scripts.
- `src/style.css` — all styling. Colors are CSS custom properties on `:root`, with dark-mode overrides via `prefers-color-scheme` and a `[data-theme]` attribute override hook.
- `src/lib/date.js` — pure, DOM-free helpers (`toISODate`, `addDays`, `dueMeta`, `formatShort`, `uid`). This is the only module covered by tests, intentionally: everything else in `src/main.js` is DOM-coupled.
- `src/main.js` — all application logic in one file:
  - **State**: `{ columns: { todo: [...], doing: [...], done: [...] } }`, each card is `{id, title, desc, due}`. Persisted to `localStorage` under the key `flowboard-v1`; `sampleState()` seeds demo data when storage is empty or fails to parse.
  - **Rendering**: `render()` tears down and rebuilds the entire `#board` DOM tree from `state` on every change (no diffing/virtual DOM). Any state mutation must be followed by `saveState()` then `render()`.
  - **Drag-and-drop**: hand-rolled with Pointer Events (not the HTML5 DnD API), so it works for mouse and touch alike. A card's drag handle (`.handle`) starts a floating clone (`.drag-ghost-wrap`) that follows the pointer; drop target resolution walks up from `document.elementFromPoint()` to find the `.column`/`.cards-list` under the pointer and reorders the DOM live before committing to `state` on pointerup (`moveCardCommit`).
  - **Modal**: a single overlay/form pair is reused for both "add" and "edit" — `editing` holds the current context (`{columnId}` or `{columnId, cardId}`).

## Repo-specific Claude Code tooling

- `.claude/hooks/pre-commit-check.sh` is wired as a `PreToolUse` hook (see `.claude/settings.json`) on `Bash` calls. It only triggers when the bash input contains `git commit`, then runs whichever of `lint`/`build`/`test` npm scripts exist and blocks the commit (exit 2) if any fail.
- `.claude/agents/code-reviewer.md` + `.claude/skills/code-review` — a review subagent invoked proactively after nontrivial edits.

The project is not yet a git repository (no `.git`), so the pre-commit hook is currently a no-op until one is initialized.
