const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v16.html'),
  'utf8',
);
const preferenceSource = overlaySource.match(
  /function preferredShellAvatar\(\) \{[\s\S]*?\n      \}/,
);
assert.ok(preferenceSource, 'preferredShellAvatar must exist in the overlay');

const app = vm.createContext({
  priorityShellAvatar: null,
  latestShellEventAvatar: null,
});
vm.runInContext(
  `${preferenceSource[0]}\nglobalThis.preferredShellAvatar = preferredShellAvatar;`,
  app,
);

test('latest connected user takes priority over later event avatars', () => {
  const connectedUser = { code: 's0', user: 'connected' };
  app.priorityShellAvatar = connectedUser;
  app.latestShellEventAvatar = { code: 's1', user: 'event' };

  assert.equal(app.preferredShellAvatar(), connectedUser);
});

test('most recent event avatar is used until a user connects', () => {
  const eventUser = { code: 's1', user: 'event' };
  app.priorityShellAvatar = null;
  app.latestShellEventAvatar = eventUser;

  assert.equal(app.preferredShellAvatar(), eventUser);
});
