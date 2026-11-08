const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v16.html'),
  'utf8',
);
const showWinSource = overlaySource.match(
  /function showWin\(code\) \{[\s\S]*?\n      \}(?=\n      \/\* Empieza una ronda)/,
);
assert.ok(showWinSource, 'showWin must exist in the overlay');

function createElement(tagName) {
  return {
    tagName,
    textContent: '',
    className: '',
    children: [],
    style: {},
    classList: { add() {} },
    append(...children) {
      this.children.push(...children);
    },
  };
}

function createPodiumHarness() {
  const elements = new Map(
    ['pod', 'wk', 'wt', 'ws', 'nxb', 'nxt', 'win'].map((id) => [
      id,
      createElement(id),
    ]),
  );
  const app = vm.createContext({
    C: [{ c: 's0' }, { c: 's1' }, { c: 's2' }],
    NATIONS: [
      { n: 'Argentina', f: '🇦🇷' },
      { n: 'Brasil', f: '🇧🇷' },
      { n: 'Uruguay', f: '🇺🇾' },
    ],
    S: { pos: { s0: 90, s1: 70, s2: 100 }, round: 4, nxI: 0 },
    document: { createElement },
    $(id) {
      return elements.get(id);
    },
    clearInterval() {},
    setTimeout() {},
    burst() {},
    SFX: { win() {} },
  });
  vm.runInContext(
    `${showWinSource[0]}\nglobalThis.showWin = showWin;`,
    app,
  );
  return { app, elements };
}

test('winner and podium entries display flags for their own countries', () => {
  const { app, elements } = createPodiumHarness();
  app.showWin('s2');

  assert.equal(elements.get('wt').textContent, '🇺🇾 Uruguay ¡CAMPEÓN!');
  assert.deepEqual(
    elements
      .get('pod')
      .children.map((place) => place.children[0].textContent),
    ['🇦🇷', '🇺🇾', '🇧🇷'],
  );
});
