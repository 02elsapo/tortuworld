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
    commentStatsPath: path.join(os.tmpdir(), `tiktok-starter-${process.pid}-stats.json`),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    assert.deepEqual(await fetch(`${baseUrl}/health`).then((response) => response.json()), { ok: true });

    const overlay = await fetch(baseUrl);
    assert.equal(overlay.status, 200);
    const overlayHtml = await overlay.text();
    const overlaySource = overlayHtml.replace(/\s+/g, ' ');
    assert.match(overlaySource, /<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?>/);
    assert.match(overlaySource, /navigator\.serviceWorker[\s\S]*?\.register\("\/sw\.js"\)/);
    assert.match(overlaySource, /<title>\s*Sigue al líder de la carrera y ayuda a cuentas pequeñas a ganar seguidores\s*<\/title>/);
    assert.match(overlaySource, /id="overlayVersion">v1\.6\.0/);
    assert.match(overlaySource, /id="lanes"/);
    assert.match(overlaySource, /#app \{ top: var\(--top, 18%\); bottom: var\(--bot, 7%\);/);
    assert.match(overlaySource, /#lanes \{ --tw: min\(13rem, 16vh\); --n: 9; flex: 0\.85 1 0;/);
    assert.match(overlaySource, /id="ctaMain">\s*💬 ESCRIBE EL NOMBRE DE UN PAÍS/);
    assert.match(overlaySource, /const source = new EventSource\("\/api\/events"\)/);
    assert.match(overlaySource, /source\.addEventListener\("snapshot"/);
    assert.match(overlaySource, /source\.addEventListener\("update"/);
    assert.match(overlaySource, /const crawl = S\.go && !S\.over \? t\.cr \* dt \* m : 0/);
    assert.match(overlaySource, /enabled: false/);
    assert.match(overlaySource, /\.lane\.empty \.tur \{ opacity: 1; filter: none; \}/);
    assert.match(overlaySource, /const FIXED_TEAMS = NATIONS\.slice\(0, 4\)/);
    assert.match(overlaySource, /shuffled\(candidates\)\.slice\(0, 6\)/);
    assert.match(overlaySource, /const POPULAR_COUNTRIES/);
    assert.match(overlaySource, /No se generan eventos de audiencia ni interacciones automáticas/);
    assert.match(overlaySource, /recordCupWin\(nat\(p\)\.code\)/);
    assert.match(overlaySource, /loadCupStats\(\);/);
    assert.match(overlaySource, /function registerFan\(user, code, entry\)/);
    assert.match(overlaySource, /S\.pick\.get\(_u\)[\s\S]*?rnd\(C\)\.c/);
    assert.match(overlaySource, /PENDING_FANS\[code\]\.add\(user\)/);
    assert.match(overlaySource, /function layPendingFanEggs\(code\)/);
    assert.match(overlaySource, /--fan-size: calc\(var\(--flag-size\) \* 1\.2\)/);
    assert.match(overlaySource, /width: calc\(var\(--fan-size\) \* 0\.9\);\s*height: var\(--fan-size\)/);
    assert.match(overlaySource, /border-radius: 50%;\s*overflow: hidden/);
    assert.match(overlaySource, /#lanes \.fa img \{[^}]*width: 100%;[^}]*height: 100%;[^}]*border: 0;/);
    assert.match(overlaySource, /#lanes \.fa\.trail \{[\s\S]*?var\(--fan-size\) \* 0\.45/);
    assert.match(overlaySource, /im\.referrerPolicy = "no-referrer";\s*im\.loading = "eager";\s*im\.onerror = placeholder;\s*im\.src = item\.avatar/);
    assert.match(overlaySource, /#lanes::after[\s\S]*?background-image: radial-gradient/);
    assert.match(overlaySource, /im\.referrerPolicy = "no-referrer"/);
    assert.match(overlaySource, /C\.find\(\(c\) => c\.c === preferred && !S\.slotUser\[c\.c\]\)/);
    assert.match(overlaySource, /function putGiftAhead\(code, entry\)/);
    assert.match(overlaySource, /tgtE = VMAX/);
    assert.match(overlaySource, /S\.pos\[k\] >= t\.giftTarget/);
    assert.match(overlaySource, /const ownsLane = Boolean\(code\)/);
    assert.match(overlaySource, /const code = S\.slotOf\.get\(p\.key\) \|\| S\.pick\.get\(p\.key\)/);
    assert.doesNotMatch(overlaySource, /const CLUBS/);
    assert.doesNotMatch(overlaySource, /if \(Q\.get\("demo"\)\)/);
    assert.doesNotMatch(overlaySource, /S\.pos\[k\] = 0/);
    assert.match(overlaySource, /setRoundTeams\(\);/);
    assert.match(overlaySource, /id="backend-link" href="\/backend"/);
    assert.match(overlaySource, /e\.classList\.add\("fresh"\)/);
    assert.match(overlaySource, /alreadyHere = FANS\[code\]\.has\(user\)/);
    assert.match(overlaySource, /FANINFO\[user\] = \{[\s\S]*?progress:/);
    assert.match(overlaySource, /Comenta tu país y deja tu avatar en la pista/);
    assert.match(overlaySource, /function dropTrail\(code, now\)/);
    assert.match(overlaySource, /message \? "💬 “" \+ message \+ "”" : "💬 Comentó"/);

    const overlayAlias = await fetch(`${baseUrl}/overlay`);
    assert.equal(await overlayAlias.text(), overlayHtml);

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
    const backendHtml = await backend.text();
    assert.match(backendHtml, /Panel de control/);
    assert.match(backendHtml, /Comentarios recibidos y copas ganadas/);

    const status = await fetch(`${baseUrl}/api/status`);
    assert.equal(status.status, 200);
    assert.equal((await status.json()).connected, false);
    assert.deepEqual(await fetch(`${baseUrl}/api/config`).then((response) => response.json()), {
      username: '',
    });
    const commentStats = await fetch(`${baseUrl}/api/comment-stats`).then((response) => response.json());
    assert.equal(commentStats.total, 0);
    assert.ok(commentStats.teams.every((team) => team.type === 'country'));
    const cupStats = await fetch(`${baseUrl}/api/cup-stats`).then((response) => response.json());
    assert.ok(cupStats.countries.some((country) => country.code === 'PY'));

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
    monitorService.emit({ type: 'chat', username: 'viewer', content: 'Paraguay' });
    let update = '';
    while (!update.includes('"content":"Paraguay"')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      update += new TextDecoder().decode(chunk.value);
    }
    assert.match(update, /event: update/);
    assert.match(update, /event: comment-stats/);
    assert.equal((await fetch(`${baseUrl}/api/status`).then((result) => result.json())).eventCount, 100);
    const commentStats = await fetch(`${baseUrl}/api/comment-stats`).then((result) => result.json());
    assert.equal(commentStats.total, 102);
    assert.equal(commentStats.unassigned, 101);
    assert.equal(commentStats.teams.find((team) => team.code === 'PY').comments, 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'comment-stats.json'), 'utf8')).counts.PY, 1);

    const invalidCup = await fetch(`${baseUrl}/api/cup-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'RMA' }),
    });
    assert.equal(invalidCup.status, 400);
    const cupResponse = await fetch(`${baseUrl}/api/cup-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'PY' }),
    });
    const savedCups = await cupResponse.json();
    assert.equal(savedCups.countries.find((country) => country.code === 'PY').cups, 1);
    let cupEvent = '';
    while (!cupEvent.includes('event: cup-stats')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      cupEvent += new TextDecoder().decode(chunk.value);
    }
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(directory, 'comment-stats.json'), 'utf8')).cups.PY,
      1,
    );
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
