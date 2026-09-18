'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '@/components/Navbar'
import PincodeModal from '@/components/PincodeModal'
import { POSICIONES, MINUTOS, FORMACION_VACIA } from '@/lib/formacion'
import type { ClavePosicion, FormacionData } from '@/lib/formacion'
import { colorDeJugador } from '@/lib/colores'
import { descargarImagenFormacion } from '@/lib/imagenFormacion'
import type { TiempoImagen } from '@/lib/imagenFormacion'

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
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [editando, setEditando] = useState(false)
  const [descargando, setDescargando] = useState<TiempoImagen | null>(null)
  const [pincode, setPincode] = useState<string | null>(null)
  const [pincodeAbierto, setPincodeAbierto] = useState(false)

  const GUARDAR_DESPUES_MS = 600

  useEffect(() => {
    const guardadoPincode = sessionStorage.getItem('formacion_pincode')
    if (guardadoPincode) {
      setPincode(guardadoPincode)
      setEditando(true)
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  const mostrarToast = (texto: string) => {
    setToast(texto)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1400)
  }

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

  const programarAutoguardado = (nuevosDatos: FormacionData) => {
    if (!pincode) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/formacion', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ datos: nuevosDatos, pincode })
        })
        if (!res.ok) {
          const error = await res.json().catch(() => null)
          throw new Error(error?.error || 'Error al guardar')
        }
        mostrarMensaje('exito', 'Guardado')
      } catch (e: any) {
        mostrarMensaje('error', e.message || 'No se pudo guardar la formación')
      }
    }, GUARDAR_DESPUES_MS)
  }

  const agregarJugador = (jugadorId: number) => {
    if (!datos || !celdaAbierta) return
    const { posicion, minuto } = celdaAbierta
    const ids = datos[posicion][minuto]
    if (ids.includes(jugadorId)) return
    if (idsEnMinuto.get(minuto)?.has(jugadorId)) {
      mostrarMensaje('error', 'Ese jugador ya está asignado en este minuto')
      return
    }
    const nuevosDatos = {
      ...datos,
      [posicion]: { ...datos[posicion], [minuto]: [jugadorId] }
    }
    setDatos(nuevosDatos)
    programarAutoguardado(nuevosDatos)
    setCeldaAbierta(null)
  }

  const quitarJugador = (posicion: ClavePosicion, minuto: string, jugadorId: number) => {
    if (!datos) return
    const nuevosDatos = {
      ...datos,
      [posicion]: { ...datos[posicion], [minuto]: datos[posicion][minuto].filter(id => id !== jugadorId) }
    }
    setDatos(nuevosDatos)
    programarAutoguardado(nuevosDatos)
  }

  const descargarImagen = async (tiempo: TiempoImagen) => {
    if (!datos || descargando) return
    setDescargando(tiempo)
    try {
      await descargarImagenFormacion(tiempo, datos, jugadorPorId)
    } catch (e: any) {
      mostrarMensaje('error', e.message || 'No se pudo generar la imagen')
    } finally {
      setDescargando(null)
    }
  }

  const limpiarTodo = () => {
    if (!confirm('¿Vaciar toda la formación?')) return
    const nuevosDatos = FORMACION_VACIA()
    setDatos(nuevosDatos)
    programarAutoguardado(nuevosDatos)
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

      <div className="w-full mx-auto p-4 space-y-4 overflow-x-hidden">
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
          <div className="flex items-center gap-2">
            {editando && (
              <button
                onClick={limpiarTodo}
                className="text-gray-400 hover:text-red-400 text-sm px-2 py-1"
              >
                Vaciar todo
              </button>
            )}
            {editando ? (
              <button
                onClick={() => setEditando(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                🔒 Bloquear
              </button>
            ) : (
              <button
                onClick={() => setPincodeAbierto(true)}
                className="bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                🔓 Editar
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <p className="text-gray-400 text-xs mb-3">
            {editando
              ? 'Tocá cualquier celda para agregar jugadores. Un jugador por celda y no puede repetirse en el mismo minuto.'
              : 'Vista de la formación. Tocá "Editar" para modificarla.'}
          </p>

          {jugadores.length === 0 ? (
            <p className="text-gray-400 text-center py-6">
              No hay jugadores registrados. <a href="/admin/jugadores" className="text-primary-400 underline">Agregalos primero</a>.
            </p>
          ) : (
            <>
              {[
                { label: '1er Tiempo', tiempo: 1 as const, minutos: MINUTOS.slice(0, 2) },
                { label: '2do Tiempo', tiempo: 2 as const, minutos: MINUTOS.slice(2) }
              ].map(({ label: titulo, tiempo, minutos }) => (
                <div key={tiempo} className="mb-4 last:mb-0">
                  <div className="text-center mb-2">
                    <span className="text-gray-300 text-xs font-semibold">{titulo}</span>
                  </div>

                  <div className="grid grid-cols-[auto_repeat(2,minmax(0,1fr))] gap-1">
                    <div></div>
                    {['Min 0', 'Min 10'].map(label => (
                      <div key={label} className="text-center">
                        <span className="text-primary-400 text-[10px] font-semibold">{label}</span>
                      </div>
                    ))}

                    {POSICIONES.map(({ key, label, numero }) => (
                      <Fragment key={key}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            onClick={() => mostrarToast(label)}
                            className="w-7 h-7 rounded-full bg-gray-700 hover:bg-primary-600 text-white text-xs font-bold transition-colors"
                            title={label}
                          >
                            {numero}
                          </button>
                          <span className="text-gray-400 text-[8px] font-medium text-center leading-tight">{label}</span>
                        </div>
                        {minutos.map(minuto => (
                          <div
                            key={minuto}
                            onClick={editando ? () => setCeldaAbierta({ posicion: key, minuto: String(minuto) }) : undefined}
                            className={`min-h-[44px] bg-gray-700/60 border border-gray-600/60 rounded-md p-1 flex flex-col gap-0.5 transition-colors ${
                              editando ? 'cursor-pointer hover:border-primary-500/60' : ''
                            }`}
                          >
                            {datos[key][String(minuto)].length === 0 ? (
                              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm select-none">+</div>
                            ) : (
                              datos[key][String(minuto)].map(id => {
                                const jugador = jugadorPorId.get(id)
                                if (!jugador) return null
                                return (
                                  <div key={id} className="flex items-center gap-1 bg-gray-800 rounded px-1.5 py-1 min-w-0 w-full border-l-2"
                                    style={{ borderLeftColor: colorDeJugador(id) }}>
                                    <span className="font-bold text-[10px] shrink-0" style={{ color: colorDeJugador(id) }}>#{jugador.numero}</span>
                                    <span className="text-white text-xs font-medium truncate flex-1 min-w-0 leading-tight">{jugador.nombre}</span>
                                    {editando && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); quitarJugador(key, String(minuto), id) }}
                                        className="text-gray-500 hover:text-red-400 text-[9px] font-bold px-0.5 shrink-0"
                                        title="Quitar"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>

                  <button
                    onClick={() => descargarImagen(tiempo)}
                    disabled={descargando !== null}
                    className="w-full mt-3 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {descargando === tiempo ? 'Generando...' : '⬇ Descargar Alineación'}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
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
          onQuitar={quitarJugador}
          onCerrar={() => setCeldaAbierta(null)}
          posicionLabel={posicionLabel}
        />
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 shadow-lg pointer-events-none">
          <p className="text-white text-sm font-semibold">{toast}</p>
        </div>
      )}

      {pincodeAbierto && (
        <PincodeModal
          titulo="Editar Formación"
          descripcion="Solo el administrador puede modificar la formación."
          onConfirm={(pin) => {
            sessionStorage.setItem('formacion_pincode', pin)
            setPincode(pin)
            setEditando(true)
          }}
          onCancel={() => setPincodeAbierto(false)}
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
  onQuitar,
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
  onQuitar: (posicion: ClavePosicion, minuto: string, jugadorId: number) => void
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
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${colorDeJugador(id)}33`, color: colorDeJugador(id) }}>
                  {jugador.numero}
                </div>
                <span className="text-white font-medium">{jugador.nombre}</span>
                <span className="text-primary-400 text-xs ml-auto">En esta celda</span>
                <button
                  onClick={() => onQuitar(posicion, minuto, id)}
                  className="text-gray-500 hover:text-red-400 text-sm font-bold shrink-0"
                  title="Quitar de esta celda"
                >
                  ✕
                </button>
              </div>
            )
          })}
          {idsEnCelda.length === 0 && (
            <p className="text-gray-400 text-sm py-2">Celda vacía. Agregá jugadores abajo.</p>
          )}
        </div>

        <h4 className="text-white font-semibold mb-2">
          {idsEnCelda.length > 0 ? 'Reemplazar jugador' : 'Agregar jugador'}
        </h4>
        <div className="space-y-2">
          {jugadores
            .filter(j => !idsEnCelda.includes(j.id))
            .map(jugador => {
              const ocupadoOtroLugar = idsEnMinuto.has(jugador.id)
              const lugar = otroLugar(jugador.id)
              return (
                <div key={jugador.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: `${colorDeJugador(jugador.id)}33`, color: colorDeJugador(jugador.id) }}>
                    {jugador.numero}
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
