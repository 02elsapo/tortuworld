const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createCommentArchiveService } = require('../modules/tiktok/commentArchiveService');

test('comment archive stores text without usernames and exports JSON and TXT', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tortu-comment-archive-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'comments.json');
  const archive = createCommentArchiveService({ filePath });
  archive.recordComment('¡Vamos Brasil!', '2026-11-13T04:00:00.000Z');
  archive.recordComment('Argentina\ncampeón');
  archive.flush();

  assert.equal(archive.getSummary().count, 2);
  assert.equal(archive.getTextExport(), '¡Vamos Brasil!\nArgentina campeón');
  const saved = fs.readFileSync(filePath, 'utf8');
  assert.match(saved, /"text": "¡Vamos Brasil!"/);
  assert.doesNotMatch(saved, /username|author/);

  const restored = createCommentArchiveService({ filePath });
  assert.equal(restored.getArchive().comments.length, 2);
  assert.equal(restored.reset().count, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')).comments, []);
});
