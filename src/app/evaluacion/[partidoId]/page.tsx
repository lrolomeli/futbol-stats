'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { extraerJugadoresPorMinuto, FORMACION_VACIA } from '@/lib/formacion'
import type { FormacionData } from '@/lib/formacion'

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

interface PartidoInfo {
  id: number
  rival: string
  estado: string
  fecha: string
  jugadoresEnCancha: { jugador: Jugador; enCancha: boolean; esSuplente: boolean }[]
  statsObjetivas: (Stats & { jugadorId: number; jugador: Jugador })[]
}

interface PayloadStats {
  jugadorId: number
  stat: keyof Stats
  valor: number
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

const CUARTOS = [
  { minuto: '0', label: '1er Tiempo - 1ra Mitad' },
  { minuto: '10', label: '1er Tiempo - 2da Mitad' },
  { minuto: '20', label: '2do Tiempo - 1ra Mitad' },
  { minuto: '30', label: '2do Tiempo - 2da Mitad' },
]

export default function EvaluacionPage() {
  const params = useParams()
  const partidoId = Number(params.partidoId)
  const [partido, setPartido] = useState<PartidoInfo | null>(null)
  const [formacion, setFormacion] = useState<FormacionData | null>(null)
  const [cuartoActual, setCuartoActual] = useState(0)
  const [jugadorEditando, setJugadorEditando] = useState<Jugador | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const socketRef = useRef<Socket | null>(null)

  const cargarPartido = useCallback(async () => {
    const res = await fetch(`/api/partidos/${partidoId}`)
    if (!res.ok) {
      setError('Partido no encontrado')
      return
    }
    const data = await res.json()
    setPartido(data)
  }, [partidoId])

  useEffect(() => {
    cargarPartido()

    fetch('/api/formacion')
      .then(res => res.json())
      .then(data => setFormacion(data.datos ?? FORMACION_VACIA()))
      .catch(() => setError('Error al cargar la formación'))
      .finally(() => setCargando(false))

    const socket = io({ query: { partidoId } })
    socketRef.current = socket
    socket.on('stats-update', (payload: PayloadStats) => {
      setPartido(prev => {
        if (!prev) return prev
        return {
          ...prev,
          statsObjetivas: prev.statsObjetivas.map(s =>
            s.jugadorId === payload.jugadorId
              ? { ...s, [payload.stat]: payload.valor }
              : s
          )
        }
      })
    })

    const interval = setInterval(() => {
      cargarPartido()
    }, 30000)

    return () => {
      socket.close()
      socketRef.current = null
      clearInterval(interval)
    }
  }, [partidoId, cargarPartido])

  const jugadoresEnCancha = partido?.jugadoresEnCancha
    .filter(j => j.enCancha)
    .map(j => j.jugador) || []

  const jugadoresDelCuarto = useCallback((): Jugador[] => {
    if (!formacion) return []
    const ids = extraerJugadoresPorMinuto(formacion, CUARTOS[cuartoActual].minuto)
    return ids
      .map(id => jugadoresEnCancha.find(j => j.id === id))
      .filter((j): j is Jugador => !!j)
  }, [formacion, cuartoActual, jugadoresEnCancha])

  const handleStatChange = useCallback(async (jugadorId: number, stat: keyof Stats, incremento: number) => {
    const res = await fetch(`/api/partidos/${partidoId}/stats`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, stat, incremento })
    })
    if (!res.ok) return
    const stats = await res.json()
    setPartido(prev => {
      if (!prev) return prev
      return {
        ...prev,
        statsObjetivas: prev.statsObjetivas.map(s =>
          s.jugadorId === jugadorId
            ? { ...s, [stat]: stats[stat] }
            : s
        )
      }
    })
  }, [partidoId])

  if (error && !partido) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <p className="text-gray-400">Verifica el link sea correcto</p>
        </div>
      </div>
    )
  }

  if (cargando || !partido) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-center">
        <p className="text-gray-400">Cargando evaluación...</p>
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

  const statsJugadorEditando = jugadorEditando
    ? partido.statsObjetivas.find(s => s.jugadorId === jugadorEditando.id)
    : null

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-white font-semibold">BlueLock vs {partido.rival}</h1>
          <p className="text-gray-400 text-sm">Evaluación</p>
        </div>
      </div>

      {/* Resumen */}
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

      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p className="text-red-400 text-center text-sm">{error}</p>
        </div>
      )}

      {jugadorEditando ? (
        /* Vista de stats del jugador */
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent-600 flex items-center justify-center text-lg font-bold">
                  #{jugadorEditando.numero}
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">{jugadorEditando.nombre}</h2>
                  <p className="text-gray-400 text-sm">{CUARTOS[cuartoActual].label}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {STAT_CONFIG.map(({ key, label }) => {
                const valor = statsJugadorEditando ? (statsJugadorEditando[key] as number) : 0
                return (
                  <div key={key} className="bg-gray-700 rounded-xl p-3 text-center">
                    <p className="text-gray-300 text-sm font-medium mb-2">{label}</p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleStatChange(jugadorEditando.id, key, -1)}
                        className="w-10 h-10 rounded-full bg-gray-600 hover:bg-gray-500 text-white text-xl font-bold flex items-center justify-center transition-colors active:scale-95"
                      >
                        −
                      </button>
                      <span className="text-3xl font-bold text-white w-10 text-center">{valor}</span>
                      <button
                        onClick={() => handleStatChange(jugadorEditando.id, key, 1)}
                        className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-500 text-white text-xl font-bold flex items-center justify-center transition-colors active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setJugadorEditando(null)}
              className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors text-lg"
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        /* Grid de jugadores del cuarto */
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Navegación de cuartos */}
          <div className="flex items-center justify-between bg-gray-800 rounded-xl p-2">
            <button
              onClick={() => setCuartoActual(prev => Math.max(0, prev - 1))}
              disabled={cuartoActual === 0}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors ${
                cuartoActual === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              ◄
            </button>
            <span className="text-white font-semibold">{CUARTOS[cuartoActual].label}</span>
            <button
              onClick={() => setCuartoActual(prev => Math.min(3, prev + 1))}
              disabled={cuartoActual === 3}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors ${
                cuartoActual === 3
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              ►
            </button>
          </div>

          {/* Grid de jugadores */}
          {jugadoresDelCuarto().length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No hay jugadores asignados para este cuarto en la formación.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {jugadoresDelCuarto().map(jugador => {
                const stats = partido.statsObjetivas.find(s => s.jugadorId === jugador.id)
                const totalPoints = Object.values(stats ?? {}).reduce((a, b) => a + (b as number), 0)
                return (
                  <button
                    key={jugador.id}
                    onClick={() => setJugadorEditando(jugador)}
                    className={`bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors ${
                      totalPoints > 0
                        ? 'border border-primary-500'
                        : 'border border-transparent hover:bg-gray-750'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-accent-600 flex items-center justify-center text-lg font-bold">
                      #{jugador.numero}
                    </div>
                    <span className="text-white font-semibold text-center leading-tight">{jugador.nombre}</span>
                    {totalPoints > 0 && (
                      <span className="text-primary-400 text-xs font-medium">✓ {totalPoints} registros</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Finalizar evaluación */}
          {cuartoActual === 3 && (
            <button
              onClick={() => {
                if (window.confirm('¿Finalizar la evaluación? Se cerrará esta ventana y volverás al partido.')) {
                  window.close()
                }
              }}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-colors text-lg"
            >
              Finalizar Evaluación
            </button>
          )}
        </div>
      )}
    </div>
  )
}