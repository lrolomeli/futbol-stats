'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '@/components/Navbar'
import PreviewImportModal from '@/components/PreviewImportModal'
import TablaRotacionCuartos from '@/components/TablaRotacionCuartos'
import { CLAVES_FORMACION, MINUTOS, idsPorMinuto, posicionesDe } from '@/lib/formacion'
import type { ClaveFormacion, FormacionData } from '@/lib/formacion'
import { colorDeJugador } from '@/lib/colores'
import { descargarImagenFormacion } from '@/lib/imagenFormacion'
import type { TiempoImagen } from '@/lib/imagenFormacion'
import { descargarRespaldo, generarPreviewImport, parsearRespaldo } from '@/lib/respaldoFormacion'
import type { PreviewImport, RespaldoFormacion } from '@/lib/respaldoFormacion'
import {
  GUARDADO_MS,
  MI_FORMACION_VACIA,
  borrarEstado,
  cargarEstado,
  guardarEstado,
  jugadoresDelRespaldoAusentes,
  quitarJugadorDeFormacion,
  siguienteIdJugador
} from '@/lib/miFormacion'
import type { EstadoMiFormacion, JugadorLocal } from '@/lib/miFormacion'

interface JugadorApp {
  id: number
  nombre: string
  numero: number
  posicion: string | null
}

interface CeldaSeleccionada {
  posicion: string
  minuto: string
}

interface RespaldoPendiente {
  respaldo: RespaldoFormacion
  jugadoresAAgregar: number
}

const TIEMPOS = [
  { label: '1er Tiempo', tiempo: 1 as const, minutos: MINUTOS.slice(0, 2) },
  { label: '2do Tiempo', tiempo: 2 as const, minutos: MINUTOS.slice(2) }
]

const ETIQUETAS: Record<ClaveFormacion, string> = {
  defensiva: 'Defensiva',
  ofensiva: 'Ofensiva'
}

export default function MiFormacionPage() {
  const [clave, setClave] = useState<ClaveFormacion>('defensiva')
  const [estado, setEstado] = useState<EstadoMiFormacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [celdaAbierta, setCeldaAbierta] = useState<CeldaSeleccionada | null>(null)
  const [jugadoresApp, setJugadoresApp] = useState<JugadorApp[]>([])
  const [appDisponible, setAppDisponible] = useState(true)
  const [descargando, setDescargando] = useState<TiempoImagen | null>(null)
  const [previewImport, setPreviewImport] = useState<PreviewImport | null>(null)
  const [respaldoPendiente, setRespaldoPendiente] = useState<RespaldoPendiente | null>(null)
  const [importando, setImportando] = useState(false)
  const archivoRef = useRef<HTMLInputElement | null>(null)
  const [formNombre, setFormNombre] = useState('')
  const [formNumero, setFormNumero] = useState('')
  const [formPosicion, setFormPosicion] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)

  useEffect(() => {
    setEstado(cargarEstado(clave))
    setCargando(false)
    setCeldaAbierta(null)
    limpiarFormulario()
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
      try {
        const res = await fetch('/api/jugadores')
        if (!res.ok) throw new Error('sin respuesta')
        const lista: JugadorApp[] = await res.json()
        if (vigente) setJugadoresApp(lista)
      } catch {
        if (vigente) setAppDisponible(false)
      }
    }
    cargar()
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => {
    if (!estado) return
    const timer = setTimeout(() => {
      if (!guardarEstado(estado)) {
        mostrarMensaje('error', 'No se pudo guardar en este navegador')
      }
    }, GUARDADO_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  const jugadores = estado?.jugadores ?? []
  const datos = estado?.datos ?? null

  const jugadorPorId = useMemo(
    () => new Map(jugadores.map(j => [j.id, j])),
    [jugadores]
  )

  const idsEnMinuto = useMemo(
    () => (datos ? idsPorMinuto(datos) : new Map<string, Set<number>>()),
    [datos]
  )

  const idsAppCopiados = useMemo(
    () => new Set(jugadores.filter(j => j.appId !== null).map(j => j.appId as number)),
    [jugadores]
  )

  const appDisponibles = jugadoresApp.filter(j => !idsAppCopiados.has(j.id))

  const tieneFormacion = datos
    ? Object.values(datos).some(celdas => Object.values(celdas).some(ids => ids.length > 0))
    : false

  function mostrarMensaje(tipo: 'exito' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3500)
  }

  const mostrarToast = (texto: string) => {
    setToast(texto)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1400)
  }

  const actualizar = (cambios: Partial<EstadoMiFormacion>) => {
    setEstado(prev => (prev ? { ...prev, ...cambios } : prev))
  }

  const agregarACelda = (jugadorId: number) => {
    if (!estado || !celdaAbierta) return
    const { posicion, minuto } = celdaAbierta
    if (estado.datos[posicion][minuto].includes(jugadorId)) return
    if (idsEnMinuto.get(minuto)?.has(jugadorId)) {
      mostrarMensaje('error', 'Ese jugador ya está asignado en este minuto')
      return
    }
    actualizar({
      datos: {
        ...estado.datos,
        [posicion]: { ...estado.datos[posicion], [minuto]: [jugadorId] }
      }
    })
    setCeldaAbierta(null)
  }

  const quitarDeCelda = (posicion: string, minuto: string, jugadorId: number) => {
    if (!estado) return
    actualizar({
      datos: {
        ...estado.datos,
        [posicion]: {
          ...estado.datos[posicion],
          [minuto]: estado.datos[posicion][minuto].filter(id => id !== jugadorId)
        }
      }
    })
  }

  const copiarDeApp = (appJugador: JugadorApp, idLocal: number): JugadorLocal => ({
    id: idLocal,
    nombre: appJugador.nombre,
    numero: appJugador.numero,
    posicion: appJugador.posicion,
    origen: 'app',
    appId: appJugador.id
  })

  const copiarYAsignar = (appJugador: JugadorApp) => {
    const nuevo = copiarDeApp(appJugador, siguienteIdJugador(jugadores))
    actualizar({ jugadores: [...jugadores, nuevo] })
    agregarACelda(nuevo.id)
  }

  const importarPlantillaDeApp = () => {
    if (appDisponibles.length === 0) {
      mostrarMensaje('error', 'Ya tenés todos los jugadores de la app en tu equipo')
      return
    }
    let siguiente = siguienteIdJugador(jugadores)
    const nuevos = appDisponibles.map(j => copiarDeApp(j, siguiente++))
    actualizar({ jugadores: [...jugadores, ...nuevos] })
    mostrarMensaje('exito', `${nuevos.length} jugadores copiados a tu equipo`)
  }

  const limpiarFormulario = () => {
    setFormNombre('')
    setFormNumero('')
    setFormPosicion('')
    setEditandoId(null)
  }

  const guardarJugador = (evento: React.FormEvent) => {
    evento.preventDefault()
    const nombre = formNombre.trim()
    const numero = parseInt(formNumero, 10)
    if (!nombre) {
      mostrarMensaje('error', 'El nombre es obligatorio')
      return
    }
    if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
      mostrarMensaje('error', 'El número tiene que estar entre 1 y 99')
      return
    }
    const posicion = formPosicion.trim() || null

    if (editandoId !== null) {
      actualizar({
        jugadores: jugadores.map(j =>
          j.id === editandoId ? { ...j, nombre, numero, posicion } : j
        )
      })
      mostrarMensaje('exito', 'Jugador actualizado')
    } else {
      actualizar({
        jugadores: [
          ...jugadores,
          { id: siguienteIdJugador(jugadores), nombre, numero, posicion, origen: 'propio', appId: null }
        ]
      })
      mostrarMensaje('exito', 'Jugador agregado')
    }
    limpiarFormulario()
  }

  const editarJugador = (jugador: JugadorLocal) => {
    setFormNombre(jugador.nombre)
    setFormNumero(String(jugador.numero))
    setFormPosicion(jugador.posicion ?? '')
    setEditandoId(jugador.id)
  }

  const eliminarJugador = (jugador: JugadorLocal) => {
    if (!estado) return
    if (!confirm(`¿Eliminar a ${jugador.nombre}? También se lo saca de la formación.`)) return
    actualizar({
      jugadores: jugadores.filter(j => j.id !== jugador.id),
      datos: quitarJugadorDeFormacion(estado.datos, jugador.id)
    })
    if (editandoId === jugador.id) limpiarFormulario()
    mostrarMensaje('exito', 'Jugador eliminado')
  }

  const borrarTodo = () => {
    if (!confirm(`Se borran tu alineación ${ETIQUETAS[clave].toLowerCase()} y todos tus jugadores de este navegador. No se puede deshacer. ¿Seguís?`)) return
    borrarEstado(clave)
    setEstado(MI_FORMACION_VACIA(clave))
    limpiarFormulario()
    setCeldaAbierta(null)
    mostrarMensaje('exito', 'Todo borrado')
  }

  const descargarImagen = async (tiempo: TiempoImagen) => {
    if (!datos || descargando) return
    setDescargando(tiempo)
    try {
      await descargarImagenFormacion(tiempo, datos, jugadorPorId, clave, `mi-formacion-${clave}`)
    } catch (e: any) {
      mostrarMensaje('error', e.message || 'No se pudo generar la imagen')
    } finally {
      setDescargando(null)
    }
  }

  const exportarRespaldo = () => {
    if (!datos) return
    try {
      descargarRespaldo(datos, jugadorPorId, clave, `mi-formacion-${clave}`)
      mostrarMensaje('exito', 'Copia de seguridad descargada')
    } catch (e: any) {
      mostrarMensaje('error', e.message || 'No se pudo generar el archivo')
    }
  }

  const manejarArchivo = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo || !datos) return
    setImportando(true)
    try {
      const parseo = parsearRespaldo(await archivo.text())
      if (!parseo.ok) {
        mostrarMensaje('error', parseo.error)
        return
      }
      if (parseo.respaldo.clave !== clave) {
        mostrarMensaje('error', `Este respaldo es de la formación ${parseo.respaldo.clave} y lo estás importando en la ${clave}`)
        return
      }
      const nuevos = jugadoresDelRespaldoAusentes(parseo.respaldo, jugadores)
      const roster = [...jugadores, ...nuevos]
      setRespaldoPendiente({ respaldo: parseo.respaldo, jugadoresAAgregar: nuevos.length })
      setPreviewImport(generarPreviewImport(parseo.respaldo, roster, datos))
    } catch {
      mostrarMensaje('error', 'No se pudo leer el archivo')
    } finally {
      setImportando(false)
    }
  }

  const cerrarPreview = () => {
    setPreviewImport(null)
    setRespaldoPendiente(null)
  }

  const confirmarImportacion = () => {
    if (!estado || !previewImport || !respaldoPendiente) return
    const nuevos = jugadoresDelRespaldoAusentes(respaldoPendiente.respaldo, jugadores)
    const roster = [...jugadores, ...nuevos]
    const previewFinal = generarPreviewImport(respaldoPendiente.respaldo, roster, estado.datos)
    actualizar({ jugadores: roster, datos: previewFinal.datosResultantes })
    cerrarPreview()
    mostrarMensaje('exito', 'Formación restaurada')
  }

  function jugadoresEnMinuto(jugadorId: number): string[] {
    const lugares: string[] = []
    for (const minuto of MINUTOS) {
      for (const { key } of posicionesDe(clave)) {
        if (datos?.[key]?.[String(minuto)]?.includes(jugadorId)) {
          lugares.push(`M${minuto}`)
        }
      }
    }
    return lugares
  }

  if (cargando || !datos) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar titulo="Mi Formación" mostrarVolver hrefVolver="/" />
        <div className="flex items-center justify-center p-10">
          <p className="text-gray-400">Cargando tu formación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar titulo="Mi Formación" mostrarVolver hrefVolver="/" />

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

        <div className="grid grid-cols-2 gap-1 bg-gray-800 p-1 rounded-xl">
          {CLAVES_FORMACION.map(c => (
            <button
              key={c}
              onClick={() => setClave(c)}
              className={`text-sm font-semibold py-2.5 rounded-lg transition-colors ${
                clave === c
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {ETIQUETAS[c]}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-white font-semibold text-lg">Mi alineación {ETIQUETAS[clave].toLowerCase()}</h2>
            <p className="text-gray-400 text-xs">
              Se guarda solamente en este navegador, no se envía nada al servidor.
            </p>
          </div>
          <button
            onClick={borrarTodo}
            className="text-gray-400 hover:text-red-400 text-sm px-2 py-1 shrink-0"
          >
            Borrar todo
          </button>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl space-y-3">
          <h3 className="text-white font-semibold">
            {editandoId !== null ? 'Editar jugador' : 'Agregar jugador'}
          </h3>

          <form onSubmit={guardarJugador} className="space-y-3">
            <input
              type="text"
              placeholder="Nombre del jugador"
              value={formNombre}
              onChange={e => setFormNombre(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Número"
                value={formNumero}
                onChange={e => setFormNumero(e.target.value)}
                className="bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="1"
                max="99"
              />
              <input
                type="text"
                placeholder="Posición (opcional)"
                value={formPosicion}
                onChange={e => setFormPosicion(e.target.value)}
                className="bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {editandoId !== null ? 'Guardar cambios' : 'Agregar'}
              </button>
              {editandoId !== null && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm font-semibold">
                Tu equipo ({jugadores.length})
              </span>
              {appDisponible && appDisponibles.length > 0 && (
                <button
                  onClick={importarPlantillaDeApp}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  ⬇ Copiar plantilla de la app
                </button>
              )}
            </div>

            {!appDisponible && (
              <p className="text-gray-500 text-xs mb-2">
                No se pudo leer la plantilla de la app, pero podés seguir agregando tus propios jugadores.
              </p>
            )}

            {jugadores.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">
                Todavía no tenés jugadores. Agregá los tuyos arriba o copiá la plantilla de la app.
              </p>
            ) : (
              <div className="space-y-2">
                {jugadores.map(jugador => (
                  <div key={jugador.id} className="bg-gray-700 p-2.5 rounded-lg flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: `${colorDeJugador(jugador.id)}33`, color: colorDeJugador(jugador.id) }}
                    >
                      {jugador.numero}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{jugador.nombre}</p>
                      <p className="text-gray-400 text-xs">
                        {jugador.posicion ?? (jugador.origen === 'app' ? 'de la app' : 'sin posición')}
                      </p>
                    </div>
                    {jugadoresEnMinuto(jugador.id).length > 0 && (
                      <span className="text-primary-400 text-[10px] text-right shrink-0">
                        {jugadoresEnMinuto(jugador.id).join(' · ')}
                      </span>
                    )}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => editarJugador(jugador)}
                        className="text-primary-400 hover:text-primary-300 px-2 py-1 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarJugador(jugador)}
                        className="text-red-400 hover:text-red-300 px-2 py-1 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-white font-semibold text-sm mb-1">Rotación por Minutos</h3>
          <p className="text-gray-400 text-xs mb-3">
            Tocá cualquier celda para agregar jugadores. Un jugador por celda y no puede repetirse en el mismo minuto.
          </p>

          {jugadores.length === 0 ? (
            <p className="text-gray-400 text-center py-6">Agregá jugadores para empezar a armar la formación.</p>
          ) : (
            <>
              {TIEMPOS.map(({ label: tituloTiempo, tiempo, minutos }) => (
                <div key={tiempo} className="mb-4 last:mb-0">
                  <div className="text-center mb-2">
                    <span className="text-gray-300 text-xs font-semibold">{tituloTiempo}</span>
                  </div>

                  <div className="grid grid-cols-[auto_repeat(2,minmax(0,1fr))] gap-1">
                    <div></div>
                    {['Min 0', 'Min 10'].map(label => (
                      <div key={label} className="text-center">
                        <span className="text-primary-400 text-[10px] font-semibold">{label}</span>
                      </div>
                    ))}

                    {posicionesDe(clave).map(({ key, label, numero }) => (
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
                            onClick={() => setCeldaAbierta({ posicion: key, minuto: String(minuto) })}
                            className="min-h-[44px] bg-gray-700/60 border border-gray-600/60 rounded-md p-1 flex flex-col gap-0.5 cursor-pointer hover:border-primary-500/60 transition-colors"
                          >
                            {datos[key][String(minuto)].length === 0 ? (
                              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm select-none">+</div>
                            ) : (
                              datos[key][String(minuto)].map(id => {
                                const jugador = jugadorPorId.get(id)
                                if (!jugador) return null
                                return (
                                  <div
                                    key={id}
                                    className="flex items-center gap-1 bg-gray-800 rounded px-1.5 py-1 min-w-0 w-full border-l-2"
                                    style={{ borderLeftColor: colorDeJugador(id) }}
                                  >
                                    <span className="font-bold text-[10px] shrink-0" style={{ color: colorDeJugador(id) }}>#{jugador.numero}</span>
                                    <span className="text-white text-xs font-medium truncate flex-1 min-w-0 leading-tight">{jugador.nombre}</span>
                                    <button
                                      onClick={e => { e.stopPropagation(); quitarDeCelda(key, String(minuto), id) }}
                                      className="text-gray-500 hover:text-red-400 text-[9px] font-bold px-0.5 shrink-0"
                                      title="Quitar"
                                    >
                                      ✕
                                    </button>
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

        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-white font-semibold text-sm mb-1">Copia de seguridad</h3>
          <p className="text-gray-400 text-xs mb-3">
            Descargá la alineación a un archivo JSON para poder restaurarla más adelante si la cambiás.
          </p>
          <div className="flex gap-2">
            <button
              onClick={exportarRespaldo}
              disabled={!tieneFormacion}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              ⬇ Exportar JSON
            </button>
            <button
              onClick={() => archivoRef.current?.click()}
              disabled={importando}
              className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {importando ? 'Leyendo...' : '⬆ Importar JSON'}
            </button>
          </div>
          <input
            ref={archivoRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={manejarArchivo}
          />
        </div>

        {jugadores.length > 0 && (
          <TablaRotacionCuartos
            datos={datos}
            jugadorPorId={jugadorPorId}
            clave={clave}
            tituloShare={`⚽ Rotación ${ETIQUETAS[clave].toLowerCase()} por cuartos`}
          />
        )}
      </div>

      {celdaAbierta && (
        <CeldaModal
          datos={datos}
          jugadores={jugadores}
          jugadorPorId={jugadorPorId}
          jugadoresApp={appDisponibles}
          clave={clave}
          posicion={celdaAbierta.posicion}
          minuto={celdaAbierta.minuto}
          idsEnMinuto={idsEnMinuto.get(celdaAbierta.minuto) ?? new Set()}
          onAgregar={agregarACelda}
          onQuitar={quitarDeCelda}
          onCopiarDeApp={copiarYAsignar}
          onCerrar={() => setCeldaAbierta(null)}
        />
      )}

      {previewImport && respaldoPendiente && (
        <PreviewImportModal
          preview={previewImport}
          jugadoresAAgregar={respaldoPendiente.jugadoresAAgregar}
          onConfirmar={confirmarImportacion}
          onCancelar={cerrarPreview}
        />
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 shadow-lg pointer-events-none">
          <p className="text-white text-sm font-semibold">{toast}</p>
        </div>
      )}
    </div>
  )
}

function CeldaModal({
  datos,
  jugadores,
  jugadorPorId,
  jugadoresApp,
  clave,
  posicion,
  minuto,
  idsEnMinuto,
  onAgregar,
  onQuitar,
  onCopiarDeApp,
  onCerrar
}: {
  datos: FormacionData
  jugadores: JugadorLocal[]
  jugadorPorId: Map<number, JugadorLocal>
  jugadoresApp: JugadorApp[]
  clave: ClaveFormacion
  posicion: string
  minuto: string
  idsEnMinuto: Set<number>
  onAgregar: (jugadorId: number) => void
  onQuitar: (posicion: string, minuto: string, jugadorId: number) => void
  onCopiarDeApp: (jugador: JugadorApp) => void
  onCerrar: () => void
}) {
  const otroLugar = (id: number): string | null => {
    for (const { key, label } of posicionesDe(clave)) {
      if (key !== posicion && datos[key][minuto].includes(id)) return label
    }
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-gray-800 w-full max-w-lg rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-lg">
            {otroLugarPosicion(clave, posicion)} · Min {minuto}
          </h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {datos[posicion][minuto].length > 0 && (
          <div className="space-y-2 mb-4 pb-3 border-b border-gray-700">
            {datos[posicion][minuto].map(id => {
              const jugador = jugadorPorId.get(id)
              if (!jugador) return null
              return (
                <div key={id} className="flex items-center gap-3 p-3 bg-primary-600/20 border border-primary-500/30 rounded-lg">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${colorDeJugador(id)}33`, color: colorDeJugador(id) }}
                  >
                    {jugador.numero}
                  </div>
                  <span className="text-white font-medium truncate">{jugador.nombre}</span>
                  <span className="text-primary-400 text-xs ml-auto shrink-0">En esta celda</span>
                  <button
                    onClick={() => onQuitar(posicion, minuto, id)}
                    className="text-gray-400 hover:text-red-400 text-sm font-bold shrink-0"
                    title="Quitar de esta celda"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <h4 className="text-white font-semibold mb-2">Tu equipo ({jugadores.length})</h4>
        {jugadores.length === 0 ? (
          <p className="text-gray-400 text-sm py-2">Todavía no tenés jugadores en tu equipo.</p>
        ) : (
          <div className="space-y-2">
            {jugadores.map(jugador => {
              const enEstaCelda = datos[posicion][minuto].includes(jugador.id)
              const ocupado = idsEnMinuto.has(jugador.id)
              const lugar = otroLugar(jugador.id)
              return (
                <div key={jugador.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${colorDeJugador(jugador.id)}33`, color: colorDeJugador(jugador.id) }}
                  >
                    {jugador.numero}
                  </div>
                  <span className="text-white font-medium truncate">{jugador.nombre}</span>
                  {ocupado ? (
                    <span className="text-gray-500 text-xs ml-auto shrink-0">
                      {enEstaCelda ? 'En esta celda' : `Usado en ${lugar ?? 'otra celda'}`}
                    </span>
                  ) : (
                    <button
                      onClick={() => onAgregar(jugador.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-600 hover:bg-green-500 text-white ml-auto shrink-0"
                      title="Agregar"
                    >
                      +
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {jugadoresApp.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <h4 className="text-white font-semibold mb-2">De la app ({jugadoresApp.length})</h4>
            <p className="text-gray-500 text-xs mb-2">
              Al elegir uno se copia a tu equipo y queda en este navegador.
            </p>
            <div className="space-y-2">
              {jugadoresApp.map(appJugador => (
                <div key={appJugador.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${colorDeJugador(appJugador.id)}33`, color: colorDeJugador(appJugador.id) }}>
                    {appJugador.numero}
                  </div>
                  <span className="text-white font-medium truncate">{appJugador.nombre}</span>
                  {appJugador.posicion && (
                    <span className="text-gray-400 text-xs truncate shrink-0">{appJugador.posicion}</span>
                  )}
                  <button
                    onClick={() => onCopiarDeApp(appJugador)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-primary-600 hover:bg-primary-500 text-white ml-auto shrink-0"
                    title="Copiar y agregar"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {jugadores.length === 0 && jugadoresApp.length === 0 && (
          <p className="text-gray-400 text-sm py-2">Cerrá esto y agregá jugadores en la sección de arriba.</p>
        )}
      </div>
    </div>
  )
}

function otroLugarPosicion(clave: ClaveFormacion, key: string): string {
  return posicionesDe(clave).find(p => p.key === key)?.label ?? key
}
