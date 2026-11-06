const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { createSseHub } = require('../modules/realtime/sseHub');

function createResponse() {
  const response = new EventEmitter();
  response.messages = [];
  response.writableEnded = false;
  response.destroyed = false;
  response.writeHead = (status, headers) => {
    response.status = status;
    response.headers = headers;
  };
  response.flushHeaders = () => {};
  response.write = (message) => response.messages.push(message);
  response.end = () => { response.writableEnded = true; };
  return response;
}

test('SSE hub sends initial messages, updates, heartbeats, and closes clients', async () => {
  const hub = createSseHub({ heartbeatIntervalMs: 5 });
  const response = createResponse();
  hub.attach(response, [['snapshot', [{ type: 'chat' }]]]);

  assert.equal(response.status, 200);
  assert.match(response.headers['Content-Type'], /text\/event-stream/);
  assert.match(response.messages[0], /event: snapshot/);
  hub.broadcast('update', { type: 'gift' });
  assert.match(response.messages[1], /event: update/);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(response.messages.some((message) => message.includes(': keep-alive')));

  hub.close();
  assert.equal(response.writableEnded, true);
});

test('SSE hub removes disconnected clients and handles response close events', async () => {
  const hub = createSseHub({ heartbeatIntervalMs: 5 });
  const disconnected = createResponse();
  hub.attach(disconnected);
  disconnected.destroyed = true;
  hub.broadcast('update', { ignored: true });
  assert.deepEqual(disconnected.messages, []);

  const expired = createResponse();
  hub.attach(expired);
  expired.destroyed = true;
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(expired.messages, []);

  const closed = createResponse();
  hub.attach(closed);
  closed.emit('close');
  hub.broadcast('update', { ignored: true });
  assert.deepEqual(closed.messages, []);
  hub.close();
});
