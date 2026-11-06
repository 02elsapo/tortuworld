const { createServer } = require('node:http');
const path = require('node:path');
const express = require('express');
const { createSseHub } = require('./modules/realtime/sseHub');
const { createTikTokModule, createTikTokMonitorService } = require('./modules/tiktok');
const { registerOverlayRoutes } = require('./modules/overlay');

function createWebserver({
  configurationPath = process.env.TIKTOK_CONFIG_PATH
    || path.join(__dirname, 'data', 'tiktok', 'config.json'),
  defaultUsername = process.env.TIKTOK_USERNAME || '',
  monitorService = createTikTokMonitorService(),
} = {}) {
  const app = express();
  const server = createServer(app);
  const eventStream = createSseHub();
  const tiktok = createTikTokModule({
    stream: eventStream,
    monitorService,
    configurationPath,
    defaultUsername,
  });

  app.use(express.json({ limit: '1mb' }));
  registerOverlayRoutes(app);
  tiktok.registerRoutes(app);

  app.get('/health', (request, response) => {
    response.json({ ok: true });
  });
  app.use('/api', (request, response) => {
    response.status(404).json({ ok: false, message: 'Ruta API no encontrada.' });
  });

  server.on('close', () => {
    tiktok.close();
    eventStream.close();
  });

  return { server, monitorService };
}

function startServer({
  port = Number(process.env.PORT || 80),
  host = process.env.HOST || '0.0.0.0',
  createWebserver: createServerInstance = createWebserver,
  logger = console,
} = {}) {
  const { server } = createServerInstance();
  server.listen(port, host, () => {
    const address = server.address();
    const listeningPort = address && typeof address === 'object' ? address.port : port;
    logger.log(`Servidor y conector TikTok disponibles en http://localhost:${listeningPort}`);
  });
  server.on('error', (error) => {
    logger.error(`No se pudo iniciar el servidor: ${error.message}`);
    process.exitCode = 1;
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { createWebserver, startServer };
