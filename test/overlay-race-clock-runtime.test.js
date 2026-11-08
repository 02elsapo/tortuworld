const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v17.html'),
  'utf8',
);
const clockSource = overlaySource.match(
  /function stopRaceClock\(\) \{[\s\S]*?\n      \}(?=\n      \/\* BUCLE PRINCIPAL)/,
);
assert.ok(clockSource, 'race clock interval helpers must exist in the overlay');

test('race timer advances the fallback turtle and finishes at the deadline', () => {
  let now = 1_000;
  let intervalCallback;
  let intervalDelay;
  let clearedInterval;
  const state = {
    go: true,
    over: false,
    winner: null,
    pos: { s0: 0 },
  };
  const progress = {};
  let app;
  app = vm.createContext({
    CFG: { win: 100 },
    RACE_DURATION_MS: 180_000,
    S: state,
    T: {
      s0: {
        tur: { style: { setProperty: (key, value) => (progress.turtle = value) } },
        trk: { style: { setProperty: (key, value) => (progress.track = value) } },
      },
    },
    fallbackWinnerCode: 's0',
    performance: { now: () => now },
    setInterval(callback, delay) {
      intervalCallback = callback;
      intervalDelay = delay;
      return 7;
    },
    clearInterval(id) {
      clearedInterval = id;
    },
    guaranteedRacePosition(elapsedMs, designatedWinner) {
      return Math.min(1, elapsedMs / 180_000) * (designatedWinner ? 100 : 90);
    },
    updateRaceClock(timestamp) {
      progress.clock = timestamp;
    },
    finish(code) {
      state.over = true;
      state.winner = code;
      app.stopRaceClock();
    },
  });
  vm.runInContext(
    `let raceStartedAt = 1000, raceClockTimer = 0;\n${clockSource[0]}\nglobalThis.start = startRaceClock;`,
    app,
  );

  app.start();
  assert.equal(intervalDelay, 100);

  now = 61_000;
  intervalCallback();
  assert.ok(Number(progress.turtle) > 0);
  assert.equal(progress.track, progress.turtle);
  assert.equal(progress.clock, now);

  now = 181_000;
  intervalCallback();
  assert.equal(state.over, true);
  assert.equal(state.winner, 's0');
  assert.equal(clearedInterval, 7);
});
