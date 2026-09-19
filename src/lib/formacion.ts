export const POSICIONES = [
  { key: 'portero', label: 'Portero', numero: 1 },
  { key: 'defensa_izquierdo', label: 'Defensa Izquierdo', numero: 2 },
  { key: 'defensa_derecho', label: 'Defensa Derecho', numero: 3 },
  { key: 'lateral_izquierdo', label: 'Lateral Izquierdo', numero: 4 },
  { key: 'lateral_derecho', label: 'Lateral Derecho', numero: 5 },
  { key: 'centrocampista', label: 'Centrocampista', numero: 6 },
  { key: 'delantero', label: 'Delantero', numero: 7 },
] as const

export const MINUTOS = [0, 10, 20, 30] as const

export type ClavePosicion = (typeof POSICIONES)[number]['key']

export type FormacionData = Record<ClavePosicion, Record<string, number[]>>

export type DatosFormacion = Record<string, Record<string, number[]>>

export const FORMACION_VACIA = (): FormacionData => {
  const vacia = {} as FormacionData
  for (const { key } of POSICIONES) {
    vacia[key] = {}
    for (const minuto of MINUTOS) {
      vacia[key][String(minuto)] = []
    }
  }
  return vacia
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

export function extraerJugadoresPorMinuto(datos: FormacionData, minuto: string): number[] {
  const ids: number[] = []
  for (const posicion of POSICIONES) {
    if (posicion.key === 'portero') continue
    const celda = datos[posicion.key]?.[minuto]
    if (celda && celda.length > 0) {
      ids.push(celda[0])
    }
  }
  return ids
}