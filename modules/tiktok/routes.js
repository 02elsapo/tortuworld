function registerTikTokRoutes(app, {
  getStatus,
  getConfiguration,
  getCommentStats,
  getCupStats,
  recordCup,
  saveConfiguration,
  reconnect,
  openEventStream,
}) {
  app.get('/api/status', (request, response) => {
    response.json(getStatus());
  });

  app.get('/api/config', (request, response) => {
    response.json(getConfiguration());
  });

  app.get('/api/comment-stats', (request, response) => {
    response.json(getCommentStats());
  });

  app.get('/api/cup-stats', (request, response) => {
    response.json(getCupStats());
  });

  app.post('/api/cup-stats', (request, response) => {
    const stats = recordCup(request.body?.code);
    if (!stats) {
      response.status(400).json({ ok: false, message: 'El código de país no es válido.' });
      return;
    }
    response.json(stats);
  });

  app.put('/api/config', (request, response) => {
    const result = saveConfiguration(request.body);
    if (!result.ok) {
      response.status(400).json(result);
      return;
    }
    response.json(result);
  });

  app.post('/api/reconnect', (request, response) => {
    const result = reconnect();
    if (!result.ok) {
      response.status(result.status).json({ ok: false, message: result.message });
      return;
    }
    response.json(result);
  });

  app.get('/api/events', (request, response) => {
    openEventStream(response);
  });
}

module.exports = { registerTikTokRoutes };
