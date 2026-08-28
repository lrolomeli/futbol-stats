const PALETA = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#d946ef',
  '#f43f5e',
  '#a855f7'
]

export function colorDeJugador(id: number): string {
  return PALETA[id % PALETA.length]
}