const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v16.html'),
  'utf8',
);
const racePositionSource = overlaySource.match(
  /function guaranteedRacePosition\(elapsedMs, designatedWinner\) \{[\s\S]*?\n      \}(?=\n      function firstFinisher)/,
);
const firstFinisherSource = overlaySource.match(
  /function firstFinisher\(crossings\) \{[\s\S]*?\n      \}(?=\n      function formatRaceTime)/,
);
const raceTimeSource = overlaySource.match(
  /function formatRaceTime\(remainingMs\) \{[\s\S]*?\n      \}(?=\n      function raceProgressPercent)/,
);
const raceProgressSource = overlaySource.match(
  /function raceProgressPercent\(remainingMs\) \{[\s\S]*?\n      \}(?=\n      const \$)/,
);
assert.ok(racePositionSource, 'guaranteedRacePosition must exist in the overlay');
assert.ok(firstFinisherSource, 'firstFinisher must exist in the overlay');
assert.ok(raceTimeSource, 'formatRaceTime must exist in the overlay');
assert.ok(raceProgressSource, 'raceProgressPercent must exist in the overlay');

const app = vm.createContext({ CFG: { win: 100 }, RACE_DURATION_MS: 180_000 });
vm.runInContext(
  `${racePositionSource[0]}\n${firstFinisherSource[0]}\n${raceTimeSource[0]}\n${raceProgressSource[0]}\nglobalThis.racePosition = guaranteedRacePosition; globalThis.firstFinisher = firstFinisher; globalThis.raceTime = formatRaceTime; globalThis.raceProgress = raceProgressPercent;`,
  app,
);

test('only the designated lane is guaranteed to reach the finish in three minutes', () => {
  assert.equal(app.racePosition(-100, true), 0);
  assert.equal(app.racePosition(90_000, true), 50);
  assert.equal(app.racePosition(90_000, false), 45);
  assert.equal(app.racePosition(180_000, true), 100);
  assert.equal(app.racePosition(180_000, false), 90);
  assert.equal(app.racePosition(240_000, true), 100);
  assert.equal(app.racePosition(240_000, false), 90);
});

test('the earliest crossing fraction wins when multiple lanes cross in one frame', () => {
  assert.equal(
    app.firstFinisher([
      { code: 's0', fraction: 0.7 },
      { code: 's1', fraction: 0.2 },
      { code: 's2', fraction: 0.5 },
    ]).code,
    's1',
  );
  assert.equal(
    app.firstFinisher([
      { code: 's0', fraction: 0.4 },
      { code: 's1', fraction: 0.4 },
    ]).code,
    's0',
  );
});

test('race clock rounds up and displays zero at the deadline', () => {
  assert.equal(app.raceTime(180_000), '03:00');
  assert.equal(app.raceTime(179_500), '03:00');
  assert.equal(app.raceTime(179_000), '02:59');
  assert.equal(app.raceTime(0), '00:00');
});

test('race progress bar drains linearly and never exceeds its bounds', () => {
  assert.equal(app.raceProgress(180_000), '100.00');
  assert.equal(app.raceProgress(90_000), '50.00');
  assert.equal(app.raceProgress(0), '0.00');
  assert.equal(app.raceProgress(-100), '0.00');
  assert.equal(app.raceProgress(240_000), '100.00');
});
