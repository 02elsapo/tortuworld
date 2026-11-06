# TikTok Mini App Starter

Carrera de tortugas para TikTok LIVE. Incluye la conexión al LIVE, un backend de configuración y un overlay transparente que transforma los eventos del conector en acciones del juego mediante Server-Sent Events (SSE).

## Requisitos e inicio

- Node.js 22 o posterior.
- Una cuenta pública con un LIVE activo para que TikTok envíe eventos.

```powershell
npm install
$env:TIKTOK_USERNAME = "nombre_de_usuario"
npm start
```

El servidor escucha en `http://localhost:3000` por defecto. Abre `/backend` para configurar la cuenta y `/` para ver el overlay. También puedes dejar `TIKTOK_USERNAME` vacío y guardar el usuario en el backend. La conexión comienza al arrancar si hay una cuenta configurada.

El servidor no lee `.env` por sí mismo. Usa variables del entorno o administra el entorno con tu herramienta de despliegue. `.env.example` enumera las variables:

| Variable | Predeterminado | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP. |
| `HOST` | `0.0.0.0` | Interfaz de red de escucha. |
| `TIKTOK_USERNAME` | vacío | Usuario de TikTok; se acepta con o sin `@`. Tiene prioridad sobre la cuenta persistida. |
| `TIKTOK_CONFIG_PATH` | `data/tiktok/config.json` | Ruta del archivo JSON con el usuario configurado desde el backend. |

Monta almacenamiento persistente si necesitas conservar la configuración del backend entre reinicios. El directorio `data/` está excluido de Git.

## HTTP y eventos

| Método y ruta | Uso | Respuesta |
|---|---|---|
| `GET /` o `GET /overlay` | Juego de carrera de tortugas; demo con `?demo=1`. | HTML |
| `GET /backend` | Configurar la cuenta y ver su estado. | HTML |
| `GET /health` | Comprobar que el servidor responde. | `{ "ok": true }` |
| `GET /api/status` | Estado actual y diagnóstico del conector. | JSON |
| `GET /api/config` | Usuario configurado. | `{ "username": "usuario" }` |
| `PUT /api/config` | Guarda el usuario y comienza la conexión. | Envío: `{ "username": "@usuario" }`; respuesta: `{ "ok": true, "username": "usuario" }` |
| `POST /api/reconnect` | Reintenta la conexión configurada. | JSON; `409` si falta cuenta o ya se está conectando. |
| `GET /api/events` | Flujo SSE de estado y actividad. | Eventos `status`, `snapshot` y `update`. |

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

El juego en `Carrera_de_Tortugas_TikTok_Live_v2.html` usa `EventSource` y procesa eventos nuevos de chat, regalos, likes, seguidores y compartidos. El snapshot inicial no se vuelve a jugar. Se puede abrir `/backend` para configurar TikTok, o probar el juego sin conectar una cuenta con `/?demo=1`. Para un servidor WebSocket externo, el overlay conserva compatibilidad si se especifica `?ws=ws://localhost:8080`.

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
Carrera_de_Tortugas_TikTok_Live_v2.html # Juego y overlay transparente
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
