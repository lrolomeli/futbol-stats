'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PincodeModal from '@/components/PincodeModal'

interface Jugador {
  id: number
  nombre: string
  numero: number
  posicion: string | null
}

interface Partido {
  id: number
  rival: string
  fecha: string
  estado: string
  cancha: string | null
  tokenAcceso: string
  jugadoresEnCancha: { jugador: Jugador; enCancha: boolean; esSuplente: boolean }[]
}

export default function PartidoAdminPage() {
  const params = useParams()
  const router = useRouter()
  const [partido, setPartido] = useState<Partido | null>(null)
  const [plantelAbierto, setPlantelAbierto] = useState(false)
  const [todosJugadores, setTodosJugadores] = useState<Jugador[]>([])
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState(false)

  useEffect(() => {
    fetch(`/api/partidos/${params.id}`)
      .then(res => res.json())
      .then(setPartido)
  }, [params.id])

  const cargarPartido = async () => {
    const res = await fetch(`/api/partidos/${params.id}`)
    const data = await res.json()
    setPartido(data)
  }

  const abrirPlantel = async () => {
    setPlantelAbierto(true)
    const res = await fetch('/api/jugadores')
    const data = await res.json()
    setTodosJugadores(data)
  }

  const cambiarPlantel = async (action: 'agregar' | 'quitar', jugadorId: number) => {
    if (action === 'quitar' && !confirm('¿Quitar a este jugador del partido? Se eliminarán sus estadísticas de este partido.')) {
      return
    }

    await fetch(`/api/partidos/${params.id}/plantel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, jugadorId })
    })

    await cargarPartido()
  }

  const cambiarEstado = async (nuevoEstado: string) => {
    await fetch(`/api/partidos/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    })
    setPartido(prev => prev ? { ...prev, estado: nuevoEstado } : null)
  }

  const eliminarPartido = async (pincode: string) => {
    const res = await fetch(`/api/partidos/${params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pincode })
    })

    if (!res.ok) {
      setErrorEliminar(true)
      return
    }

    router.push('/admin')
  }

  if (!partido) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando partido...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar titulo="Detalle del Partido" mostrarVolver hrefVolver="/admin" />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Info del partido */}
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold text-lg">BlueLock vs {partido.rival}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
              partido.estado === 'en_curso' ? 'bg-green-500' :
              partido.estado === 'finalizado' ? 'bg-gray-500' : 'bg-yellow-500'
            }`}>
              {partido.estado === 'en_curso' ? 'En Curso' :
               partido.estado === 'finalizado' ? 'Finalizado' : 'Pendiente'}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            {new Date(partido.fecha).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          {partido.cancha && (
            <p className="text-gray-400 text-sm">📍 {partido.cancha}</p>
          )}
        </div>

        {/* Controles del partido */}
        <div className="bg-gray-800 p-4 rounded-xl space-y-3">
          <h3 className="text-white font-semibold">Control del Partido</h3>
          <div className="grid grid-cols-2 gap-2">
            {partido.estado === 'pendiente' && (
              <button
                onClick={() => cambiarEstado('en_curso')}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Iniciar Partido
              </button>
            )}
            {partido.estado === 'en_curso' && (
              <button
                onClick={() => cambiarEstado('finalizado')}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Finalizar
              </button>
            )}
          </div>

          <button
            onClick={abrirPlantel}
            disabled={partido.estado !== 'pendiente'}
            className={`w-full font-semibold py-3 rounded-lg transition-colors ${
              partido.estado === 'pendiente'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            👥 Ajustar Plantel
          </button>

          <button
            onClick={() => { setErrorEliminar(false); setConfirmarEliminar(true) }}
            className="w-full font-semibold py-3 rounded-lg transition-colors bg-red-600 hover:bg-red-500 text-white"
          >
            🗑 Eliminar Partido
          </button>
        </div>

        {/* Sesiones de Evaluación */}
        <div className="bg-gray-800 p-4 rounded-xl space-y-3">
          <h3 className="text-white font-semibold">Sesiones de Evaluación</h3>
          <p className="text-gray-400 text-xs">
            Crea una sesión por cada juez. Cada juez elige sus jugadores y esos quedan asignados.
          </p>
          <button
            onClick={() => {
              const juezId = crypto.randomUUID()
              window.open(`/evaluacion/${partido.id}/${juezId}`, '_blank')
            }}
            disabled={partido.estado === 'pendiente' || partido.estado === 'finalizado'}
            className={`w-full font-semibold py-3 rounded-lg transition-colors ${
              partido.estado === 'pendiente' || partido.estado === 'finalizado'
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            + Nueva Sesión de Evaluación
          </button>
          {partido.estado === 'pendiente' && (
            <p className="text-gray-400 text-xs">
              El partido debe comenzar antes de crear evaluaciones.
            </p>
          )}
          {partido.estado === 'finalizado' && (
            <p className="text-gray-400 text-xs">
              El partido ya finalizó, no se pueden crear evaluaciones.
            </p>
          )}
        </div>

        {/* Jugadores en cancha */}
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-white font-semibold mb-3">
            Jugadores en Cancha ({partido.jugadoresEnCancha.filter(j => j.enCancha).length})
          </h3>
          <div className="space-y-2">
            {partido.jugadoresEnCancha
              .filter(j => j.enCancha)
              .map(({ jugador }) => (
                <div key={jugador.id} className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
                    #{jugador.numero}
                  </div>
                  <span className="text-white">{jugador.nombre}</span>
                  {jugador.posicion && (
                    <span className="text-gray-400 text-sm ml-auto">{jugador.posicion}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Modal de ajustar plantel */}
      {plantelAbierto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
          <div className="bg-gray-800 w-full max-w-lg rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Ajustar Plantel</h3>
              <button
                onClick={() => setPlantelAbierto(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <h4 className="text-white font-semibold mb-2">Quitar del Partido</h4>
            <div className="space-y-2 mb-4">
              {partido.jugadoresEnCancha.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">No hay jugadores en el partido</p>
              ) : (
                partido.jugadoresEnCancha.map(({ jugador, enCancha }) => (
                  <div
                    key={jugador.id}
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${enCancha ? 'bg-primary-600' : 'bg-gray-600'}`}>
                      #{jugador.numero}
                    </div>
                    <span className="text-white font-medium">{jugador.nombre}</span>
                    {enCancha ? (
                      <span className="text-primary-400 text-xs ml-auto">En cancha</span>
                    ) : (
                      <span className="text-gray-400 text-xs ml-auto">Suplente</span>
                    )}
                    <button
                      onClick={() => cambiarPlantel('quitar', jugador.id)}
                      className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-sm font-bold transition-colors"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <h4 className="text-white font-semibold mb-2">Agregar al Partido</h4>
            <div className="space-y-2">
              {todosJugadores
                .filter(j => !partido.jugadoresEnCancha.some(p => p.jugador.id === j.id))
                .length === 0 ? (
                <p className="text-gray-400 text-sm py-2">Todos los jugadores ya están en el partido</p>
              ) : (
                todosJugadores
                  .filter(j => !partido.jugadoresEnCancha.some(p => p.jugador.id === j.id))
                  .map(jugador => (
                    <div
                      key={jugador.id}
                      className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                        #{jugador.numero}
                      </div>
                      <span className="text-white font-medium">{jugador.nombre}</span>
                      {jugador.posicion && (
                        <span className="text-gray-400 text-xs ml-auto">{jugador.posicion}</span>
                      )}
                      <button
                        onClick={() => cambiarPlantel('agregar', jugador.id)}
                        className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center text-sm font-bold transition-colors"
                        title="Agregar"
                      >
                        +
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de pincode para eliminar partido */}
      {confirmarEliminar && (
        <PincodeModal
          titulo="Eliminar Partido"
          descripcion="Esto eliminará el partido y todas sus estadísticas y evaluaciones permanentemente."
          onConfirm={(pin) => eliminarPartido(pin)}
          onCancel={() => { setConfirmarEliminar(false); setErrorEliminar(false) }}
        />
      )}

      {errorEliminar && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs text-center">
            <h3 className="text-white font-bold text-lg mb-2">Error</h3>
            <p className="text-red-400 text-sm mb-4">No se pudo eliminar el partido.</p>
            <button
              onClick={() => setErrorEliminar(false)}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
