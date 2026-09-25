# AGENTS.md

Guia de contexto para trabajar en este repositorio.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS + Recharts
- Prisma 6 + PostgreSQL (esquema en `prisma/schema.prisma`, sin migraciones: se usa `prisma db push`)
- Redis 7 (cliente en `src/lib/redis.ts`)
- Websockets: Socket.io a traves de un servidor Node custom (`server.js`); los eventos de stats se emiten desde la ruta API via `src/lib/socket.ts`
- Package manager: npm

## Comandos

```bash
npm install          # instalar dependencias
npm run setup        # prisma generate + db push
npm run dev          # servidor custom + dev server (hot reload), incluye websockets
npm run dev:full     # redis + setup + dev server (todo en uno)
npm run build        # build de produccion
npm start            # servidor custom en produccion (usa el build)
npm run db:generate  # prisma generate
npm run db:push      # prisma db push
npm run db:seed      # sembrar datos de ejemplo (tsx prisma/seed.ts)
npm run db:studio    # Prisma Studio
```

No hay ESLint configurado: `npm run lint` dispara el setup interactivo de Next, evitar correrlo. Para verificar errores de tipos usar `npx tsc --noEmit`. El paso de verificacion es `npm run build`.

## Entorno local (WSL2)

- WSL2 sin systemd activo como PID 1: `systemctl` **no funciona**.
- PostgreSQL 18 y Redis estan instalados de forma nativa (no Docker; el daemon de Docker no corre).
- Arrancar servicios con scripts SysV:

```bash
sudo service postgresql start
sudo service redis-server start
```

- Credenciales dev: usuario `bluelock` / pass `bluelock123`, DB `bluelockstats` en `localhost:5432`. `REDIS_URL=redis://localhost:6379`.
- En WSL los servicios no persisten entre sesiones: hay que arrancarlos de nuevo tras cada reboot.
- Los scripts de la app (postinstall de `@prisma/client`, `prisma`, `@prisma/engines` y `esbuild`) estan aprobados via `allowScripts` en `package.json` (feature de npm 11, entradas fijadas por version). Si se actualizan esos paquetes, npm pedira re-aprobar.

## Arquitectura

- Rutas: App Router bajo `src/app/`. Paginas client en `page.tsx` con `'use client'`, APIs como `route.ts` (handlers `GET`/`POST`/`PUT`).
- Base de datos: singleton Prisma en `src/lib/db.ts`. Las unicas rutas que escriben en la base son las APIs `api/*`; las paginas de armado de formacion (`/admin/formacion`, `/mi-formacion`) nunca persisten desde el cliente a mano.
- Evaluacion compartida por partido (`/evaluacion/[partidoId]`, sin tokens ni roles operador/juez): todos los que abren el link ven/editan las mismas stats en tiempo real via websocket.
- Pincode de administrador hardcodeado `098651` (en `PincodeModal`, APIs `formacion` y `reset`).

## Reglas de negocio importantes

- **Formacion** (`/admin/formacion`): grilla de 7 posiciones x 4 minutos. Constantes y tipos en `src/lib/formacion.ts`.
  - **Un jugador por celda** (refuerzo tambien en la API `PUT /api/formacion`).
  - Un jugador no puede repetirse dentro del mismo minuto.
  - **Autosave**: cada cambio se guarda solo (debounce ~600ms) via `PUT /api/formacion`. No hay boton de guardado.
  - El pincode se pide una sola vez y se conserva en `sessionStorage` (`formacion_pincode`) para reutilizarlo en el autosave. Ojo: la sesión (no el navegador), así que al reabrir la pestaña hay que pedirlo de nuevo.
  - Columnas y tiempos: `Min 0` = alineacion inicial 1er tiempo, `Min 10` = cambios 1er tiempo, `Min 20` = inicial 2do tiempo, `Min 30` = cambios 2do tiempo.
- **Imagen de formacion**: `src/lib/imagenFormacion.ts` replica (en canvas, cliente) el script Python `futform/futform.py`. Carga la plantilla `/plantilla.jpg` (copia servida desde `public/`), dibuja nombres centrados en cajas fijas y descarga un JPEG por tiempo (botones en `/admin/formacion`).
- **Copia de seguridad de la formacion** (bloque "Copia de seguridad" en `/admin/formacion`): todo en `src/lib/respaldoFormacion.ts`, sin endpoints nuevos.
  - Exportar = `descargarRespaldo`: baja un JSON `{ version, generadoEn, jugadores: [{id,numero,nombre}], datos }` con `datos` igual al blob de `Formacion.datos` y nombre `formacion-YYYY-MM-DD_HHmm.json`. Solo incluye los jugadores en uso.
  - Importar = `parsearRespaldo` (valida version, posiciones, minutos, 1 por celda y unicidad por minuto) + `generarPreviewImport` (resuelve cada jugador por cascada **id → numero → nombre** (nombre normalizado con NFD, sin tildes) y calcula el diff) → `PreviewImportModal` **reemplaza toda la formación** previa confirmación.
  - El import reusa el `PUT /api/formacion` (el mismo autosave de 600ms), no hay logica de persistencia nueva. Requiere `editando` (pincode) para importar; exportar siempre esta disponible.
  - Los jugadores no resolubles y las colisiones que surjan al resolver quedan como `faltantes` en el preview en vez de romper el PUT con un 400.
- **Mi formacion** (`/mi-formacion`, sin pincode ni login): version libre de la grilla para que cualquiera arme su propia alineacion. **No escribe nunca en la base**: todo vive en `localStorage` (clave `mi_formacion`). Logica de estado en `src/lib/miFormacion.ts`.
  - El unico fetch es `GET /api/jugadores` (solo lectura) para ofrecer la plantilla de la app. Si falla, muestra un aviso y la pagina sigue funcionando con los jugadores propios.
  - `JugadorLocal` = `{ id, nombre, numero, posicion, origen: 'propio'|'app', appId }`. Los ids son **locales**, no los de la DB.
  - Al elegir un jugador de la app se **copia** al roster local (queda con `appId` para no volver a ofrecerlo). Tambien hay "Copiar plantilla de la app" (copia todos los que falten). Nada queda referenciado a la base, asi que un reset global no rompe nada.
  - Autosave a `localStorage` con debounce `GUARDADO_MS` (400ms) via `useEffect` sobre `estado` (el cleanup cancela el timer anterior).
  - `cargarEstado` valida/normaliza lo que haya en `localStorage` reusando `generarPreviewImport`: descarta jugadores sin nombre, ids duplicados e ids que no existan en el roster.
  - Export/import JSON, descarga de imagen y `TablaRotacionCuartos` son los mismos de `/admin/formacion` (`descargarRespaldo(..., 'mi-formacion')` cambia solo el prefijo del archivo; `PreviewImportModal` es un componente compartido en `src/components/`).
  - Al importar, `jugadoresDelRespaldoAusentes` **agrega al roster local los jugadores del archivo que falten**, asi una copia se puede restaurar incluso en un navegador limpio. El preview se calcula contra ese roster extendido para que los numeros del modal sean los reales.
- **Evaluacion** (`/evaluacion/[partidoId]`): vista unica compartida por partido (sin tokens ni roles). Los cambios de stats se guardan via `PUT /api/partidos/[id]/stats` y se emiten por Socket.io al room `partido:{id}` (`src/lib/socket.ts`); los clientes aplican el valor devuelto/recibido (no suman). El boton "Cambiar jugador" usa `POST /api/partidos/[id]/cambiar`. "Finalizar evaluacion" (solo 4to cuarto) cierra la ventana sin tocar la base de datos.
- Reset global y creacion de partidos: acciones protegidas por el mismo pincode.