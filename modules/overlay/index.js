const path = require('node:path');

function registerOverlayRoutes(app) {
  app.get(['/', '/overlay'], (request, response) => {
    response.sendFile(path.join(__dirname, 'index.html'));
  });

  app.get('/backend', (request, response) => {
    response.sendFile(path.join(__dirname, 'backend.html'));
  });
}

module.exports = { registerOverlayRoutes };
