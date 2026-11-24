**Last updated:** 2026-11-24 14:46
**Now:** Phase 1 / 1.1 – initialize git repo with baseline commit and sync state files

## Phase 1: RL-MPC Collision Adaptation, Mode 4 Detour Fix & Verification
- [~] 1.1 Initialize local git repo with `origin` (`https://github.com/Thomas5991/AI-Methods-Comparison-Demonstrator-2026-11.git`), create baseline commit of original v2 files, and record verified code inspection & baseline metrics in `projectknowledge.md`
- [ ] 1.2 Adapt `runJepaMPC()`, `stepJepaRLMPC()`, and `stepFullTriad()` for TD-MPC2 hybrid non-uniform rollout sampling + RL Critic cost-weight calibration (keeping 11/12 rollouts), fix Mode 4 (`stepHybridLLMJepa()`) Scenario 4 Blue Zone oscillation detour, and add reusable verification script `tests/verify_sim.js` – needs: 1.1
- [ ] 1.3 Verify adaptation with `node tests/verify_sim.js` and live browser testing across architectures/scenarios; sync `projectknowledge.md` and `tasklist.md` – needs: 1.2

## Later Phases
- Phase 2: Additional user-specified tasks or approved improvement proposals

## Blocked / Awaiting Decision
- Push to GitHub remote `origin/main`: awaiting explicit push approval after Phase 1 verification

## Completed Phases
- Phase 0: Workspace inventory, planning & agent file setup
