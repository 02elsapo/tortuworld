const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v17.html'),
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
    ['winnerFlag', 'win'].map((id) => [id, createElement(id)]),
  );
  elements.get('win').classList = {
    added: [],
    add(name) {
      this.added.push(name);
    },
  };
  const app = vm.createContext({
    C: [{ c: 's0' }, { c: 's1' }, { c: 's2' }],
    NATIONS: [
      { n: 'Argentina', u: 'flag-ar.svg' },
      { n: 'Brasil', u: 'flag-br.svg' },
      { n: 'Uruguay', u: 'flag-uy.svg' },
    ],
    S: { pos: { s0: 90, s1: 70, s2: 100 }, round: 4, nxI: 0 },
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

test('winner celebration displays only the winning country flag', () => {
  const { app, elements } = createPodiumHarness();
  app.showWin('s2');

  assert.equal(elements.get('winnerFlag').src, 'flag-uy.svg');
  assert.equal(elements.get('winnerFlag').alt, 'Bandera de Uruguay');
  assert.ok(elements.get('win').classList.added.includes('on'));
});
