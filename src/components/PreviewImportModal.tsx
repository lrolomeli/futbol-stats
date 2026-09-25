'use client'

import type { PreviewImport } from '@/lib/respaldoFormacion'

export default function PreviewImportModal({
  preview,
  jugadoresAAgregar = 0,
  onConfirmar,
  onCancelar
}: {
  preview: PreviewImport
  jugadoresAAgregar?: number
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const generado = preview.generadoEn ? new Date(preview.generadoEn) : null
  const fechaLegible = generado && !isNaN(generado.getTime())
    ? generado.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })
    : 'sin fecha'

  const resumen = [
    { valor: preview.celdasConJugador, texto: 'celdas con jugadores' },
    { valor: preview.cambios, texto: 'cambios' },
    { valor: preview.celdasQueSeVacias, texto: 'celdas que se vacían' },
    { valor: preview.faltantes.length, texto: 'sin asignar' }
  ]

  const vias = [
    { valor: preview.resueltosPorId, texto: 'por id' },
    { valor: preview.resueltosPorNumero, texto: 'por número de camiseta' },
    { valor: preview.resueltosPorNombre, texto: 'por nombre' }
  ]

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-gray-800 w-full max-w-lg rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-semibold text-lg">Restaurar formación</h3>
          <button onClick={onCancelar} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <p className="text-gray-400 text-xs mb-3">Copia del {fechaLegible}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {resumen.map(({ valor, texto }) => (
            <div key={texto} className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-white text-lg font-bold leading-none">{valor}</div>
              <div className="text-gray-400 text-[10px] mt-1">{texto}</div>
            </div>
          ))}
        </div>

        {vias.some(v => v.valor > 0) && (
          <p className="text-gray-400 text-xs mb-3">
            Jugadores reconocidos:{' '}
            {vias.filter(v => v.valor > 0).map(v => `${v.valor} ${v.texto}`).join(', ')}.
          </p>
        )}

        {jugadoresAAgregar > 0 && (
          <div className="bg-green-600/15 border border-green-600/30 rounded-lg p-3 mb-3">
            <p className="text-green-300 text-xs">
              Se van a agregar {jugadoresAAgregar}{' '}
              {jugadoresAAgregar === 1 ? 'jugador' : 'jugadores'} del archivo a tu equipo.
            </p>
          </div>
        )}

        {preview.faltantes.length > 0 && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-3 mb-3">
            <p className="text-amber-400 text-xs font-semibold mb-1">
              {preview.faltantes.length} {preview.faltantes.length === 1 ? 'jugador' : 'jugadores'} del archivo no están en la lista actual y van a quedar sin asignar:
            </p>
            <ul className="text-amber-200/80 text-[11px] space-y-0.5">
              {preview.faltantes.map((faltante, i) => (
                <li key={`${faltante.posicion}-${faltante.minuto}-${i}`}>
                  #{faltante.numero ?? '?'} {faltante.nombre} · {faltante.posicion} (Min {faltante.minuto})
                </li>
              ))}
            </ul>
          </div>
        )}

        {preview.celdasQueSeVacias > 0 && (
          <div className="bg-red-600/15 border border-red-600/30 rounded-lg p-3 mb-3">
            <p className="text-red-300 text-xs">
              Se van a vaciar {preview.celdasQueSeVacias}{' '}
              {preview.celdasQueSeVacias === 1 ? 'celda' : 'celdas'} que hoy tienen jugadores asignados.
            </p>
          </div>
        )}

        <p className="text-gray-300 text-xs mb-4">
          Se reemplaza toda la formación actual con la del archivo.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancelar}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            ⚠ Restaurar
          </button>
        </div>
      </div>
    </div>
  )
}
