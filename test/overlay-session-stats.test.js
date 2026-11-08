const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v17.html'),
  'utf8',
);
const recordStatsSource = overlaySource.match(
  /function recordSessionEvent\(entry, isBot\) \{[\s\S]*?\n      \}(?=\n      function updateSessionStats)/,
);
assert.ok(recordStatsSource, 'recordSessionEvent must exist in the overlay');

const app = vm.createContext({
  SESSION: { chat: 0, like: 0, gift: 0, follow: 0, share: 0, join: 0 },
});
vm.runInContext(
  `${recordStatsSource[0]}\nglobalThis.recordSessionEvent = recordSessionEvent;`,
  app,
);

test('overlay statistics count real event totals and ignore simulated events', () => {
  for (const [type, details] of [
    ['chat', {}],
    ['like', { activityCount: 12 }],
    ['gift', { activityCount: 2 }],
    ['follow', {}],
    ['share', {}],
    ['join', {}],
  ]) {
    assert.equal(
      app.recordSessionEvent({ type, ...details }, false),
      true,
    );
  }
  assert.equal(app.recordSessionEvent({ type: 'gift' }, true), false);

  assert.deepEqual(
    JSON.parse(JSON.stringify(app.SESSION)),
    { chat: 1, like: 12, gift: 2, follow: 1, share: 1, join: 1 },
  );
});
