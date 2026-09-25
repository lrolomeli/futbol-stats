'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { CLAVE_DEFENSIVA, extraerJugadoresPorMinuto, FORMACION_VACIA, MINUTOS } from '@/lib/formacion'
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

const EVALUACION_PIN = '098651'
const PIN_STORAGE_KEY = 'evaluacion_pincode'

export default function EvaluacionPage() {
  const params = useParams()
  const partidoId = Number(params.partidoId)
  const [partido, setPartido] = useState<PartidoInfo | null>(null)
  const [formacion, setFormacion] = useState<FormacionData | null>(null)
  const [jugadorEditando, setJugadorEditando] = useState<Jugador | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [pin, setPin] = useState('')
  const [errorPin, setErrorPin] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (localStorage.getItem(PIN_STORAGE_KEY) === EVALUACION_PIN) {
      setAutorizado(true)
    }
  }, [])

  const ingresar = async () => {
    if (pin !== EVALUACION_PIN) {
      setErrorPin(true)
      return
    }
    localStorage.setItem(PIN_STORAGE_KEY, pin)
    setAutorizado(true)
  }

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
    if (!autorizado) return

    cargarPartido()

    fetch('/api/formacion')
      .then(res => res.json())
      .then(data => setFormacion(data.datos ?? FORMACION_VACIA(CLAVE_DEFENSIVA)))
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
  }, [partidoId, cargarPartido, autorizado])

  const jugadoresEnCancha = partido?.jugadoresEnCancha
    .filter(j => j.enCancha)
    .map(j => j.jugador) || []

  const jugadores = useCallback((): Jugador[] => {
    if (!formacion) return []
    const ids = new Set<number>()
    for (const minuto of MINUTOS) {
      for (const id of extraerJugadoresPorMinuto(formacion, String(minuto), CLAVE_DEFENSIVA)) {
        ids.add(id)
      }
    }
    return [...ids]
      .map(id => jugadoresEnCancha.find(j => j.id === id))
      .filter((j): j is Jugador => !!j)
  }, [formacion, jugadoresEnCancha])

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

  if (!autorizado) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs">
          <h3 className="text-white font-bold text-lg text-center mb-1">Evaluación</h3>
          <p className="text-gray-400 text-sm text-center mb-4">
            Ingresá el pincode para acceder a la evaluación del partido.
          </p>

          <input
            type="password"
            inputMode="numeric"
            placeholder="Pincode"
            value={pin}
            onChange={e => { setPin(e.target.value); setErrorPin(false) }}
            onKeyDown={e => { if (e.key === 'Enter') ingresar() }}
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-center tracking-widest"
          />

          {errorPin && (
            <p className="text-red-400 text-sm text-center mt-2">Pincode incorrecto</p>
          )}

          <button
            onClick={ingresar}
            disabled={!pin}
            className="w-full mt-5 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-colors font-semibold disabled:opacity-50"
          >
            Ingresar
          </button>
        </div>
      </div>
    )
  }

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
                  <p className="text-gray-400 text-sm">{partido.rival}</p>
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
        /* Grid de jugadores */
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Grid de jugadores */}
          {jugadores().length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No hay jugadores asignados en la formación.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {jugadores().map(jugador => {
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
        </div>
      )}
    </div>
  )
}