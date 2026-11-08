const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v17.html'),
  'utf8',
);
const advanceSource = overlaySource.match(
  /const REAL_USER_EVENT_TYPES = new Set\(\[[\s\S]*?\]\);\s*function realEventLaneAdvance\(player, type\) \{[\s\S]*?\n      \}/,
);
assert.ok(advanceSource, 'realEventLaneAdvance must exist in the overlay');

const app = vm.createContext({ CFG: { win: 100 } });
vm.runInContext(
  `${advanceSource[0]}\nglobalThis.realEventLaneAdvance = realEventLaneAdvance;`,
  app,
);

test('each real user event adds twenty percent of race distance', () => {
  for (const type of ['chat', 'gift', 'like', 'follow', 'share', 'join']) {
    assert.equal(app.realEventLaneAdvance({ isBot: false }, type), 20);
  }
});

test('demo bots and internal support updates do not add event distance', () => {
  assert.equal(app.realEventLaneAdvance({ isBot: true }, 'gift'), 0);
  assert.equal(app.realEventLaneAdvance({ isBot: false }, 'support'), 0);
});
