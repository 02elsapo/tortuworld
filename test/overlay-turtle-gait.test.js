const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v17.html'),
  'utf8',
);

test('shell bob follows the same gait phase as the legs', () => {
  assert.match(overlaySource, /const s = Math\.sin\(t\.ph\),/);
  assert.match(
    overlaySource,
    /Math\.abs\(Math\.sin\(t\.ph\)\) \* \(0\.2 \+ 1\.8 \* speedRatio\)/,
  );
  assert.match(overlaySource, /const by = -gallop/);
  assert.doesNotMatch(overlaySource, /Math\.sin\(t\.ph \* 2\)/);
});
