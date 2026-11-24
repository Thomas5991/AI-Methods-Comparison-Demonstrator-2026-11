/**
 * Headless verification harness for ai_architectures_energy_planning_demonstrator-v1.html.
 * Tests all 6 architectures x 4 scenarios x 2 cases (48 combinations),
 * plus S2 re-parametrisation, S3 horizon sweep, S4 NL parser & engineer encoding,
 * S1 disturbance drag persistence, and completeness of all 48 explanations.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const htmlPath = path.join(__dirname, '..', 'ai_architectures_energy_planning_demonstrator-v1.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const start = html.lastIndexOf('<script>') + '<script>'.length;
const end = html.lastIndexOf('</script>');
if (start < 8 || end <= start) {
  throw new Error('Could not locate main <script> block in HTML file.');
}
let js = html.slice(start, end);

js = js.replace('function updateDynamicTelemetry() {', 'function updateDynamicTelemetry() { return; ');
js = js.replace('function updateAllUI() {', 'function updateAllUI() { return; ');
js = js.replace(
  'window.onload = function () {',
  'globalThis.__sim = { state, setupDay, stepSimulation, parseNaturalRule, rebuildRLValueGrids, EXPLANATIONS }; window.onload = function () {'
);

const noop = () => {};
const fakeEl = () => ({
  getContext: () => new Proxy({}, { get: () => noop }),
  getBoundingClientRect: () => ({ width: 720, height: 470, left: 0, top: 0 }),
  addEventListener: noop,
  querySelectorAll: () => [],
  classList: { toggle: noop },
  style: {},
  dataset: {},
  value: ''
});

globalThis.requestAnimationFrame = noop;
globalThis.window = { devicePixelRatio: 1, addEventListener: noop };
globalThis.document = { getElementById: fakeEl, querySelectorAll: () => [] };

eval(js);

const { state, setupDay, stepSimulation, parseNaturalRule, rebuildRLValueGrids, EXPLANATIONS } = globalThis.__sim;

const ARCHS = ['classical_mpc', 'llm_only', 'wm_mpc', 'llm_wm_mpc', 'wm_rl_mpc', 'full_triad'];
const SCENARIOS = ['S1', 'S2', 'S3', 'S4'];
const CASES = ['A', 'B'];
const S4_PRESETS = {
  A: 'Grid operator: cap import at 1.0 MW between 17:00 and 19:00',
  B: 'Redispatch request: CHP max 30 MW_el 16:00–20:00'
};

function runDay(caseId, scenario, arch, opts = {}) {
  state.caseId = caseId;
  state.scenario = scenario;
  state.arch = arch;
  state.horizonHours = opts.horizonHours ?? 4;
  state.mismatchPct = opts.mismatchPct ?? 25;
  state.ruleText = opts.ruleText ?? S4_PRESETS[caseId];
  setupDay(true);
  if (opts.reparamNow) state.twinReparamDone = true;
  if (opts.encodeNow) state.baselineRuleEncoded = true;
  let maxPrePeakSoc = 0;
  let sumCompute = 0;
  for (let t = 0; t < 96; t++) {
    stepSimulation();
    sumCompute += state.computeMetric;
    if (caseId === 'A' && t < 68 && state.batSoC > maxPrePeakSoc) maxPrePeakSoc = state.batSoC;
    if (caseId === 'B' && t < 32 && state.hsSoC > maxPrePeakSoc) maxPrePeakSoc = state.hsSoC;
  }
  return {
    cost: Math.round(state.energyCost),
    peakKw: state.peakImportKw,
    margin: Math.round(state.netMargin),
    unmetMwh: Number(state.unmetHeatMwh.toFixed(2)),
    limViol: state.limitViolations,
    ruleViol: state.ruleViolations,
    misses: state.deadlineMisses,
    avgCompute: Math.round(sumCompute / 96),
    maxPrePeakSoc: Number(maxPrePeakSoc.toFixed(2)),
    rlsBat: Number(state.rls.batCapEst.toFixed(2)),
    rlsBoil: Number(state.rls.boilCapEst.toFixed(1))
  };
}

const results = { A: {}, B: {} };

for (const c of CASES) {
  console.log(`\n=== CASE ${c} (96 steps / 24h, default H=4h, S2 mismatch=25%) ===`);
  if (c === 'A') {
    console.log('SCEN | ARCH          | COST(€) | PEAK(kW) | LIM_V | RUL_V | MISS | PRE_SOC | COMP');
    console.log('-----+---------------+---------+----------+-------+-------+------+---------+-----');
  } else {
    console.log('SCEN | ARCH          | MARGIN(€) | UNMET(MWh) | LIM_V | RUL_V | PRE_SOC | COMP');
    console.log('-----+---------------+-----------+------------+-------+-------+---------+-----');
  }
  for (const sc of SCENARIOS) {
    results[c][sc] = {};
    for (const a of ARCHS) {
      const r = runDay(c, sc, a);
      results[c][sc][a] = r;
      if (c === 'A') {
        console.log(
          `${sc}   | ${a.padEnd(13)} | ${String(r.cost).padStart(7)} | ${String(r.peakKw).padStart(8)} | ${String(r.limViol).padStart(5)} | ${String(r.ruleViol).padStart(5)} | ${String(r.misses).padStart(4)} | ${String(Math.round(r.maxPrePeakSoc * 100) + '%').padStart(7)} | ${String(r.avgCompute).padStart(4)}`
        );
      } else {
        console.log(
          `${sc}   | ${a.padEnd(13)} | ${String(r.margin).padStart(9)} | ${String(r.unmetMwh).padStart(10)} | ${String(r.limViol).padStart(5)} | ${String(r.ruleViol).padStart(5)} | ${String(Math.round(r.maxPrePeakSoc * 100) + '%').padStart(7)} | ${String(r.avgCompute).padStart(4)}`
        );
      }
    }
  }
}

console.log('\n=== INTERACTIVE FLOW CHECKS ===');
const a0_s3_4h = results.A.S3.classical_mpc;
const a0_s3_10h = runDay('A', 'S3', 'classical_mpc', { horizonHours: 10 });
const b0_s3_4h = results.B.S3.classical_mpc;
const b0_s3_10h = runDay('B', 'S3', 'classical_mpc', { horizonHours: 10 });
console.log(`S3 Horizon Sweep A (Arch 0): 4h -> cost=${a0_s3_4h.cost}€, nodes=${a0_s3_4h.avgCompute} | 10h -> cost=${a0_s3_10h.cost}€, nodes=${a0_s3_10h.avgCompute}`);
console.log(`S3 Horizon Sweep B (Arch 0): 4h -> margin=${b0_s3_4h.margin}€, nodes=${b0_s3_4h.avgCompute} | 10h -> margin=${b0_s3_10h.margin}€, nodes=${b0_s3_10h.avgCompute}`);

const a0_s2_reparam = runDay('A', 'S2', 'classical_mpc', { reparamNow: true });
const b0_s2_reparam = runDay('B', 'S2', 'classical_mpc', { reparamNow: true });
console.log(`S2 Re-param A (Arch 0): before limViol=${results.A.S2.classical_mpc.limViol} -> after=${a0_s2_reparam.limViol}`);
console.log(`S2 Re-param B (Arch 0): before unmet=${results.B.S2.classical_mpc.unmetMwh} MWh -> after=${b0_s2_reparam.unmetMwh} MWh`);

const a0_s4_enc = runDay('A', 'S4', 'classical_mpc', { encodeNow: true });
const b0_s4_enc = runDay('B', 'S4', 'classical_mpc', { encodeNow: true });
console.log(`S4 Manual Encode A (Arch 0): before ruleViol=${results.A.S4.classical_mpc.ruleViol} -> after=${a0_s4_enc.ruleViol}`);
console.log(`S4 Manual Encode B (Arch 0): before ruleViol=${results.B.S4.classical_mpc.ruleViol} -> after=${b0_s4_enc.ruleViol}`);

const customRule = parseNaturalRule('Grid operator: cap import at 1.15 MW between 16:00 and 19:30', 'A');
assert.strictEqual(customRule.valid, true, 'Custom NL rule should parse');
assert.strictEqual(customRule.type, 'grid_cap');
assert.strictEqual(customRule.limitValue, 1.15);
assert.strictEqual(customRule.startStep, 64);
assert.strictEqual(customRule.endStep, 78);

// S1 draggable disturbance persistence
state.caseId = 'A';
state.scenario = 'S1';
state.disturbStep.A = 60;
setupDay(true);
assert.strictEqual(state.disturbStep.A, 60, 'Disturbance step should persist across day reset');
state.arch = 'full_triad';
setupDay(true);
assert.strictEqual(state.disturbStep.A, 60, 'Disturbance step should persist across arch switch');

// All 48 explanations present
for (const a of ARCHS) {
  for (const c of CASES) {
    for (const sc of SCENARIOS) {
      assert.ok(EXPLANATIONS[a][c][sc] && EXPLANATIONS[a][c][sc].length > 40, `Missing explanation for ${a}/${c}/${sc}`);
    }
  }
}

console.log('\n=== ASSERTIONS (EXPECTED BEHAVIOUR MATRIX) ===');
for (const c of CASES) {
  // S1: Arch 0,2,3,4,5 clean; Arch 1 violates
  for (const a of ['classical_mpc', 'wm_mpc', 'llm_wm_mpc', 'wm_rl_mpc', 'full_triad']) {
    assert.strictEqual(results[c].S1[a].limViol, 0, `${c}/S1/${a} limViol should be 0`);
    if (c === 'B') assert.strictEqual(results[c].S1[a].unmetMwh, 0, `B/S1/${a} unmet should be 0`);
  }
  assert.ok(results[c].S1.llm_only.limViol > 0, `${c}/S1/llm_only should incur violations`);

  // S2: Arch 0 & 1 fail/violate before re-param; Arch 2,3,4,5 adapt via RLS
  if (c === 'A') {
    assert.ok(results.A.S2.classical_mpc.limViol > 0, 'A/S2/classical_mpc should violate under 25% fade');
    assert.strictEqual(a0_s2_reparam.limViol, 0, 'A/S2/classical_mpc after re-param should have 0 viol');
    assert.ok(results.A.S2.wm_mpc.rlsBat < 1.65, 'A/S2/wm_mpc RLS should converge toward 1.50 MWh');
  } else {
    assert.ok(results.B.S2.classical_mpc.unmetMwh > 0, 'B/S2/classical_mpc should have unmet heat under fouling');
    assert.strictEqual(b0_s2_reparam.unmetMwh, 0, 'B/S2/classical_mpc after re-param should have 0 unmet heat');
  }
  for (const a of ['wm_mpc', 'llm_wm_mpc', 'wm_rl_mpc', 'full_triad']) {
    assert.strictEqual(results[c].S2[a].limViol, 0, `${c}/S2/${a} RLS should prevent violations`);
  }

  // S3: Arch 0 (4h) & Arch 2 myopic; Arch 3,4,5 & Arch 0 (10h) pre-charge & outperform
  const minPreSoc = c === 'A' ? 0.50 : 0.32;
  assert.ok(results[c].S3.wm_rl_mpc.maxPrePeakSoc >= minPreSoc, `${c}/S3/wm_rl_mpc should pre-charge`);
  assert.ok(results[c].S3.full_triad.maxPrePeakSoc >= minPreSoc, `${c}/S3/full_triad should pre-charge`);
  assert.ok(results[c].S3.llm_wm_mpc.maxPrePeakSoc >= minPreSoc, `${c}/S3/llm_wm_mpc should pre-charge`);
  if (c === 'A') {
    assert.ok(results.A.S3.full_triad.cost < results.A.S3.wm_mpc.cost, 'A/S3 full_triad should beat myopic wm_mpc cost');
    assert.ok(a0_s3_10h.cost < a0_s3_4h.cost, 'A/S3 Arch 0 10h should beat 4h cost');
    assert.ok(a0_s3_10h.avgCompute > a0_s3_4h.avgCompute * 4, 'A/S3 Arch 0 10h solver nodes should scale steeply');
  } else {
    assert.ok(results.B.S3.full_triad.margin > results.B.S3.wm_mpc.margin, 'B/S3 full_triad should beat myopic wm_mpc margin');
    assert.ok(b0_s3_10h.margin > b0_s3_4h.margin, 'B/S3 Arch 0 10h should beat 4h margin');
    assert.ok(b0_s3_10h.avgCompute > b0_s3_4h.avgCompute * 4, 'B/S3 Arch 0 10h solver nodes should scale steeply');
  }

  // S4: Arch 0 (before encode), 2, 4 violate rule; Arch 3 & 5 achieve 0 ruleViol & 0 limViol
  assert.ok(results[c].S4.classical_mpc.ruleViol > 0, `${c}/S4/classical_mpc should violate before encoding`);
  assert.ok(results[c].S4.wm_mpc.ruleViol > 0, `${c}/S4/wm_mpc should ignore rule`);
  assert.ok(results[c].S4.wm_rl_mpc.ruleViol > 0, `${c}/S4/wm_rl_mpc stale RL should violate rule`);
  assert.strictEqual(results[c].S4.llm_wm_mpc.ruleViol, 0, `${c}/S4/llm_wm_mpc should have 0 ruleViol`);
  assert.strictEqual(results[c].S4.full_triad.ruleViol, 0, `${c}/S4/full_triad should have 0 ruleViol`);
  assert.strictEqual(results[c].S4.full_triad.limViol, 0, `${c}/S4/full_triad should have 0 limViol`);
}

console.log('ALL 48-COMBO ENERGY DEMONSTRATOR ASSERTIONS PASSED.');
