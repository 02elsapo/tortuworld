const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { once } = require('node:events');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createWebserver, startServer } = require('../server');

function createMonitorService() {
  let eventListener;
  let statusListener;
  const service = {
    state: { username: '', status: 'idle', isConnected: false, error: '' },
    getStatusPayload: () => ({ ...service.state }),
    subscribeToEvents(listener) {
      eventListener = listener;
      return () => { eventListener = null; };
    },
    subscribeToStatus(listener) {
      statusListener = listener;
      return () => { statusListener = null; };
    },
    connectUser(username) {
      Object.assign(service.state, {
        username,
        status: 'connected',
        isConnected: true,
      });
      statusListener({ ...service.state });
    },
    disconnectUser() {},
    refreshRetryWindow() {},
    emit(entry) {
      eventListener(entry);
    },
  };
  return service;
}

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  server.closeAllConnections();
  const closed = once(server, 'close');
  server.close();
  await closed;
}

async function readEvent(reader, eventName) {
  let message = '';
  while (!message.includes(`event: ${eventName}\n`)) {
    const { value, done } = await reader.read();
    assert.equal(done, false, 'SSE stream closed before the expected event');
    message += new TextDecoder().decode(value);
  }
  return message;
}

test('serves the Cluss TikTok overlay as a full-screen PWA', async () => {
  const root = path.join(__dirname, '..');
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY cluss\.html \.\//);
  assert.equal(fs.existsSync(path.join(root, 'cluss.html')), true);
  assert.equal(fs.existsSync(path.join(root, 'tortugas_tiktok.html')), false);
  assert.equal(fs.existsSync(path.join(root, 'v2_1 (1).html')), false);
  assert.equal(fs.existsSync(path.join(root, 'tortugas.html')), false);
  assert.equal(fs.existsSync(path.join(root, 'v1.3.html')), false);
  assert.equal(fs.existsSync(path.join(root, 'v68.html')), false);
  assert.doesNotMatch(dockerfile, /v1\.3\.html/);
  assert.doesNotMatch(dockerfile, /v45\.html/);
  assert.equal(fs.existsSync(path.join(root, 'v45.html')), false);

  const monitorService = createMonitorService();
  const { server } = createWebserver({
    configurationPath: path.join(os.tmpdir(), `tortu-test-${process.pid}.json`),
    monitorService,
  });
  const baseUrl = await listen(server);

  try {
    const backendResponse = await fetch(`${baseUrl}/backend`);
    assert.equal(backendResponse.status, 200);
    assert.match(await backendResponse.text(), /fetch\('\/api\/reconnect', \{ method: 'POST' \}\)/);
    assert.equal(monitorService.state.isConnected, false, 'opening the backend must not connect TikTok');

    const rootResponse = await fetch(baseUrl);
    assert.equal(rootResponse.status, 200);
    assert.equal(monitorService.state.isConnected, false, 'serving the overlay must not connect TikTok');
    assert.match(rootResponse.headers.get('cache-control'), /no-store/);
    const html = await rootResponse.text();
    assert.match(html, /new EventSource\('\/api\/events'\)/);
    assert.match(html, /source\.addEventListener\('update'/);
    assert.match(html, /fetch\('\/api\/reconnect'/);
    assert.match(html, /const RACE_SECONDS=1800/);
    assert.match(html, /const PASSIVE_CAP=100/);
    assert.match(html, /const START_DUELO=\['ol','cp'\]/);
    assert.match(html, /P\.duel=duel\.slice\(\)/);
    assert.match(html, /P\.nextRival=nextRival/);
    assert.match(html, /function brNew\(mode=tournamentMode\)/);
    assert.match(html, /function roundName\(k\)/);
    assert.match(html, /function interactionFinalists\(\)/);
    assert.match(html, /const TOURNAMENT_MODES=\['libertadores','champions','countries','america'\]/);
    assert.ok(html.indexOf('<h1 class="title">CLUSS</h1>') < html.indexOf('<section class="board">'));
    assert.match(html, /tournamentMode=TOURNAMENT_MODES\[\(TOURNAMENT_MODES\.indexOf\(tournamentMode\)\+1\)%TOURNAMENT_MODES\.length\]/);
    assert.match(html, /stCloseTimer=setTimeout\(stClose,3000\)/);
    assert.match(html, /botTurboGiftCloseTimer=setTimeout\(closeBotTurboGift,2800\)/);
    assert.match(html, /rs=setTimeout\(reset,2800\)/);
    assert.match(html, /rs=setTimeout\(nextMatch,fin\?7000:5000\)/);
    assert.match(html, /const ESFUERZO=\{ol:4,cp:4,li:4,gu:4,lu:4,na:4,sa:4,to:4\}/);
    assert.match(html, /const PISTA=1/);
    assert.match(html, /const TURBO_PPS=4,BOT_TURBO_PPS=1,TURBO_PROLONGED_MS=10000/);
    assert.match(html, /const GIFT_PROGRESS=10,GIFT_TEAM_WINDOW_MS=60000/);
    assert.match(html, /lu:\{id:'lu',n:'LUQUEÑO'/);
    assert.match(html, /na:\{id:'na',n:'NACIONAL'/);
    assert.match(html, /sa:\{id:'sa',n:'SOL DE AMÉRICA'/);
    assert.match(html, /to:\{id:'to',n:'12 DE OCTUBRE'/);
    assert.match(html, /function renderTop3\(\)\{const el=document\.getElementById\('top3'\);if\(!el\|\|!BR\)return/);
    assert.match(html, /type==='gift'\?GIFT_PROGRESS\*n/);
    assert.match(html, /const BOT_TURBO_GIFT_MIN_MS=30000,BOT_TURBO_GIFT_MAX_MS=40000/);
    assert.match(html, /id="botTurboGift" hidden role="dialog"/);
    assert.match(html, /id="botTurboGiftClose" type="button">CERRAR</);
    assert.match(html, /id="bRefresh"/);
    assert.match(html, /location\.reload\(\)/);
    assert.match(html, /aria-label="Límite de taps del turbo y versión 1\.1\.0"/);
    assert.doesNotMatch(html, /v1\.0\.11/);
    assert.match(html, /v1\.1\.0/);
    assert.match(html, /before\(tournamentButton\)/);
    assert.match(html, /setAttribute\('y',p<=50\?456\+54-p\*4\.8-16:528\+54-p\*4\.8\+14\)/);
    assert.match(html, /id="clubName\$\{i\}".*>\$\{t\.n\}<\/text>/);
    assert.match(html, /\$\('#clubName'\+i\)\.textContent=T\[i\]\.n/);
    assert.doesNotMatch(html, /out\?\.32:1/);
    assert.match(html, /id="bVozB"/);
    assert.match(html, /const CHAT_LEE_TODOS=true/);
    assert.match(html, /const BOT_CAP=80/);
    assert.match(html, /const greeted=new Set\(\);let grLast=-1e9/);
    assert.match(html, /joined\.add\(k\);greet\(u,t,e\.displayName\)/);
    assert.match(html, /const txt='Saludamos al hincha de '\+cap\(T\[t\]\.n\)\+', '\+name/);
    assert.match(html, /const ENGAGEMENT_AT=\[50,75\]/);
    assert.doesNotMatch(html, /25:'Para avanzar, comenta el nombre de tu equipo en el chat y suma taps con APOYAR'/);
    assert.match(html, /function nextEngagementCall\(progress,done\)/);
    assert.match(html, /call\.percent===50&&vSess\.has\('turbo-rose'\)/);
    assert.match(html, /if\(call\.percent===50\)vSess\.add\('turbo-rose'\)/);
    assert.doesNotMatch(html, /LOSING_LINES|AVISO PERIODICO/);
    assert.match(html, /now-alLast<18000/);
    assert.match(html, /data-local-only disabled aria-label="APOYAR deshabilitado/);
    assert.match(html, /data-local-only disabled aria-label="ROSITA deshabilitada/);
    assert.match(html, /class="cta apoyar-cta" data-local-only disabled/);
    assert.match(html, /class="cta rosita-cta" data-local-only disabled/);
    assert.match(html, /class="hint">EN EL LIVE</);
    assert.match(html, /class="hint">MODO TURBO</);
    assert.match(html, /\.cta\[data-local-only\]:disabled\{opacity:1/);
    assert.doesNotMatch(html, /heartAdd\(sel/);
    assert.match(html, /role="progressbar"/);
    assert.doesNotMatch(html, /document\.querySelectorAll\('\.hb'\)\.forEach/);
    assert.match(html, /hype\('💵🔫','','➜ 🏆'/);
    assert.doesNotMatch(html, /const tap=\(\)=>heartAdd\(i,1\)/);
    assert.match(html, /heartAdd\(i,\(TAP_WEIGHTS\[type\]\|\|0\)\*n\)/);
    assert.match(html, /RETOQUES FINALES \(v2\.1\): confeti, efectos, banners, pips de copas/);
    assert.match(html, /window\.fx=\{confetti/);
    assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
    assert.match(html, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
    assert.match(html, /function handleLiveEntry\(entry\)/);
    assert.match(html, /activityCount/);
    assert.deepEqual(await fetch(`${baseUrl}/api/config`).then((response) => response.json()), {
      username: 'd4n1el325',
    });

    for (const route of ['/overlay', '/tortugas.html', '/tortugas_tiktok.html', '/v2.0.html']) {
      const response = await fetch(`${baseUrl}${route}`);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), html);
    }
    assert.equal((await fetch(`${baseUrl}/v1.3.html`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/v68.html`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/v60.html`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/v45.html`)).status, 404);
    const serviceWorker = await fetch(`${baseUrl}/sw.js`);
    assert.equal(serviceWorker.status, 200);
    assert.match(await serviceWorker.text(), /tortu-shell-v8/);
    const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
    assert.equal(manifest.status, 200);
    const appManifest = await manifest.json();
    assert.equal(appManifest.name, 'cluss');
    assert.equal(appManifest.short_name, 'cluss');
    assert.equal(appManifest.display, 'fullscreen');
    assert.deepEqual(await fetch(`${baseUrl}/health`).then((response) => response.json()), {
      ok: true,
    });
  } finally {
    await close(server);
  }
});

test('draws a stable next opponent from clubs outside the current duel', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const pool = { ol: {}, cp: {}, li: {}, gu: {}, lu: {}, na: {}, sa: {} };
  const drawSource = html.match(/function drawNextRival\(duel=DUELO\)\{[\s\S]*?\n\}/);
  assert.ok(drawSource, 'the overlay must define a random rival selector');
  const drawFirst = vm.runInNewContext(`(${drawSource[0]})`, {
    POOL: pool,
    DUELO: ['ol', 'cp'],
    Math: { random: () => 0, floor: Math.floor },
  });
  const drawLast = vm.runInNewContext(`(${drawSource[0]})`, {
    POOL: pool,
    DUELO: ['ol', 'cp'],
    Math: { random: () => 0.99, floor: Math.floor },
  });
  assert.equal(drawFirst(), 'li');
  assert.equal(drawLast(), 'sa');
  assert.equal(drawLast(['ol', 'li']), 'sa');

  const fixtureSource = html.match(/function nextFixture\(winnerId,rival=nextRival,duel=DUELO\)\{[\s\S]*?\n\}/);
  assert.ok(fixtureSource, 'the overlay must pair the winner with the saved draw');
  const nextFixture = vm.runInNewContext(`(${fixtureSource[0]})`, {
    POOL: pool,
    DUELO: ['ol', 'cp'],
    nextRival: 'gu',
  });
  assert.deepEqual(Array.from(nextFixture('ol')), ['ol', 'gu']);
  assert.deepEqual(Array.from(nextFixture('cp', 'li', ['ol', 'cp'])), ['cp', 'li']);
});

test('the prolonged manual turbo advances more than the bot turbo', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function turboGain\(rate,ms,handicap\)\{[\s\S]*?\}/);
  assert.ok(source, 'the overlay must calculate turbo progress using duration and handicap');
  const turboGain = vm.runInNewContext(`(${source[0]})`);

  assert.equal(turboGain(4, 8000, 0.25), 8);
  assert.equal(turboGain(1, 4000, 0.25), 1);
});

test('gift boosts only use the team mentioned in chat within the previous minute', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const helperSource = html.match(/function recentChatTeam\(key,now=Date\.now\(\)\)\{[\s\S]*?\n\}/);
  const handlerSource = html.match(/function handleLiveEntry\(entry\)\{[\s\S]*?\n\}/);
  assert.ok(helperSource, 'the overlay must resolve gifts only to a recently supported team');
  assert.ok(handlerSource, 'the overlay must handle real TikTok gift events');
  let now = 10_000;
  const recentChatPicks = new Map();
  const recentChatTeam = vm.runInNewContext(`(${helperSource[0]})`, {
    Date: { now: () => now },
    recentChatPicks,
    GIFT_TEAM_WINDOW_MS: 60_000,
  });
  const picks = new Map();
  const received = [];
  const handleLiveEntry = vm.runInNewContext(`(${handlerSource[0]})`, {
    Date: { now: () => now },
    lastChat: new Map(),
    picks,
    recentChatPicks,
    recentChatTeam,
    findTeam: (content) => content === 'Cerro' ? 1 : -1,
    push: (...event) => received.push(event),
  });

  handleLiveEntry({ type: 'chat', username: 'viewer', content: 'Cerro' });
  now = 20_000;
  handleLiveEntry({ type: 'gift', username: 'viewer', activityCount: 2 });
  assert.deepEqual(received, [[1, 'chat', 1], [1, 'gift', 2]]);

  now = 70_001;
  handleLiveEntry({ type: 'gift', username: 'viewer', activityCount: 1 });
  assert.deepEqual(received, [[1, 'chat', 1], [1, 'gift', 2]]);
});

test('the bot turbo targets the team that is behind', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function losingLane\(progress\)\{[\s\S]*?\}/);
  assert.ok(source, 'the overlay must select the losing team for its free turbo');
  const losingLane = vm.runInNewContext(`(${source[0]})`);

  assert.equal(losingLane([24, 31]), 0);
  assert.equal(losingLane([45, 37]), 1);
  assert.equal(losingLane([40, 40]), -1);
});

test('the bot does not offer free turbos', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const canGift = html.match(/function canBotTurboGift\(\)\{[\s\S]*?\}/);
  assert.ok(canGift, 'the overlay must define whether the bot can offer free turbo');
  assert.match(html, /const BOT_TURBO_GIFT_ON=false/);
  const canOffer = vm.runInNewContext(`(() => {
    let botTurboGiftCount = 0;
    const BOT_TURBO_GIFT_ON = false;
    const BOT_TURBO_GIFT_MAX = 4;
    const BOT_TURBO_GIFT_STOP_AT = 75;
    ${canGift[0]}
    return canBotTurboGift();
  })()`, { S: [{ p: 24 }, { p: 31 }] });
  assert.equal(canOffer, false);
});

test('removes the tap call-to-action and keeps later prompts', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function nextEngagementCall\(progress,done\)\{[\s\S]*?\n\}/);
  assert.ok(source, 'the overlay must select only the next interaction milestone');
  const nextEngagementCall = vm.runInNewContext(`(${source[0]})`, {
    ENGAGEMENT_AT: [50, 75],
    ENGAGEMENT_CALLS: {
      50: 'envía una rosita real para activar el modo turbo',
      75: 'sigue y comparte',
    },
    Math,
  });
  const announced = new Set();

  assert.equal(nextEngagementCall([30, 0], announced), null);

  const first = nextEngagementCall([60, 0], announced);
  assert.equal(first.percent, 50);
  assert.match(first.text, /rosita real.*modo turbo/);
  announced.add('engagement50');

  const second = nextEngagementCall([80, 0], announced);
  assert.equal(second.percent, 75);
  assert.match(second.text, /sigue y comparte/);
  announced.add('engagement75');
  assert.equal(nextEngagementCall([100, 0], announced), null);
});

test('uses Don Tortu for explanations and defines the staged prompts', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const introductionSource = html.match(/function queueNarratorIntroductions\(\)\{[\s\S]*?\n\}/);
  assert.ok(introductionSource, 'the overlay must keep the team narrators disabled');
  const narratorQueue = [];
  vm.runInNewContext(`(${introductionSource[0]})()`, {
    T: [{ n: 'OLIMPIA' }, { n: 'CERRO' }],
    narratorQueue,
  });
  assert.deepEqual(narratorQueue, []);
  assert.match(html, /const dinamicaTxt=\(\)=>/);
  assert.match(html, /id:'intro',at:2/);
  assert.match(html, /const ENGAGEMENT_CALLS=\{/);
  assert.match(html, /hype\('💵🔫','','➜ 🏆'/);
  assert.match(html, /txt\(ro,'ROSITA','activa el TURBO 🚀'\)/);
  assert.match(html, /call\.percent===50&&vSess\.has\('turbo-rose'\)/);
  assert.match(html, /if\(call\.percent===50\)vSess\.add\('turbo-rose'\)/);
});

test('enlarges fan avatars and abbreviates large podium scores', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function formatAvatarScore\(score\)\{[\s\S]*?\n\}/);
  assert.ok(source, 'the overlay must format displayed fan scores');
  const formatAvatarScore = vm.runInNewContext(`(${source[0]})`, { Intl });

  assert.equal(formatAvatarScore(999), '999');
  assert.equal(formatAvatarScore(1000), '1k');
  assert.equal(formatAvatarScore(1250), '1.3k');
  assert.equal(formatAvatarScore(1_000_000), '1m');
  assert.match(html, /\.pod \.pw \.ua\{width:26px;height:26px/);
  assert.match(html, /\.pod \.pw1 \.ua\{width:32px;height:32px/);
});

test('does not display spoken narrator text', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const narratorCard = html.match(/function showNarrator\(team\)\{[\s\S]*?\n\}/);
  assert.ok(narratorCard, 'the overlay may identify the active narrator');
  assert.doesNotMatch(narratorCard[0], /textContent|innerHTML|narratorText/);
  assert.doesNotMatch(html, /class="narrator-comment"|id="narratorText|showNarratorComment/);
  assert.doesNotMatch(html, /if\(sub\)say\(sub\)/);
});

test('uses a Spanish Google voice for Don Tortu and a male voice for the chat reader', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const start = html.indexOf('const FEMALE_VOICE=');
  const end = html.indexOf('/* Voz del relator', start);
  assert.ok(start >= 0 && end > start, 'the overlay must define narrator voice selection');
  const pickV = vm.runInNewContext(`${html.slice(start, end)}\npickV;`, {
    voices: [
      { name: 'Google español', lang: 'es-US' },
      { name: 'Jorge', lang: 'es-ES' },
    ],
  });

  assert.equal(pickV().name, 'Google español');
  assert.equal(pickV('chat').name, 'Jorge');
});

test('does not narrate free turbo gifts and explains the real rose turbo once', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const giftSource = html.match(/function showBotTurboGift\(\)\{[\s\S]*?\n\}/);
  assert.ok(giftSource, 'the overlay must still display the free turbo gift');
  assert.doesNotMatch(giftSource[0], /\b(?:speak|say)\(/);

  const voiceScripts = html.match(/const VL=\[([\s\S]*?)\n\];/);
  assert.ok(voiceScripts, 'the overlay must define its voice scripts');
  assert.doesNotMatch(voiceScripts[1], /gratis|regalar/i);
  assert.match(html, /Para activar el modo turbo, envía una rosita real/);
  assert.match(html, /if\(call\.percent===50\)vSess\.add\('turbo-rose'\)/);
});

test('a full tap counter advances 3% and activates turbo', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function heartAdd\(t,n\)\{[\s\S]*?\n\}/);
  assert.ok(source, 'the overlay must define tap-to-board progress');

  const heart = [0];
  const S = [{ p: 0 }];
  const heartBar = {
    classList: { add() {}, remove() {} },
    offsetWidth: 0,
    querySelector(selector) {
      if (selector === 'b') return { style: {} };
      if (selector === 'em') return { textContent: '' };
      return { classList: { add() {}, remove() {} } };
    },
  };
  const context = {
    over: false,
    T: [{}],
    heart,
    HEART_N: 50,
    HEART_TURBO_PROGRESS: 3,
    TURBO_PROLONGED_MS: 10000,
    turboOn: (...args) => turboCalls.push(args),
    S,
    $: () => heartBar,
    renderHeart() {},
    tapPop() {},
    update() {},
    walk() {},
    A: { sfx() {} },
    float() {},
    hype() {},
    win() {},
  };
  const turboCalls = [];
  const heartAdd = vm.runInNewContext(`(${source[0]})`, context);
  assert.match(html, /let HEART_N=50,heartLimitOffset=0/);
  assert.match(html, /id="bTurboDn"/);
  assert.match(html, /id="bTurboUp"/);
  assert.match(html, /heartLimitOffset=Math\.max\(-10000,Math\.min\(10000,heartLimitOffset\+d\)\)/);
  assert.match(html, /HEART_TURBO_PROGRESS=3/);

  heartAdd(0, 49);
  assert.equal(S[0].p, 0);
  assert.equal(heart[0], 49);
  heartAdd(0, 1);
  assert.equal(S[0].p, 3);
  assert.equal(heart[0], 0);
  assert.deepEqual(turboCalls, [[0, 10000]]);

  heartAdd(0, 49);
  assert.equal(S[0].p, 3);
  assert.equal(heart[0], 49);
  assert.deepEqual(turboCalls, [[0, 10000]]);

  heartAdd(0, 1);
  assert.equal(S[0].p, 6);
  assert.equal(heart[0], 0);
  assert.deepEqual(turboCalls, [[0, 10000], [0, 10000]]);

  heartAdd(0, 25);
  assert.equal(S[0].p, 6);
  assert.equal(heart[0], 25);
  assert.deepEqual(turboCalls, [[0, 10000], [0, 10000]]);
});

test('tap turbo duration is capped at ten seconds', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/const turboOn=\(t,ms,power=TURBO_PPS\)=>\{[\s\S]*?\};/);
  assert.ok(source);
  const turbo = [0];
  const startTurbo = vm.runInNewContext(source[0].replace(/^const turboOn=/, ''), {
    turbo,
    turboPower: [0],
    TURBO_PROLONGED_MS: 10000,
    TURBO_PPS: 4,
    performance: { now: () => 1000 },
  });

  startTurbo(0, 20000);
  assert.equal(turbo[0], 11000);
});

test('dynamic tap cap starts at 50 and applies the tournament/final increments', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const stepSource = html.match(/function heartLimitStep\(\)\{[\s\S]*?\n\s*\}/);
  const syncSource = html.match(/function syncHeartLimit\(\)\{[\s\S]*?\n\s*\}/);
  assert.ok(stepSource);
  assert.ok(syncSource);
  const stepFor = (DUELO, k) => vm.runInNewContext(`(${stepSource[0]})`, {
    DUELO,
    BR: { r: [[], [], [], []] },
    brCur: () => ({ k }),
  })();

  assert.equal(stepFor(['lib-oli', 'lib-fla'], 0), 100);
  assert.equal(stepFor(['lib-gua', 'lib-fla'], 0), 50);
  assert.equal(stepFor(['lib-gua', 'lib-cer'], 0), 100);
  assert.equal(stepFor(['ucl-rm', 'ucl-bc'], 2), 100);
  assert.equal(stepFor(['lib-oli', 'lib-fla'], 2), 200);
  assert.equal(stepFor(['lib-gua', 'lib-fla'], 2), 150);

  const state = {
    S: [{ p: 0 }, { p: 0 }],
    HEART_N: 50,
    heartLimitOffset: 0,
    heartLimitStep: () => 100,
    T: [{}, {}],
    renderHeart() {},
  };
  vm.runInNewContext(`(${syncSource[0]})`, state)();
  assert.equal(state.HEART_N, 50);
  state.S[0].p = 10;
  vm.runInNewContext(`(${syncSource[0]})`, state)();
  assert.equal(state.HEART_N, 150);

  const narratorScripts = html.match(/const dinamicaTxt=[\s\S]*?const VL=\[[\s\S]*?\n\];/);
  assert.ok(narratorScripts);
  assert.doesNotMatch(narratorScripts[0], /\b\d+\s*taps?\b/i);
  assert.match(html, /class="version" aria-label="Límite de taps del turbo y versión 1\.1\.0"><span id="turboLim">[^<]*50 taps<\/span> · v1\.1\.0<\/span>/);
});

test('the two most interactive participants enter the final', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function interactionFinalists\(\)\{[\s\S]*?\n\}/);
  assert.ok(source);
  const finalists = vm.runInNewContext(`(${source[0]})`, {
    BR: { r: [['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], [], ['a', 'b'], [null]] },
    tournamentInteractions: { a: 2, b: 3, c: 1, d: 10, e: 9, f: 0, g: 0, h: 0 },
  });
  assert.deepEqual(Array.from(finalists()), ['d', 'e']);
});

test('real TikTok events only add their configured weights to the tap counter', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/push=function\(i,type,n=1,m=1\)\{[\s\S]*?\n};/);
  assert.ok(source, 'the overlay must route real events through the tap counter');

  const weightsSource = html.match(/const TAP_WEIGHTS=(\{[^}]+\})/);
  assert.ok(weightsSource, 'the overlay must define event weights');
  const weights = vm.runInNewContext(`(${weightsSource[1]})`);
  assert.deepEqual({ ...weights }, { member: 1, chat: 10, like: 1, follow: 3, share: 5 });
  assert.doesNotMatch(html, /ROSITA_TAPS/);
  const progress = { p: 42, l: 0, g: 0 };
  const received = [];
  const gifts = [];
  let directPushes = 0;
  const context = {
    live: true,
    curBot: false,
    S: [progress],
    realLane: [[]],
    cu: 'viewer',
    Date: { now: () => 1 },
    over: false,
    lead: 0,
    lt: 0,
    TAP_WEIGHTS: weights,
    GIFT_PROGRESS: 10,
    _push() { directPushes++; },
    heartAdd(team, amount) { received.push([team, amount]); },
    giftTurboOn(team, count) { gifts.push([team, count]); },
    grow() {},
    update() {},
    float() {},
    walk() {},
    PTS: {},
    BOT_W: 0.25,
    HANDICAP: [0.5],
    contrib: new Map(),
    streak: 0,
    P: { best: 0 },
    addXp() {},
    ach() {},
    A: { sfx() {} },
    performance: { now: () => 100 },
    pm: 1,
    hud() {},
  };
  const push = vm.runInNewContext(`(() => { let push; ${source[0]}; return push; })()`, context);

  for (const [type, count] of [['member', 1], ['chat', 1], ['like', 12], ['follow', 1], ['share', 1]]) {
    push(0, type, count);
  }

  assert.deepEqual(received, [
    [0, 1], [0, 10], [0, 12], [0, 3], [0, 5],
  ]);
  assert.equal(progress.p, 42);
  assert.equal(directPushes, 0);
  assert.deepEqual(gifts, []);
  push(0, 'gift', 2);
  assert.equal(progress.p, 62);
  assert.equal(progress.g, 2);
  assert.deepEqual(gifts, [[0, 2]]);
});

test('each real gift advances 10% and activates twenty seconds of five-percent-per-second turbo', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function giftTurboOn\(t,count\)\{[\s\S]*?\}/);
  assert.ok(source, 'the overlay must define per-gift turbo timing');
  assert.match(html, /GIFT_TURBO_MS=20000,GIFT_TURBO_PPS=5/);
  const turboGainSource = html.match(/function turboGain\(rate,ms,handicap\)\{[\s\S]*?\}/);
  const turboGain = vm.runInNewContext(`(${turboGainSource[0]})`);
  assert.equal(10 + turboGain(5, 20_000, 1), 110);

  let now = 1000;
  const giftTurboUntil = [0];
  const giftTurboOn = vm.runInNewContext(`(${source[0]})`, {
    giftTurboUntil,
    GIFT_TURBO_MS: 20000,
    performance: { now: () => now },
  });

  giftTurboOn(0, 1);
  assert.equal(giftTurboUntil[0], 21_000);
  now = 2000;
  giftTurboOn(0, 2);
  assert.equal(giftTurboUntil[0], 61_000);
});

test('money gun wins for the team named by the gifting user', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function isMoneyGunGift\(e\)\{[\s\S]*?\n\}/);
  assert.ok(source, 'the overlay must recognize Money Gun gift events');
  const isMoneyGunGift = vm.runInNewContext(`(${source[0]})`);

  assert.equal(isMoneyGunGift({ content: 'Envió Money Gun' }), true);
  assert.equal(isMoneyGunGift({ giftName: 'Pistola de dinero' }), true);
  assert.equal(isMoneyGunGift({ giftName: 'Diamond Gun' }), false);
  assert.match(html, /if\(!isMoneyGunGift\(e\)\)return;[\s\S]*?S\[t\]\.p=100;win\(t\)/);
});

test('gift narration interrupts other voice and announces the team turbo', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const textSource = html.match(/function giftThanksText\(g\)\{[\s\S]*?\n\}/);
  assert.ok(textSource, 'the overlay must create a gift-specific thank-you');
  const giftThanksText = vm.runInNewContext(`(${textSource[0]})`, {
    T: [{ n: 'CERRO' }],
    cap: (name) => name[0] + name.slice(1).toLowerCase(),
  });
  assert.equal(giftThanksText({ name: 'Ana', t: 0, count: 1 }), '¡Gracias Ana por tu regalo! ¡Cerro entró en modo turbo!');
  assert.match(html, /speak\(txt,null,true,undefined,\(\)=>\{giftSpeaking=false;speakNextGift\(\)\}\)/);
});

test('race victory waits until both turbo effects have finished', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'cluss.html'), 'utf8');
  const source = html.match(/function turboFinished\(t,now=performance\.now\(\)\)\{[\s\S]*?\}/);
  assert.ok(source, 'the overlay must defer victory until turbo ends');
  const turboFinished = vm.runInNewContext(`(${source[0]})`, {
    turbo: [12_000],
    giftTurboUntil: [20_000],
    performance: { now: () => 10_000 },
  });

  assert.equal(turboFinished(0, 15_000), false);
  assert.equal(turboFinished(0, 20_000), true);
});

test('forwards normalized TikTok updates in the shape consumed by version 68', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tortu-test-'));
  const monitorService = createMonitorService();
  const { server } = createWebserver({
    configurationPath: path.join(directory, 'config.json'),
    commentStatsPath: path.join(directory, 'comment-stats.json'),
    recentUsersPath: path.join(directory, 'recent-users.json'),
    monitorService,
  });
  const baseUrl = await listen(server);
  let reader;

  try {
    const stream = await fetch(`${baseUrl}/api/events`);
    reader = stream.body.getReader();
    await reader.read();

    const configResponse = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '@race-host' }),
    });
    assert.deepEqual(await configResponse.json(), { ok: true, username: 'race-host' });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'config.json'), 'utf8')), {
      username: 'race-host',
    });
    assert.equal(monitorService.state.status, 'idle', 'saving configuration must not connect TikTok');
    const reconnectResponse = await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' });
    assert.deepEqual(await reconnectResponse.json(), { ok: true, username: 'race-host' });
    assert.equal(monitorService.state.isConnected, true);

    const entry = {
      type: 'chat',
      username: 'viewer',
      content: 'Argentina',
      time: '2026-11-08T12:00:00.000Z',
    };
    monitorService.emit(entry);
    const update = await readEvent(reader, 'update');
    const payload = JSON.parse(update.match(/event: update\ndata: (.+)\n/)[1]);
    assert.deepEqual(payload.entry, entry);

    const stats = await fetch(`${baseUrl}/api/comment-stats`).then((response) => response.json());
    assert.equal(stats.total, 1);
    assert.equal(stats.teams.find((team) => team.code === 'AR').comments, 1);

    monitorService.emit({
      type: 'member',
      username: 'new-viewer',
      avatar: 'https://example.com/new-viewer.png',
    });
    const savedRecentUsers = await fetch(`${baseUrl}/api/recent-users`).then((response) => response.json());
    assert.equal(savedRecentUsers.users[0].username, 'new-viewer');
    assert.equal(savedRecentUsers.users[0].avatar, 'https://example.com/new-viewer.png');
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(directory, 'recent-users.json'), 'utf8')).users,
      savedRecentUsers.users,
    );

    const recentUsers = [
      { username: 'viewer-one', avatar: 'https://example.com/one.png', t: 1 },
      { username: 'viewer-two', avatar: '', t: 2 },
    ];
    const savedUsersResponse = await fetch(`${baseUrl}/api/recent-users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: recentUsers }),
    });
    const savedUsers = await savedUsersResponse.json();
    assert.match(savedUsers.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(savedUsers.users, recentUsers);
    assert.deepEqual(
      await fetch(`${baseUrl}/api/recent-users`).then((response) => response.json()),
      JSON.parse(fs.readFileSync(path.join(directory, 'recent-users.json'), 'utf8')),
    );
  } finally {
    if (reader) await reader.cancel();
    await close(server);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('server starts on the requested port and logs its address', async () => {
  const messages = [];
  const server = startServer({
    port: 0,
    host: '127.0.0.1',
    createWebserver: () => createWebserver({ monitorService: createMonitorService() }),
    logger: { log: (message) => messages.push(message), error() {} },
  });
  await once(server, 'listening');
  assert.match(messages[0], /http:\/\/localhost:\d+/);
  await close(server);
});
