const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createRecentUsersService } = require('../../modules/tiktok/recentUsersService');

test('recent users are deduplicated, limited to four, and persisted in JSON', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-recent-users-'));
  const filePath = path.join(directory, 'recent-users.json');

  try {
    const service = createRecentUsersService({ filePath });
    const saved = service.saveRecentUsers([
      { username: 'ana', avatar: '', t: 1 },
      { username: 'Beto', avatar: '', t: 2 },
      { username: 'Carla', avatar: '', t: 3 },
      { username: 'Dani', avatar: '', t: 4 },
      { username: 'ANA', avatar: 'https://example.com/ana.png', t: 5 },
      { username: 'Eva', avatar: '', t: 6 },
    ]);

    assert.deepEqual(saved.users.map((user) => user.username), ['Carla', 'Dani', 'ANA', 'Eva']);
    assert.equal(saved.users[2].avatar, 'https://example.com/ana.png');
    assert.deepEqual(createRecentUsersService({ filePath }).getRecentUsers(), saved);
    assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')).users, saved.users);
    assert.equal(service.saveRecentUsers([{ username: '', avatar: '', t: 1 }]), null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
