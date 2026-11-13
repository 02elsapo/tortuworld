const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'v10.html'), 'utf8');

test('free tournament is the default locked mode and can be manually unlocked', () => {
  assert.match(html, /let tournamentMode='free'/);
  assert.match(html, /let lock='free'/);
  assert.match(html, /v==='auto'\)lock=null/);
  assert.match(html, /localStorage\.setItem\('cluss\.torneoLock',lock\|\|'auto'\)/);
});

test('inactivity victories advance without awarding a cup', () => {
  assert.match(html, /win\(winner,\{timedOut:true\}\)/);
  assert.match(html, /TAP_POLICY\.shouldAwardCup\(fin,timedOut\)/);
});

test('race divider and versus badge stay beneath the winner popup', () => {
  assert.match(html, /\.win\{[^}]*z-index:5/);
  assert.match(html, /#lanes:after\{[^}]*z-index:4/);
  assert.match(html, /#lanes:before\{[^}]*z-index:4/);
});

test('statistics bar exposes all six LIVE event counters and both dynamic indicators', () => {
  const start = html.indexOf('<div class="evs" id="evs"');
  const end = html.indexOf('<div id="toast"', start);
  const bar = start < 0 || end < 0 ? '' : html.slice(start, end);
  for (const type of ['member', 'chat', 'gift', 'like', 'follow', 'share']) {
    assert.match(bar, new RegExp(`data-k="${type}"`), `${type} counter is missing`);
  }
  assert.match(html, /idleStat\.dataset\.k='idle'/);
  assert.match(html, /limStat\.dataset\.k='lim'/);
  assert.match(html, /id="idleCountdown"/);
  assert.match(html, /id="tapLimit"/);
});

test('statistics bar updates from real events and renders the live tap and idle values', () => {
  assert.match(html, /if\(e&&!e\.bot&&e\.type in ST\)/);
  assert.match(html, /TAP_POLICY\.statEventDelta\(e\.type,e\.activityCount\)/);
  assert.match(html, /TAP_POLICY\.isInteractionEvent\(e\.type\)/);
  assert.match(html, /stFmt\(HEART_N\)/);
  assert.match(html, /TAP_POLICY\.inactivityRemainingSeconds\(now-lastInteractionAt,IDLE_LIMIT_MS\)/);
});
