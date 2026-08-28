'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface Jugador {
  id: number
  nombre: string
  numero: number
  posicion: string | null
}

interface Stats {
  goles: number
  asistencias: number
  recuperaciones: number
  tirosAPorteria: number
  faltas: number
  balonesPerdidos: number
  tirosAfuera: number
}

interface PartidoCompleto {
  id: number
  rival: string
  estado: string
  jugadoresEnCancha: { jugador: Jugador; enCancha: boolean; esSuplente: boolean }[]
  statsObjetivas: (Stats & { jugadorId: number; jugador: Jugador })[]
}

const STAT_CONFIG: { key: keyof Stats; label: string }[] = [
  { key: 'goles', label: 'Goles' },
  { key: 'asistencias', label: 'Asistencias' },
  { key: 'recuperaciones', label: 'Recuperaciones' },
  { key: 'tirosAPorteria', label: 'Tiros a portería' },
  { key: 'faltas', label: 'Faltas' },
  { key: 'balonesPerdidos', label: 'Balones perdidos' },
  { key: 'tirosAfuera', label: 'Tiros afuera' },
]

export default function RegistroPartidoPage() {
  const params = useParams()
  const [partido, setPartido] = useState<PartidoCompleto | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<number | null>(null)
  const [modalStat, setModalStat] = useState<{ jugadorId: number; jugadorNombre: string; jugadorNumero: number; stat: keyof Stats; label: string; valor: number } | null>(null)

  useEffect(() => {
    cargarPartido()
  }, [params.id])

  const cargarPartido = async () => {
    const res = await fetch(`/api/partidos/${params.id}`)
    const data = await res.json()
    setPartido(data)
  }

  const jugadoresEnCancha = partido?.jugadoresEnCancha
    .filter(j => j.enCancha)
    .map(j => j.jugador) || []

  const handleStatChange = useCallback(async (jugadorId: number, stat: keyof Stats, incremento: number) => {
    await fetch(`/api/partidos/${params.id}/stats`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, stat, incremento })
    })

    setPartido(prev => {
      if (!prev) return prev
      return {
        ...prev,
        statsObjetivas: prev.statsObjetivas.map(s =>
          s.jugadorId === jugadorId
            ? { ...s, [stat]: Math.max(0, (s as any)[stat] + incremento) }
            : s
        )
      }
    })
  }, [params.id])

  const handleCambiarJugador = async (jugadorSalienteId: number, jugadorEntranteId: number) => {
    await fetch(`/api/partidos/${params.id}/cambiar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorSalienteId, jugadorEntranteId })
    })

    await cargarPartido()
    setCambiando(false)
    setJugadorSeleccionado(null)
  }

  if (!partido) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando partido...</p>
      </div>
    )
  }

  const resumen = partido.statsObjetivas.reduce(
    (acc, s) => ({
      goles: acc.goles + s.goles,
      faltas: acc.faltas + s.faltas,
      recuperaciones: acc.recuperaciones + s.recuperaciones,
    }),
    { goles: 0, faltas: 0, recuperaciones: 0 }
  )

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      <Navbar
        titulo={`BlueLock vs ${partido.rival}`}
        mostrarVolver
        hrefVolver={`/admin/partidos/${partido.id}`}
      />

      {/* Resumen rápido */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-2 flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-green-400">{resumen.goles}</p>
            <p className="text-xs text-gray-400">Goles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{resumen.faltas}</p>
            <p className="text-xs text-gray-400">Faltas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{resumen.recuperaciones}</p>
            <p className="text-xs text-gray-400">Recup.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Tabla de stats */}
        <div className="bg-gray-800 rounded-xl overflow-hidden mx-auto" style={{ width: 'fit-content', maxWidth: '100%' }}>
          <div className="overflow-x-auto">
            <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="sticky left-0 bg-gray-800 z-10 px-2 py-2 text-center text-gray-300 font-semibold w-10">
                    #
                  </th>
                  {STAT_CONFIG.map(({ key, label }) => (
                    <th key={key} className="px-1 py-2 text-center text-gray-300 font-semibold">
                      <span className="inline-block text-[10px] whitespace-nowrap" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                        {label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jugadoresEnCancha.map(jugador => {
                  const statsJugador = partido.statsObjetivas.find(s => s.jugadorId === jugador.id)
                  return (
                    <tr key={jugador.id} className="border-b border-gray-700/50 hover:bg-gray-750 transition-colors">
                      <td className="sticky left-0 bg-gray-800 z-10 px-2 py-2 text-center">
                        <span className="text-primary-400 font-bold text-sm">#{jugador.numero}</span>
                      </td>
                      {STAT_CONFIG.map(({ key, label }) => {
                        const valor = statsJugador ? (statsJugador as any)[key] : 0
                        return (
                          <td key={key} className="px-0 py-1">
                            <button
                              onClick={() => setModalStat({
                                jugadorId: jugador.id,
                                jugadorNombre: jugador.nombre,
                                jugadorNumero: jugador.numero,
                                stat: key,
                                label,
                                valor,
                              })}
                              className={`w-full text-center py-2 text-sm font-bold rounded-lg transition-colors ${
                                valor > 0
                                  ? 'text-primary-400 bg-primary-600/10 hover:bg-primary-600/20'
                                  : 'text-gray-500 hover:bg-gray-700'
                              }`}
                            >
                              {valor}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botón de cambio */}
        <button
          onClick={() => setCambiando(true)}
          className="w-full bg-accent-600 hover:bg-accent-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          🔄 Cambiar Jugador
        </button>
      </div>

      {/* Modal de cambio de jugador */}
      {cambiando && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
          <div className="bg-gray-800 w-full max-w-lg rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Cambiar Jugador</h3>
              <button
                onClick={() => { setCambiando(false); setJugadorSeleccionado(null) }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {!jugadorSeleccionado ? (
              <>
                <p className="text-gray-400 mb-3">Selecciona quién sale:</p>
                <div className="space-y-2">
                  {jugadoresEnCancha.map(j => (
                    <button
                      key={j.id}
                      onClick={() => setJugadorSeleccionado(j.id)}
                      className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-3 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold">
                        #{j.numero}
                      </div>
                      <span className="text-white">{j.nombre}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-3">Selecciona quién entra:</p>
                <div className="space-y-2">
                  {partido.jugadoresEnCancha
                    .filter(j => !j.enCancha)
                    .map(({ jugador }) => (
                      <button
                        key={jugador.id}
                        onClick={() => handleCambiarJugador(jugadorSeleccionado, jugador.id)}
                        className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-3 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
                          #{jugador.numero}
                        </div>
                        <span className="text-white">{jugador.nombre}</span>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de editar stat */}
      {modalStat && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setModalStat(null)}>
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <p className="text-gray-400 text-sm text-center mb-1">#{modalStat.jugadorNumero} {modalStat.jugadorNombre}</p>
            <h3 className="text-white font-bold text-lg text-center mb-6">{modalStat.label}</h3>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => {
                  const nuevo = Math.max(0, modalStat.valor - 1)
                  setModalStat({ ...modalStat, valor: nuevo })
                  handleStatChange(modalStat.jugadorId, modalStat.stat, -1)
                }}
                className="w-16 h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-3xl font-bold flex items-center justify-center transition-colors active:scale-95"
              >
                −
              </button>
              <span className="text-5xl font-bold text-white w-16 text-center">{modalStat.valor}</span>
              <button
                onClick={() => {
                  const nuevo = modalStat.valor + 1
                  setModalStat({ ...modalStat, valor: nuevo })
                  handleStatChange(modalStat.jugadorId, modalStat.stat, 1)
                }}
                className="w-16 h-16 rounded-full bg-primary-600 hover:bg-primary-500 text-white text-3xl font-bold flex items-center justify-center transition-colors active:scale-95"
              >
                +
              </button>
            </div>

            <button
              onClick={() => setModalStat(null)}
              className="w-full mt-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
