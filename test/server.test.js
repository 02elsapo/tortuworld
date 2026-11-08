const assert = require('node:assert/strict');
const fs = require('node:fs');
const { once } = require('node:events');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createWebserver, startServer } = require('../server');
const { createTikTokModule } = require('../modules/tiktok');

test('starter serves the overlay, backend, health check, and TikTok API', async () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY v16\.html \.\//);
  assert.doesNotMatch(dockerfile, /COPY v15\.html/);

  const { server } = createWebserver({
    configurationPath: path.join(os.tmpdir(), `tiktok-starter-${process.pid}.json`),
    commentStatsPath: path.join(os.tmpdir(), `tiktok-starter-${process.pid}-stats.json`),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    assert.deepEqual(await fetch(`${baseUrl}/health`).then((response) => response.json()), { ok: true });

    const overlay = await fetch(baseUrl);
    assert.equal(overlay.status, 200);
    const overlayHtml = await overlay.text();
    const overlaySource = overlayHtml.replace(/\s+/g, ' ');
    assert.match(overlaySource, /<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?>/);
    assert.match(overlaySource, /navigator\.serviceWorker[\s\S]*?\.register\("\/sw\.js"\)/);
    assert.match(overlaySource, /<title>Carrera de tortugas · Países en vivo<\/title>/);
    assert.match(overlaySource, /id="overlayVersion">v1\.6\.0/);
    assert.match(overlaySource, /id="lanes"/);
    assert.match(overlaySource, /id="connectionStatus"[^>]*role="status"/);
    assert.match(overlaySource, /id="statJoin">0/);
    assert.match(overlaySource, /title="Ingresos al LIVE">👋 <b id="statJoin">0<\/b>/);
    assert.match(overlaySource, /\$\("statJoin"\)\.textContent = SESSION\.join/);
    assert.match(overlaySource, /if \(recordSessionEvent\(entry, isBot\)\) updateSessionStats\(\)/);
    assert.match(overlaySource, /#liveStats \{ position: fixed; left: 3%; right: 3%; bottom: calc\(1% \+ env\(safe-area-inset-bottom, 0px\) \+ 3\.8rem\); z-index: 51; display: grid !important; grid-template-columns: repeat\(6, max-content\);/);
    assert.match(overlaySource, /grid-template-columns: repeat\(3, max-content\); gap: 0\.18rem 0\.42rem; font-size: 1\.12rem;/);
    assert.match(overlaySource, /font-size: 1\.5rem; pointer-events: none;/);
    assert.doesNotMatch(overlaySource, /voiceToggle/);
    assert.doesNotMatch(overlaySource, /#dot|id="dot"|backend-link/);
    assert.match(overlaySource, /a\.im\.setAttribute\("href", _nn\.u\)/);
    assert.match(overlaySource, /im\.src = info\.avatar/);
    assert.match(overlaySource, /#lanes \.tur \.rider-avatar \{ position: absolute; z-index: 8; left: 50%; top: 50%;/);
    assert.match(overlaySource, /function showTurtleAvatar\(code, user, isJoin = false\)/);
    assert.match(overlaySource, /selectedTurtle\.tur\.append\(rider\)/);
    assert.match(overlaySource, /isJoin \|\| _newAvatar \|\| FANINFO\[_u\]\?\.avatar !== _oldAvatar/);
    assert.match(overlaySource, /#lanes \{ --g: 1\.5rem; \}/);
    assert.doesNotMatch(overlaySource, /--track-flag-size|#lanes \.rk|<div class="rk disp" id="rk-/);
    assert.match(overlaySource, /#lanes \.tag \{ top: calc\(var\(--rt\) \+ 0\.1rem\); \}/);
    assert.doesNotMatch(overlaySource, /CUP_COUNTS|loadCupStats|recordCupWin/);
    assert.doesNotMatch(overlaySource, /<div class="tag">|MÁS HINCHAS/);
    assert.match(overlaySource, /if \(_newAvatar\) layPendingFanEggs\(_code, _u\)/);
    assert.match(overlaySource, /type = \["member", "enter", "joined"\]\.includes\(entry\.type\) \? "join" : entry\.type; if \(type !== entry\.type\) entry = \{ \.\.\.entry, type \};/);
    assert.match(overlaySource, /const USER_EVENT_ADVANCE = 3/);
    assert.match(overlaySource, /entry\.type === "chat" \? \(CFG\.target \* 0\.15\) \/ USER_EVENT_ADVANCE/);
    assert.match(overlaySource, /points \*= USER_EVENT_ADVANCE/);
    assert.match(overlaySource, /if \(n - \(player\.lastChat \|\| 0\) < 8000\) points = 0/);
    assert.match(overlaySource, /let ownerCode = S\.slotOf\.get\(p\.key\); if \(!ownerCode\) ownerCode = claimSlot\(p\); const code = S\.pick\.get\(p\.key\) \|\| ownerCode, ownsLane = Boolean\(ownerCode && ownerCode === code\);/);
    assert.match(overlaySource, /function speakNextTickerMessage\(\)/);
    assert.match(overlaySource, /voiceSynth\.speak\(utterance\)/);
    assert.match(overlaySource, /const googleVoices = latinVoices\.filter/);
    assert.match(overlaySource, /const latinVoices = spanishVoices\.filter/);
    assert.match(overlaySource, /googleVoices\[0\] \|\| googleVoices\[1\]/);
    assert.match(overlaySource, /utterance\.lang = voice \? voice\.lang : "es-419"/);
    assert.match(overlaySource, /VOICE_INTERVAL_MS = 60000/);
    assert.match(overlaySource, /ACTION_REMINDER_INTERVAL_MS = 180000/);
    assert.match(overlaySource, /setInterval\(speakEncouragement, VOICE_INTERVAL_MS\)/);
    assert.match(overlaySource, /setInterval\(speakActionReminder, ACTION_REMINDER_INTERVAL_MS\)/);
    assert.match(overlaySource, /voiceEnabled = Boolean\(voiceSynth\)/);
    assert.match(overlaySource, /if \(voiceSynth\) \{ speakEncouragement\(\); voiceTimer = setInterval/);
    assert.match(overlaySource, /addEventListener\(event, unlockVoiceAfterGesture, \{ once: true \}\)/);
    assert.match(overlaySource, /voiceNeedsGesture = true/);
    assert.match(overlaySource, /voiceWatchdog = setTimeout/);
    assert.match(overlaySource, /"¡Vamos " \+ NATIONS\[C\.findIndex\(\(country\) => country\.c === leader\.c\)\]\.n \+ "! ¡Qué buena carrera!"/);
    assert.match(overlaySource, /Si quieres, comenta cuál es tu país favorito y alienta al equipo que prefieras/);
    const voiceLoop = overlaySource.match(
      /function speakEncouragement\(\) \{([\s\S]*?)\} function unlockVoiceAfterGesture/,
    );
    assert.ok(voiceLoop);
    assert.doesNotMatch(voiceLoop[1], /enqueueMsg/);
    assert.doesNotMatch(overlaySource, /VOICE_PROMPTS|Usuarios más activos|regal/i);
    assert.match(overlaySource, /function enqueueMsg\(t\) \{ if \(!connectorEventDisplayed\) \$\("specialEvent"\)\.textContent = String\(t \|\| ""\); \}/);
    assert.match(overlaySource, /function formatConnectorEvent\(entry\)/);
    assert.match(overlaySource, /function showConnectorEvent\(entry\) \{ connectorEventDisplayed = true; const message = \$\("specialEvent"\); message\.textContent = formatConnectorEvent\(entry\); message\.className = "disp on";/);
    assert.match(overlaySource, /id="raceClock" class="disp" role="timer"/);
    assert.match(overlaySource, /<div id="win">\s*<div class="card"><img id="winnerFlag" alt="" \/><\/div>\s*<\/div>/);
    assert.doesNotMatch(overlaySource, /TIEMPO DE CARRERA|#raceClock small/);
    assert.match(overlaySource, /id="lanes"><\/div> <div id="raceProgressTrack" role="progressbar"/);
    assert.match(overlaySource, /raceProgressPercent\(remainingMs\) \+ "%"/);
    assert.match(overlaySource, /id="raceProgress"><\/i>/);
    assert.match(overlaySource, /RACE_DURATION_MS = 180_000/);
    assert.match(overlaySource, /aria-valuemax="180"[\s\S]*?aria-valuenow="180"[\s\S]*?aria-valuetext="03:00"/);
    assert.match(overlaySource, /guaranteedRacePosition\(\s*now - raceStartedAt,\s*k === fallbackWinnerCode,?\s*\)/);
    assert.match(overlaySource, /fraction:\s*\(CFG\.win - previousPosition\) \/ \(S\.pos\[k\] - previousPosition\)/);
    assert.match(overlaySource, /S\.winner = firstFinisher\(finishers\)\.code/);
    assert.match(overlaySource, /S\.pos\[c\.c\] = Math\.min\(S\.pos\[c\.c\], Math\.max\(0, CFG\.win - 1\)\)/);
    assert.match(overlaySource, /fallbackWinnerCode = C\[\(Math\.random\(\) \* C\.length\) \| 0\]\.c/);
    assert.match(overlaySource, /RACE_WARNINGS = new Set\(\[120, 60, 30, 15, 10, 5, 4, 3, 2, 1\]\)/);
    assert.match(overlaySource, /eventAdvance = realEventLaneAdvance\(p, ty\)/);
    assert.match(overlaySource, /Math\.max\(t\.pend, scoredAdvance\) \+ eventAdvance/);
    assert.match(overlaySource, /t\.pend \+ scoredAdvance \+ eventAdvance/);
    assert.match(overlaySource, /if \(p\) \{ const w = \(winsBy\.get\(p\.key\) \|\| 0\) \+ 1;/);
    assert.match(overlaySource, /speakWinnerAnnouncement\([\s\S]*?"Ganó "\s*\+[\s\S]*?winnerName[\s\S]*?restartAfterAnnouncement/);
    assert.match(overlaySource, /function finishVoiceItem\(item, spoken\)/);
    assert.match(overlaySource, /utterance\.onend = \(\) => \{ voiceHasStarted = true; finishVoiceItem\(item, true\); \}/);
    assert.match(overlaySource, /function speakWinnerAnnouncement\(text, onComplete\) \{[\s\S]*?voiceQueue\.unshift\([\s\S]*?required: true/);
    assert.match(overlaySource, /function finish\(code\) \{[\s\S]*?showWin\(code\);/);
    assert.match(overlaySource, /#win\.on \{ display: flex; \}/);
    assert.match(overlaySource, /if \(!S\.over && S\.winner\) finish\(S\.winner\)/);
    assert.match(overlaySource, /function addLiveEvent\(entry\) \{[\s\S]*?showConnectorEvent\(entry\);/);
    assert.doesNotMatch(overlaySource, /#tkIn|tkmove|function msgTick/);
    assert.match(overlaySource, /comment\.length > 100/);
    assert.match(overlaySource, /Esperando el LIVE de /);
    assert.match(overlaySource, /Date\.parse\(status\.nextRetryAt\)/);
    assert.match(overlaySource, /#app \{ top: var\(--top, 4%\); bottom: var\(--bot, 50%\);/);
    assert.match(overlaySource, /#specialEvent \{ left: 3% !important; right: 3% !important;[\s\S]*?display: flex !important;[\s\S]*?white-space: normal !important;/);
    assert.match(overlaySource, /id="specialEvent"[^>]*> Esperando eventos del LIVE\.\.\./);
    assert.match(overlaySource, /#lanes \{ order: 1; --tw: min\(5rem, 6vh\); --n: 2; flex: 0\.85 1 0;/);
    assert.match(overlaySource, /#raceProgressTrack \{\s*order: 2;\s*flex: none;[\s\S]*?height: 0\.42rem;/);
    assert.match(overlaySource, /--padr: 7%/);
    assert.doesNotMatch(overlaySource, /#lanes::after|--lane-step/);
    assert.match(overlaySource, /const T = \{\};\s*let fallbackWinnerCode = null;\s*C\.forEach\(\(c, li\) => \{\s*const e = \$\("tu-" \+ c\.c\)/);
    const leaderMarker = overlaySource.match(/l\.classList\.toggle\(\s*"lead",([\s\S]*?)\);/);
    assert.ok(leaderMarker);
    assert.match(leaderMarker[1], /S\.pos\[ord\[0\]\.c\] > 1 && c\.c === ord\[0\]\.c/);
    assert.doesNotMatch(leaderMarker[1], /!!p/);
    assert.doesNotMatch(overlaySource, /class="lane-bot"/);
    assert.doesNotMatch(overlaySource, /countryAssistantEvent|scheduleCountryAssistant/);
    assert.match(overlaySource, /const walking = S\.go && !S\.over && d \+ crawl > 0\.0001/);
    assert.match(overlaySource, /swayPhase \+= dt \* \(0\.25 \+ speedRatio \* 0\.12\)/);
    assert.match(overlaySource, /swayLimit = Math\.max\(\s*0,\s*Math\.min\(\s*laneStep \* 0\.24,\s*laneTop,/);
    assert.match(overlaySource, /t\.sway \+= \(swayTarget - t\.sway\) \* Math\.min\(1, dt \* 1\.5\)/);
    assert.match(overlaySource, /t\.tur\.style\.setProperty\("--sway", t\.sway\.toFixed\(2\) \+ "px"\)/);
    assert.match(overlaySource, /const th = H \/ \(1 \+ 0\.625 \* \(C\.length - 1\)\)/);
    assert.match(overlaySource, /W \* 0\.33/);
    assert.match(overlaySource, /id="ctaMain">💬 ¿QUÉ PAÍS TE GUSTARÍA QUE GANE\?<\/b>/);
    assert.match(overlaySource, /teams\.map\(\(team\) => team\.n\)\.join\(" · "\)/);
    assert.match(overlaySource, /racePromptTimer = setTimeout\(\(\) => \{[\s\S]*?queueActionReminder\(\s*updateRacePrompt\(VOICE_INTERVAL_MS\)/);
    assert.doesNotMatch(overlaySource, /id="ctaSub"|PARTICIPA EN LA CARRERA|COMENTA EL NOMBRE DE TU PAÍS PARA APOYARLO/);
    assert.doesNotMatch(overlaySource, /CTA_ROTATION|ESCRIBE EL NOMBRE DE UN PAÍS|El país con más apoyo corre al DOBLE|Toca su perfil y dale <b>Seguir/);
    assert.match(overlaySource, /const source = new EventSource\("\/api\/events"\)/);
    assert.match(overlaySource, /source\.addEventListener\("snapshot"/);
    assert.match(overlaySource, /source\.addEventListener\("update"/);
    assert.match(overlaySource, /startupRetryRequested[\s\S]*?fetch\("\/api\/reconnect", \{ method: "POST" \}\)/);
    assert.match(overlaySource, /const crawl = S\.go && !S\.over \? t\.cr \* dt \* m : 0/);
    assert.match(overlaySource, /enabled: Q\.get\("demo"\) === "1"/);
    assert.match(overlaySource, /\.lane\.empty \.tur \{ opacity: 1; filter: none; \}/);
    assert.match(overlaySource, /countries: \[0, 1, 2\]\.map/);
    assert.match(overlaySource, /const FIXED_TEAMS = NATIONS\.slice\(0, 3\)/);
    assert.match(overlaySource, /POPULAR_COUNTRIES\.includes\(team\.code\)/);
    assert.match(overlaySource, /function chooseRoundTeams\(\) \{ return \[\.\.\.FIXED_TEAMS\]; \}/);
    assert.match(overlaySource, /const POPULAR_COUNTRIES/);
    assert.match(overlaySource, /function registerFan\(user, code, entry\)/);
    assert.match(overlaySource, /S\.pick\.get\(_u\)[\s\S]*?rnd\(C\)\.c/);
    assert.match(overlaySource, /PENDING_FANS\[code\]\.add\(user\)/);
    assert.match(overlaySource, /function layPendingFanEggs\(code, preferredUser\)/);
    assert.match(overlaySource, /function trailEl\(item, progress, sway\)/);
    assert.match(overlaySource, /e\.style\.setProperty\("--sway", sway \+ "px"\)/);
    assert.match(overlaySource, /info\.sway = T\[code\]\.sway/);
    assert.match(overlaySource, /egg\.style\.setProperty\("--sway", \(info\.sway \|\| 0\) \+ "px"\)/);
    assert.match(overlaySource, /top: calc\(\s*var\(--rt\) \+ \(var\(--th\) - var\(--fan-size\)\) \/ 2 \+ var\(--sway, 0px\)\s*\);/);
    assert.match(overlaySource, /function fanEl\(user, info\)[\s\S]*?animationend[\s\S]*?e\.classList\.remove\("fresh"\)/);
    assert.match(overlaySource, /#lanes \.fa\.fresh \{ z-index: 4; animation: markerdrop/);
    assert.match(overlaySource, /translateY\(calc\(-1 \* var\(--th\)\)\)/);
    assert.match(overlaySource, /--fan-size: calc\(var\(--flag-size\) \* 2\.4\)/);
    assert.match(overlaySource, /width: calc\(var\(--fan-size\) \* 0\.9\);\s*height: var\(--fan-size\)/);
    assert.match(overlaySource, /border-radius: 50%;\s*overflow: hidden/);
    assert.match(overlaySource, /#lanes \.fa img \{[^}]*width: 100%;[^}]*height: 100%;[^}]*border: 0;/);
    assert.match(overlaySource, /#lanes \.fa\.trail \{[\s\S]*?var\(--fan-size\) \* 0\.45/);
    assert.match(overlaySource, /im\.referrerPolicy = "no-referrer";\s*im\.loading = "eager";\s*im\.onerror = placeholder;\s*im\.src = item\.avatar/);
    assert.match(overlaySource, /im\.referrerPolicy = "no-referrer"/);
    assert.match(overlaySource, /C\.find\(\(c\) => c\.c === preferred && !S\.slotUser\[c\.c\]\)/);
    assert.match(overlaySource, /function putGiftAhead\(code, entry\)/);
    assert.match(overlaySource, /tgtE = VMAX/);
    assert.match(overlaySource, /S\.pos\[k\] >= t\.giftTarget/);
    assert.match(overlaySource, /const code = S\.pick\.get\(p\.key\) \|\| ownerCode, ownsLane = Boolean\(ownerCode && ownerCode === code\)/);
    assert.doesNotMatch(overlaySource, /const CLUBS/);
    assert.match(overlaySource, /enabled: Q\.get\("demo"\) === "1"/);
    assert.match(overlaySource, /id="demoMode" hidden>DEMO · EVENTOS SIMULADOS · NO SON REALES/);
    assert.doesNotMatch(overlaySource, /S\.pos\[k\] = 0/);
    assert.match(overlaySource, /setRoundTeams\(\);/);
    assert.doesNotMatch(overlaySource, /id="backend-link"/);
    assert.match(overlaySource, /e\.classList\.add\("fresh"\)/);
    assert.match(overlaySource, /alreadyHere = FANS\[code\]\.has\(user\)/);
    assert.match(overlaySource, /FANINFO\[user\] = \{[\s\S]*?progress:/);
    assert.match(overlaySource, /Carrera de tortugas en vivo/);
    assert.match(overlaySource, /function dropTrail\(code, now\)/);
    assert.match(overlaySource, /message \? "💬 “" \+ message \+ "”" : "💬 Comentó"/);

    const overlayAlias = await fetch(`${baseUrl}/overlay`);
    assert.equal(await overlayAlias.text(), overlayHtml);

    const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`);
    assert.equal(manifestResponse.status, 200);
    assert.match(manifestResponse.headers.get('content-type'), /application\/manifest\+json/);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.name, 'tortu');
    assert.equal(manifest.display, 'fullscreen');
    assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
    for (const icon of manifest.icons) {
      assert.equal((await fetch(new URL(icon.src, baseUrl))).status, 200);
    }

    const serviceWorker = await fetch(`${baseUrl}/sw.js`);
    assert.equal(serviceWorker.status, 200);
    assert.match(await serviceWorker.text(), /url\.pathname\.startsWith\('\/api\/'\)/);

    const backend = await fetch(`${baseUrl}/backend`);
    assert.equal(backend.status, 200);
    const backendHtml = await backend.text();
    assert.match(backendHtml, /Panel de control/);
    assert.match(backendHtml, /Comentarios recibidos y copas ganadas/);

    const status = await fetch(`${baseUrl}/api/status`);
    assert.equal(status.status, 200);
    assert.equal((await status.json()).connected, false);
    assert.deepEqual(await fetch(`${baseUrl}/api/config`).then((response) => response.json()), {
      username: '',
    });
    const commentStats = await fetch(`${baseUrl}/api/comment-stats`).then((response) => response.json());
    assert.equal(commentStats.total, 0);
    assert.ok(commentStats.teams.every((team) => team.type === 'country'));
    const cupStats = await fetch(`${baseUrl}/api/cup-stats`).then((response) => response.json());
    assert.ok(cupStats.countries.some((country) => country.code === 'PY'));

    const events = await fetch(`${baseUrl}/api/events`);
    const reader = events.body.getReader();
    const initialMessages = new TextDecoder().decode((await reader.read()).value);
    assert.match(initialMessages, /event: status/);
    assert.match(initialMessages, /event: snapshot/);
    await reader.cancel();

    assert.equal((await fetch(`${baseUrl}/api/unknown`)).status, 404);
  } finally {
    server.closeAllConnections();
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('server starts on the requested port and logs its address', async () => {
  const messages = [];
  const server = startServer({
    port: 0,
    host: '127.0.0.1',
    logger: { log: (message) => messages.push(message), error() {} },
  });
  await once(server, 'listening');
  assert.match(messages[0], /http:\/\/localhost:\d+/);
  server.closeAllConnections();
  const closed = once(server, 'close');
  server.close();
  await closed;
});

test('backend configuration connects the account and forwards TikTok events', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-starter-'));
  let eventListener;
  let statusListener;
  const monitorService = {
    state: { username: '', status: 'idle', isConnected: false, error: '' },
    retryWindowRefreshes: 0,
    getStatusPayload: () => ({ ...monitorService.state }),
    subscribeToEvents(listener) {
      eventListener = listener;
      return () => { eventListener = null; };
    },
    subscribeToStatus(listener) {
      statusListener = listener;
      return () => { statusListener = null; };
    },
    connectUser(username) {
      Object.assign(monitorService.state, { username, status: 'connected', isConnected: true });
      statusListener({ ...monitorService.state });
    },
    disconnectUser() {},
    refreshRetryWindow() { monitorService.retryWindowRefreshes += 1; },
    emit(entry) {
      eventListener(entry);
    },
  };
  const configurationPath = path.join(directory, 'config.json');
  const { server } = createWebserver({ configurationPath, monitorService });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let reader;

  try {
    const stream = await fetch(`${baseUrl}/api/events`);
    reader = stream.body.getReader();
    await reader.read();

    const invalidConfiguration = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '  ' }),
    });
    assert.equal(invalidConfiguration.status, 400);
    assert.equal((await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' })).status, 409);

    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '@mini-app-host' }),
    });
    assert.deepEqual(await response.json(), { ok: true, username: 'mini-app-host' });
    assert.deepEqual(JSON.parse(fs.readFileSync(configurationPath, 'utf8')), {
      username: 'mini-app-host',
    });

    assert.equal((await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' })).status, 409);
    Object.assign(monitorService.state, { status: 'reconnecting', isConnected: false });
    assert.equal((await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' })).status, 200);
    assert.equal(monitorService.retryWindowRefreshes, 1);
    Object.assign(monitorService.state, { status: 'disconnected', isConnected: false });
    const reconnect = await fetch(`${baseUrl}/api/reconnect`, { method: 'POST' });
    assert.equal(reconnect.status, 200);

    monitorService.emit(null);
    monitorService.emit({});
    for (let index = 0; index < 101; index += 1) {
      monitorService.emit({ type: 'chat', username: 'viewer', content: `Mensaje ${index}` });
    }
    monitorService.emit({ type: 'chat', username: 'viewer', content: 'Paraguay' });
    let update = '';
    while (!update.includes('"content":"Paraguay"')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      update += new TextDecoder().decode(chunk.value);
    }
    assert.match(update, /event: update/);
    assert.match(update, /event: comment-stats/);
    assert.equal((await fetch(`${baseUrl}/api/status`).then((result) => result.json())).eventCount, 100);
    const commentStats = await fetch(`${baseUrl}/api/comment-stats`).then((result) => result.json());
    assert.equal(commentStats.total, 102);
    assert.equal(commentStats.unassigned, 101);
    assert.equal(commentStats.teams.find((team) => team.code === 'PY').comments, 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'comment-stats.json'), 'utf8')).counts.PY, 1);

    const invalidCup = await fetch(`${baseUrl}/api/cup-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'RMA' }),
    });
    assert.equal(invalidCup.status, 400);
    const cupResponse = await fetch(`${baseUrl}/api/cup-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'PY' }),
    });
    const savedCups = await cupResponse.json();
    assert.equal(savedCups.countries.find((country) => country.code === 'PY').cups, 1);
    let cupEvent = '';
    while (!cupEvent.includes('event: cup-stats')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      cupEvent += new TextDecoder().decode(chunk.value);
    }
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(directory, 'comment-stats.json'), 'utf8')).cups.PY,
      1,
    );
  } finally {
    await reader?.cancel();
    server.closeAllConnections();
    const closed = once(server, 'close');
    server.close();
    await closed;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('starter loads saved configuration, lets environment configuration override it, and rejects invalid files', () => {
  assert.throws(() => createTikTokModule(), /canal de eventos/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-starter-config-'));
  const configurationPath = path.join(directory, 'config.json');
  fs.writeFileSync(configurationPath, JSON.stringify({ username: '@saved-host' }));

  const monitorService = {
    state: { username: '', status: 'idle', isConnected: false, error: '' },
    getStatusPayload: () => ({}),
    subscribeToEvents: () => () => {},
    subscribeToStatus: () => () => {},
    connectUser(username) { this.connectedUsername = username; },
    disconnectUser() {},
  };

  try {
    const instance = createWebserver({ configurationPath, monitorService });
    assert.equal(monitorService.connectedUsername, 'saved-host');

    const override = createWebserver({
      configurationPath,
      defaultUsername: '@environment-host',
      monitorService: { ...monitorService, state: { ...monitorService.state } },
    });
    assert.equal(override.monitorService.connectedUsername, 'environment-host');

    fs.writeFileSync(configurationPath, JSON.stringify({ username: 42 }));
    assert.throws(() => createWebserver({ configurationPath }), /configuración guardada de TikTok no es válida/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
