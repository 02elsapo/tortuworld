const path = require('node:path');

function registerOverlayRoutes(app) {
  app.get(['/', '/overlay'], (request, response) => {
    response.sendFile(path.join(__dirname, '..', '..', 'Carrera_de_Tortugas_TikTok_Live_v6.html'));
  });

  app.get('/backend', (request, response) => {
    response.sendFile(path.join(__dirname, 'backend.html'));
  });
}

module.exports = { registerOverlayRoutes };
