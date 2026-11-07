const assert = require('node:assert/strict');
const fs = require('node:fs');
const { once } = require('node:events');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createWebserver, startServer } = require('../server');
const { createTikTokModule } = require('../modules/tiktok');

test('starter serves the overlay, backend, health check, and TikTok API', async () => {
  const { server } = createWebserver({
    configurationPath: path.join(os.tmpdir(), `tiktok-starter-${process.pid}.json`),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    assert.deepEqual(await fetch(`${baseUrl}/health`).then((response) => response.json()), { ok: true });

    const overlay = await fetch(baseUrl);
    assert.equal(overlay.status, 200);
    const overlayHtml = await overlay.text();
    assert.match(overlayHtml, /<link rel="manifest" href="\/manifest\.webmanifest">/);
    assert.match(overlayHtml, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
    assert.match(overlayHtml, /\.tag b\{[^}]*font-size:clamp\(10px,1\.4vw,16px\)/);
    assert.match(overlayHtml, /max-width:min\(calc\(100% - 1\.4rem\),36vw\)/);
    assert.doesNotMatch(overlayHtml, /id="rnd"/);
    assert.match(overlayHtml, /#banner\{[^}]*height:100%[^}]*overflow:hidden/);
    assert.match(overlayHtml, /#slot\{height:1\.1rem;margin-top:\.05rem\}/);
    assert.match(overlayHtml, /new EventSource\('\/api\/events'\)/);
    assert.match(overlayHtml, /<title>Sigue al líder de la carrera y ayuda a cuentas pequeñas a ganar seguidores<\/title>/);
    assert.match(overlayHtml, /<h1 class="disp">SIGUE AL LÍDER Y AYUDA A GANAR SEGUIDORES<\/h1>/);
    assert.match(overlayHtml, /function handleTikTokEntry\(entry,isBot=false\)/);
    assert.match(overlayHtml, /function scoreContestant\(entry,isBot=false\)/);
    assert.match(overlayHtml, /if\(p\.isBot\)return null/);
    assert.match(overlayHtml, /if\(isBot&&!S\.slotOf\.has\(key\)&&!C\.some\(c=>!S\.slotUser\[c\.c\]\)\)return/);
    assert.match(overlayHtml, /if\(lo\.o\.isBot\)contestants\.delete\(lo\.o\.key\)/);
    assert.match(overlayHtml, /else if\(!isBot\)player\.isBot=false/);
    assert.match(overlayHtml, /addLiveEvent\(entry\);handleTikTokEntry\(entry,true\)/);
    assert.match(overlayHtml, /names:\['Ana','Leo','Lola','Rayo','Tito'\]/);
    assert.match(overlayHtml, /const liveEvents=\[\],liveEventLimit=3,contestants=new Map\(\)/);
    assert.match(overlayHtml, /entry\.type==='chat'\?1/);
    assert.match(overlayHtml, /entry\.type==='gift'\?diamonds\*counts/);
    assert.match(overlayHtml, /entry\.type==='like'\?counts\*\.1/);
    assert.match(overlayHtml, /@media \(orientation:portrait\)/);
    assert.match(overlayHtml, /--padr:12%/);
    assert.match(overlayHtml, /#bottom\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.35fr\)/);
    assert.match(overlayHtml, /grid-template-rows:minmax\(0,2fr\) minmax\(0,\.8fr\)/);
    assert.match(overlayHtml, /#app\{top:0;bottom:50%/);
    assert.match(overlayHtml, /\.tur\{top:50%;width:auto;height:100%;aspect-ratio:70 \/ 46/);
    assert.match(overlayHtml, /#bottom\.on\{display:flex\}/);
    assert.match(overlayHtml, /function showCelebration\(duration=2300\)/);
    assert.match(overlayHtml, /else if\(ty==='gift'\)\{bigFx\('🎁 ¡REGALO!'/);
    assert.match(overlayHtml, /if\(!S\.over&&S\.winner\)finish\(S\.winner\)/);
    assert.match(overlayHtml, /#spot\.on\{display:flex;animation:scard var\(--sm,3s\)/);
    assert.match(overlayHtml, /crawl:\.15,restartMs:3600/);
    assert.match(overlayHtml, /const crawl=S\.go&&S\.slotUser\[k\]&&!S\.over\?t\.cr\*dt:0/);
    assert.match(overlayHtml, /t\.ph\+=dt\*\(\.65\+5\.35\*speedRatio\)/);
    assert.match(overlayHtml, /step:th\(\(speed=0\)=>\{if\(!SND\)return/);
    assert.match(overlayHtml, /noise\(\.08,\.16,t,700\);tone\(105\+speed\*20,\.1,'triangle',\.38,t/);
    assert.match(overlayHtml, /if\(S\.go&&S\.slotUser\[k\]&&step!==t\.step\)\{t\.step=step;SFX\.step\(speedRatio\)\}/);
    assert.match(overlayHtml, /<div id="bottom">[\s\S]*<div id="big"><\/div>/);
    assert.match(overlayHtml, /<div id="spotBg"><\/div>\s*<div id="spot"><\/div>/);
    assert.match(overlayHtml, /id="standings"[\s\S]*TOP 5[\s\S]*id="topPlayers"/);
    assert.match(overlayHtml, /id="activity"[\s\S]*EVENTOS[\s\S]*id="eventRows"/);
    assert.match(overlayHtml, /id="specialEvent"/);
    assert.match(overlayHtml, /function showSpecialEvent\(text\)/);
    assert.match(overlayHtml, /#app\{top:3%;bottom:3%;left:3%;right:var\(--padr\)/);
    assert.match(overlayHtml, /function renderTopPlayers\(\)/);
    assert.match(overlayHtml, /function scoreContestant\(entry,isBot=false\)/);
    assert.match(overlayHtml, /\.runner-shell img\{width:100%;height:100%;object-fit:cover\}/);
    assert.match(overlayHtml, /Tortuga de @/);
    assert.match(overlayHtml, /source\.addEventListener\('snapshot'/);
    assert.match(overlayHtml, /function addLiveEvent\(entry\)/);
    assert.match(overlayHtml, /#dot\{position:fixed;right:\.7rem;bottom:\.7rem/);
    assert.match(overlayHtml, /#dot\.on\{background:#36e276/);
    assert.match(overlayHtml, /setTikTokConnectionStatus\(JSON\.parse\(e\.data\)\.connected\)/);

    const overlayAlias = await fetch(`${baseUrl}/overlay`);
    assert.equal(await overlayAlias.text(), overlayHtml);
    assert.match(overlayHtml, /CARRERA DE TORTUGAS v6/);

    const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`);
    assert.equal(manifestResponse.status, 200);
    assert.match(manifestResponse.headers.get('content-type'), /application\/manifest\+json/);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.name, 'tortu');
    assert.equal(manifest.display, 'fullscreen');
    assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
    for (const icon of manifest.icons) {
      assert.equal((await fetch(new URL(icon.src, baseUrl))).status, 200);
    }

    const serviceWorker = await fetch(`${baseUrl}/sw.js`);
    assert.equal(serviceWorker.status, 200);
    assert.match(await serviceWorker.text(), /url\.pathname\.startsWith\('\/api\/'\)/);

    const backend = await fetch(`${baseUrl}/backend`);
    assert.equal(backend.status, 200);
    assert.match(await backend.text(), /Backend básico/);

    const status = await fetch(`${baseUrl}/api/status`);
    assert.equal(status.status, 200);
    assert.equal((await status.json()).connected, false);
    assert.deepEqual(await fetch(`${baseUrl}/api/config`).then((response) => response.json()), {
      username: '',
    });

    const events = await fetch(`${baseUrl}/api/events`);
    const reader = events.body.getReader();
    const initialMessages = new TextDecoder().decode((await reader.read()).value);
    assert.match(initialMessages, /event: status/);
    assert.match(initialMessages, /event: snapshot/);
    await reader.cancel();

    assert.equal((await fetch(`${baseUrl}/api/unknown`)).status, 404);
  } finally {
    server.closeAllConnections();
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('server starts on the requested port and logs its address', async () => {
  const messages = [];
  const server = startServer({
    port: 0,
    host: '127.0.0.1',
    logger: { log: (message) => messages.push(message), error() {} },
  });
  await once(server, 'listening');
  assert.match(messages[0], /http:\/\/localhost:\d+/);
  server.closeAllConnections();
  const closed = once(server, 'close');
  server.close();
  await closed;
});

test('backend configuration connects the account and forwards TikTok events', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-starter-'));
  let eventListener;
  let statusListener;
  const monitorService = {
    state: { username: '', status: 'idle', isConnected: false, error: '' },
    getStatusPayload: () => ({ ...monitorService.state }),
    subscribeToEvents(listener) {
      eventListener = listener;
      return () => { eventListener = null; };
    },
    subscribeToStatus(listener) {
      statusListener = listener;
      return () => { statusListener = null; };
    },
    connectUser(username) {
      Object.assign(monitorService.state, { username, status: 'connected', isConnected: true });
      statusListener({ ...monitorService.state });
    },
    disconnectUser() {},
    emit(entry) {
      eventListener(entry);
    },
  };
  const configurationPath = path.join(directory, 'config.json');
  const { server } = createWebserver({ configurationPath, monitorService });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let reader;

  try {
    const stream = await fetch(`${baseUrl}/api/events`);
    reader = stream.body.getReader();
    await reader.read();

    const invalidConfiguration = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '  ' }),
    });
    assert.equal(invalidConfiguration.status, 400);
    assert.equal((await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' })).status, 409);

    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '@mini-app-host' }),
    });
    assert.deepEqual(await response.json(), { ok: true, username: 'mini-app-host' });
    assert.deepEqual(JSON.parse(fs.readFileSync(configurationPath, 'utf8')), {
      username: 'mini-app-host',
    });

    assert.equal((await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' })).status, 409);
    Object.assign(monitorService.state, { status: 'disconnected', isConnected: false });
    const reconnect = await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' });
    assert.equal(reconnect.status, 200);

    monitorService.emit(null);
    monitorService.emit({});
    for (let index = 0; index < 101; index += 1) {
      monitorService.emit({ type: 'chat', username: 'viewer', content: `Mensaje ${index}` });
    }
    let update = '';
    while (!update.includes('"content":"Mensaje 100"')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      update += new TextDecoder().decode(chunk.value);
    }
    assert.match(update, /event: update/);
    assert.equal((await fetch(`${baseUrl}/api/status`).then((result) => result.json())).eventCount, 100);
  } finally {
    await reader?.cancel();
    server.closeAllConnections();
    const closed = once(server, 'close');
    server.close();
    await closed;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('starter loads saved configuration, lets environment configuration override it, and rejects invalid files', () => {
  assert.throws(() => createTikTokModule(), /canal de eventos/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-starter-config-'));
  const configurationPath = path.join(directory, 'config.json');
  fs.writeFileSync(configurationPath, JSON.stringify({ username: '@saved-host' }));

  const monitorService = {
    state: { username: '', status: 'idle', isConnected: false, error: '' },
    getStatusPayload: () => ({}),
    subscribeToEvents: () => () => {},
    subscribeToStatus: () => () => {},
    connectUser(username) { this.connectedUsername = username; },
    disconnectUser() {},
  };

  try {
    const instance = createWebserver({ configurationPath, monitorService });
    assert.equal(monitorService.connectedUsername, 'saved-host');

    const override = createWebserver({
      configurationPath,
      defaultUsername: '@environment-host',
      monitorService: { ...monitorService, state: { ...monitorService.state } },
    });
    assert.equal(override.monitorService.connectedUsername, 'environment-host');

    fs.writeFileSync(configurationPath, JSON.stringify({ username: 42 }));
    assert.throws(() => createWebserver({ configurationPath }), /configuración guardada de TikTok no es válida/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
