const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createCommentStatsService, teams } = require('../../modules/tiktok/commentStatsService');

test('comment and cup statistics are country-only and persist in JSON', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-comment-stats-'));
  const filePath = path.join(directory, 'stats.json');

  try {
    const stats = createCommentStatsService({ filePath });
    assert.ok(teams.length > 10);
    assert.ok(teams.every((team) => team.type === 'country'));

    stats.recordComment('¡Vamos Paraguay! 🇵🇾');
    stats.recordComment('Argentina 🇦🇷');
    stats.recordComment('RMA');
    stats.recordComment('Chileano');
    stats.recordCup('PY');
    stats.recordCup('PY');

    assert.equal(stats.getStats().teams.find((team) => team.code === 'PY').comments, 1);
    assert.equal(stats.getStats().teams.find((team) => team.code === 'AR').comments, 1);
    assert.equal(stats.getStats().unassigned, 2);
    assert.equal(stats.getStats().total, 4);
    assert.equal(stats.getCupStats().countries.find((country) => country.code === 'PY').cups, 2);

    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(saved.counts.PY, 1);
    assert.equal(saved.cups.PY, 2);
    assert.equal(saved.unassigned, 2);
    assert.equal(createCommentStatsService({ filePath }).getCupStats().countries
      .find((country) => country.code === 'PY').cups, 2);
    assert.equal(stats.recordCup('RMA'), null);

    const invalidFile = path.join(directory, 'invalid.json');
    fs.writeFileSync(invalidFile, JSON.stringify({ counts: { BR: '2' } }));
    assert.throws(
      () => createCommentStatsService({ filePath: invalidFile }),
      /conteo de comentarios de BR no es válido/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
