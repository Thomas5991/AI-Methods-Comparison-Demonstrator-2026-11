# Project Knowledge

## Workspace Inventory
- Workspace root: `c:\Users\TS\Antigravity_data\AI-Methods Comparison Demonstrator 2026-11` *(verified)*
- `ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html` — 97,737 bytes, 2,218 lines *(verified)*
- `Handover message.txt` — 4,143 bytes *(verified)*
- `AGENTS.md`, `CLAUDE.md`, `tasklist.md`, `projectknowledge.md` — governance & state files *(verified)*
- Git: local repository initialized on `main` with `origin` = `https://github.com/Thomas5991/AI-Methods-Comparison-Demonstrator-2026-11.git` *(verified)*

## Architecture & Tech Stack
- **Application form:** Single-file HTML/Canvas 2D robotics sandbox demonstrator (`ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html`) *(verified)*.
- **Implementation stack:** Vanilla HTML/CSS/JS + Tailwind CDN (`cdn.tailwindcss.com`) + Google Fonts (`Inter`) + HTML5 `<canvas>` (640×400 logical arena, 32×20 Bellman value grid) *(verified)*.
- **Obstacle persistence:** Already implemented in `-v2.html` via `state.customObstacles`, `saveCustomObstacles()` (L683–L688), and `applyCustomObstacles()` (L690–L712), called from `setupScenario()` (L785) and pointer drag handlers (`onMove`/`onUp`, L2152–L2180) *(verified)*.

## Core Concepts & Business Logic
Source: `Handover message.txt` and `ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html` *(verified)*
- **6 Architectures:** `llm` (1. Autoregressive LLM), `pixel` (2. Pixel-Space WM), `jepa_mpc` (3. JEPA + MPC, 36 rollouts), `llm_jepa_mpc` (4. Hybrid LLM + JEPA + MPC, 36 rollouts), `jepa_rl_mpc` (5. JEPA + RL + MPC, 11 rollouts), `full_triad` (6. Full Triad, 12 rollouts).
- **4 Scenarios:** `dynamic` (1. Dynamic Obstacles), `noise` (2. High-Noise Env), `keygate` (3. Key & Gate), `ruleshift` (4. Zero-Shot Rule Shift).
- **Baseline Benchmark Metrics (pre-adaptation `-v2.html`, 5,000 steps/suite):**
  - Modes 3 & 4 (`jepa_mpc`, `llm_jepa_mpc`): **0 collisions** across all 12 suites (4 baseline, 4 perturbation stress, 4 moved-obstacle stress).
  - Mode 5 (`jepa_rl_mpc`): **11 collisions total** (baseline `dynamic`: 1, `noise`: 1; perturbed: 3; moved-obstacle stress: 6).
  - Mode 6 (`full_triad`): **15 collisions total** (baseline `dynamic`: 1, `noise`: 1; perturbed: 6; moved-obstacle stress: 7).
  - Mode 4 in `ruleshift`: **0 goals** (0 violations) due to waypoint toggle oscillation at `rob.y < blueZone.y + blueZone.h + 25` in `stepHybridLLMJepa()`.
  - Mode 5 in `ruleshift`: **67 rule violations** (intended stale-RL demonstration); Mode 6 in `ruleshift`: **20 goals, 0 violations**.

## Data Schemas & State Management
Key functions in `ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html` *(verified)*:
- `computeValueGrid(targetX, targetY, blockGate, avoidBlueZone)` (L559–L609): 32×20 8-neighbor Bellman value iteration (static obstacles/walls only).
- `saveCustomObstacles()` / `applyCustomObstacles()` (L683–L712): persists user-dragged static and moving obstacles per scenario.
- `runJepaMPC(options)` (L953–L1056): shared trajectory optimizer for Modes 3–6 (24-step horizon, `spd = 2.75`, moving-obstacle future lookahead via `getMovingObsPos(obs, k)`).
- `stepHybridLLMJepa()` (L1084–L1130): Mode 4 controller (`36` rollouts, `spreadRad: 2.35`).
- `stepJepaRLMPC()` (L1133–L1164): Mode 5 controller (`11` rollouts, `latencyMs: 8`).
- `stepFullTriad()` (L1167–L1198): Mode 6 controller (`12` rollouts, `latencyMs: 10`).

## Known Quirks & Environment Constraints
- **Filename mismatch in handover notes:** `Handover message.txt` mentions `ai_architecture_demonstrator.html`; actual workspace file is `ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html` *(verified)*.
- **Windows PowerShell:** Workspace path contains spaces (`AI-Methods Comparison Demonstrator 2026-11`), so shell paths must be quoted *(verified)*.
- **Node.js `v22.19.0` & Python `3.11.9`:** Available locally for headless simulation testing and static HTTP serving *(verified)*.

## Decision Log
- **2026-11-24:** Initialized project governance and state files (`AGENTS.md`, `CLAUDE.md`, `tasklist.md`, `projectknowledge.md`) per `kickoff/SKILL.md`.
- **2026-11-24:** User approved in-place editing of `ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html`, local git setup with `origin` = `https://github.com/Thomas5991/AI-Methods-Comparison-Demonstrator-2026-11.git`, TD-MPC2 hybrid sampling (`warpedFrac = Math.sign(frac) * Math.pow(Math.abs(frac), 1.55)`, `spreadRad: 2.35`, `curve = -warpedFrac * 0.042`) + RL Critic cost calibration (`* 9` / `* 1000`), and Mode 4 `ruleshift` two-stage detour fix. Rationale: eliminates unintended RL-MPC collision artifacts while preserving 11/12 rollout budgets and all teaching behaviors.

## Open Questions
- **Push approval:** Confirm whether to push local `main` commits to `origin` (`https://github.com/Thomas5991/AI-Methods-Comparison-Demonstrator-2026-11.git`) after Phase 1 verification completes.
