# tortu — Carrera de tortugas

Carrera de tortugas para TikTok LIVE. Incluye la conexión al LIVE, un backend de configuración y un overlay transparente que transforma los eventos del conector en acciones del juego mediante Server-Sent Events (SSE).

## Requisitos e inicio

- Node.js 22 o posterior.
- Una cuenta pública con un LIVE activo para que TikTok envíe eventos.

```powershell
npm install
$env:TIKTOK_USERNAME = "nombre_de_usuario"
npm start
```

El servidor escucha en el puerto `80` por defecto (`http://localhost/`). En EasyPanel, configura el puerto interno de la aplicación como `80` y expón ese mismo puerto en el dominio para publicar el overlay. Abre `/backend` para configurar la cuenta y `/` para ver el overlay. También puedes dejar `TIKTOK_USERNAME` vacío y guardar el usuario en el backend. La conexión comienza al arrancar si hay una cuenta configurada.

La aplicación también es instalable en Chrome como **tortu** y abre en pantalla completa. Entra al sitio por HTTPS (o por `http://localhost` durante desarrollo) y elige **Instalar tortu** en el menú de Chrome o en el icono de instalación de la barra de direcciones. El modo de pantalla completa se aplica al abrir la aplicación instalada; el overlay sigue disponible en `/` para TikTok LIVE Studio.

El servidor no lee `.env` por sí mismo. Usa variables del entorno o administra el entorno con tu herramienta de despliegue. `.env.example` enumera las variables:

| Variable | Predeterminado | Descripción |
|---|---|---|
| `PORT` | `80` | Puerto HTTP. |
| `HOST` | `0.0.0.0` | Interfaz de red de escucha. |
| `TIKTOK_USERNAME` | vacío | Usuario de TikTok; se acepta con o sin `@`. Tiene prioridad sobre la cuenta persistida. |
| `TIKTOK_CONFIG_PATH` | `data/tiktok/config.json` | Ruta del archivo JSON con el usuario configurado desde el backend. |
| `TIKTOK_COMMENT_STATS_PATH` | Junto a `TIKTOK_CONFIG_PATH` | Archivo JSON persistente con comentarios y copas por país. |

Monta almacenamiento persistente si necesitas conservar la configuración del backend entre reinicios. El directorio `data/` está excluido de Git.

### EasyPanel

Selecciona el constructor **Dockerfile** para evitar la instalación de Nixpacks. El `Dockerfile` incluido usa Node 22 y conserva la capa de dependencias mientras no cambien `package.json` o `package-lock.json`. Para guardar la cuenta entre despliegues, monta un volumen persistente en `/app/data`.

## HTTP y eventos

| Método y ruta | Uso | Respuesta |
|---|---|---|
| `GET /` o `GET /overlay` | Carrera de tortugas con eventos visuales internos por país, sin alterar estadísticas ni simular espectadores de TikTok. | HTML |
| `GET /backend` | Configurar la cuenta y ver estadísticas de comentarios y copas por país. | HTML |
| `GET /health` | Comprobar que el servidor responde. | `{ "ok": true }` |
| `GET /api/status` | Estado actual y diagnóstico del conector. | JSON |
| `GET /api/config` | Usuario configurado. | `{ "username": "usuario" }` |
| `PUT /api/config` | Guarda el usuario y comienza la conexión. | Envío: `{ "username": "@usuario" }`; respuesta: `{ "ok": true, "username": "usuario" }` |
| `POST /api/reconnect` | Reintenta la conexión configurada. | JSON; `409` si falta cuenta o ya se está conectando. |
| `GET /api/comment-stats` | Conteo persistente de comentarios mencionando cada país y comentarios sin país. | JSON |
| `GET /api/cup-stats` | Copas ganadas acumuladas por país. | JSON |
| `POST /api/cup-stats` | Registra una copa al terminar una ronda. | Envío: `{ "code": "PY" }`; respuesta: estadísticas actualizadas. |
| `GET /api/events` | Flujo SSE de estado, actividad y estadísticas. | Eventos `status`, `snapshot`, `update`, `comment-stats` y `cup-stats`. |

Un usuario vacío o inválido al guardar devuelve `400`. Los eventos `status` contienen el estado resumido; `snapshot` contiene los eventos recientes al conectar; cada `update` incluye el evento nuevo y la lista actualizada:

```json
{
  "entry": {
    "id": "id-del-proveedor-o-id-generado",
    "type": "chat",
    "eventLabel": "Comentario",
    "username": "espectador",
    "avatar": "",
    "content": "¡Hola!",
    "time": "2026-11-05T12:00:00.000Z"
  },
  "events": []
}
```

Los tipos dependen de los eventos que entregue TikTok; incluyen chat, regalos, likes, seguidores, compartidos, entradas y otros eventos del LIVE. Campos adicionales como `activityCount` y `diamondCount` solo aparecen cuando aplican. El conector conserva los valores del proveedor para que cada mini app decida cómo presentarlos.

El overlay `v16.html` presenta una carrera de diez países: Brasil, Paraguay, Argentina y Alemania son fijos; los otros seis se sortean por ronda entre campeones del Mundial masculino y selecciones populares, sin clubes ni duplicados. Las tortugas avanzan lentamente aunque no haya espectadores y zigzaguean dentro de su carril. Eventos visuales internos por país (likes, comentarios y regalos) mantienen dinámica la carrera sin aparecer como espectadores ni modificar estadísticas, el feed real o datos de TikTok. Los avatares de los hinchas dejan un rastro en la pista. Los comentarios y las copas ganadas se guardan por país en JSON; el backend ofrece un botón de estadísticas con actualización en vivo. El overlay también muestra el Top 5 de participantes, los eventos y una meta colectiva. Configura la fuente de navegador de TikTok LIVE Studio en `1080 × 1920`. Los eventos reales se reciben por SSE; el backend ignora eventos de audiencia (`roomUser`). El panel de pruebas manual se abre con `P` o `?panel=1`. Para un servidor WebSocket externo, especifica `?ws=ws://localhost:8080`.

## Estructura

```text
server.js                         # Ensambla HTTP, overlay, SSE y conector
modules/
  tiktok/
    index.js                      # Configuración, estado y publicación de eventos
    tiktokMonitorService.js       # Conexión SDK, normalización y reconexión
    eventConfig.js                # Nombres y etiquetas del SDK
    eventFeedService.js            # Orden de la actividad recibida
    routes.js                     # API HTTP del conector
  realtime/sseHub.js              # Transporte SSE compartido
  overlay/
    index.js                      # Rutas del overlay y backend
    backend.html                  # Interfaz mínima de configuración
    public/                       # Manifest, service worker e iconos de la PWA tortu
v16.html                           # Juego y overlay transparente
test/
  server.test.js                  # HTTP, configuración y publicación
  realtime.test.js                # Conexiones y ciclo de vida SSE
  tiktok/                         # Pruebas del conector y reconexión
```

`server.js` compone los módulos. `modules/tiktok` es dueño de la conexión y de la forma de los eventos; `modules/realtime` solo transporta mensajes; el juego adapta los eventos normalizados al contrato de su lógica. El servicio del conector usa `tiktok-live-connector` y carga su export ESM de forma dinámica. La conexión no requiere que haya un overlay abierto.

## Operación y seguridad

- Configura `TIKTOK_USERNAME` en producción o guarda la cuenta en `/backend`.
- El backend no tiene autenticación. No lo publiques directamente en Internet: limita el acceso con la red, VPN, proxy autenticado o controles equivalentes.
- Usa HTTPS en el proxy de producción si el overlay o las mini apps se abren desde otro equipo.
- La cuenta de TikTok y el acceso al LIVE están sujetos a cambios del proveedor y del conector.

## Pruebas

```powershell
npm test
npm run test:coverage
```

Las pruebas usan conexiones falsas y no se conectan a TikTok. La suite de cobertura permite revisar el transporte SSE, las rutas y los casos de reconexión antes de agregar una mini app.
