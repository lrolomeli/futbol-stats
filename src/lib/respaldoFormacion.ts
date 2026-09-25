import { POSICIONES, MINUTOS, FORMACION_VACIA, extraerJugadoresDeFormacion } from './formacion'
import type { FormacionData } from './formacion'

export const VERSION_RESPALDO = 1

export interface JugadorRespaldo {
  id: number
  numero: number
  nombre: string
}

export interface RespaldoFormacion {
  version: number
  generadoEn: string | null
  jugadores: JugadorRespaldo[]
  datos: FormacionData
}

export type ParseoRespaldo =
  | { ok: true; respaldo: RespaldoFormacion }
  | { ok: false; error: string }

export interface JugadorFaltante {
  posicion: string
  minuto: string
  nombre: string
  numero: number | null
}

export interface PreviewImport {
  generadoEn: string | null
  celdasConJugador: number
  cambios: number
  celdasQueSeVacias: number
  resueltosPorId: number
  resueltosPorNumero: number
  resueltosPorNombre: number
  faltantes: JugadorFaltante[]
  datosResultantes: FormacionData
}

function etiquetaPosicion(key: string): string {
  return POSICIONES.find(p => p.key === key)?.label ?? key
}

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function selloFecha(): string {
  const ahora = new Date()
  const dos = (n: number) => String(n).padStart(2, '0')
  const fecha = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
  return `${fecha}_${dos(ahora.getHours())}${dos(ahora.getMinutes())}`
}

export function crearRespaldo(
  datos: FormacionData,
  jugadorPorId: ReadonlyMap<number, JugadorRespaldo>
): RespaldoFormacion {
  const jugadores: JugadorRespaldo[] = []
  for (const id of extraerJugadoresDeFormacion(datos)) {
    const jugador = jugadorPorId.get(id)
    if (!jugador) continue
    jugadores.push({ id: jugador.id, numero: jugador.numero, nombre: jugador.nombre })
  }
  jugadores.sort((a, b) => a.numero - b.numero)
  return {
    version: VERSION_RESPALDO,
    generadoEn: new Date().toISOString(),
    jugadores,
    datos
  }
}

export function descargarRespaldo(
  datos: FormacionData,
  jugadorPorId: ReadonlyMap<number, JugadorRespaldo>,
  prefijo = 'formacion'
): void {
  const respaldo = crearRespaldo(datos, jugadorPorId)
  const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${prefijo}-${selloFecha()}.json`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export function parsearRespaldo(texto: string): ParseoRespaldo {
  let crudo: any
  try {
    crudo = JSON.parse(texto)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido' }
  }

  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) {
    return { ok: false, error: 'El archivo no tiene el formato de una copia de formación' }
  }
  if (typeof crudo.version !== 'number') {
    return { ok: false, error: 'El archivo no indica la versión del respaldo' }
  }
  if (crudo.version > VERSION_RESPALDO) {
    return { ok: false, error: `El archivo es de una versión más nueva (v${crudo.version})` }
  }
  if (!Array.isArray(crudo.jugadores)) {
    return { ok: false, error: 'El archivo no tiene la lista de jugadores' }
  }
  if (!crudo.datos || typeof crudo.datos !== 'object' || Array.isArray(crudo.datos)) {
    return { ok: false, error: 'El archivo no tiene la formación' }
  }

  for (const jugador of crudo.jugadores) {
    if (!jugador || typeof jugador !== 'object' || !Number.isInteger(jugador.id)) {
      return { ok: false, error: 'La lista de jugadores del archivo es inválida' }
    }
  }

  const minutosValidos = new Set(MINUTOS.map(String))
  const usadosPorMinuto = new Map<string, Set<number>>()

  for (const { key } of POSICIONES) {
    const celdas = crudo.datos[key]
    if (celdas == null) continue
    if (typeof celdas !== 'object' || Array.isArray(celdas)) {
      return { ok: false, error: `Datos inválidos en la posición ${etiquetaPosicion(key)}` }
    }
    for (const minuto in celdas) {
      const etiqueta = `${etiquetaPosicion(key)} minuto ${minuto}`
      if (!minutosValidos.has(minuto)) {
        return { ok: false, error: `Minuto desconocido en ${etiqueta}` }
      }
      const celda = celdas[minuto]
      if (celda == null) continue
      if (!Array.isArray(celda) || celda.some((id: unknown) => !Number.isInteger(id))) {
        return { ok: false, error: `Lista inválida en ${etiqueta}` }
      }
      if (celda.length > 1) {
        return { ok: false, error: `El archivo tiene más de un jugador en ${etiqueta}` }
      }
      const usados = usadosPorMinuto.get(minuto) ?? new Set<number>()
      for (const id of celda as number[]) {
        if (usados.has(id)) {
          return { ok: false, error: `El archivo repite al jugador ${id} en el minuto ${minuto}` }
        }
        usados.add(id)
      }
      usadosPorMinuto.set(minuto, usados)
    }
  }

  return {
    ok: true,
    respaldo: {
      version: crudo.version,
      generadoEn: typeof crudo.generadoEn === 'string' ? crudo.generadoEn : null,
      jugadores: crudo.jugadores,
      datos: crudo.datos
    }
  }
}

export function generarPreviewImport(
  respaldo: RespaldoFormacion,
  jugadoresActivos: readonly JugadorRespaldo[],
  datosActuales: FormacionData
): PreviewImport {
  const porId = new Map<number, JugadorRespaldo>()
  const porNumero = new Map<number, JugadorRespaldo>()
  const porNombre = new Map<string, JugadorRespaldo>()

  for (const jugador of jugadoresActivos) {
    porId.set(jugador.id, jugador)
    if (!porNumero.has(jugador.numero)) porNumero.set(jugador.numero, jugador)
    const clave = normalizarNombre(jugador.nombre)
    if (!porNombre.has(clave)) porNombre.set(clave, jugador)
  }

  const refsPorId = new Map<number, JugadorRespaldo>()
  for (const ref of respaldo.jugadores) refsPorId.set(ref.id, ref)

  const datosResultantes = FORMACION_VACIA()
  const usadosPorMinuto = new Map<string, Set<number>>()
  const faltantes: JugadorFaltante[] = []

  let resueltosPorId = 0
  let resueltosPorNumero = 0
  let resueltosPorNombre = 0
  let celdasConJugador = 0

  for (const { key } of POSICIONES) {
    for (const minuto of MINUTOS) {
      const columna = String(minuto)
      const celda = respaldo.datos?.[key]?.[columna]
      const ref = Array.isArray(celda) && celda.length > 0 ? celda[0] : null
      if (ref == null) continue

      const descripcion = refsPorId.get(ref)
      const nombreRef = descripcion?.nombre ?? `Jugador ${ref}`
      const numeroRef = descripcion?.numero ?? null

      let encontrado = porId.get(ref)
      let via: 'id' | 'numero' | 'nombre' | null = encontrado ? 'id' : null

      if (!encontrado && numeroRef != null) {
        encontrado = porNumero.get(numeroRef)
        if (encontrado) via = 'numero'
      }
      if (!encontrado && descripcion?.nombre) {
        encontrado = porNombre.get(normalizarNombre(descripcion.nombre))
        if (encontrado) via = 'nombre'
      }

      if (!encontrado || !via) {
        faltantes.push({ posicion: etiquetaPosicion(key), minuto: columna, nombre: nombreRef, numero: numeroRef })
        continue
      }

      const usados = usadosPorMinuto.get(columna) ?? new Set<number>()
      if (usados.has(encontrado.id)) {
        faltantes.push({ posicion: etiquetaPosicion(key), minuto: columna, nombre: nombreRef, numero: numeroRef })
        continue
      }
      usados.add(encontrado.id)
      usadosPorMinuto.set(columna, usados)

      datosResultantes[key][columna] = [encontrado.id]
      celdasConJugador++
      if (via === 'id') resueltosPorId++
      else if (via === 'numero') resueltosPorNumero++
      else resueltosPorNombre++
    }
  }

  let cambios = 0
  let celdasQueSeVacias = 0
  for (const { key } of POSICIONES) {
    for (const minuto of MINUTOS) {
      const columna = String(minuto)
      const antes = datosActuales[key][columna]
      const despues = datosResultantes[key][columna]
      if (antes[0] !== despues[0]) cambios++
      if (antes.length > 0 && despues.length === 0) celdasQueSeVacias++
    }
  }

  return {
    generadoEn: respaldo.generadoEn,
    celdasConJugador,
    cambios,
    celdasQueSeVacias,
    resueltosPorId,
    resueltosPorNumero,
    resueltosPorNombre,
    faltantes,
    datosResultantes
  }
}
