# Architecture and module contracts

## Runtime flow

```text
TikTok Live
   | tiktok-live-connector
   v
modules/tiktok/tiktokMonitorService.js
   | normalized activity
   v
modules/tiktok/index.js -----> modules/realtime/sseHub.js
                                      |             |
                                      v             v
                           turtle game overlay    future mini apps

server.js composes the modules and owns the HTTP server lifecycle.
```

The connector starts only when a username is configured. Connection retries, stale-connection handling, provider event subscriptions, and normalization belong to the TikTok monitor. The module facade loads persisted configuration, subscribes to monitor updates, keeps a bounded 100-event snapshot, and publishes `status`, `snapshot`, and `update` SSE messages. The SSE hub knows nothing about TikTok or app behavior.

## Module responsibilities

| Module | Contract |
|---|---|
| `server.js` | Creates the Express app, HTTP server, SSE hub, overlay routes, and TikTok module; closes subscriptions and SSE clients when the server closes. |
| `modules/tiktok/tiktokMonitorService.js` | Owns the TikTok SDK connection and reconnection lifecycle; emits normalized events and connection status. |
| `modules/tiktok/index.js` | Loads and saves the configured username, persists country comment/cup statistics, stores the latest events, and adapts monitor callbacks to SSE. |
| `modules/tiktok/commentStatsService.js` | Counts comments and earned cups by country in a JSON file; recognizes country names, codes, and flags. |
| `modules/tiktok/eventConfig.js` | Defines the provider event names, display labels, defaults, and control event names. |
| `modules/tiktok/eventFeedService.js` | Maintains an ordered event feed for connector diagnostics. |
| `modules/tiktok/routes.js` | Maps HTTP requests to connector operations; it contains no connection logic. |
| `modules/realtime/sseHub.js` | Attaches SSE responses, sends initial messages, broadcasts named events and heartbeats, and removes closed clients. |
| `modules/overlay/index.js` | Maps `/` and `/overlay` to the turtle game, `/backend` to configuration, and serves the `tortu` PWA assets. |
| `modules/overlay/public/` | Provides the `tortu` install manifest, full-screen service worker, and app icons. |
| `v15.html` | Runs the country race and Top 5, consumes normalized SSE updates, and maps TikTok events to game actions. |
| `modules/overlay/backend.html` | Reads status/configuration and displays live comment and cup statistics by country. |

Add a mini app as a new module with its own routes and event subscription. Keep the provider connection reusable and app-agnostic.

## Configuration and persistence

- `PORT`, `HOST`, `TIKTOK_USERNAME`, `TIKTOK_CONFIG_PATH`, and `TIKTOK_COMMENT_STATS_PATH` are read from the process environment.
- If `TIKTOK_CONFIG_PATH` is unset, the account is stored at `data/tiktok/config.json`.
- If `TIKTOK_COMMENT_STATS_PATH` is unset, statistics are stored beside the TikTok configuration as `comment-stats.json`.
- A configured environment username overrides the persisted username and is not written by the backend.
- Configuration writes create the containing directory. Runtime `data/` is ignored by Git and should be mounted persistently when needed.
- `.env.example` is documentation only; this project does not load dotenv files.

## HTTP contract

`GET /health` reports server liveness. `GET /api/status` returns the facade status (`connected`, `status`, `error`, `username`, `lastEventAt`, `eventCount`) and the monitor diagnostic payload under `connector`. `GET /api/config` returns the configured `username`.

`PUT /api/config` accepts `{ "username": "name" }`, trims whitespace and leading `@` characters, persists the username, and starts a connection. An empty value returns HTTP 400. `POST /api/reconnect` starts a retry for the current username; missing configuration or an active connection returns HTTP 409.

`GET /api/comment-stats` returns totals by country and unassigned comments. Every incoming chat event is counted and persisted in JSON. `GET /api/cup-stats` returns cumulative cup wins by country; `POST /api/cup-stats` accepts `{ "code": "PY" }` to persist a winner. Both statistics are shown in `/backend` and broadcast through SSE as `comment-stats` and `cup-stats`.

`GET /api/events` is an SSE stream:

1. `status` gives the current facade connection state.
2. `snapshot` gives up to 100 recent normalized events, newest first.
3. `update` gives `{ "entry": <event>, "events": <current snapshot> }`.

An event entry has `id`, `type`, `eventLabel`, `username`, `avatar`, `content`, and `time`. `activityCount` and `diamondCount` are optional. `id` is the provider message ID when available and otherwise a generated UUID. `content` is a short human-readable summary; the full provider payload remains available to connector diagnostics.

Unknown `/api/*` paths return JSON 404. The game and backend are served as static HTML files.

## Lifecycle and failure behavior

- The SDK is dynamically imported, so the HTTP server can start before loading the ESM-only connector.
- A configured username triggers the first connection at startup. The monitor retries transient failures and stops retrying after its configured retry window/attempt limit.
- `close` unsubscribes TikTok listeners, disconnects the monitor, and ends open SSE responses.
- Malformed persisted JSON or an invalid saved username is reported during startup rather than silently replaced.
- The backend is intentionally unauthenticated; protect it at the network boundary before public deployment.

## Quality checks

```powershell
npm test
npm run test:coverage
```

Tests use fake TikTok connections and exercise the HTTP, SSE, persistence, retry, and event-normalization contracts without opening a real TikTok session.
