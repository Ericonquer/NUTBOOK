// Explicitly enabled instrumentation; never treats rAF as display presentation time.
export function nearestRank(values, percentile = .95) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * percentile) - 1)];
}

export function createMotionMeasurement({ now, requestFrame, cancelFrame, hidden, environment, mark = () => {}, clearMarks = () => {} }) {
  let active = null, frame = null, generation = 0, disposed = false;
  const latencies = new Map();
  const schedule = () => {
    if (frame !== null || disposed || (!active && !latencies.size)) return;
    const token = generation;
    frame = requestFrame(timestamp => {
      if (token !== generation || disposed) return;
      frame = null;
      sample(timestamp);
      schedule();
    });
  };
  function finish(reason = null) {
    if (!active) return;
    const run = active; active = null;
    if (reason) run.invalidReasons.push(reason);
    const { intervals, renderCpuMs, resets } = run;
    if (!renderCpuMs.length) run.invalidReasons.push('no-render-samples');
    const setupIssues = [];
    if (run.environment.width !== 1280 || run.environment.height !== 720 || run.environment.dpr !== 1) setupIssues.push('standard-requires-1280x720-dpr1');
    if (run.warmupMs !== 2000 || run.durationMs !== 10000) setupIssues.push('non-standard-window');
    for (const key of ['sourceHash', 'machine', 'os', 'webview', 'power', 'displayMode']) if (!run.metadata[key] || /^(unknown|unverified)$/i.test(run.metadata[key])) setupIssues.push(`missing-${key}`);
    if (run.metadata.preset !== 'standard') setupIssues.push('non-standard-preset');
    if (run.metadata.validatedPreset !== true) setupIssues.push('non-standard-parameters');
    if (!/^[a-f0-9]{64}$/i.test(run.metadata.sourceHash || '')) setupIssues.push('invalid-source-hash');
    if (!['single', 'dual'].includes(run.metadata.displayMode)) setupIssues.push('invalid-display-mode');
    const report = {
      version: 1, kind: 'motion-steady', semantics: 'rAF submission intervals, not physical display latency',
      metadata: run.metadata, environment: run.environment,
      standardSetupEligible: setupIssues.length === 0, setupIssues,
      warmupMs: run.warmupMs, requestedDurationMs: run.durationMs, elapsedMs: now() - run.started,
      valid: run.invalidReasons.length === 0 && intervals.length > 0,
      invalidReasons: run.invalidReasons, frameIntervalsMs: intervals, renderCpuMs, resetBoundaries: resets,
      p95FrameIntervalMs: nearestRank(intervals), p95RenderCpuMs: nearestRank(renderCpuMs),
      thresholdMs: 33, thresholdMet: run.invalidReasons.length === 0 && intervals.length > 0 && nearestRank(intervals) <= 33,
    };
    mark('nutbook-motion:steady:end');
    run.resolve(report);
  }
  function sample(timestamp) {
    const at = now();
    if (hidden()) {
      finish('backgrounded');
      for (const entry of latencies.values()) entry.resolve({ ...entry.info, valid: false, reason: 'backgrounded', latencyMs: null });
      latencies.clear(); return;
    }
    for (const [key, entry] of latencies) {
      // rAF callbacks in the same batch can run after render; their timestamp
      // predates submission. Count the following batch only.
      if (entry.submittedAt !== null && timestamp > entry.submittedAt) {
        latencies.delete(key);
        entry.resolve({ ...entry.info, valid: true, latencyMs: at - entry.started });
      } else if (at - entry.started > 2000) {
        latencies.delete(key);
        entry.resolve({ ...entry.info, valid: false, reason: 'timeout', latencyMs: at - entry.started });
      }
    }
    const run = active;
    if (!run) return;
    const elapsed = at - run.started;
    const currentEnvironment = environment();
    if (['width', 'height', 'dpr'].some(key => currentEnvironment[key] !== run.environment[key])) { finish('viewport-changed'); return; }
    if (elapsed >= run.warmupMs) {
      if (run.lastTimestamp !== null) run.intervals.push(timestamp - run.lastTimestamp);
    }
    // Keep the interval crossing the warmup boundary, including a long frame.
    run.lastTimestamp = timestamp;
    if (elapsed >= run.warmupMs + run.durationMs) { finish(); return; }
    try { run.onFrame?.(); } catch { finish('replay-failed'); }
  }
  return {
    start({ metadata = {}, warmupMs = 2000, durationMs = 10000, onFrame } = {}) {
      if (disposed || active) throw new Error('Measurement already active or disposed');
      if (!Number.isFinite(warmupMs) || warmupMs < 0 || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 60000) throw new TypeError('Invalid measurement window');
      clearMarks(); mark('nutbook-motion:steady:start');
      return new Promise(resolve => {
        active = { metadata: structuredClone(metadata), environment: environment(), warmupMs, durationMs, onFrame, resolve, started: now(), intervals: [], renderCpuMs: [], resets: [], invalidReasons: [], lastTimestamp: null };
        schedule();
      });
    },
    recordRender(cpuMs) {
      if (active && now() - active.started >= active.warmupMs) active.renderCpuMs.push(cpuMs);
    },
    reset(reason) { if (active) active.resets.push({ atMs: now() - active.started, reason }); },
    // Register before the user event/prepare, then submit only its actual first frame.
    latency(kind, revision) {
      if (disposed || !['cold-apply', 'hot-param'].includes(kind) || !Number.isSafeInteger(revision) || revision < 0 || latencies.has(revision)) throw new TypeError('Invalid latency measurement');
      const result = new Promise(resolve => latencies.set(revision, { info: { kind, revision }, started: now(), submittedAt: null, resolve }));
      schedule(); return result;
    },
    submitted(revision) { const entry = latencies.get(revision); if (entry && entry.submittedAt === null) entry.submittedAt = now(); },
    invalidate(reason = 'backgrounded') { finish(reason); for (const entry of latencies.values()) entry.resolve({ ...entry.info, valid: false, reason, latencyMs: null }); latencies.clear(); generation++; if (frame !== null) cancelFrame(frame); frame = null; },
    cancel() { this.invalidate('cancelled'); },
    dispose() { this.cancel(); disposed = true; clearMarks(); },
    state() { return { active: Boolean(active), pendingLatencies: latencies.size, scheduledFrames: frame === null ? 0 : 1, disposed }; },
  };
}
