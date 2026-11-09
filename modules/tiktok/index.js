const fs = require('node:fs');
const path = require('node:path');
const { registerTikTokRoutes } = require('./routes');
const { createTikTokMonitorService } = require('./tiktokMonitorService');
const { createCommentStatsService } = require('./commentStatsService');

const maxEvents = 100;

function createTikTokModule({
  stream,
  monitorService = createTikTokMonitorService(),
  configurationPath = process.env.TIKTOK_CONFIG_PATH
    || path.join(__dirname, '..', '..', 'data', 'tiktok', 'config.json'),
  commentStatsPath = process.env.TIKTOK_COMMENT_STATS_PATH,
  defaultUsername = process.env.TIKTOK_USERNAME || '',
} = {}) {
  if (!stream || typeof stream.attach !== 'function' || typeof stream.broadcast !== 'function') {
    throw new Error('El módulo TikTok necesita su canal de eventos.');
  }

  const environmentUsername = String(defaultUsername).trim().replace(/^@+/, '');
  const commentStats = createCommentStatsService({
    filePath: commentStatsPath || path.join(path.dirname(configurationPath), 'comment-stats.json'),
  });
  let username = environmentUsername;
  const events = [];
  const state = {
    connected: Boolean(monitorService.state.isConnected),
    status: monitorService.state.status,
    error: monitorService.state.error || '',
    username,
    lastEventAt: null,
  };

  try {
    const saved = JSON.parse(fs.readFileSync(configurationPath, 'utf8'));
    if (!saved || typeof saved.username !== 'string') {
      throw new Error('La configuración guardada de TikTok no es válida.');
    }
    if (!environmentUsername) username = saved.username.trim().replace(/^@+/, '');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!username) username = 'labettydetemu';
  state.username = username;

  function publish(event, payload) {
    stream.broadcast(event, payload);
  }

  function handleEvent(entry) {
    if (!entry || typeof entry !== 'object' || typeof entry.type !== 'string') return;
    events.unshift(entry);
    events.length = Math.min(events.length, maxEvents);
    state.lastEventAt = entry.time || new Date().toISOString();
    if (entry.type === 'chat') {
      const stats = commentStats.recordComment(entry.content);
      publish('comment-stats', stats);
    }
    publish('update', { entry, events });
  }

  function getCommentStats() {
    return commentStats.getStats();
  }

  function getCupStats() {
    return commentStats.getCupStats();
  }

  function recordCup(code) {
    const stats = commentStats.recordCup(code);
    if (stats) publish('cup-stats', stats);
    return stats;
  }

  const unsubscribeEvents = monitorService.subscribeToEvents(handleEvent);
  const unsubscribeStatus = monitorService.subscribeToStatus((status) => {
    state.connected = Boolean(status.isConnected);
    state.status = status.status;
    state.error = status.error || '';
    state.username = status.username || username;
    publish('status', { ...state });
  });

  function getStatus() {
    return { ...state, eventCount: events.length, connector: monitorService.getStatusPayload() };
  }

  function getConfiguration() {
    return { username };
  }

  function saveConfiguration(body) {
    const nextUsername = typeof body?.username === 'string'
      ? body.username.trim().replace(/^@+/, '')
      : '';
    if (!nextUsername) {
      return { ok: false, message: 'Ingresa un usuario de TikTok válido.' };
    }
    fs.mkdirSync(path.dirname(configurationPath), { recursive: true });
    fs.writeFileSync(configurationPath, JSON.stringify({ username: nextUsername }, null, 2));
    monitorService.disconnectUser();
    username = nextUsername;
    state.username = nextUsername;
    state.connected = false;
    state.status = 'disconnected';
    state.error = '';
    publish('status', { ...state });
    return { ok: true, username };
  }

  function reconnect() {
    if (!username) {
      return { ok: false, status: 409, message: 'Primero configura un usuario de TikTok.' };
    }
    if (monitorService.state.isConnected) {
      return { ok: false, status: 409, message: 'La conexión ya está activa.' };
    }
    if (['connecting', 'reconnecting'].includes(monitorService.state.status)) {
      monitorService.refreshRetryWindow();
      return { ok: true, username };
    }
    monitorService.connectUser(username);
    return { ok: true, username };
  }

  function openEventStream(response) {
    stream.attach(response, [
      ['status', { ...state }],
      ['snapshot', events],
    ]);
  }

  function registerRoutes(app) {
    registerTikTokRoutes(app, {
      getStatus,
      getConfiguration,
      getCommentStats,
      getCupStats,
      recordCup,
      saveConfiguration,
      reconnect,
      openEventStream,
    });
  }

  return {
    monitorService,
    registerRoutes,
    close() {
      unsubscribeEvents();
      unsubscribeStatus();
      monitorService.disconnectUser();
    },
  };
}

module.exports = {
  createTikTokModule,
  createTikTokMonitorService,
};
