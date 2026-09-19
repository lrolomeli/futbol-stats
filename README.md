# BlueLock Stats

Sistema de estadisticas de futbol 7 con registro en tiempo real y evaluacion compartida por partido via websocket. Mobile-first, pensado para uso en cancha desde el celular.

---

## Tabla de contenidos

- [Funcionalidades](#funcionalidades)
- [Stack tecnologico](#stack-tecnologico)
- [Inicio rapido](#inicio-rapido)
- [Desarrollo local](#desarrollo-local)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [API Endpoints](#api-endpoints)
- [Flujo de uso](#flujo-de-uso)
- [Despliegue](#despliegue)

---

## Funcionalidades

- **CRUD de jugadores**: alta, baja (logica), edicion. Jugadores persistentes reutilizables entre partidos.
- **Creacion de partidos**: el admin crea el partido protegido por pincode de administrador. Si no se pasan jugadores, el partido se crea **automaticamente con los jugadores de la formacion** de `Min 0`.
- **Gestion de plantel**: antes de iniciar el partido, el admin puede agregar/quitar jugadores del partido desde `/admin/partidos/[id]`. Al iniciar el partido, la gestion de plantel se desactiva.
- **Registro de stats objetivas**: 7 estadisticas por jugador (goles, asistencias, recuperaciones, tiros a porteria, faltas, balones perdidos, tiros afuera). Tabla con +/- compacto y modal de edicion por jugador.
- **Tiempo real por websocket (Socket.io)**: cualquier cambio de stats emitido por un cliente se propaga al instante a todos los que tienen abierta la evaluacion del mismo partido (evento `stats-update` en el room `partido:{id}`).
- **Evaluacion compartida por partido**: `/evaluacion/[partidoId]` es una vista unica por partido (sin tokens ni roles). Todos los que abren el link ven y editan las mismas stats en tiempo real. Organizada por cuartos/minutos segun la formacion; "Finalizar Evaluacion" (solo 4to cuarto) cierra la ventana sin tocar la base.
- **Acciones protegidas por pincode** (`098651`): editar formacion, crear partido, iniciar/finalizar partido, eliminar partido y reset global.
- **Reset global**: desde la portada se puede reiniciar todo (partidos, jugadores, estadisticas y formacion) ingresando el pincode.
- **Historial**: estadisticas historicas por jugador, metricas derivadas (goles/partido, efectividad, etc.), radar chart con seleccion de jugadores, graficos de barras, tabla comparativa.
- **Tab Individual**: datos crudos por partido + totales acumulados + promedios por partido, por cada jugador.
- **Grafico de evolucion**: linea por jugador que muestra como cambia una estadistica a lo largo de sus partidos.
- **Formacion**: grilla persistente de 7 posiciones (portero, defensas, laterales, centrocampista, delantero) x 4 minutos (0, 10, 20, 30). Un solo jugador por celda (refuerzo incluido) y sin jugadores repetidos dentro del mismo minuto. Cada cambio se guarda solo (autosave con debounce ~600ms). La edicion se desbloquea con el pincode una sola vez y se conserva en `sessionStorage` (`formacion_pincode`). Desde la misma vista se descargan las imagenes de alineacion de cada tiempo (replican el script Python `futform/futform.py`): `Min 0/10` = 1er tiempo, `Min 20/30` = 2do tiempo.
- **Docker Compose**: despliegue con un solo comando.

---

## Stack tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Recharts |
| Backend | Next.js API Routes |
| Tiempo real | Socket.io (servidor Node custom `server.js`) |
| Base de datos | PostgreSQL 16 |
| Cache / Colas | Redis 7 |
| ORM | Prisma 6 |
| Despliegue | Docker Compose |
| Lenguaje | TypeScript |

---

## Inicio rapido

### Con Docker (produccion)

```bash
git clone <url-del-repositorio>
cd bluelockstats
docker compose up -d
```

La app estara disponible en `http://localhost:3000`.

> **Nota**: Si PostgreSQL ya corre en el puerto 5432, el Docker mapea el DB al puerto 5433. En ese caso usa el workflow de desarrollo local.

### Nativo en Linux (requisitos: Node.js, PostgreSQL, Redis)

```bash
# 1. Instalar PostgreSQL y Redis
sudo apt install postgresql redis-server

# 2. Crear la base de datos y el usuario (postgres debe estar corriendo)
sudo -u postgres psql -c "CREATE USER bluelock WITH PASSWORD 'bluelock123';"
sudo -u postgres psql -c "CREATE DATABASE bluelockstats OWNER bluelock;"

# 3. Instalar dependencias y configurar el entorno
npm install
cp .env.example .env   # usa localhost:5432 y localhost:6379

# 4. Generar el cliente Prisma y sincronizar el esquema
npm run setup

# 5. Iniciar en modo desarrollo (con hot reload y websockets)
npm run dev
```

La app estara en `http://localhost:3000`.

> `npm run dev:full` hace todo en un solo comando: asegura que Redis corra, sincroniza el esquema y levanta el servidor de desarrollo.

### WSL2 (nativo, sin Docker ni systemd)

Si trabajas en WSL2 sin systemd activo, Docker no esta disponible y `systemctl` no funciona. Usa los scripts SysV y servicios nativos:

```bash
# 1. Levantar PostgreSQL y Redis (no persisten entre reinicios)
sudo service postgresql start
sudo service redis-server start

# 2. Crear base de datos y usuario (una sola vez, si no existen)
sudo -u postgres psql -c "CREATE USER bluelock WITH PASSWORD 'bluelock123';"
sudo -u postgres psql -c "CREATE DATABASE bluelockstats OWNER bluelock;"

# 3. Instalar dependencias y configurar entorno
npm install
cp .env.example .env   # localhost:5432 y localhost:6379

# 4. Sincronizar esquema y levantar el dev server
npm run setup
npm run dev
```

> Alternativa para el arranque de PostgreSQL: `sudo pg_ctlcluster 18 main start`.

### Desarrollo local (recomendado)

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Crear esquema en la DB (requiere PostgreSQL corriendo)
npx prisma db push

# Iniciar Redis (requiere redis-server o Docker)
docker compose up -d redis

# Iniciar en modo desarrollo (hot reload + websockets)
npm run dev
```

La app estara en `http://localhost:3000`.

### Solo DB + Redis en Docker, app local

```bash
docker compose up -d db redis
npm run dev
```

Este es el workflow mas rapido: la DB y Redis corren en Docker, la app corre local con hot reload.

---

## Desarrollo local

### Variables de entorno

Copiar `.env.example` a `.env` y ajustar:

```env
# Nativo en Linux (PostgreSQL local en puerto estandar)
DATABASE_URL=postgresql://bluelock:bluelock123@localhost:5432/bluelockstats

# Con Docker (el compose mapea el contenedor 5432 al host en 5433)
# DATABASE_URL=postgresql://bluelock:bluelock123@localhost:5433/bluelockstats

REDIS_URL=redis://localhost:6379
```

> **Nativo**: PostgreSQL corre en el puerto estandar `5432`.
> **Con Docker**: el compose mapea el PostgreSQL del contenedor (5432) al host en el puerto **5433**, asi que apunta `DATABASE_URL` a `localhost:5433`.

### Comandos utiles

```bash
npm run setup        # Configuracion inicial: prisma generate + db push
npm run dev          # Servidor de desarrollo (Node custom server.js) con hot reload y websockets
npm run dev:full     # Redis + setup + servidor de desarrollo (todo en uno)
npm run build        # Build de produccion
npm start            # Iniciar en modo produccion (node server.js)
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar esquema con la DB
npm run db:seed      # Sembrar datos de ejemplo
npm run db:studio    # Prisma Studio (UI de la DB)
```

> No hay ESLint configurado: `npm run lint` dispara el setup interactivo de Next, evitar correrlo. Para verificar errores de tipos: `npx tsc --noEmit`. El paso de verificacion es `npm run build`.

---

## Arquitectura

```
bluelockstats/
├── server.js                    # Servidor Node custom: Next.js + Socket.io (dev y produccion)
├── docker-compose.yml           # Servicios: app, db (PostgreSQL), redis
├── Dockerfile                   # Build multi-stage para produccion
├── scripts/start.sh             # Startup: prisma db push && npm start
├── .env.example                 # Template de variables de entorno
├── prisma/
│   └── schema.prisma            # Esquema de BD (5 modelos)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Portada (reset global)
│   │   ├── api/                 # API Routes
│   │   │   ├── reset/           # Reinicio global (pincode)
│   │   │   ├── jugadores/       # CRUD de jugadores
│   │   │   ├── partidos/
│   │   │   │   └── [id]/
│   │   │   │       ├── stats/   # Actualizar stat (emite por websocket)
│   │   │   │       └── plantel/ # Agregar/quitar jugadores del partido
│   │   │   ├── formacion/       # Grilla de formacion (GET/PUT con pincode)
│   │   │   └── historial/
│   │   ├── admin/               # Panel de administracion
│   │   │   ├── page.tsx         # Dashboard admin
│   │   │   ├── jugadores/       # CRUD de jugadores
│   │   │   ├── formacion/       # Grilla 7x4 con autosave y descargas
│   │   │   └── partidos/
│   │   │       ├── nuevo/       # Crear partido (auto desde formacion)
│   │   │       └── [id]/        # Detalle/control del partido + boton Evaluar
│   │   ├── evaluacion/
│   │   │   └── [partidoId]/     # Evaluacion compartida por partido (tiempo real)
│   │   └── historial/           # Estadisticas historicas
│   │       └── jugador/[id]/    # Historial individual
│   ├── components/              # Componentes React compartidos
│   │   ├── Navbar.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── StatButton.tsx
│   │   └── PincodeModal.tsx     # Modal de pincode reutilizable
│   └── lib/
│       ├── db.ts                # Cliente Prisma (singleton)
│       ├── redis.ts             # Cliente Redis
│       ├── socket.ts            # Emisor de eventos de stats a rooms de Socket.io
│       ├── formacion.ts         # Posiciones, minutos, tipos y helpers de formacion
│       ├── imagenFormacion.ts   # Genera imagenes de alineacion por tiempo (canvas)
│       └── colores.ts           # Paleta de colores por jugador
└── public/                      # Archivos estaticos
```

### Tiempo real (websocket)

- `server.js` levanta un servidor HTTP de Next.js junto con Socket.io. En cada conexion el cliente se une al room `partido:{id}` (query `partidoId`).
- `PUT /api/partidos/[id]/stats` guarda el valor devuelto y emite el evento `stats-update` por `src/lib/socket.ts` (`emitEstadisticas`).
- Los clientes de `/evaluacion/[partidoId]` escuchan `stats-update` y **reemplazan** el valor del stat recibido (no suman), asi la evaluacion queda consistente para todos los que la tienen abierta. Ademas se hace un refetch periodico cada 30s como respaldo.

---

## Modelo de datos

```
Jugador
├── id          Int      @id @default(autoincrement())
├── nombre      String
├── numero      Int
├── posicion    String?
├── activo      Boolean  @default(true)
├── createdAt   DateTime @default(now())

Partido
├── id          Int      @id @default(autoincrement())
├── rival       String
├── fecha       DateTime
├── cancha      String?
├── estado      String   @default("pendiente")  // pendiente | en_curso | finalizado
├── createdAt   DateTime @default(now())

MatchJugador
├── id          Int      @id @default(autoincrement())
├── partidoId   Int
├── jugadorId   Int
├── enCancha    Boolean  @default(true)
├── esSuplente  Boolean  @default(false)
├── @@unique([partidoId, jugadorId])

StatsObjetivas
├── id                Int  @id @default(autoincrement())
├── partidoId         Int
├── jugadorId         Int
├── goles             Int  @default(0)
├── asistencias       Int  @default(0)
├── recuperaciones    Int  @default(0)
├── tirosAPorteria    Int  @default(0)
├── faltas            Int  @default(0)
├── balonesPerdidos   Int  @default(0)
├── tirosAfuera       Int  @default(0)
├── @@unique([partidoId, jugadorId])

Formacion
├── id         Int      @id @default(autoincrement())
├── datos      Json     // grilla 7 posiciones x 4 minutos, cada celda es un array de jugadorIds
├── updatedAt  DateTime
└── Nota: tabla unica (una sola fila persistente). El PUT exige pincode de administrador y valida que no haya jugadores repetidos dentro de una misma columna (minuto) y solo un jugador por celda.
```

---

## API Endpoints

### Jugadores

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/jugadores` | Listar jugadores activos |
| `POST` | `/api/jugadores` | Crear jugador `{ nombre, numero, posicion? }` |
| `GET` | `/api/jugadores/[id]` | Obtener jugador por ID |
| `PUT` | `/api/jugadores/[id]` | Actualizar jugador |
| `DELETE` | `/api/jugadores/[id]` | Baja logica del jugador |

### Partidos

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/partidos` | Listar partidos |
| `POST` | `/api/partidos` | Crear partido `{ rival, fecha, cancha?, jugadoresIds? }`. Si no se envian `jugadoresIds`, toma los jugadores de la formacion |
| `GET` | `/api/partidos/[id]` | Detalle del partido con jugadores y stats |
| `PUT` | `/api/partidos/[id]` | Actualizar estado `{ estado }` |
| `DELETE` | `/api/partidos/[id]` | Eliminar partido `{ pincode }` |
| `PUT` | `/api/partidos/[id]/stats` | Actualizar stat `{ jugadorId, stat, incremento }` (emite `stats-update` por websocket) |
| `POST` | `/api/partidos/[id]/plantel` | Agregar/quitar del plantel `{ action: "agregar"\|"quitar", jugadorId }` (solo mientras esta pendiente) |

### Historial

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/historial/[jugadorId]` | Historial de un jugador por partido (stats crudas, promedios, totales) |
| `GET` | `/api/historial/comparar` | Todos los jugadores con metricas derivadas |

### Reset

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/api/reset` | Reiniciar todo el sistema `{ pincode }` (elimina partidos, jugadores, estadisticas y formacion) |

### Formacion

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/formacion` | Obtener la grilla persistente (datos + updatedAt) |
| `PUT` | `/api/formacion` | Guardar la grilla `{ datos, pincode }`. Valida estructura, un jugador por celda, no repetidos por minuto y pincode de admin |

---

## Flujo de uso

### 1. Preparacion (Admin)

1. Ir a `/admin/jugadores` y agregar los jugadores del equipo (nombre, numero, posicion).
2. Ir a `/admin/formacion`, tocar "Editar", ingresar el pincode y acomodar los jugadores en la grilla de posiciones por minuto. **Autosave**: cada cambio se guarda solo (~600ms). Descargar las imagenes de alineacion del 1er y 2do tiempo si se necesitan.
3. Ir a `/admin/partidos/nuevo` y crear el partido (requiere pincode). Si no se seleccionan jugadores, se toman automaticamente los de la formacion.
4. En `/admin/partidos/[id]` usar "Ajustar Plantel" para agregar/quitar jugadores del partido (solo mientras esta pendiente).
5. Presionar "Iniciar Partido" (requiere pincode). Al iniciar se desactiva la gestion de plantel y se habilita "Evaluar Partido".

### 2. En cancha (Evaluacion compartida)

1. El admin abre "📊 Evaluar Partido" desde `/admin/partidos/[id]` (o comparte el link `/evaluacion/[partidoId]`).
2. Todos los que abren el link ven y editan las **mismas stats en tiempo real** (websocket). No hay operador ni jueces separados.
3. La evaluacion se organiza por cuartos/minutos (1er tiempo con Min 0/10, 2do tiempo con Min 20/30) segun la formacion. Tocar un jugador para registrar sus 7 stats con +/-.
4. En el 4to cuarto, "Finalizar Evaluacion" cierra la ventana (solo cierra la ventana, no toca la base de datos).
5. El admin puede finalizar el partido desde `/admin/partidos/[id]` (requiere pincode) o eliminarlo con `🗑 Eliminar Partido`.

### 3. Historial

1. Ir a `/historial` para ver estadisticas acumuladas.
2. **Tab Graficos**: barras por metrica seleccionable + grafico de "Evolucion por Partido" por jugador y estadistica.
3. **Tab Tabla**: tabla completa con todas las metricas (las filas llevan al historial individual).
4. **Tab Radar**: radar chart con selector de jugadores (toggle individual).
5. **Tab Individual**: datos crudos por partido, totales acumulados y promedios por partido de un jugador.

### 4. Reset global

Desde la portada, "Reiniciar Estadisticas" permite eliminar todo (partidos, jugadores, estadisticas y formacion) confirmando con el pincode de administrador.

---

## Despliegue

### Docker Compose (produccion)

```bash
docker compose up -d --build
```

Esto levanta:
- **app** (Next.js en puerto 3000, sirve via `server.js`)
- **db** (PostgreSQL 16 en puerto 5433)
- **redis** (Redis 7 en puerto 6379)

Al arrancar, `scripts/start.sh` corre `prisma db push --skip-generate` para sincronizar el esquema y luego ejecuta `npm start` (`node server.js`), que suma los websockets de tiempo real.

> **Esquema**: este proyecto no usa migraciones de Prisma; el esquema se sincroniza con `prisma db push`. Si un deploy implica cambios destructivos (borrar columnas/tablas), `db push` lo bloquea pidiendo `--accept-data-loss` (en un contenedor no interactivo marca error, aunque no detiene el arranque). En ese caso corri manualmente una vez:
>
> ```bash
> docker compose exec app npx prisma db push --accept-data-loss --skip-generate
> docker compose restart app
> ```

### Variables de entorno para produccion

Cambiar en `docker-compose.yml` o usar `.env`:
- `POSTGRES_PASSWORD`: cambiar de `bluelock123` a un password seguro.
- `NODE_ENV=production`.

---

## Licencia

MIT