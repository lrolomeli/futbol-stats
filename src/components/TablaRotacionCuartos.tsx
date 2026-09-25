'use client'

import { useMemo, useState } from 'react'
import { CUARTOS, MINUTOS, extraerJugadoresDeFormacion, posicionEnMinuto } from '@/lib/formacion'
import type { ClaveFormacion, FormacionData } from '@/lib/formacion'
import { colorDeJugador } from '@/lib/colores'

interface Jugador {
  id: number
  nombre: string
  numero: number
  posicion: string | null
}

interface Props {
  datos: FormacionData
  jugadorPorId: Map<number, Jugador>
  clave: ClaveFormacion
  tituloShare?: string
}

const BANCA = 'Banca'

const colorCuartos = (cuartos: number): string => {
  if (cuartos >= CUARTOS.length) return 'bg-green-600/25 text-green-300'
  if (cuartos === 3) return 'bg-green-600/10 text-green-500'
  if (cuartos === 2) return 'bg-yellow-500/15 text-yellow-400'
  if (cuartos === 1) return 'bg-orange-500/15 text-orange-400'
  return 'bg-gray-700/50 text-gray-500'
}

export default function TablaRotacionCuartos({ datos, jugadorPorId, clave, tituloShare = '⚽ Rotación por cuartos' }: Props) {
  const [filtro, setFiltro] = useState<number | 'todos'>('todos')

  const jugadoresEnTabla = useMemo(() => {
    const ids = extraerJugadoresDeFormacion(datos)
    return ids
      .map(id => jugadorPorId.get(id))
      .filter((j): j is Jugador => !!j)
      .sort((a, b) => a.numero - b.numero)
  }, [datos, jugadorPorId])

  const filaVisible = filtro === 'todos'
    ? jugadoresEnTabla
    : jugadoresEnTabla.filter(j => j.id === filtro)

  const posicionesPorCuarto = (jugadorId: number): string[] =>
    MINUTOS.map(minuto => posicionEnMinuto(datos, String(minuto), jugadorId, clave) ?? BANCA)

  const cuartosJugados = (jugadorId: number): number =>
    MINUTOS.filter(minuto => posicionEnMinuto(datos, String(minuto), jugadorId, clave) !== null).length

  const compartirWhatsApp = () => {
    const lineas: string[] = []
    if (filtro === 'todos') lineas.push(tituloShare)
    for (const jugador of filaVisible) {
      const posiciones = posicionesPorCuarto(jugador.id).join(' | ')
      lineas.push(`${jugador.nombre} (#${jugador.numero}): ${posiciones}`)
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank')
  }

  return (
    <div className="mt-8 bg-gray-800 p-4 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-white font-semibold text-lg">Posición por Cuartos</h3>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={e => setFiltro(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
            className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="todos">Todos los jugadores</option>
            {jugadoresEnTabla.map(j => (
              <option key={j.id} value={j.id}>#{j.numero} {j.nombre}</option>
            ))}
          </select>
          <button
            onClick={compartirWhatsApp}
            disabled={filaVisible.length === 0}
            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            📱 Compartir por WhatsApp
          </button>
        </div>
      </div>

      {jugadoresEnTabla.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No hay jugadores en la formación.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-2 pr-2 font-semibold text-xs">Jugador</th>
                {CUARTOS.map(c => (
                  <th key={c} className="py-2 px-1 text-center font-semibold text-xs">{c}</th>
                ))}
                <th className="py-2 pl-1 text-center font-semibold text-xs" title="Cuántos cuartos juega">
                  Cuartos
                </th>
              </tr>
            </thead>
            <tbody>
              {filaVisible.map(jugador => (
                <tr key={jugador.id} className="border-t border-gray-700/60">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <span className="font-bold text-xs" style={{ color: colorDeJugador(jugador.id) }}>#{jugador.numero}</span>
                    <span className="text-white ml-1.5">{jugador.nombre}</span>
                  </td>
                  {posicionesPorCuarto(jugador.id).map((posicion, i) => (
                    <td key={i} className="py-2 px-1 text-center">
                      <span className={posicion === BANCA ? 'text-gray-500 text-xs' : 'text-white text-xs'}>
                        {posicion}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 pl-1 text-center">
                    <span
                      className={`inline-block min-w-[22px] rounded px-1 py-0.5 text-xs font-bold ${colorCuartos(cuartosJugados(jugador.id))}`}
                    >
                      {cuartosJugados(jugador.id)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}