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

## Acceso desde la red local (LAN)

El servidor custom (`server.js`) bindea a `0.0.0.0` **por defecto** para que la app sea accesible desde otros dispositivos de la red. Sobreescribible con `HOSTNAME=localhost npm run dev`. Al arrancar imprime las URLs LAN detectadas. Para alcanzarla desde otros equipos hace falta ademas resolver la red de WSL2 (ver abajo).

### Como se ve la red

- El server de Next + Socket.io corre **dentro de Ubuntu (WSL2)** en `0.0.0.0:3000`; Postgres y Redis tambien corren en WSL por `localhost` (no se exponen).
- El cliente de Socket.io usa `io()` sin URL (`src/app/evaluacion/[partidoId]/page.tsx`), es decir `location.host` de la pagina: el websocket funciona por IP LAN sin configuracion extra.
- Con la NAT clasica de WSL2, `ip addr` muestra una IP virtual `172.20.x.x` (no alcanzable desde la LAN) y Windows expone `vEthernet (WSL)`. Con el modo espejado, WSL toma directamente la IP de la LAN del host.

### Opcion A: modo espejado (recomendada, Windows 11 22H2+)

Crear/editar `C:\Users\<usuario>\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Luego **desde Windows** (no basta cerrar la terminal de Ubuntu):

```powershell
wsl --shutdown
```

y reabrir WSL. Verificar que tomo efecto:

```bash
ip addr   # debe mostrar la IP de la LAN (192.168.x.x), NO 172.20.x.x
```

Si sigue apareciendo la IP NAT `172.20.x.x`, el modo espejado no se aplico (VPN/antivirus/red bloqueando, o WSL viejo): ir a la Opcion B.

### Opcion B: portproxy (fallback, funciona siempre)

Correr como administrador en Windows `C:\Users\<usuario>\wsl-portforward.bat` (copia versionada en `scripts/wsl-portforward.bat`). El script toma la IP actual de WSL dinamicamente, reenvia `0.0.0.0:3000` hacia ella y crea la regla de firewall TCP 3000 si falta:

- Clic derecho en **PowerShell** (o cmd) → **Ejecutar como administrador** y correr el `.bat`.
- Re-ejecutarlo tras cada **reboot** o cambio de red (WSL cambia de IP y Windows borra los proxies al apagar).

Comandos manuales equivalentes (mismo contexto admin):

```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<IP-de-WSL>
netsh advfirewall firewall add rule name="FutbolStats-3000" dir=in action=allow protocol=TCP localport=3000
```

### URL de acceso

- IP del host Windows: `ipconfig` (ej. `192.168.100.69`).
- Desde otro dispositivo de la LAN: `http://<IP-del-host-Windows>:3000`.
- Desde el propio host Windows: `http://localhost:3000` o `http://<IP-de-WSL>:3000` (NAT alcanzable desde el host).

## Entorno local (WSL2)

- WSL2 sin systemd activo como PID 1: `systemctl` **no funciona**.
- PostgreSQL 18 y Redis estan instalados de forma nativa (no Docker; el daemon de Docker no corre).
- Arrancar servicios con scripts SysV:

```bash
sudo service postgresql start
sudo service redis-server start
```

- Credenciales dev: usuario `bluelock` / pass `bluelock123`, DB `bluelockstats` en `localhost:5432`. `REDIS_URL=redis://localhost:6379`.
- En WSL los servicios no persisten entre sesiones: hay que arrancarlos de nuevo tras cada reboot. Para la red LAN ver la seccion **Acceso desde la red local (LAN)**.
- Los scripts de la app (postinstall de `@prisma/client`, `prisma`, `@prisma/engines` y `esbuild`) estan aprobados via `allowScripts` en `package.json` (feature de npm 11, entradas fijadas por version). Si se actualizan esos paquetes, npm pedira re-aprobar.

## Arquitectura

- Rutas: App Router bajo `src/app/`. Paginas client en `page.tsx` con `'use client'`, APIs como `route.ts` (handlers `GET`/`POST`/`PUT`).
- Base de datos: singleton Prisma en `src/lib/db.ts`. Las unicas rutas que escriben en la base son las APIs `api/*`; las paginas de armado de formacion (`/admin/formacion`, `/formacion-ofensiva`, `/mi-formacion`) nunca persisten desde el cliente a mano.
- Evaluacion compartida por partido (`/evaluacion/[partidoId]`, sin tokens ni roles operador/juez): todos los que abren el link ven/editan las mismas stats en tiempo real via websocket.
- Pincode de administrador hardcodeado `098651` (en `PincodeModal`, APIs `formacion` y `reset`).

## Reglas de negocio importantes

- **Formacion** (grilla de 7 posiciones x 4 minutos). Constantes y tipos en `src/lib/formacion.ts`.
  - Hay **dos formaciones** con sets de posiciones distintos, identificados por `clave: 'defensiva' | 'ofensiva'`:
    | clave | ruta | posiciones |
    |---|---|---|
    | `defensiva` | `/admin/formacion` | Portero, Defensa Central, Defensa Izq, Defensa Der, Centrocampista, Delantero Izq, Delantero Der |
    | `ofensiva` | `/formacion-ofensiva` | Portero, Defensa Izq, Defensa Der, Centrocampista, Lateral Izq, Lateral Der, Delantero Punta |  - `Formacion` es **multi-fila con `clave @unique`** (una fila por formación). Nada de `findFirst`: siempre `findUnique({ where: { clave } })`. `GET /api/formacion` toma `?clave=` (default `defensiva`), `PUT` toma `clave` en el body. Sin el parametro sigue sirviendo la defensiva.
  - `POST /api/partidos` y `/evaluacion/[partidoId]` usan siempre la **defensiva** (`CLAVE_DEFENSIVA`).
  - Las dos páginas son wrappers finos de `src/components/FormacionEditor.tsx` (recibe `clave, titulo, hrefVolver, prefijoRespaldo, otraRuta`). Para cambiar la UI se edita el componente, no las páginas.
  - **Un jugador por celda** (refuerzo tambien en la API `PUT /api/formacion`).
  - Un jugador no puede repetirse dentro del mismo minuto.
  - **Autosave**: cada cambio se guarda solo (debounce ~600ms) via `PUT /api/formacion`. No hay boton de guardado.
  - El pincode se pide una sola vez y se conserva en `sessionStorage` (`formacion_pincode`) para reutilizarlo en el autosave. Ojo: la sesión (no el navegador), así que al reabrir la pestaña hay que pedirlo de nuevo. El "Bloquear" de una pagina no bloquea la otra (es estado local de React).
  - Columnas y tiempos: `Min 0` = alineacion inicial 1er tiempo, `Min 10` = cambios 1er tiempo, `Min 20` = inicial 2do tiempo, `Min 30` = cambios 2do tiempo.
- **Imagen de formacion**: `src/lib/imagenFormacion.ts`. Carga la plantilla segun la clave (`PLANTILLA_POR_CLAVE`): `/formacion-ofensiva.png` para la ofensiva y `/formacion-defensiva.png` para la defensiva. **Las dos usan cajas en porcentajes** (`CAJAS_OFENSIVA` / `CAJAS_DEFENSIVA`, cada posicion con `superior` = alineacion inicial e `inferior` = cambios), y `aPixels()` las convierte a pixeles con `naturalWidth`/`naturalHeight`. El `x`/`y` es el **centro** del nombre, no la esquina; el ancho y alto de caja son los constantes `ANCHO_CAJA` / `ALTO_CAJA`. El numero del tiempo (1 o 2) va en el punto de `CAJA_TIEMPO_POR_CLAVE` de cada clave; la palabra de la etiqueta ya viene impresa en la imagen y no se dibuja. El tamaño de la fuente va como porcentaje del alto de la imagen (`FUENTE_NORMAL_PORCENTAJE` / `FUENTE_TITULO_PORCENTAJE`) para no depender de la resolucion. `CAJAS_POR_CLAVE` esta anotado con `satisfies Record<ClavePosicionDe<...>>`, asi que agregar una posicion sin su caja rompe el `tsc` en vez de dibujar el nombre en ningun lado. Replica el script Python `futform/futform.py`.
- **Copia de seguridad de la formacion** (bloque "Copia de seguridad"): todo en `src/lib/respaldoFormacion.ts`, sin endpoints nuevos.
  - Exportar = `descargarRespaldo(datos, jugadorPorId, clave, prefijo)`: baja un JSON `{ version, clave, generadoEn, jugadores, datos }` y nombre `${prefijo}-YYYY-MM-DD_HHmm.json`. Solo incluye los jugadores en uso.
  - `VERSION_RESPALDO = 2`. La v2 agrega `clave`; los archivos v1 (sin `clave`) se asumen **ofensivos** (`parsearRespaldo` se lo completa).
  - Importar = `parsearRespaldo` (valida version, que la `clave` exista, posiciones **del set del propio archivo**, minutos, 1 por celda y unicidad por minuto) + `generarPreviewImport` (resuelve por cascada **id → numero → nombre**, nombre normalizado con NFD sin tildes, y calcula el diff) → `PreviewImportModal` **reemplaza toda la formación** previa confirmación.
  - **No se puede importar un respaldo de una formación en la otra**: ambas paginas rechazan el archivo con un error explicito antes de abrir el preview.
  - El import reusa el `PUT /api/formacion` (el mismo autosave de 600ms), no hay logica de persistencia nueva. Requiere `editando` (pincode) para importar; exportar siempre esta disponible.
  - Los jugadores no resolubles y las colisiones que surjan al resolver quedan como `faltantes` en el preview en vez de romper el PUT con un 400.
- **Mi formacion** (`/mi-formacion`, sin pincode ni login): version libre de la grilla para que cualquiera arme su propia alineacion, **para las dos formaciones** (tabs Defensiva/Ofensiva). **No escribe nunca en la base**: todo vive en `localStorage` (una clave por formacion: `mi_formacion_defensiva` / `mi_formacion_ofensiva`; la vieja `mi_formacion` se lee como fallback la primera vez en la ofensiva). Logica de estado en `src/lib/miFormacion.ts`.
  - El unico fetch es `GET /api/jugadores` (solo lectura) para ofrecer la plantilla de la app. Si falla, muestra un aviso y la pagina sigue funcionando con los jugadores propios.
  - `JugadorLocal` = `{ id, nombre, numero, posicion, origen: 'propio'|'app', appId }`. Los ids son **locales**, no los de la DB.
  - Al elegir un jugador de la app se **copia** al roster local (queda con `appId` para no volver a ofrecerlo). Tambien hay "Copiar plantilla de la app" (copia todos los que falten). Nada queda referenciado a la base, asi que un reset global no rompe nada.
  - Autosave a `localStorage` con debounce `GUARDADO_MS` (400ms) via `useEffect` sobre `estado` (el cleanup cancela el timer anterior).
  - `cargarEstado(clave)` valida/normaliza lo que haya en `localStorage` reusando `generarPreviewImport`: descarta jugadores sin nombre, ids duplicados e ids que no existan en el roster.
  - Export/import JSON, descarga de imagen y `TablaRotacionCuartos` son los mismos de `/admin/formacion` (`descargarRespaldo(..., 'mi-formacion-' + clave)` cambia el prefijo del archivo; `PreviewImportModal` es un componente compartido en `src/components/`).
  - Al importar, `jugadoresDelRespaldoAusentes` **agrega al roster local los jugadores del archivo que falten**, asi una copia se puede restaurar incluso en un navegador limpio. El preview se calcula contra ese roster extendido para que los numeros del modal sean los reales.
- **Evaluacion** (`/evaluacion/[partidoId]`): vista unica compartida por partido (sin tokens ni roles). Los cambios de stats se guardan via `PUT /api/partidos/[id]/stats` y se emiten por Socket.io al room `partido:{id}` (`src/lib/socket.ts`); los clientes aplican el valor devuelto/recibido (no suman). El boton "Cambiar jugador" usa `POST /api/partidos/[id]/cambiar`. "Finalizar evaluacion" (solo 4to cuarto) cierra la ventana sin tocar la base de datos.
- Reset global y creacion de partidos: acciones protegidas por el mismo pincode.