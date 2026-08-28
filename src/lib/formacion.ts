export const POSICIONES = [
  { key: 'portero', label: 'Portero' },
  { key: 'defensa_izquierdo', label: 'Defensa Izquierdo' },
  { key: 'defensa_derecho', label: 'Defensa Derecho' },
  { key: 'lateral_izquierdo', label: 'Lateral Izquierdo' },
  { key: 'lateral_derecho', label: 'Lateral Derecho' },
  { key: 'centrocampista', label: 'Centrocampista' },
  { key: 'delantero', label: 'Delantero' },
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