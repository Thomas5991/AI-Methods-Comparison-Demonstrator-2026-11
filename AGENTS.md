# AGENTS.md

## Project Overview
Single-file HTML/Canvas 2D demonstrators:
1. Robotics sandbox (`ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html`) comparing six AI architectures across four interactive scenarios (`Handover message.txt`).
2. Energy-aware planning & control sandbox (`ai_architectures_energy_planning_demonstrator-v1.html`, `ai_architectures_energy_planning_demonstrator-v2.html`, `ai_architectures_energy_planning_demonstrator-v3.html`) comparing six AI architectures across Industrial DSM (Case A) and CHP District Heating Dispatch (Case B) (`Energy Demo.txt`).

## Session Start
Read `tasklist.md` and `projectknowledge.md` before acting on any request. Do the same after any context summary or compression before continuing: work from the files, not from the summary.

## Progress Tracking (required)
- `tasklist.md` is how the user monitors your work. Keeping it current is part of every task, not optional bookkeeping.
- Before starting a task: mark it `[~]` and update the "Now" line.
- After finishing a task: mark it `[x]` and add one line of result (what changed, how it was verified).
- Before pausing for user input, and at the end of every response in which you changed files: update "Now", "Last updated" (use `date` / `Get-Date`), and blockers.
- A task is not complete until `tasklist.md` reflects it.
- If the tool keeps its own internal task list or plan artifact, mirror every status change into `tasklist.md` at the same time. `tasklist.md` is authoritative.
- When work is delegated to a sub-agent: the sub-agent updates only the lines of its own tasks and does not edit `projectknowledge.md`; the orchestrating session owns "Now", "Last updated", phase headers, and `projectknowledge.md`.
- When a delegated sub-task is accepted, the orchestrating session closes or updates the parent task it implements in the same commit. Old `[~]` or "running" lines are re-checked against the actual state, not trusted.
- *Precondition check:* before anything costly or irreversible (long compute runs, push/merge to the main branch, deletions, client deliveries, sending anything externally), re-read `tasklist.md` from the file and list every open task this action `needs:` (or that the text names as "before", "after", "LAST task before", "needs OK"). Finish them first, or tell the user explicitly which one is skipped and why. A conditional go-ahead never covers skipping a listed precondition.

## Status Block
End every response in which you changed files with:
`**Status:** [task id] – done / in progress / blocked`
`**Next:** [next task id] – [one-line description]`

## Commands
- **Setup:** None required (standalone single-file HTML/Canvas application; `TBD` if a test runner is introduced).
- **Build:** None required (static HTML/JS/CSS file).
- **Run:** Open `ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html` in a browser (or serve locally, e.g., `python -m http.server` / Antigravity browser subagent).
- **Test:** `node tests/verify_sim.js` (robot demo) and `node tests/verify_energy_sim.js` (energy demo), plus live browser visual check.
- **Lint / Type-check:** `TBD`.

## Remote agents (cloud VM)
`not suitable: interactive visual verification requires local browser rendering of the HTML/Canvas app.` Remote `origin` is `https://github.com/Thomas5991/AI-Methods-Comparison-Demonstrator-2026-11.git`. If cloud execution is later used: work only on branch `remote/<slug>` from `briefs/<slug>.md`, deliver a draft PR with the implementer report, and never touch `main`.

## Working Rules
- *Alignment first:* if requirements are ambiguous or a significant trade-off emerges (architecture, state semantics, new dependency, public behavior), stop and ask before writing code. Present options with a recommendation. A sub-agent that cannot ask the user stops the task and reports it as blocked with options and a recommendation instead.
- *Phased execution:* work in sequential phases, split into numbered tasks of roughly 15–60 minutes of work. A phase is done only when its acceptance criteria pass via the verification commands. Report the actual command output; do not just assert success.
- *Economical exploration:* prefer targeted reads over broad exploration. Exclude dependency and build folders from listings and limit command output. Check `projectknowledge.md` before re-inspecting files.
- *Data hygiene:* never load full datasets or large blobs into context, chat, or state files. Inspect shapes, columns, types, and summary statistics via lightweight scripts or targeted reads.
- *Regression protection:* run the relevant checks after each task and the full verification suite before marking a phase done. Never delete, skip, or weaken existing checks without approval.
- *Scope discipline:* no unrelated refactors, renames, or formatting sweeps. No new dependencies without approval. Per `Handover message.txt`, keep all existing demonstrator features intact and propose optional improvements in chat rather than implementing them unsolicited.
- *Non-destructive HTML versioning:* never overwrite or delete previous demonstrator HTML files; create a new versioned filename (`-vN.html`) for each new variant or major iteration.
- *Version control:* if a git repository exists, commit after each completed and verified task, with the task id in the message (e.g. `1.2: persist user-moved obstacles across runs and method switches`). Never push, force-push, or rewrite history without approval. Never commit raw data files, credentials, or `.env` values.
- *Knowledge sync:* update `projectknowledge.md` at the end of each completed phase and immediately after resolving a non-obvious environment or tooling issue.
