import { FORMACION_VACIA } from './formacion'
import type { FormacionData } from './formacion'
import { generarPreviewImport } from './respaldoFormacion'
import type { RespaldoFormacion } from './respaldoFormacion'

export const VERSION_MI_FORMACION = 1
export const CLAVE_MI_FORMACION = 'mi_formacion'
export const GUARDADO_MS = 400

export type OrigenJugador = 'propio' | 'app'

export interface JugadorLocal {
  id: number
  nombre: string
  numero: number
  posicion: string | null
  origen: OrigenJugador
  appId: number | null
}

export interface EstadoMiFormacion {
  version: number
  jugadores: JugadorLocal[]
  datos: FormacionData
  actualizadoEn: string
}

export const MI_FORMACION_VACIA = (): EstadoMiFormacion => ({
  version: VERSION_MI_FORMACION,
  jugadores: [],
  datos: FORMACION_VACIA(),
  actualizadoEn: new Date().toISOString()
})

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizarJugadores(crudo: unknown): JugadorLocal[] {
  if (!Array.isArray(crudo)) return []
  const vistos = new Set<number>()
  const jugadores: JugadorLocal[] = []

  for (const item of crudo) {
    if (!item || typeof item !== 'object') continue
    const candidato = item as Record<string, unknown>
    const id = candidato.id
    if (!Number.isInteger(id) || vistos.has(id as number)) continue
    if (typeof candidato.nombre !== 'string' || candidato.nombre.trim() === '') continue

    vistos.add(id as number)
    jugadores.push({
      id: id as number,
      nombre: candidato.nombre.trim(),
      numero: Number.isInteger(candidato.numero) ? (candidato.numero as number) : 0,
      posicion:
        typeof candidato.posicion === 'string' && candidato.posicion.trim() !== ''
          ? candidato.posicion.trim()
          : null,
      origen: candidato.origen === 'app' ? 'app' : 'propio',
      appId: Number.isInteger(candidato.appId) ? (candidato.appId as number) : null
    })
  }

  jugadores.sort((a, b) => a.numero - b.numero)
  return jugadores
}

export function normalizarEstado(crudo: unknown): EstadoMiFormacion {
  const jugadores = normalizarJugadores(
    crudo && typeof crudo === 'object' ? (crudo as Record<string, unknown>).jugadores : null
  )
  const datosCandidatas =
    crudo && typeof crudo === 'object' && (crudo as Record<string, unknown>).datos

  const respaldo: RespaldoFormacion = {
    version: VERSION_MI_FORMACION,
    generadoEn: null,
    jugadores: jugadores.map(j => ({ id: j.id, numero: j.numero, nombre: j.nombre })),
    datos:
      datosCandidatas && typeof datosCandidatas === 'object'
        ? (datosCandidatas as FormacionData)
        : FORMACION_VACIA()
  }

  const { datosResultantes } = generarPreviewImport(respaldo, jugadores, FORMACION_VACIA())

  return {
    version: VERSION_MI_FORMACION,
    jugadores,
    datos: datosResultantes,
    actualizadoEn: new Date().toISOString()
  }
}

export function cargarEstado(): EstadoMiFormacion {
  if (typeof window === 'undefined') return MI_FORMACION_VACIA()
  try {
    const texto = window.localStorage.getItem(CLAVE_MI_FORMACION)
    if (!texto) return MI_FORMACION_VACIA()
    return normalizarEstado(JSON.parse(texto))
  } catch {
    return MI_FORMACION_VACIA()
  }
}

export function guardarEstado(estado: EstadoMiFormacion): boolean {
  if (typeof window === 'undefined') return false
  try {
    const payload: EstadoMiFormacion = { ...estado, actualizadoEn: new Date().toISOString() }
    window.localStorage.setItem(CLAVE_MI_FORMACION, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function borrarEstado(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CLAVE_MI_FORMACION)
  } catch {
    // sin localStorage disponible no hay nada que borrar
  }
}

export function siguienteIdJugador(jugadores: readonly JugadorLocal[]): number {
  return jugadores.reduce((mayor, j) => Math.max(mayor, j.id), 0) + 1
}

export function quitarJugadorDeFormacion(datos: FormacionData, jugadorId: number): FormacionData {
  const copia: FormacionData = { ...datos }
  for (const celdas of Object.values(copia)) {
    for (const minuto of Object.keys(celdas)) {
      celdas[minuto] = celdas[minuto].filter(id => id !== jugadorId)
    }
  }
  return copia
}

export function jugadoresDelRespaldoAusentes(
  respaldo: RespaldoFormacion,
  jugadores: readonly JugadorLocal[]
): JugadorLocal[] {
  const porId = new Set(jugadores.map(j => j.id))
  const porNumero = new Set(jugadores.map(j => j.numero))
  const porNombre = new Set(jugadores.map(j => normalizarNombre(j.nombre)))

  let siguiente = siguienteIdJugador(jugadores)
  const nuevos: JugadorLocal[] = []

  for (const ref of respaldo.jugadores) {
    const nombre = ref.nombre?.trim()
    if (!nombre) continue
    if (porId.has(ref.id) || porNumero.has(ref.numero) || porNombre.has(normalizarNombre(nombre))) continue

    porNumero.add(ref.numero)
    porNombre.add(normalizarNombre(nombre))
    nuevos.push({
      id: siguiente++,
      nombre,
      numero: ref.numero,
      posicion: null,
      origen: 'propio',
      appId: null
    })
  }

  return nuevos
}
