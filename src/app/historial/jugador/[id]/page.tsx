'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface StatsHistorial {
  goles: number
  asistencias: number
  recuperaciones: number
  tirosAPorteria: number
  faltas: number
  balonesPerdidos: number
  tirosAfuera: number
}

interface PartidoHistorial {
  fecha: string
  rival: string
  stats: StatsHistorial
  evaluacion?: number
}

interface DatosJugador {
  jugador: {
    id: number
    nombre: string
    numero: number
    posicion: string | null
  }
  totalPartidos: number
  promedios: StatsHistorial
  promedioEvaluacion: number
  stats: {
    stats: StatsHistorial
    partido: { rival: string; fecha: string }
  }[]
  evaluaciones: {
    puntuacion: number
    partido: { rival: string; fecha: string }
  }[]
}

export default function JugadorHistorialPage() {
  const params = useParams()
  const [datos, setDatos] = useState<DatosJugador | null>(null)

  useEffect(() => {
    fetch(`/api/historial/${params.id}`)
      .then(res => res.json())
      .then(setDatos)
  }, [params.id])

  if (!datos) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando historial...</p>
      </div>
    )
  }

  const statLabels = [
    { key: 'goles', label: 'Goles', color: 'text-green-400' },
    { key: 'asistencias', label: 'Asistencias', color: 'text-blue-400' },
    { key: 'recuperaciones', label: 'Recuperaciones', color: 'text-yellow-400' },
    { key: 'tirosAPorteria', label: 'Tiros a Portería', color: 'text-purple-400' },
    { key: 'faltas', label: 'Faltas', color: 'text-red-400' },
    { key: 'balonesPerdidos', label: 'Balones Perdidos', color: 'text-orange-400' },
    { key: 'tirosAfuera', label: 'Tiros Afuera', color: 'text-gray-400' },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar
        titulo={datos.jugador.nombre}
        mostrarVolver
        hrefVolver="/historial"
      />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Info del jugador */}
        <div className="bg-gray-800 p-4 rounded-xl flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold">
            #{datos.jugador.numero}
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">{datos.jugador.nombre}</h2>
            {datos.jugador.posicion && (
              <p className="text-gray-400">{datos.jugador.posicion}</p>
            )}
            <p className="text-gray-400 text-sm">{datos.totalPartidos} partidos jugados</p>
          </div>
        </div>

        {/* Evaluación de jueces */}
        {datos.promedioEvaluacion > 0 && (
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm mb-1">Evaluación Promedio de Jueces</p>
            <p className="text-4xl font-bold text-yellow-400">
              ⭐ {datos.promedioEvaluacion.toFixed(1)}
            </p>
            <p className="text-gray-400 text-sm">
              basado en {datos.evaluaciones.length} evaluación(es)
            </p>
          </div>
        )}

        {/* Promedios por partido */}
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-white font-semibold mb-3">Promedios por Partido</h3>
          <div className="grid grid-cols-2 gap-3">
            {statLabels.map(({ key, label, color }) => (
              <div key={key} className="bg-gray-700 p-3 rounded-lg">
                <p className={`text-2xl font-bold ${color}`}>
                  {datos.promedios[key as keyof StatsHistorial].toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        {datos.stats.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-xl">
            <h3 className="text-white font-semibold mb-3">Totales Acumulados</h3>
            <div className="grid grid-cols-2 gap-3">
              {statLabels.map(({ key, label, color }) => (
                <div key={key} className="bg-gray-700 p-3 rounded-lg">
                  <p className={`text-2xl font-bold ${color}`}>
                    {datos.stats.reduce((sum, item) => sum + (item.stats[key as keyof StatsHistorial] || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de partidos */}
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-white font-semibold mb-3">Historial de Partidos</h3>
          {datos.stats.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Sin partidos registrados</p>
          ) : (
            <div className="space-y-3">
              {datos.stats.map((item, index) => (
                <div key={index} className="bg-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-750">
                    <p className="text-white font-medium">
                      vs {item.partido.rival}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {new Date(item.partido.fecha).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-600/40">
                    {statLabels.map(({ key, label, color }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-2">
                        <span className="text-gray-300 text-sm">{label}</span>
                        <span className={`font-semibold ${color}`}>{item.stats[key as keyof StatsHistorial]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
