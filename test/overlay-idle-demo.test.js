const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v16.html'),
  'utf8',
);
const actionSource = overlaySource.match(
  /function simulatedIdleAction\(roll\) \{[\s\S]*?\n      \}(?=\n      function startIdle)/,
);
assert.ok(actionSource, 'simulatedIdleAction must exist in the overlay');

const app = vm.createContext({});
vm.runInContext(
  `${actionSource[0]}\nglobalThis.simulatedIdleAction = simulatedIdleAction;`,
  app,
);

test('idle demo generates labeled mock likes, chat, follows, and minimal gifts', () => {
  const action = (roll) =>
    JSON.parse(JSON.stringify(app.simulatedIdleAction(roll)));

  assert.deepEqual(action(0.1), { type: 'like', activityCount: 20 });
  assert.deepEqual(action(0.3), {
    type: 'chat',
    content: '¡Vamos, equipo!',
  });
  assert.deepEqual(action(0.6), { type: 'follow' });
  assert.deepEqual(action(0.9), {
    type: 'gift',
    content: 'Rose',
    diamondCount: 1,
    activityCount: 1,
  });
});
