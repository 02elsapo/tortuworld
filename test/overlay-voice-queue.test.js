const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const overlaySource = fs.readFileSync(
  path.join(__dirname, '..', 'v16.html'),
  'utf8',
);
const winnerSpeechSource = overlaySource.match(
  /function speakWinnerAnnouncement\(text, onComplete\) \{[\s\S]*?\n      \}(?=\n      function nextEncouragement)/,
);
const finishVoiceSource = overlaySource.match(
  /function finishVoiceItem\(item\) \{[\s\S]*?\n      \}(?=\n      function speakNextTickerMessage)/,
);
assert.ok(winnerSpeechSource, 'speakWinnerAnnouncement must exist in the overlay');
assert.ok(finishVoiceSource, 'finishVoiceItem must exist in the overlay');

const app = vm.createContext({
  voiceEnabled: true,
  voiceSynth: {},
  voiceNeedsGesture: false,
  voiceQueue: [],
  voiceSpeaking: true,
  voiceCurrentItem: null,
  voiceWatchdog: 0,
  clearTimeout() {},
  speakNextTickerMessage() {},
});
vm.runInContext(
  `${winnerSpeechSource[0]}\n${finishVoiceSource[0]}\nglobalThis.queueWinner = speakWinnerAnnouncement; globalThis.finishVoice = finishVoiceItem;`,
  app,
);

test('winner voice waits in the queue while another announcement is speaking', () => {
  let restarted = false;
  app.queueWinner('Ganó Paraguay', () => {
    restarted = true;
  });

  assert.equal(restarted, false);
  assert.equal(app.voiceQueue[0].required, true);
  assert.equal(app.voiceQueue[0].text, 'Ganó Paraguay');

  app.finishVoice(app.voiceQueue.shift());
  assert.equal(restarted, true);
});

test('voice completion triggers the restart callback only once', () => {
  let restarts = 0;
  const item = { onComplete: () => restarts++ };

  app.finishVoice(item);
  app.finishVoice(item);

  assert.equal(restarts, 1);
});
