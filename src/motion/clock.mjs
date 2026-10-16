// One scheduler per page. All adapters receive the same logical milliseconds.
export function createMotionClock({ render, requestFrame, cancelFrame, now }) {
  let time = 0, anchor = 0, frame = null, playing = false, disposed = false;
  let suspended = false, resumePlaying = false, generation = 0;
  const assertTime = value => { if (!Number.isFinite(value) || value < 0) throw new TypeError('Invalid motion time'); };
  function sample() { if (playing) time = Math.max(time, now() - anchor); return time; }
  function stop() { generation += 1; if (frame !== null) cancelFrame(frame); frame = null; }
  function schedule() { const token = generation; frame = requestFrame(() => { if (token === generation) tick(); }); }
  function tick() {
    frame = null;
    if (disposed || !playing || suspended) return;
    render(sample());
    if (!disposed && playing && !suspended) schedule();
  }
  const api = {
    play() {
      if (disposed) return false;
      if (suspended) { resumePlaying = true; return true; }
      if (!playing) { anchor = now() - time; playing = true; schedule(); }
      return true;
    },
    pause() { sample(); playing = false; resumePlaying = false; stop(); },
    seek(value) { assertTime(value); if (disposed) return false; time = value; anchor = now() - time; render(time); return true; },
    replay() { if (!api.seek(0)) return false; return api.play(); },
    suspend() { if (disposed || suspended) return; resumePlaying = playing; sample(); playing = false; suspended = true; stop(); },
    resume() { if (disposed || !suspended) return; suspended = false; const restart = resumePlaying; resumePlaying = false; if (restart) api.play(); },
    dispose() { if (disposed) return; sample(); disposed = true; playing = false; resumePlaying = false; stop(); },
    state() { return { logicalTimeMs: sample(), playing, suspended, disposed, scheduledFrames: frame === null ? 0 : 1 }; }
  };
  return api;
}
