const assert = require('node:assert/strict');
const fs = require('node:fs');
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

test('serves the v2.0 TikTok overlay as a full-screen PWA', async () => {
  const root = path.join(__dirname, '..');
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY v2\.0\.html \.\//);
  assert.equal(fs.existsSync(path.join(root, 'v2.0.html')), true);
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
    assert.match(html, /const RACE_SECONDS=600/);
    assert.match(html, /const DUELO=\['py','br'\]/);
    assert.match(html, /data-t="gift"/);
    assert.match(html, /if\(b\.dataset\.t==='gift'\)\{turboOn\(sel,4000\)/);
    assert.match(html, /if\(type==='like'&&!curBot\)heartAdd\(i,n\)/);
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
    assert.match(await serviceWorker.text(), /tortu-shell-v7/);
    const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
    assert.equal(manifest.status, 200);
    const appManifest = await manifest.json();
    assert.equal(appManifest.name, 'madera2');
    assert.equal(appManifest.short_name, 'madera2');
    assert.equal(appManifest.display, 'fullscreen');
    assert.deepEqual(await fetch(`${baseUrl}/health`).then((response) => response.json()), {
      ok: true,
    });
  } finally {
    await close(server);
  }
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
