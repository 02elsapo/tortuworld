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
  /function guaranteedRacePosition\(elapsedMs\) \{[\s\S]*?\n      \}(?=\n      function formatRaceTime)/,
);
const raceTimeSource = overlaySource.match(
  /function formatRaceTime\(remainingMs\) \{[\s\S]*?\n      \}(?=\n      const \$)/,
);
assert.ok(racePositionSource, 'guaranteedRacePosition must exist in the overlay');
assert.ok(raceTimeSource, 'formatRaceTime must exist in the overlay');

const app = vm.createContext({ CFG: { win: 100 }, RACE_DURATION_MS: 60_000 });
vm.runInContext(
  `${racePositionSource[0]}\n${raceTimeSource[0]}\nglobalThis.racePosition = guaranteedRacePosition; globalThis.raceTime = formatRaceTime;`,
  app,
);

test('unassisted progress reaches the finish within one minute', () => {
  assert.equal(app.racePosition(-100), 0);
  assert.equal(app.racePosition(30_000), 50);
  assert.equal(app.racePosition(60_000), 100);
  assert.equal(app.racePosition(90_000), 100);
});

test('race clock rounds up and displays zero at the deadline', () => {
  assert.equal(app.raceTime(60_000), '01:00');
  assert.equal(app.raceTime(59_500), '01:00');
  assert.equal(app.raceTime(59_000), '00:59');
  assert.equal(app.raceTime(0), '00:00');
});
