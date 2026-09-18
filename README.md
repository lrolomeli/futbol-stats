# BlueLock Stats

Sistema de estadisticas de futbol 7 con registro en tiempo real y evaluacion subjetiva por multiples jueces. Mobile-first, pensado para uso en cancha desde el celular.

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
- **Creacion de partidos**: el admin selecciona los titulares (con gestion de plantel) y crea el partido protegido por pincode de administrador.
- **Gestion de plantel**: antes de iniciar el partido, el admin puede agregar/quitar jugadores del plantel. Los agregados entran como titulares en cancha. Al iniciar el partido, la gestion de plantel se desactiva.
- **Registro de stats objetivas**: 7 estadisticas por jugador (goles, asistencias, recuperaciones, tiros a portería, faltas, balones perdidos, tiros afuera). Tabla con +/- compacto y modal de edicion rapida.
- **Cambios de jugador**: substituciones en vivo ("Cambiar Jugador") entre banco y cancha.
- **Acciones protegidas por pincode**: crear partido, iniciar partido y finalizar partido exigen el pincode de administrador (`098651`).
- **Reset global**: desde la portada se puede reiniciar todo (partidos, jugadores, estadisticas y formacion) ingresando el pincode.
- **Evaluacion subjetiva**: multiples jueces califican a cada jugador del 1 al 5. Cada juez tiene una URL unica. Solo se puede crear una sesion de evaluacion con el partido en curso.
- **Asignacion de jugadores por juez**: cada juez selecciona qué jugadores evaluar; el sistema bloquea para que no haya conflictos entre jueces.
- **Historial**: estadisticas historicas por jugador, metricas derivadas (goles/partido, efectividad, etc.), radar chart con seleccion de jugadores, graficos de barras, tabla comparativa.
- **Tab Individual**: datos crudos por partido + totales acumulados + promedios por partido, por cada jugador.
- **Grafico de evolucion**: linea por jugador que muestra como cambia una estadistica a lo largo de sus partidos.
- **Formacion**: grilla unica y persistente de 7 posiciones (portero, defensas, laterales, centrocampista, delantero) x 4 minutos (0, 10, 20, 30). Un solo jugador por celda, con colores por jugador para identificarlos facilmente. No se admiten repetidos dentro de la misma columna (minuto). Autosave: cada cambio se guarda solo (debounce ~600ms). La edicion se desbloquea con el pincode de administrador una sola vez y se conserva en `localStorage`. Desde la misma vista se descargan las imagenes de alineacion del 1er y 2do tiempo (replican el script Python `futform/futform.py`): `Min 0/10` = 1er tiempo, `Min 20/30` = 2do tiempo.
- **3 vistas por rol**: admin (`/admin`), operador (`/partido/[id]`), juez (`/evaluacion/[partidoId]/[token]`).
- **Docker Compose**: despliegue con un solo comando.

---

## Stack tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Recharts |
| Backend | Next.js API Routes |
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

# 5. Iniciar en modo desarrollo (con hot reload)
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

# Iniciar en modo desarrollo (hot reload)
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
npm run dev          # Servidor de desarrollo con hot reload
npm run dev:full     # Redis + setup + servidor de desarrollo (todo en uno)
npm run build        # Build de produccion
npm start            # Iniciar en modo produccion
npm run lint         # Linting
npx prisma db push   # Sincronizar esquema con la DB
npx prisma studio    # Abrir Prisma Studio (UI de la DB)
```

---

## Arquitectura

```
bluelockstats/
├── docker-compose.yml          # Servicios: app, db (PostgreSQL), redis
├── Dockerfile                  # Build multi-stage para produccion
├── scripts/start.sh            # Startup: prisma db push && npm start
├── .env.example                # Template de variables de entorno
├── prisma/
│   └── schema.prisma           # Esquema de BD (6 modelos)
├── src/
│   ├── app/
│   │   ├── api/                # API Routes (19 endpoints)
│   │   │   ├── reset/          # Reinicio global (pincode)
│   │   │   ├── jugadores/
│   │   │   ├── partidos/
│   │   │   │   └── [id]/
│   │   │   │       ├── stats/  # Actualizar stat
│   │   │   │       ├── cambiar/# Cambiar jugador
│   │   │   │       └── plantel/# Agregar/quitar jugadores del partido
│   │   │   ├── formacion/      # Grilla de formacion (GET/PUT con pincode)
│   │   │   ├── evaluacion/
│   │   │   └── historial/
│   │   ├── admin/              # Panel de administracion
│   │   │   ├── page.tsx        # Dashboard admin
│   │   │   ├── jugadores/      # CRUD de jugadores
│   │   │   ├── formacion/      # Grilla 7x4 de formacion
│   │   │   └── partidos/
│   │   │       ├── nuevo/      # Crear partido
│   │   │       └── [id]/       # Detalle/control del partido
│   │   ├── partido/[id]/       # Vista del operador (registro)
│   │   ├── evaluacion/         # Vista del juez
│   │   │   └── [partidoId]/[juezToken]/
│   │   └── historial/          # Estadisticas historicas
│   │       └── jugador/[id]/   # Historial individual
│   ├── components/             # Componentes React compartidos
│   │   ├── Navbar.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── JudgeScorePad.tsx
│   │   ├── StatButton.tsx
│   │   └── PincodeModal.tsx    # Modal de pincode reutilizable
│   └── lib/
│       ├── db.ts               # Cliente Prisma (singleton)
│       ├── redis.ts            # Cliente Redis
│       ├── formacion.ts        # Posiciones, minutos y tipos de formacion
│       └── colores.ts          # Paleta de colores por jugador
└── public/                     # Archivos estaticos
```

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
├── tokenAcceso String   @unique @default(uuid())
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

EvaluacionJuez
├── id                Int     @id @default(autoincrement())
├── partidoId         Int
├── jugadorId         Int
├── juezToken         String  // UUID unico por juez
├── puntuacion        Int     // 1-5 por jugador
├── completado        Boolean @default(false)
├── @@unique([partidoId, jugadorId, juezToken])

Formacion
├── id         Int      @id @default(autoincrement())
├── datos      Json     // grilla 7 posiciones x 4 minutos, cada celda es un array de jugadorIds
├── updatedAt  DateTime
└── Nota: tabla unica (una sola fila persistente). El PUT valida que no haya jugadores repetidos dentro de una misma columna (minuto) y exige pincode de administrador.
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
| `POST` | `/api/partidos` | Crear partido `{ rival, fecha, cancha?, jugadoresIds: number[] }` |
| `GET` | `/api/partidos/[id]` | Detalle del partido con jugadores y stats |
| `PUT` | `/api/partidos/[id]` | Actualizar estado `{ estado }` |
| `PUT` | `/api/partidos/[id]/stats` | Actualizar stat `{ jugadorId, stat, incremento }` |
| `POST` | `/api/partidos/[id]/cambiar` | Cambiar jugador `{ jugadorSalienteId, jugadorEntranteId }` |
| `POST` | `/api/partidos/[id]/plantel` | Agregar/quitar del plantel `{ action: "agregar"\|"quitar", jugadorId }` (solo antes de iniciar) |

### Evaluacion

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/evaluacion/[partidoId]/[juezToken]` | Obtener estado de evaluacion (asignados, disponibles, stats) |
| `POST` | `/api/evaluacion/[partidoId]/[juezToken]` | `action: "asignar"` reservar jugadores, `action: "guardar"` guardar scores |

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
| `PUT` | `/api/formacion` | Guardar la grilla `{ datos, pincode }`. Valida estructura, no repetidos por columna y pincode de admin |

---

## Flujo de uso

### 1. Preparacion (Admin)

1. Ir a `/admin/jugadores` y agregar los jugadores del equipo (nombre, numero, posicion).
2. Ir a `/admin/formacion`, tocar "Editar", ingresar el pincode y acomodar los jugadores en la grilla de posiciones por minuto (guardar al final).
3. Ir a `/admin/partidos/nuevo`, seleccionar los titulares y crear el partido (requiere pincode de administrador).
4. En `/admin/partidos/[id]` usar "Ajustar Plantel" para agregar/quitar jugadores del partido (solo mientras el partido esta pendiente).
5. Presionar "Iniciar Partido" (requiere pincode). Al iniciar, la gestion de plantel se desactiva y se habilita la creacion de evaluaciones.

### 2. En cancha (Operador)

1. Abrir `/partido/[id]` (link del admin).
2. Registrar goles, asistencias, etc. con los botones +/- de la tabla.
3. Hacer cambios de jugador con "Cambiar Jugador" cuando sea necesario.
4. El admin finaliza el partido desde `/admin/partidos/[id]` (requiere pincode).

### 3. Evaluacion (Jueces)

1. Admin genera una sesion de evaluacion ("Nueva Sesion de Evaluacion", solo con el partido en curso) -> obtiene un link unico por juez.
2. Cada juez abre su link `/evaluacion/[partidoId]/[juezToken]`.
3. **Fase 1 - Seleccion**: El juez elige qué jugadores va a evaluar.
4. **Fase 2 - Stats Objetivas**: Registra goles, asistencias, etc. (o el operador ya lo hizo).
5. **Fase 3 - Subjetiva**: Califica a cada jugador del 1 al 5.
6. Envía la evaluacion.

### 4. Historial

1. Ir a `/historial` para ver estadisticas acumuladas.
2. **Tab Graficos**: barras por metrica seleccionable + grafico de "Evolucion por Partido" por jugador y estadistica.
3. **Tab Tabla**: tabla completa con todas las metricas (las filas llevan al historial individual).
4. **Tab Radar**: radar chart con selector de jugadores (toggle individual).
5. **Tab Individual**: datos crudos por partido, totales acumulados y promedios por partido de un jugador.

### 5. Reset global

Desde la portada, "Reiniciar Estadisticas" permite eliminar todo (partidos, jugadores, estadisticas y formacion) confirmando con el pincode de administrador.

---

## Despliegue

### Docker Compose (produccion)

```bash
docker compose up -d --build
```

Esto levanta:
- **app** (Next.js en puerto 3000)
- **db** (PostgreSQL 16 en puerto 5433)
- **redis** (Redis 7 en puerto 6379)

### Variables de entorno para produccion

Cambiar en `docker-compose.yml` o usar `.env`:
- `POSTGRES_PASSWORD`: cambiar de `bluelock123` a un password seguro.
- `NODE_ENV=production`.

---

## Licencia

MIT
