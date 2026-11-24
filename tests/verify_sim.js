/**
 * Headless verification harness for ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html.
 * Runs all 6 architectures across all 4 scenarios (baseline, perturbation stress, moved-obstacle stress,
 * and obstacle persistence) and enforces regression assertions.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const htmlPath = path.join(__dirname, '..', 'ai_architectures_in_action_llms_jepa_rl_mpc_demonstrator-v2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const start = html.lastIndexOf('<script>') + '<script>'.length;
const end = html.lastIndexOf('</script>');
if (start < 8 || end <= start) {
  throw new Error('Could not locate main <script> block in HTML file.');
}
let js = html.slice(start, end);

// Stub UI updates for fast headless execution while keeping physics, controllers, and state intact
js = js.replace('function updateDynamicTelemetry() {', 'function updateDynamicTelemetry() { return; ');
js = js.replace('function updateAllUI() {', 'function updateAllUI() { return; ');
js = js.replace(
  'window.onload = function () {',
  'globalThis.__sim = { state, setupScenario, stepSimulation, initNoiseParticles, saveCustomObstacles }; window.onload = function () {'
);

const noop = () => {};
const fakeEl = () => ({
  getContext: () => new Proxy({}, { get: () => noop }),
  getBoundingClientRect: () => ({ width: 640, height: 400, left: 0, top: 0 }),
  addEventListener: noop,
  querySelectorAll: () => [],
  classList: { toggle: noop },
  style: {},
  dataset: {}
});

globalThis.requestAnimationFrame = noop;
globalThis.window = { devicePixelRatio: 1, addEventListener: noop };
globalThis.document = { getElementById: fakeEl, querySelectorAll: () => [] };

eval(js);

const { state, setupScenario, stepSimulation, initNoiseParticles, saveCustomObstacles } = globalThis.__sim;
initNoiseParticles();

const ARCHS = ['llm', 'pixel', 'jepa_mpc', 'llm_jepa_mpc', 'jepa_rl_mpc', 'full_triad'];
const JEPA_ARCHS = ['jepa_mpc', 'llm_jepa_mpc', 'jepa_rl_mpc', 'full_triad'];
const SCENARIOS = ['dynamic', 'noise', 'keygate', 'ruleshift'];

const baseline = {};

console.log('=== 1. BASELINE (5000 steps per scenario/arch, default obstacles) ===');
console.log('SCENARIO     | ARCH          | GOALS | COLL | VIOL | STUCK | ROLL | LAT');
console.log('-------------+---------------+-------+------+------+-------+------+----');
for (const sc of SCENARIOS) {
  baseline[sc] = {};
  for (const a of ARCHS) {
    state.customObstacles = {};
    state.arch = a;
    state.scenario = sc;
    state.noiseLevel = sc === 'noise' ? 85 : 15;
    setupScenario(true);
    let stuckSteps = 0;
    let activeRollouts = 0;
    for (let t = 0; t < 5000; t++) {
      stepSimulation();
      if (state.stuckAtGate) stuckSteps++;
      if (state.goalResetTimer === 0) activeRollouts = state.mpcMem.rolloutCount;
    }
    baseline[sc][a] = {
      goals: state.goals,
      collisions: state.collisions,
      violations: state.ruleViolations,
      stuckSteps,
      rollouts: activeRollouts,
      latency: state.mpcMem.latencyMs
    };
    console.log(
      sc.padEnd(12) + ' | ' +
      a.padEnd(13) + ' | ' +
      String(state.goals).padStart(5) + ' | ' +
      String(state.collisions).padStart(4) + ' | ' +
      String(state.ruleViolations).padStart(4) + ' | ' +
      String(stuckSteps).padStart(5) + ' | ' +
      String(activeRollouts).padStart(4) + ' | ' +
      String(state.mpcMem.latencyMs).padStart(3)
    );
  }
}

console.log('\n=== 2. PERTURBATION STRESS (5000 steps, deterministic kick every 150 steps) ===');
console.log('SCENARIO     | ARCH          | GOALS | COLL | VIOL');
console.log('-------------+---------------+-------+------+-----');
const pertResults = [];
for (const sc of SCENARIOS) {
  for (const a of JEPA_ARCHS) {
    state.customObstacles = {};
    state.arch = a;
    state.scenario = sc;
    state.noiseLevel = sc === 'noise' ? 85 : 15;
    setupScenario(true);
    for (let t = 0; t < 5000; t++) {
      if (t > 0 && t % 150 === 0) {
        const ang = (t * 0.73) % (Math.PI * 2);
        state.robot.vx += Math.cos(ang) * 6.0;
        state.robot.vy += Math.sin(ang) * 6.0;
      }
      stepSimulation();
    }
    pertResults.push({ sc, a, goals: state.goals, collisions: state.collisions, violations: state.ruleViolations });
    console.log(
      sc.padEnd(12) + ' | ' +
      a.padEnd(13) + ' | ' +
      String(state.goals).padStart(5) + ' | ' +
      String(state.collisions).padStart(4) + ' | ' +
      String(state.ruleViolations).padStart(4)
    );
  }
}

console.log('\n=== 3. MOVED-OBSTACLE STRESS (4000 steps per case) ===');
console.log('CASE           | ARCH          | GOALS | COLL | VIOL');
console.log('---------------+---------------+-------+------+-----');
const stressCases = [
  { name: 'mid-block', sc: 'dynamic', stat: [{ x: 255, y: 210 }, { x: 385, y: 210 }], mov: [{ baseX: 310, baseY: 200 }, { baseX: 470, baseY: 200 }] },
  { name: 'tight-gate', sc: 'dynamic', stat: [{ x: 290, y: 150 }, { x: 330, y: 265 }], mov: [{ baseX: 310, baseY: 200 }, { baseX: 470, baseY: 200 }] },
  { name: 'key-block', sc: 'keygate', stat: [{ x: 260, y: 190 }], mov: [{ baseX: 330, baseY: 165 }] },
  { name: 'rule-pinch', sc: 'ruleshift', stat: [{ x: 300, y: 320 }], mov: [{ baseX: 465, baseY: 200 }] },
  { name: 'rule-block-top', sc: 'ruleshift', stat: [{ x: 300, y: 54 }], mov: [{ baseX: 465, baseY: 200 }] }
];
const moveResults = [];
for (const c of stressCases) {
  for (const a of JEPA_ARCHS) {
    state.customObstacles = { [c.sc]: { staticObs: c.stat, movingObs: c.mov } };
    state.arch = a;
    state.scenario = c.sc;
    state.noiseLevel = 15;
    setupScenario(true);
    for (let t = 0; t < 4000; t++) stepSimulation();
    moveResults.push({ name: c.name, sc: c.sc, a, goals: state.goals, collisions: state.collisions, violations: state.ruleViolations });
    console.log(
      c.name.padEnd(14) + ' | ' +
      a.padEnd(13) + ' | ' +
      String(state.goals).padStart(5) + ' | ' +
      String(state.collisions).padStart(4) + ' | ' +
      String(state.ruleViolations).padStart(4)
    );
  }
}

console.log('\n=== 4. OBSTACLE PERSISTENCE CHECK ===');
state.customObstacles = {};
state.scenario = 'dynamic';
state.arch = 'jepa_mpc';
setupScenario(true);
state.staticObs[0].x = 180;
state.staticObs[0].y = 310;
state.movingObs[0].baseX = 355;
state.movingObs[0].baseY = 230;
saveCustomObstacles();
setupScenario(true);
assert.strictEqual(state.staticObs[0].x, 180, 'Static obstacle X should persist across reset');
assert.strictEqual(state.staticObs[0].y, 310, 'Static obstacle Y should persist across reset');
assert.strictEqual(state.movingObs[0].baseX, 355, 'Moving obstacle baseX should persist across reset');
state.arch = 'full_triad';
setupScenario(false);
assert.strictEqual(state.staticObs[0].x, 180, 'Static obstacle X should persist across arch switch');
assert.strictEqual(state.movingObs[0].baseX, 355, 'Moving obstacle baseX should persist across arch switch');
console.log('PASS: Custom static & moving obstacles persist across runs and method switches.');

console.log('\n=== 5. ASSERTIONS ===');
for (const sc of SCENARIOS) {
  for (const a of JEPA_ARCHS) {
    assert.strictEqual(baseline[sc][a].collisions, 0, `Baseline ${sc}/${a} collisions should be 0`);
  }
  assert.strictEqual(baseline[sc].jepa_mpc.rollouts, 36, `${sc}/jepa_mpc rollouts`);
  assert.strictEqual(baseline[sc].llm_jepa_mpc.rollouts, 36, `${sc}/llm_jepa_mpc rollouts`);
  assert.strictEqual(baseline[sc].jepa_rl_mpc.rollouts, 11, `${sc}/jepa_rl_mpc rollouts`);
  assert.strictEqual(baseline[sc].full_triad.rollouts, 12, `${sc}/full_triad rollouts`);
}

// Scenario 3: Mode 3 trapped at gate; Modes 4, 5, 6 solve it
assert.strictEqual(baseline.keygate.jepa_mpc.goals, 0, 'keygate/jepa_mpc should remain stuck');
assert.ok(baseline.keygate.jepa_mpc.stuckSteps > 1000, 'keygate/jepa_mpc should report stuckAtGate');
for (const a of ['llm_jepa_mpc', 'jepa_rl_mpc', 'full_triad']) {
  assert.ok(baseline.keygate[a].goals >= 15, `keygate/${a} should reach >= 15 goals`);
}

// Scenario 4: Mode 5 stale RL violates Blue Zone; Modes 4 & 6 detour cleanly with 0 violations
assert.ok(baseline.ruleshift.jepa_rl_mpc.violations > 20, 'ruleshift/jepa_rl_mpc should show stale RL violations');
for (const a of ['llm_jepa_mpc', 'full_triad']) {
  assert.ok(baseline.ruleshift[a].goals >= 14, `ruleshift/${a} should reach >= 14 goals`);
  assert.strictEqual(baseline.ruleshift[a].violations, 0, `ruleshift/${a} should have 0 violations`);
}

// Modes 1 & 2 preserve expected teaching contrast
assert.ok(baseline.dynamic.llm.collisions > 0, 'dynamic/llm should exhibit reactive collisions');
assert.ok(baseline.noise.pixel.collisions > 0, 'noise/pixel should exhibit noise-induced collisions');

// Stress suites: 0 collisions across all JEPA modes
for (const r of pertResults) {
  assert.strictEqual(r.collisions, 0, `Perturbation ${r.sc}/${r.a} collisions should be 0`);
}
for (const r of moveResults) {
  assert.strictEqual(r.collisions, 0, `Moved-obstacle ${r.name}/${r.a} collisions should be 0`);
}

console.log('ALL ASSERTIONS PASSED.');
