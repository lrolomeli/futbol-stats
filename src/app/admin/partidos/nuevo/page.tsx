'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { CLAVE_DEFENSIVA, extraerJugadoresDeFormacion, FORMACION_VACIA } from '@/lib/formacion'
import type { FormacionData } from '@/lib/formacion'

interface FormacionResponse {
  datos: FormacionData
  updatedAt: string | null
}

export default function NuevoPartidoPage() {
  const router = useRouter()
  const [rival, setRival] = useState('')
  const [fecha, setFecha] = useState('')
  const [cancha, setCancha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cantidadJugadores, setCantidadJugadores] = useState<number | null>(null)

  useEffect(() => {
    const ahora = new Date()
    setFecha(ahora.toISOString().slice(0, 16))

    fetch('/api/formacion')
      .then(res => res.json())
      .then((data: FormacionResponse) => {
        const datos = data.datos ?? FORMACION_VACIA(CLAVE_DEFENSIVA)
        const ids = extraerJugadoresDeFormacion(datos)
        setCantidadJugadores(ids.length)
      })
      .catch(() => setCantidadJugadores(0))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rival || !fecha || cantidadJugadores === 0) return
    crearPartido()
  }

  const crearPartido = async () => {
    setEnviando(true)

    try {
      const res = await fetch('/api/partidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rival,
          fecha,
          cancha: cancha || null
        })
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Error creando partido')
        return
      }

      const partido = await res.json()
      router.push(`/admin/partidos/${partido.id}`)
    } catch (error) {
      console.error('Error creando partido:', error)
    } finally {
      setEnviando(false)
    }
  }

  const sinJugadores = cantidadJugadores !== null && cantidadJugadores === 0

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar titulo="Nuevo Partido" mostrarVolver hrefVolver="/admin" />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-xl space-y-3">
            <h2 className="text-white font-semibold">Datos del Partido</h2>

            <input
              type="text"
              placeholder="Nombre del rival"
              value={rival}
              onChange={(e) => setRival(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />

            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />

            <input
              type="text"
              placeholder="Cancha (opcional)"
              value={cancha}
              onChange={(e) => setCancha(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="bg-gray-800 p-4 rounded-xl">
            {cantidadJugadores === null ? (
              <p className="text-gray-400 text-center py-2">Cargando formación...</p>
            ) : sinJugadores ? (
              <div className="text-center py-2 space-y-2">
                <p className="text-red-400 font-medium">No hay jugadores en la formación</p>
                <p className="text-gray-400 text-sm">
                  Asigná jugadores en{' '}
                  <a href="/admin/formacion" className="text-primary-400 underline">
                    /admin/formacion (defensiva)
                  </a>{' '}
                  antes de crear un partido.
                </p>
              </div>
            ) : (
              <p className="text-gray-300 text-center py-2">
                Se incluirán automáticamente{' '}
                <span className="text-white font-semibold">{cantidadJugadores} jugadores</span>{' '}
                de la formación.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando || !rival || sinJugadores || cantidadJugadores === null}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {enviando ? 'Creando...' : 'Crear Partido'}
          </button>
        </form>
      </div>
    </div>
  )
}
