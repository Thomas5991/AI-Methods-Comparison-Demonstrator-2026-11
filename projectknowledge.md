# Project Knowledge

## Workspace Inventory
- Workspace root: `c:\Users\TS\Antigravity_data\AI-Methods Comparison Demonstrator 2026-11` *(verified)*
- `ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html` — 97,737 bytes, 2,218 lines *(verified; untouched in Phases 2 & 3)*
- `ai_architectures_energy_planning_demonstrator-v1.html` — Energy-Aware Planning & Control Demonstrator v1 *(verified; untouched in Phase 3)*
- `ai_architectures_energy_planning_demonstrator-v2.html` — Energy-Aware Planning & Control Demonstrator v2 (Case Brief bar + modal, 5-tab Component Deep-Dive modal, enriched explanations + pros/cons + live relative benchmark, and bottom All-6-Methods Visual Comparison with 2×3 small-multiples, KPI/compute bars, and 6×4 scorecard) *(verified)*
- `ai_architectures_energy_planning_demonstrator-v3.html` — Energy-Aware Planning & Control Demonstrator v3 (adds fixed-height `SCENARIO_BRIEFS` strip, Panel 1 & 3 inline color-swatch legends, Case A Total Factory Load line + blue-base/red-overflow bars, Case B stacked CHP/Storage/Boiler bars vs. Heat Demand, explicit S4 cap threshold lines + `Enforced / Ignored!` badges, and case-specific plain-English legends) *(verified)*
- `tests/verify_sim.js` (robot demo) & `tests/verify_energy_sim.js` (energy demo v1, v2 & v3) *(verified)*
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
- **Post-Adaptation Verified Metrics (`node tests/verify_sim.js`, 2026-11-24):**
  - Modes 3, 4, 5, 6: **0 collisions** across all 4 baseline scenarios, all 4 perturbation stress cases, and all 5 moved-obstacle stress cases.
  - Mode 4 in `ruleshift`: **19 goals, 0 collisions, 0 violations** (36 rollouts).
  - Mode 5 in `ruleshift`: **22 goals, 0 collisions, 67 violations** (11 rollouts, preserves intended stale-RL teaching contrast).
  - Mode 6 in `ruleshift`: **20 goals, 0 collisions, 0 violations** (12 rollouts).
  - Live browser check (`http://localhost:8765`, `BROWSER_HOST_FACTS` verified): 0 console errors, 11/12 rollout counts confirmed, clean detours in Scenario 4 for Modes 4 & 6, and static obstacle drag persistence confirmed across Reset and Mode 3 switch.

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
- **2026-11-24 (Phase 3):** Created `ai_architectures_energy_planning_demonstrator-v2.html` (preserving `-v1.html` and robot `-v2.html` untouched) adding: (1) Case Brief bar + 3-col Plant & Flexibility modal (`CASE_BRIEFS`), (2) 5-tab Component Deep-Dive modal (`COMPONENT_DOCS`) triggered from header legend pills & pipeline `ⓘ` buttons, (3) enriched `"Why is it behaving this way?"` card with `ARCH_PROS_CONS` and live `renderRelativePerformance()`, and (4) side-effect-free cached `computeComparativeSnapshot()` / `computeScorecard()` powering the bottom 2×3 clickable small-multiples, ranked KPI/compute bars, and 6×4 Scorecard.
- **2026-11-24 (Phase 4):** Created `ai_architectures_energy_planning_demonstrator-v3.html` (preserving `-v1.html`, `-v2.html`, and robot `-v2.html` untouched) adding `SCENARIO_BRIEFS` (`4 × 2`), Panel 1 & 3 inline legends, Case A Total Factory Load line + blue/red-overflow bars, Case B stacked CHP/Storage/Boiler bars vs. Heat Demand, explicit S4 cap threshold lines + `Enforced / Ignored!` badges, and case-specific plain-English legends.
- **Post-Phase-4 Verified Metrics (`node tests/verify_energy_sim.js` + `1280×800` browser check, 2026-11-24):**
  - All 3 energy versions (`-v1.html`, `-v2.html`, `-v3.html`) and `node tests/verify_sim.js` passed all assertions; `1280×800` browser check (`http://localhost:8768`, `BROWSER_HOST_FACTS` verified) confirmed zero console errors, clean Panel 1/3 inline legends, Case A Total Load line, Case B stacked bars, S4 threshold badges, and fixed-height brief/control bars (`min-h-[64px]` / `min-h-[68px]`).
- **Post-Phase-2 Verified Metrics (`node tests/verify_energy_sim.js`, 2026-11-24):**
  - All 48 `(6 arch × 4 scenario × 2 case)` assertions passed: Arch 0,2,3,4,5 achieve `0` violations in S1; Arch 0 fails S2 under 25% mismatch (`3` limViol in A, `51.39 MWh` unmet in B) and recovers to `0` after engineer re-parametrisation while Arch 2–5 adapt via RLS (`0` violations); Arch 3–5 and Arch 0 (`10 h`) solve S3 (`A`: `2267€` vs `2505€` myopic; `B`: `24,800€` vs `15,912€` myopic; Arch 0 nodes scale `4,646 → 34,592` in A, `19,773 → 150,880` in B); Arch 0,2,4 violate S4 while Arch 3 & 5 achieve `0` rule & physics violations.
  - `node tests/verify_sim.js` regression passed (`ALL ASSERTIONS PASSED`).
  - Live browser check at `1280×800` (`http://localhost:8766`, `BROWSER_HOST_FACTS` verified): 0 console errors, 0 layout shift, explicit units, `V(t, SoC)` heatmap & rollout fan, S4 red vs hatched windows, and S1 disturbance drag persistence confirmed.

## Open Questions
- **Push approval:** Confirm whether to push local `main` commits to `origin` (`https://github.com/Thomas5991/AI-Methods-Comparison-Demonstrator-2026-11.git`) after Phase 1 verification completes.
