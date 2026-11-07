const path = require('node:path');
const express = require('express');

function registerOverlayRoutes(app) {
  app.get(['/', '/overlay'], (request, response) => {
    response.sendFile(path.join(__dirname, '..', '..', 'Carrera_de_Tortugas_TikTok_Live_v6.html'));
  });

  app.get('/backend', (request, response) => {
    response.sendFile(path.join(__dirname, 'backend.html'));
  });

  app.use(express.static(path.join(__dirname, 'public')));
}

module.exports = { registerOverlayRoutes };
