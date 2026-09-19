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
- Base de datos: singleton Prisma en `src/lib/db.ts`.
- Evaluacion compartida por partido (`/evaluacion/[partidoId]`, sin tokens ni roles operador/juez): todos los que abren el link ven/editan las mismas stats en tiempo real via websocket.
- Pincode de administrador hardcodeado `098651` (en `PincodeModal`, APIs `formacion` y `reset`).

## Reglas de negocio importantes

- **Formacion** (`/admin/formacion`): grilla de 7 posiciones x 4 minutos. Constantes y tipos en `src/lib/formacion.ts`.
  - **Un jugador por celda** (refuerzo tambien en la API `PUT /api/formacion`).
  - Un jugador no puede repetirse dentro del mismo minuto.
  - **Autosave**: cada cambio se guarda solo (debounce ~600ms) via `PUT /api/formacion`. No hay boton de guardado.
  - El pincode se pide una sola vez y se conserva en `localStorage` (`formacion_pincode`) para reutilizarlo en el autosave.
  - Columnas y tiempos: `Min 0` = alineacion inicial 1er tiempo, `Min 10` = cambios 1er tiempo, `Min 20` = inicial 2do tiempo, `Min 30` = cambios 2do tiempo.
- **Imagen de formacion**: `src/lib/imagenFormacion.ts` replica (en canvas, cliente) el script Python `futform/futform.py`. Carga la plantilla `/plantilla.jpg` (copia servida desde `public/`), dibuja nombres centrados en cajas fijas y descarga un JPEG por tiempo (botones en `/admin/formacion`).
- **Evaluacion** (`/evaluacion/[partidoId]`): vista unica compartida por partido (sin tokens ni roles). Los cambios de stats se guardan via `PUT /api/partidos/[id]/stats` y se emiten por Socket.io al room `partido:{id}` (`src/lib/socket.ts`); los clientes aplican el valor devuelto/recibido (no suman). El boton "Cambiar jugador" usa `POST /api/partidos/[id]/cambiar`. "Finalizar evaluacion" (solo 4to cuarto) cierra la ventana sin tocar la base de datos.
- Reset global y creacion de partidos: acciones protegidas por el mismo pincode.