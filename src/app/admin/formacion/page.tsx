'use client'

import { useEffect, useMemo, useState } from 'react'
import Navbar from '@/components/Navbar'
import { POSICIONES, MINUTOS, FORMACION_VACIA } from '@/lib/formacion'
import type { ClavePosicion, FormacionData } from '@/lib/formacion'

interface Jugador {
  id: number
  nombre: string
  numero: number
  posicion: string | null
}

interface CeldaSeleccionada {
  posicion: ClavePosicion
  minuto: string
}

export default function FormacionPage() {
  const [datos, setDatos] = useState<FormacionData | null>(null)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [celdaAbierta, setCeldaAbierta] = useState<CeldaSeleccionada | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    cargarTodo()
  }, [])

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3500)
  }

  const cargarTodo = async () => {
    setCargando(true)
    try {
      const [resFormacion, resJugadores] = await Promise.all([
        fetch('/api/formacion'),
        fetch('/api/jugadores')
      ])
      if (!resFormacion.ok || !resJugadores.ok) throw new Error('Error al cargar')
      const formacion = await resFormacion.json()
      const listaJugadores: Jugador[] = await resJugadores.json()
      setJugadores(listaJugadores)
      setDatos(normalizarDatos(formacion.datos, listaJugadores))
    } catch (e) {
      mostrarMensaje('error', 'No se pudo cargar la formación')
    } finally {
      setCargando(false)
    }
  }

  const normalizarDatos = (datos: any, listaJugadores: Jugador[]): FormacionData => {
    const idsActivos = new Set(listaJugadores.map(j => j.id))
    const normalizada = FORMACION_VACIA()
    for (const { key } of POSICIONES) {
      for (const minuto of MINUTOS) {
        const ids = datos?.[key]?.[String(minuto)]
        if (Array.isArray(ids)) {
          normalizada[key][String(minuto)] = [...new Set(ids)].filter(id => idsActivos.has(id))
        }
      }
    }
    return normalizada
  }

  const jugadorPorId = useMemo(() => {
    const mapa = new Map<number, Jugador>()
    for (const j of jugadores) mapa.set(j.id, j)
    return mapa
  }, [jugadores])

  const idsEnMinuto = useMemo(() => {
    if (!datos) return new Map<string, Set<number>>()
    const mapa = new Map<string, Set<number>>()
    for (const minuto of MINUTOS) {
      const s = new Set<number>()
      for (const { key } of POSICIONES) {
        for (const id of datos[key][String(minuto)]) s.add(id)
      }
      mapa.set(String(minuto), s)
    }
    return mapa
  }, [datos])

  const agregarJugador = (jugadorId: number) => {
    if (!datos || !celdaAbierta) return
    const { posicion, minuto } = celdaAbierta
    const ids = datos[posicion][minuto]
    if (ids.includes(jugadorId)) return
    if (idsEnMinuto.get(minuto)?.has(jugadorId)) {
      mostrarMensaje('error', 'Ese jugador ya está asignado en este minuto')
      return
    }
    setDatos(prev => prev ? {
      ...prev,
      [posicion]: { ...prev[posicion], [minuto]: [...prev[posicion][minuto], jugadorId] }
    } : null)
  }

  const quitarJugador = (posicion: ClavePosicion, minuto: string, jugadorId: number) => {
    setDatos(prev => prev ? {
      ...prev,
      [posicion]: { ...prev[posicion], [minuto]: prev[posicion][minuto].filter(id => id !== jugadorId) }
    } : null)
  }

  const guardar = async () => {
    if (!datos) return
    setGuardando(true)
    setMensaje(null)
    try {
      const res = await fetch('/api/formacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos })
      })
      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || 'Error al guardar')
      }
      mostrarMensaje('exito', 'Formación guardada')
    } catch (e: any) {
      mostrarMensaje('error', e.message || 'No se pudo guardar la formación')
    } finally {
      setGuardando(false)
    }
  }

  const limpiarTodo = () => {
    if (!confirm('¿Vaciar toda la formación?')) return
    setDatos(FORMACION_VACIA())
  }

  const posicionLabel = (key: string) =>
    POSICIONES.find(p => p.key === key)?.label ?? key

  if (cargando || !datos) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar titulo="Formación" mostrarVolver hrefVolver="/admin" />
        <div className="flex items-center justify-center p-10">
          <p className="text-gray-400">Cargando formación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar titulo="Formación" mostrarVolver hrefVolver="/admin" />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {mensaje && (
          <div className={`p-3 rounded-lg text-center font-medium ${
            mensaje.tipo === 'exito'
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : 'bg-red-600/20 text-red-400 border border-red-600/30'
          }`}>
            {mensaje.tipo === 'exito' ? '✓' : '✕'} {mensaje.texto}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-white font-semibold text-lg">Rotación por Minutos</h2>
          <button
            onClick={limpiarTodo}
            className="text-gray-400 hover:text-red-400 text-sm px-2 py-1"
          >
            Vaciar todo
          </button>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <p className="text-gray-400 text-xs mb-3">
            Tocá cualquier celda para agregar jugadores. Un jugador no puede repetirse en el mismo minuto.
          </p>

          {jugadores.length === 0 ? (
            <p className="text-gray-400 text-center py-6">
              No hay jugadores registrados. <a href="/admin/jugadores" className="text-primary-400 underline">Agregalos primero</a>.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[680px]">
                <div className="flex gap-2 mb-2">
                  <div className="w-32 shrink-0"></div>
                  {MINUTOS.map(minuto => (
                    <div key={minuto} className="flex-1 min-w-[130px] text-center">
                      <span className="text-primary-400 text-xs font-semibold">Min {minuto}</span>
                    </div>
                  ))}
                </div>

                {POSICIONES.map(({ key, label }) => (
                  <div key={key} className="flex gap-2 mb-2">
                    <div className="w-32 shrink-0 flex items-center">
                      <p className="text-gray-400 text-xs font-medium leading-tight">{label}</p>
                    </div>
                    {MINUTOS.map(minuto => (
                      <div
                        key={minuto}
                        onClick={() => setCeldaAbierta({ posicion: key, minuto: String(minuto) })}
                        className="flex-1 min-w-[130px] min-h-[64px] bg-gray-700/60 border border-gray-600/60 rounded-lg p-1.5 cursor-pointer hover:border-primary-500/60 transition-colors"
                      >
                        {datos[key][String(minuto)].length === 0 ? (
                          <div className="h-full flex items-center justify-center text-gray-500 text-xl select-none">+</div>
                        ) : (
                          <div className="space-y-1">
                            {datos[key][String(minuto)].map(id => {
                              const jugador = jugadorPorId.get(id)
                              if (!jugador) return null
                              return (
                                <div key={id} className="flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 group">
                                  <span className="text-primary-400 font-bold text-xs">#{jugador.numero}</span>
                                  <span className="text-white text-xs truncate flex-1">{jugador.nombre}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); quitarJugador(key, String(minuto), id) }}
                                    className="text-gray-500 hover:text-red-400 text-xs font-bold px-1"
                                    title="Quitar"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {guardando ? 'Guardando...' : 'Guardar Formación'}
        </button>
      </div>

      {celdaAbierta && (
        <CeldaModal
          datos={datos}
          jugadores={jugadores}
          jugadorPorId={jugadorPorId}
          posicion={celdaAbierta.posicion}
          minuto={celdaAbierta.minuto}
          idsEnMinuto={idsEnMinuto.get(celdaAbierta.minuto) ?? new Set()}
          onAgregar={agregarJugador}
          onCerrar={() => setCeldaAbierta(null)}
          posicionLabel={posicionLabel}
        />
      )}
    </div>
  )
}

function CeldaModal({
  datos,
  jugadores,
  jugadorPorId,
  posicion,
  minuto,
  idsEnMinuto,
  onAgregar,
  onCerrar,
  posicionLabel
}: {
  datos: FormacionData
  jugadores: Jugador[]
  jugadorPorId: Map<number, Jugador>
  posicion: ClavePosicion
  minuto: string
  idsEnMinuto: Set<number>
  onAgregar: (jugadorId: number) => void
  onCerrar: () => void
  posicionLabel: (key: string) => string
}) {
  const idsEnCelda = datos[posicion][minuto]
  const otroLugar = (id: number): string | null => {
    for (const { key } of POSICIONES) {
      if (key !== posicion && datos[key][minuto].includes(id)) return posicionLabel(key)
    }
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-gray-800 w-full max-w-lg rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-semibold text-lg">
            {posicionLabel(posicion)} · Min {minuto}
          </h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="space-y-2 mb-4">
          {idsEnCelda.map(id => {
            const jugador = jugadorPorId.get(id)
            if (!jugador) return null
            return (
              <div key={id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
                  #{jugador.numero}
                </div>
                <span className="text-white font-medium">{jugador.nombre}</span>
                <span className="text-primary-400 text-xs ml-auto">En esta celda</span>
              </div>
            )
          })}
          {idsEnCelda.length === 0 && (
            <p className="text-gray-400 text-sm py-2">Celda vacía. Agregá jugadores abajo.</p>
          )}
        </div>

        <h4 className="text-white font-semibold mb-2">Agregar jugadores</h4>
        <div className="space-y-2">
          {jugadores
            .filter(j => !idsEnCelda.includes(j.id))
            .map(jugador => {
              const ocupadoOtroLugar = idsEnMinuto.has(jugador.id)
              const lugar = otroLugar(jugador.id)
              return (
                <div key={jugador.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                    #{jugador.numero}
                  </div>
                  <span className="text-white font-medium">{jugador.nombre}</span>
                  {jugador.posicion && (
                    <span className="text-gray-400 text-xs ml-1">{jugador.posicion}</span>
                  )}
                  <div className="ml-auto">
                    {ocupadoOtroLugar ? (
                      <span className="text-gray-500 text-xs">Usado en {lugar}</span>
                    ) : (
                      <button
                        onClick={() => onAgregar(jugador.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          ocupadoOtroLugar
                            ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                        title="Agregar"
                        disabled={ocupadoOtroLugar}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}