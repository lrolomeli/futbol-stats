export interface PayloadEstadisticas {
  jugadorId: number
  stat: string
  valor: number
}

declare global {
  // eslint-disable-next-line no-var
  var __io: { to: (room: string) => { emit: (event: string, payload: unknown) => void } } | undefined
}

export function emitEstadisticas(partidoId: number, payload: PayloadEstadisticas) {
  globalThis.__io?.to(`partido:${partidoId}`).emit('stats-update', payload)
}