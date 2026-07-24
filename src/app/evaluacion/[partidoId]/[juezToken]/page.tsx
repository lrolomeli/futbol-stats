'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import JudgeScorePad from '@/components/JudgeScorePad'

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

interface Evaluacion {
  jugadorId: number
  puntuacion: number
}

interface PartidoInfo {
  id: number
  rival: string
  estado: string
  fecha: string
  tokenAcceso: string
  jugadoresEnCancha: { jugador: Jugador; enCancha: boolean }[]
  statsObjetivas: (Stats & { jugadorId: number; jugador: Jugador })[]
}

type Fase = 'seleccion' | 'objetiva' | 'subjetiva'

const STAT_CONFIG: { key: keyof Stats; label: string }[] = [
  { key: 'goles', label: 'Goles' },
  { key: 'asistencias', label: 'Asistencias' },
  { key: 'recuperaciones', label: 'Recuperaciones' },
  { key: 'tirosAPorteria', label: 'Tiros a portería' },
  { key: 'faltas', label: 'Faltas' },
  { key: 'balonesPerdidos', label: 'Balones perdidos' },
  { key: 'tirosAfuera', label: 'Tiros afuera' },
]

export default function EvaluacionPage() {
  const params = useParams()
  const [partido, setPartido] = useState<PartidoInfo | null>(null)
  const [jugadoresAsignados, setJugadoresAsignados] = useState<{ jugador: Jugador }[]>([])
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState<Jugador[]>([])
  const [tieneAsignaciones, setTieneAsignaciones] = useState(false)
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Record<number, number>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [fase, setFase] = useState<Fase>('seleccion')
  const [modalStat, setModalStat] = useState<{ jugadorId: number; jugadorNombre: string; jugadorNumero: number; stat: keyof Stats; label: string; valor: number } | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<number | null>(null)

  const cargarDatos = async () => {
    const res = await fetch(`/api/evaluacion/${params.partidoId}/${params.juezToken}`)
    if (!res.ok) {
      setError('Link inválido o partido no encontrado')
      return
    }
    const data = await res.json()
    setPartido(data.partido)
    setJugadoresAsignados(data.jugadoresAsignados || [])
    setJugadoresDisponibles(data.jugadoresDisponibles || [])
    setTieneAsignaciones(data.tieneAsignaciones)
    const evs: Record<number, number> = {}
    data.evaluaciones.forEach((ev: Evaluacion) => {
      evs[ev.jugadorId] = ev.puntuacion
    })
    setEvaluaciones(evs)

    if (data.tieneAsignaciones) {
      setFase('objetiva')
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [params.partidoId, params.juezToken])

  const toggleSeleccion = (id: number) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const confirmarAsignacion = async () => {
    if (seleccionados.length === 0) {
      setError('Selecciona al menos un jugador')
      return
    }
    setError('')
    const res = await fetch(`/api/evaluacion/${params.partidoId}/${params.juezToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'asignar', jugadorIds: seleccionados })
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al asignar jugadores')
      return
    }
    await cargarDatos()
  }

  const jugadoresEnCancha = jugadoresAsignados.map(a => a.jugador)

  const handleStatChange = useCallback(async (jugadorId: number, stat: keyof Stats, incremento: number) => {
    await fetch(`/api/partidos/${params.partidoId}/stats`, {
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
  }, [params.partidoId])

  const handleCambiarJugador = async (jugadorSalienteId: number, jugadorEntranteId: number) => {
    await fetch(`/api/partidos/${params.partidoId}/cambiar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorSalienteId, jugadorEntranteId })
    })
    await cargarPartido()
    setCambiando(false)
    setJugadorSeleccionado(null)
  }

  const cargarPartido = async () => {
    const res = await fetch(`/api/evaluacion/${params.partidoId}/${params.juezToken}`)
    const data = await res.json()
    setPartido(data.partido)
    setJugadoresAsignados(data.jugadoresAsignados || [])
  }

  const handlePuntuar = (jugadorId: number, puntuacion: number) => {
    setEvaluaciones(prev => ({ ...prev, [jugadorId]: puntuacion }))
  }

  const handleSubmit = async () => {
    const evaluacionesArray = jugadoresEnCancha.map(j => ({
      jugadorId: j.id,
      puntuacion: evaluaciones[j.id] || 0
    }))
    const sinCalificar = evaluacionesArray.filter(e => e.puntuacion === 0)
    if (sinCalificar.length > 0) {
      setError(`Faltan ${sinCalificar.length} jugador(es) por calificar`)
      return
    }
    setEnviando(true)
    setError('')
    try {
      const res = await fetch(`/api/evaluacion/${params.partidoId}/${params.juezToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar', evaluaciones: evaluacionesArray })
      })
      if (res.ok) setEnviado(true)
      else setError('Error al enviar la evaluación')
    } catch {
      setError('Error de conexión')
    } finally {
      setEnviando(false)
    }
  }

  if (error && !partido) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <p className="text-gray-400">Verifica que el link sea correcto</p>
        </div>
      </div>
    )
  }

  if (!partido) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando evaluación...</p>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-white text-2xl font-bold mb-2">¡Evaluación Enviada!</h2>
          <p className="text-gray-400">
            Gracias por tu evaluación del partido BlueLock vs {partido.rival}
          </p>
        </div>
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

  const completados = Object.values(evaluaciones).filter(v => v > 0).length
  const total = jugadoresEnCancha.length

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white font-semibold">BlueLock vs {partido.rival}</h1>
              <p className="text-gray-400 text-sm">
                {fase === 'seleccion' && 'Seleccionar Jugadores'}
                {fase === 'objetiva' && 'Evaluación Objetiva'}
                {fase === 'subjetiva' && 'Evaluación Subjetiva'}
              </p>
            </div>
            <div className="flex gap-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${fase === 'seleccion' ? 'bg-primary-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                1
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${fase === 'objetiva' ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                2
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${fase === 'subjetiva' ? 'bg-accent-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                3
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FASE 0: Selección de Jugadores */}
      {fase === 'seleccion' && (
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <p className="text-gray-400 text-sm">
            Selecciona los jugadores que vas a evaluar. Una vez asignados, no estarán disponibles para otros jueces.
          </p>

          <div className="space-y-2">
            {jugadoresDisponibles.map(j => (
              <button
                key={j.id}
                onClick={() => toggleSeleccion(j.id)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 text-left transition-colors ${
                  seleccionados.includes(j.id)
                    ? 'bg-primary-600/20 border border-primary-500'
                    : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  seleccionados.includes(j.id) ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {seleccionados.includes(j.id) ? '✓' : `#${j.numero}`}
                </div>
                <div className="flex-1">
                  <span className="text-white font-medium">{j.nombre}</span>
                  {j.posicion && <p className="text-gray-400 text-xs">{j.posicion}</p>}
                </div>
              </button>
            ))}
            {jugadoresDisponibles.length === 0 && (
              <p className="text-gray-400 text-center py-4">No hay jugadores disponibles</p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-center text-sm">{error}</p>
          )}

          {seleccionados.length > 0 && (
            <p className="text-primary-400 text-center text-sm font-medium">
              {seleccionados.length} jugador(es) seleccionado(s)
            </p>
          )}

          <button
            onClick={confirmarAsignacion}
            disabled={seleccionados.length === 0}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
          >
            Confirmar Selección
          </button>
        </div>
      )}

      {/* FASE 1: Estadísticas Objetivas */}
      {fase === 'objetiva' && (
        <>
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
            <div className="bg-gray-800 rounded-xl overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="sticky left-0 bg-gray-800 z-10 px-3 py-3 text-left text-gray-400 font-semibold min-w-[100px]">
                      Estadística
                    </th>
                    {jugadoresEnCancha.map(j => (
                      <th key={j.id} className="px-2 py-3 text-center text-gray-300 font-semibold min-w-[80px]">
                        <div className="text-primary-400 font-bold">#{j.numero}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[80px]">{j.nombre}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STAT_CONFIG.map(({ key, label }) => (
                    <tr key={key} className="border-b border-gray-700/50">
                      <td className="sticky left-0 bg-gray-800 z-10 px-3 py-2 text-gray-300 font-medium text-sm">
                        {label}
                      </td>
                      {jugadoresEnCancha.map(jugador => {
                        const statsJugador = partido.statsObjetivas.find(s => s.jugadorId === jugador.id)
                        const valor = statsJugador ? (statsJugador as any)[key] : 0
                        return (
                          <td key={jugador.id} className="px-1 py-1">
                            <button
                              onClick={() => setModalStat({
                                jugadorId: jugador.id,
                                jugadorNombre: jugador.nombre,
                                jugadorNumero: jugador.numero,
                                stat: key,
                                label,
                                valor,
                              })}
                              className={`w-full text-center py-2.5 text-sm font-bold rounded-lg transition-colors ${
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
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setCambiando(true)}
              className="w-full bg-accent-600 hover:bg-accent-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              🔄 Cambiar Jugador
            </button>

            <button
              onClick={() => setFase('subjetiva')}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
            >
              Finalizar Evaluación →
            </button>
          </div>
        </>
      )}

      {/* FASE 2: Evaluación Subjetiva */}
      {fase === 'subjetiva' && (
        <>
          <div className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-lg mx-auto px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (completados / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-gray-400 text-sm">{completados}/{total}</span>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto p-4 space-y-4">
            <button
              onClick={() => setFase('objetiva')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Volver a Estadísticas
            </button>

            {jugadoresEnCancha.map(jugador => (
              <JudgeScorePad
                key={jugador.id}
                jugadorId={jugador.id}
                nombre={jugador.nombre}
                numero={jugador.numero}
                puntuacion={evaluaciones[jugador.id] || 0}
                onPuntuar={handlePuntuar}
              />
            ))}

            {error && (
              <p className="text-red-400 text-center text-sm">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={enviando || completados < total}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
            >
              {enviando ? 'Enviando...' : 'Enviar Evaluación'}
            </button>
          </div>
        </>
      )}

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
