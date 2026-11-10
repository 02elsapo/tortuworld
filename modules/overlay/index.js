const path = require('node:path');
const express = require('express');

function registerOverlayRoutes(app) {
  const overlayPath = path.join(__dirname, '..', '..', 'tortugas_tiktok.html');
  app.get(['/', '/overlay', '/tortugas.html', '/tortugas_tiktok.html'], (request, response) => {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.sendFile(overlayPath);
  });

  app.get('/backend', (request, response) => {
    response.sendFile(path.join(__dirname, 'backend.html'));
  });

  app.use(express.static(path.join(__dirname, 'public')));
}

module.exports = { registerOverlayRoutes };
