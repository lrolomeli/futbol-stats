'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface Partido {
  id: number
  rival: string
  fecha: string
  estado: string
  cancha: string | null
}

export default function AdminPage() {
  const [partidos, setPartidos] = useState<Partido[]>([])

  useEffect(() => {
    fetch('/api/partidos')
      .then(res => res.json())
      .then(setPartidos)
  }, [])

  const estadoColor = (estado: string) => {
    switch (estado) {
      case 'en_curso': return 'bg-green-500'
      case 'finalizado': return 'bg-gray-500'
      default: return 'bg-yellow-500'
    }
  }

  const estadoLabel = (estado: string) => {
    switch (estado) {
      case 'en_curso': return 'En Curso'
      case 'finalizado': return 'Finalizado'
      default: return 'Pendiente'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar titulo="Administración" />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/admin/jugadores"
            className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition-colors"
          >
            <div className="text-2xl mb-2">👥</div>
            <span className="text-white font-medium">Jugadores</span>
          </Link>

          <Link
            href="/admin/partidos/nuevo"
            className="bg-primary-600 hover:bg-primary-500 p-4 rounded-xl text-center transition-colors"
          >
            <div className="text-2xl mb-2">⚽</div>
            <span className="text-white font-medium">Nuevo Partido</span>
          </Link>

          <Link
            href="/admin/formacion"
            className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition-colors"
          >
            <div className="text-2xl mb-2">🛡️</div>
            <span className="text-white font-medium">Formación Defensiva</span>
          </Link>

          <Link
            href="/formacion-ofensiva"
            className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition-colors"
          >
            <div className="text-2xl mb-2">⚔️</div>
            <span className="text-white font-medium">Formación Ofensiva</span>
          </Link>
        </div>

        <div>
          <h2 className="text-white font-semibold text-lg mb-3">Partidos Recientes</h2>
          {partidos.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay partidos registrados</p>
          ) : (
            <div className="space-y-3">
              {partidos.map(partido => (
                <Link
                  key={partido.id}
                  href={`/admin/partidos/${partido.id}`}
                  className="block bg-gray-800 hover:bg-gray-750 p-4 rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">BlueLock vs {partido.rival}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(partido.fecha).toLocaleDateString('es-ES')} 
                        {partido.cancha && ` • ${partido.cancha}`}
                      </p>
                    </div>
                    <span className={`${estadoColor(partido.estado)} px-3 py-1 rounded-full text-xs font-medium text-white`}>
                      {estadoLabel(partido.estado)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
