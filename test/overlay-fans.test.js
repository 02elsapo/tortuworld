const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v16.html'),
  'utf8',
);
const registerFanSource = overlaySource.match(
  /function registerFan\(user, code, entry\) \{[\s\S]*?\n      \}(?=\n      function fanMarkerGap)/,
);
assert.ok(registerFanSource, 'registerFan must exist in the overlay');
function createFanHarness() {
  const context = vm.createContext({
    C: [{ c: 'AR' }, { c: 'BR' }],
    FANS: { AR: new Set(), BR: new Set() },
    PENDING_FANS: { AR: new Set(), BR: new Set() },
    FANINFO: {},
    ROSTER: new Map(),
    S: { pick: new Map(), fans: { AR: 0, BR: 0 } },
    renderCount: 0,
    renderFansAll() {
      context.renderCount += 1;
    },
  });
  vm.runInContext(
    `${registerFanSource[0]}\nglobalThis.registerFan = registerFan;`,
    context,
  );
  return context;
}

test('fan count adds each username once despite repeat events', () => {
  const app = createFanHarness();
  app.registerFan('viewer', 'AR', {
    username: 'viewer',
    avatar: 'https://example.test/viewer.webp',
  });
  app.registerFan('viewer', 'AR', {
    username: 'viewer',
    avatar: 'https://example.test/viewer.webp',
  });

  assert.equal(app.FANS.AR.size, 1);
  assert.equal(app.S.fans.AR, 1);
  assert.equal(app.FANS.AR.has('viewer'), true);
  assert.equal(app.PENDING_FANS.AR.has('viewer'), true);
});

test('changing country moves one fan and updates both country counts', () => {
  const app = createFanHarness();
  app.registerFan('viewer', 'AR', { username: 'viewer' });
  app.PENDING_FANS.AR.delete('viewer');
  app.FANINFO.viewer.progress = 34;

  app.registerFan('viewer', 'BR', { username: 'viewer' });
  app.registerFan('viewer', 'BR', { username: 'viewer' });

  assert.equal(app.FANS.AR.has('viewer'), false);
  assert.equal(app.FANS.BR.size, 1);
  assert.equal(app.S.fans.AR, 0);
  assert.equal(app.S.fans.BR, 1);
  assert.equal(app.PENDING_FANS.AR.has('viewer'), false);
  assert.equal(app.PENDING_FANS.BR.has('viewer'), true);
  assert.equal(app.FANINFO.viewer.progress, null);
});

test('repeat event preserves an existing fan marker and its avatar', () => {
  const app = createFanHarness();
  app.registerFan('viewer', 'AR', {
    username: 'viewer',
    avatar: 'https://example.test/first.webp',
  });
  app.PENDING_FANS.AR.delete('viewer');
  app.FANINFO.viewer.progress = 28;
  app.registerFan('viewer', 'AR', { username: 'viewer' });

  assert.equal(app.FANS.AR.size, 1);
  assert.equal(app.PENDING_FANS.AR.has('viewer'), false);
  assert.equal(app.FANINFO.viewer.progress, 28);
  assert.equal(app.FANINFO.viewer.avatar, 'https://example.test/first.webp');
});

test('overlay does not synthesize interaction events', () => {
  assert.doesNotMatch(overlaySource, /countryAssistantEvent|scheduleCountryAssistant/);
});
