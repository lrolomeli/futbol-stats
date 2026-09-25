export const CLAVES_FORMACION = ['defensiva', 'ofensiva'] as const

export type ClaveFormacion = (typeof CLAVES_FORMACION)[number]

export const CLAVE_DEFENSIVA: ClaveFormacion = 'defensiva'
export const CLAVE_OFENSIVA: ClaveFormacion = 'ofensiva'

export interface PosicionDef {
  key: string
  label: string
  numero: number
}

const DEFENSIVA = [
  { key: 'portero', label: 'Portero', numero: 1 },
  { key: 'defensa_central', label: 'Defensa Central', numero: 2 },
  { key: 'defensa_izquierdo', label: 'Defensa Izquierdo', numero: 3 },
  { key: 'defensa_derecho', label: 'Defensa Derecho', numero: 4 },
  { key: 'centrocampista', label: 'Centrocampista', numero: 5 },
  { key: 'delantero_izquierdo', label: 'Delantero Izquierdo', numero: 6 },
  { key: 'delantero_derecho', label: 'Delantero Derecho', numero: 7 }
] as const

const OFENSIVA = [
  { key: 'portero', label: 'Portero', numero: 1 },
  { key: 'defensa_izquierdo', label: 'Defensa Izquierdo', numero: 2 },
  { key: 'defensa_derecho', label: 'Defensa Derecho', numero: 3 },
  { key: 'centrocampista', label: 'Centrocampista', numero: 4 },
  { key: 'lateral_izquierdo', label: 'Lateral Izquierdo', numero: 5 },
  { key: 'lateral_derecho', label: 'Lateral Derecho', numero: 6 },
  { key: 'delantero_punta', label: 'Delantero Punta', numero: 7 }
] as const

export const POSICIONES_POR_CLAVE = {
  defensiva: DEFENSIVA,
  ofensiva: OFENSIVA
} as const

export type ClavePosicionDe<C extends ClaveFormacion> = (typeof POSICIONES_POR_CLAVE)[C][number]['key']

export const posicionesDe = <C extends ClaveFormacion>(clave: C) => POSICIONES_POR_CLAVE[clave]

export const MINUTOS = [0, 10, 20, 30] as const

export const CUARTOS = ['1er Cuarto', '2do Cuarto', '3er Cuarto', '4to Cuarto'] as const

export type FormacionData = Record<string, Record<string, number[]>>

export type DatosFormacion = FormacionData

export const esClaveFormacion = (valor: unknown): valor is ClaveFormacion =>
  typeof valor === 'string' && (CLAVES_FORMACION as readonly string[]).includes(valor)

export const FORMACION_VACIA = (clave: ClaveFormacion): FormacionData => {
  const vacia: FormacionData = {}
  for (const { key } of posicionesDe(clave)) {
    vacia[key] = {}
    for (const minuto of MINUTOS) {
      vacia[key][String(minuto)] = []
    }
  }
  return vacia
}

export function etiquetaDePosicion(clave: ClaveFormacion, key: string): string {
  return (posicionesDe(clave) as readonly PosicionDef[]).find(p => p.key === key)?.label ?? key
}

export function extraerJugadoresDeFormacion(datos: FormacionData): number[] {
  const ids = new Set<number>()
  for (const celdas of Object.values(datos)) {
    for (const jugadores of Object.values(celdas)) {
      for (const id of jugadores) {
        ids.add(id)
      }
    }
  }
  return [...ids]
}

export function posicionEnMinuto(
  datos: FormacionData,
  minuto: string,
  jugadorId: number,
  clave: ClaveFormacion
): string | null {
  for (const { key, label } of posicionesDe(clave)) {
    if (datos[key]?.[minuto]?.includes(jugadorId)) return label
  }
  return null
}

export function extraerJugadoresPorMinuto(
  datos: FormacionData,
  minuto: string,
  clave: ClaveFormacion
): number[] {
  const ids: number[] = []
  for (const posicion of posicionesDe(clave)) {
    if (posicion.key === 'portero') continue
    const celda = datos[posicion.key]?.[minuto]
    if (celda && celda.length > 0) {
      ids.push(celda[0])
    }
  }
  return ids
}

export function idsPorMinuto(datos: FormacionData): Map<string, Set<number>> {
  const mapa = new Map<string, Set<number>>()
  for (const minuto of MINUTOS) {
    const ids = new Set<number>()
    for (const celdas of Object.values(datos)) {
      for (const id of celdas?.[String(minuto)] ?? []) {
        ids.add(id)
      }
    }
    mapa.set(String(minuto), ids)
  }
  return mapa
}
