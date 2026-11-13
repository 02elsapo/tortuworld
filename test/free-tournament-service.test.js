const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createFreeTournamentService } = require('../modules/tiktok/freeTournamentService');

test('free tournament counts real chat votes, unique users, and persists teams', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tortu-free-tournament-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'free-tournament.json');
  const service = createFreeTournamentService({ filePath });

  assert.equal(service.getStats().enabled, true, 'free mode is active by default');
  service.setEnabled(false);
  assert.equal(service.recordComment({
    type: 'chat', username: 'Ana', content: 'Cerro Porteño',
  }), null, 'comments do not count after free mode is disabled');
  service.setEnabled(true);
  service.recordComment({ type: 'chat', username: 'Ana', content: 'Cerro Porteño' });
  service.recordComment({ type: 'chat', username: 'Ana', content: 'Vamos Cerro Porteño hoy' });
  service.recordComment({ type: 'chat', username: 'Luis', content: 'Cerro Porteno!' });
  service.recordComment({ type: 'member', username: 'Ana', content: 'Boca Juniors' });

  const stats = service.getStats();
  assert.deepEqual(stats.teams, [{
    id: stats.teams[0].id,
    name: 'Cerro Porteño',
    votes: 3,
    users: 2,
  }]);

  const saved = fs.readFileSync(filePath, 'utf8');
  assert.match(saved, /"votes": 3/);
  assert.doesNotMatch(saved, /Ana|Luis/);
  service.setEnabled(false);
  const restored = createFreeTournamentService({ filePath });
  assert.equal(restored.getStats().teams[0].votes, 3);
  assert.equal(restored.getStats().teams[0].users, 2);
  assert.equal(restored.getStats().enabled, false);
});
