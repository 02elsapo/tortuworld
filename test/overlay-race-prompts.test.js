const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v17.html'),
  'utf8',
);
const promptsSource = overlaySource.match(
  /const RACE_PROMPTS = \[[\s\S]*?\n      \];\s*function updateRacePrompt\(elapsedMs\) \{[\s\S]*?\n      \}/,
);
assert.ok(promptsSource, 'race prompts must exist in the overlay');

const cta = { textContent: '' };
const app = vm.createContext({
  VOICE_INTERVAL_MS: 60_000,
  $(id) {
    assert.equal(id, 'ctaMain');
    return cta;
  },
});
vm.runInContext(
  `${promptsSource[0]}\nglobalThis.updateRacePrompt = updateRacePrompt;`,
  app,
);

test('race prompt changes to favorite country after one minute', () => {
  assert.equal(
    app.updateRacePrompt(0),
    '¿Qué país te gustaría que gane? Si quieres, comenta una de las opciones.',
  );
  assert.equal(cta.textContent, '💬 ¿QUÉ PAÍS TE GUSTARÍA QUE GANE?');

  assert.equal(
    app.updateRacePrompt(60_000),
    'Si quieres, comenta cuál es tu país favorito y alienta al equipo que prefieras.',
  );
  assert.equal(cta.textContent, '💬 SI QUERÉS, COMENTÁ CUÁL ES TU PAÍS FAVORITO');
});
