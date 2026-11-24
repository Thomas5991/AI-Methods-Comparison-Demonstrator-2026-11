/**
 * Headless verification harness for Energy-Aware Planning & Control Demonstrators (-v1.html and -v2.html).
 * Tests all 6 architectures x 4 scenarios x 2 cases (48 combinations) on both versions,
 * plus S2 re-parametrisation, S3 horizon sweep, S4 NL parser & engineer encoding,
 * S1 disturbance drag persistence, and v2 comparative snapshot / scorecard / modal docs.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ARCHS = ['classical_mpc', 'llm_only', 'wm_mpc', 'llm_wm_mpc', 'wm_rl_mpc', 'full_triad'];
const SCENARIOS = ['S1', 'S2', 'S3', 'S4'];
const CASES = ['A', 'B'];
const S4_PRESETS = {
  A: 'Grid operator: cap import at 1.0 MW between 17:00 and 19:00',
  B: 'Redispatch request: CHP max 30 MW_el 16:00–20:00'
};

function loadDemo(filename, isV2, isV3 = false) {
  const htmlPath = path.join(__dirname, '..', filename);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const start = html.lastIndexOf('<script>') + '<script>'.length;
  const end = html.lastIndexOf('</script>');
  if (start < 8 || end <= start) {
    throw new Error(`Could not locate main <script> block in ${filename}`);
  }
  let js = html.slice(start, end);

  js = js.replace('function updateDynamicTelemetry() {', 'function updateDynamicTelemetry() { return; ');
  js = js.replace('function updateAllUI() {', 'function updateAllUI() { return; ');
  if (isV2) {
    js = js.replace('function renderVisualComparison(force = false) {', 'function renderVisualComparison(force = false) { return; ');
    const extra = isV3 ? ', SCENARIO_BRIEFS' : '';
    js = js.replace(
      'window.onload = function () {',
      `globalThis.__sim = { state, setupDay, stepSimulation, parseNaturalRule, rebuildRLValueGrids, EXPLANATIONS, CASE_BRIEFS, COMPONENT_DOCS, ARCH_PROS_CONS, computeComparativeSnapshot, computeScorecard${extra} }; window.onload = function () {`
    );
  } else {
    js = js.replace(
      'window.onload = function () {',
      'globalThis.__sim = { state, setupDay, stepSimulation, parseNaturalRule, rebuildRLValueGrids, EXPLANATIONS }; window.onload = function () {'
    );
  }

  const noop = () => {};
  const fakeEl = () => ({
    getContext: () => new Proxy({}, { get: () => noop }),
    getBoundingClientRect: () => ({ width: 720, height: 470, left: 0, top: 0 }),
    addEventListener: noop,
    querySelectorAll: () => [],
    classList: { toggle: noop, add: noop, remove: noop },
    style: {},
    dataset: {},
    value: '',
    innerHTML: '',
    textContent: ''
  });

  const sandbox = {
    console, Math, Array, Float32Array, Float64Array, Uint8Array, Number, String, Object, Infinity,
    setTimeout: noop, clearTimeout: noop,
    requestAnimationFrame: noop,
    window: { devicePixelRatio: 1, addEventListener: noop },
    document: { getElementById: fakeEl, querySelectorAll: () => [] }
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(js, sandbox);
  return sandbox.__sim;
}

function verifyFile(filename, isV2, isV3 = false) {
  console.log(`\n================================================================`);
  console.log(`VERIFYING: ${filename}`);
  console.log(`================================================================`);
  const sim = loadDemo(filename, isV2, isV3);
  const { state, setupDay, stepSimulation, parseNaturalRule, EXPLANATIONS } = sim;

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
      rlsBat: Number(state.rls.batCapEst.toFixed(2))
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

  const a0_s3_4h = results.A.S3.classical_mpc;
  const a0_s3_10h = runDay('A', 'S3', 'classical_mpc', { horizonHours: 10 });
  const b0_s3_4h = results.B.S3.classical_mpc;
  const b0_s3_10h = runDay('B', 'S3', 'classical_mpc', { horizonHours: 10 });
  const a0_s2_reparam = runDay('A', 'S2', 'classical_mpc', { reparamNow: true });
  const b0_s2_reparam = runDay('B', 'S2', 'classical_mpc', { reparamNow: true });
  const a0_s4_enc = runDay('A', 'S4', 'classical_mpc', { encodeNow: true });
  const b0_s4_enc = runDay('B', 'S4', 'classical_mpc', { encodeNow: true });

  console.log(`\nS3 Horizon Sweep A: 4h=${a0_s3_4h.cost}€ (${a0_s3_4h.avgCompute}n) | 10h=${a0_s3_10h.cost}€ (${a0_s3_10h.avgCompute}n)`);
  console.log(`S3 Horizon Sweep B: 4h=${b0_s3_4h.margin}€ (${b0_s3_4h.avgCompute}n) | 10h=${b0_s3_10h.margin}€ (${b0_s3_10h.avgCompute}n)`);
  console.log(`S2 Re-param A: ${results.A.S2.classical_mpc.limViol} -> ${a0_s2_reparam.limViol} | B unmet: ${results.B.S2.classical_mpc.unmetMwh} -> ${b0_s2_reparam.unmetMwh}`);
  console.log(`S4 Manual Encode A: ${results.A.S4.classical_mpc.ruleViol} -> ${a0_s4_enc.ruleViol} | B: ${results.B.S4.classical_mpc.ruleViol} -> ${b0_s4_enc.ruleViol}`);

  const customRule = parseNaturalRule('Grid operator: cap import at 1.15 MW between 16:00 and 19:30', 'A');
  assert.strictEqual(customRule.valid, true, 'Custom NL rule should parse');
  assert.strictEqual(customRule.limitValue, 1.15);

  state.caseId = 'A';
  state.scenario = 'S1';
  state.disturbStep.A = 60;
  setupDay(true);
  assert.strictEqual(state.disturbStep.A, 60, 'Disturbance step should persist across reset');
  state.arch = 'full_triad';
  setupDay(true);
  assert.strictEqual(state.disturbStep.A, 60, 'Disturbance step should persist across arch switch');

  for (const a of ARCHS) {
    for (const c of CASES) {
      for (const sc of SCENARIOS) {
        assert.ok(EXPLANATIONS[a][c][sc] && EXPLANATIONS[a][c][sc].length > (isV2 ? 90 : 40), `Explanation ${a}/${c}/${sc}`);
      }
    }
  }

  for (const c of CASES) {
    for (const a of ['classical_mpc', 'wm_mpc', 'llm_wm_mpc', 'wm_rl_mpc', 'full_triad']) {
      assert.strictEqual(results[c].S1[a].limViol, 0, `${c}/S1/${a} limViol should be 0`);
      if (c === 'B') assert.strictEqual(results[c].S1[a].unmetMwh, 0, `B/S1/${a} unmet should be 0`);
    }
    assert.ok(results[c].S1.llm_only.limViol > 0, `${c}/S1/llm_only should incur violations`);

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

    assert.ok(results[c].S4.classical_mpc.ruleViol > 0, `${c}/S4/classical_mpc should violate before encoding`);
    assert.ok(results[c].S4.wm_mpc.ruleViol > 0, `${c}/S4/wm_mpc should ignore rule`);
    assert.ok(results[c].S4.wm_rl_mpc.ruleViol > 0, `${c}/S4/wm_rl_mpc stale RL should violate rule`);
    assert.strictEqual(results[c].S4.llm_wm_mpc.ruleViol, 0, `${c}/S4/llm_wm_mpc should have 0 ruleViol`);
    assert.strictEqual(results[c].S4.full_triad.ruleViol, 0, `${c}/S4/full_triad should have 0 ruleViol`);
    assert.strictEqual(results[c].S4.full_triad.limViol, 0, `${c}/S4/full_triad should have 0 limViol`);
    assert.strictEqual(c === 'A' ? a0_s4_enc.ruleViol : b0_s4_enc.ruleViol, 0, `${c}/S4/classical_mpc after encode should have 0 ruleViol`);
  }

  if (isV2) {
    // Verify v2 comparative snapshot parity & side-effect freedom
    state.caseId = 'A';
    state.scenario = 'S3';
    state.arch = 'full_triad';
    state.horizonHours = 4;
    state.mismatchPct = 25;
    setupDay(true);
    for (let t = 0; t < 20; t++) stepSimulation();
    const snapBefore = { step: state.step, arch: state.arch, batSoC: state.batSoC, histLen: state.history.length };
    const snap = sim.computeComparativeSnapshot(true);
    assert.strictEqual(snap.length, 6, 'v2 comparative snapshot should have 6 entries');
    assert.strictEqual(state.step, snapBefore.step, 'computeComparativeSnapshot must not mutate live step');
    assert.strictEqual(state.arch, snapBefore.arch, 'computeComparativeSnapshot must not mutate live arch');
    assert.strictEqual(state.batSoC, snapBefore.batSoC, 'computeComparativeSnapshot must not mutate live batSoC');
    assert.strictEqual(state.history.length, snapBefore.histLen, 'computeComparativeSnapshot must not mutate live history');
    for (const entry of snap) {
      assert.strictEqual(entry.cost, results.A.S3[entry.arch].cost, `Snapshot parity A/S3/${entry.arch}`);
      assert.strictEqual(entry.traj.length, 96, `Trajectory length for ${entry.arch}`);
    }

    const scData = sim.computeScorecard(true);
    assert.strictEqual(Object.keys(scData).length, 4, 'Scorecard should have 4 scenarios');
    for (const sc of SCENARIOS) {
      assert.strictEqual(Object.keys(scData[sc]).length, 6, `Scorecard ${sc} should have 6 architectures`);
    }

    for (const c of CASES) {
      assert.ok(sim.CASE_BRIEFS[c] && sim.CASE_BRIEFS[c].shortSummary && sim.CASE_BRIEFS[c].produces.length >= 2, `CASE_BRIEFS[${c}]`);
    }
    for (const k of ['twin_milp', 'llm', 'wm', 'rl', 'mpc']) {
      assert.ok(sim.COMPONENT_DOCS[k] && sim.COMPONENT_DOCS[k].inDemo && sim.COMPONENT_DOCS[k].inPractice, `COMPONENT_DOCS[${k}]`);
    }
    for (const a of ARCHS) {
      assert.ok(sim.ARCH_PROS_CONS[a] && sim.ARCH_PROS_CONS[a].pros.length >= 2 && sim.ARCH_PROS_CONS[a].cons.length >= 2, `ARCH_PROS_CONS[${a}]`);
    }
    console.log('PASS: v2 comparative snapshot parity, side-effect freedom, scorecard, case briefs, component docs, and pros/cons verified.');
  }

  if (isV3) {
    for (const sc of SCENARIOS) {
      for (const c of CASES) {
        assert.ok(sim.SCENARIO_BRIEFS[sc][c] && sim.SCENARIO_BRIEFS[sc][c].length > 60, `SCENARIO_BRIEFS[${sc}][${c}]`);
      }
    }
    console.log('PASS: v3 SCENARIO_BRIEFS (8 entries) verified.');
  }

  console.log(`ALL ASSERTIONS PASSED FOR ${filename}.`);
}

verifyFile('ai_architectures_energy_planning_demonstrator-v1.html', false, false);
verifyFile('ai_architectures_energy_planning_demonstrator-v2.html', true, false);
verifyFile('ai_architectures_energy_planning_demonstrator-v3.html', true, true);
