const path = require('node:path');
const express = require('express');

function registerOverlayRoutes(app) {
  app.get(['/', '/overlay'], (request, response) => {
    response.sendFile(path.join(__dirname, '..', '..', 'v15.html'));
  });

  app.get('/backend', (request, response) => {
    response.sendFile(path.join(__dirname, 'backend.html'));
  });

  app.use(express.static(path.join(__dirname, 'public')));
}

module.exports = { registerOverlayRoutes };
