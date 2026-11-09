const path = require('node:path');
const express = require('express');

function registerOverlayRoutes(app) {
  const overlayPath = path.join(__dirname, '..', '..', 'v60.html');
  app.get(['/', '/overlay', '/v60.html'], (request, response) => {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.sendFile(overlayPath);
  });

  app.get('/backend', (request, response) => {
    response.sendFile(path.join(__dirname, 'backend.html'));
  });

  app.use(express.static(path.join(__dirname, 'public')));
}

module.exports = { registerOverlayRoutes };
