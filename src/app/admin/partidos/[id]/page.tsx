'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'

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
  jugadoresEnCancha: { jugador: Jugador; enCancha: boolean }[]
}

export default function PartidoAdminPage() {
  const params = useParams()
  const [partido, setPartido] = useState<Partido | null>(null)

  useEffect(() => {
    fetch(`/api/partidos/${params.id}`)
      .then(res => res.json())
      .then(setPartido)
  }, [params.id])

  const cambiarEstado = async (nuevoEstado: string) => {
    await fetch(`/api/partidos/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    })
    setPartido(prev => prev ? { ...prev, estado: nuevoEstado } : null)
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
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            + Nueva Sesión de Evaluación
          </button>
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
    </div>
  )
}
