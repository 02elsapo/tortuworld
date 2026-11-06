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
    assert.match(overlayHtml, /new EventSource\('\/api\/events'\)/);
    assert.match(overlayHtml, /<title>Carrera de tortugas<\/title>/);
    assert.match(overlayHtml, /function handleTikTokEntry\(entry\)/);
    assert.match(overlayHtml, /entry\.type==='gift'/);
    assert.match(overlayHtml, /@media \(orientation:portrait\)/);
    assert.match(overlayHtml, /--padr:12%/);

    const overlayAlias = await fetch(`${baseUrl}/overlay`);
    assert.equal(await overlayAlias.text(), overlayHtml);

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
