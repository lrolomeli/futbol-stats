'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PincodeModal from '@/components/PincodeModal'

interface Jugador {
  id: number
  nombre: string
  numero: number
  posicion: string | null
}

export default function NuevoPartidoPage() {
  const router = useRouter()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [rival, setRival] = useState('')
  const [fecha, setFecha] = useState('')
  const [cancha, setCancha] = useState('')
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [enviando, setEnviando] = useState(false)
  const [confirmarCrear, setConfirmarCrear] = useState(false)

  useEffect(() => {
    fetch('/api/jugadores')
      .then(res => res.json())
      .then(setJugadores)

    // Fecha por defecto: ahora
    const ahora = new Date()
    setFecha(ahora.toISOString().slice(0, 16))
  }, [])

  const toggleJugador = (id: number) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rival || !fecha || seleccionados.length === 0) return
    setConfirmarCrear(true)
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
          cancha: cancha || null,
          jugadoresIds: seleccionados
        })
      })

      const partido = await res.json()
      router.push(`/admin/partidos/${partido.id}`)
    } catch (error) {
      console.error('Error creando partido:', error)
    } finally {
      setEnviando(false)
    }
  }

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

          <div className="bg-gray-800 p-4 rounded-xl space-y-4">
            <h2 className="text-white font-semibold">
              Titulares Seleccionados ({seleccionados.length})
            </h2>

            {seleccionados.length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                No hay titulares seleccionados
              </p>
            ) : (
              <div className="space-y-2">
                {seleccionados.map(id => {
                  const jugador = jugadores.find(j => j.id === id)
                  if (!jugador) return null
                  return (
                    <div key={jugador.id} className="p-3 rounded-lg flex items-center gap-3 bg-primary-600 text-white">
                      <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-sm font-bold">
                        #{jugador.numero}
                      </div>
                      <span className="font-medium">{jugador.nombre}</span>
                      {jugador.posicion && (
                        <span className="text-sm opacity-75 ml-auto">{jugador.posicion}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleJugador(jugador.id)}
                        className="w-8 h-8 rounded-full bg-primary-800 hover:bg-red-600 flex items-center justify-center text-sm font-bold transition-colors"
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <h2 className="text-white font-semibold pt-2 border-t border-gray-700">
              Disponibles
            </h2>

            {jugadores.filter(j => !seleccionados.includes(j.id)).length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                Todos los jugadores ya fueron seleccionados
              </p>
            ) : (
              <div className="space-y-2">
                {jugadores
                  .filter(j => !seleccionados.includes(j.id))
                  .map(jugador => (
                    <div key={jugador.id} className="p-3 rounded-lg flex items-center gap-3 bg-gray-700 text-gray-300">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                        #{jugador.numero}
                      </div>
                      <span className="font-medium">{jugador.nombre}</span>
                      {jugador.posicion && (
                        <span className="text-sm opacity-75 ml-auto">{jugador.posicion}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleJugador(jugador.id)}
                        className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center text-sm font-bold transition-colors"
                        title="Agregar"
                      >
                        +
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando || !rival || seleccionados.length === 0}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {enviando ? 'Creando...' : 'Crear Partido'}
          </button>
        </form>
      </div>

      {confirmarCrear && (
        <PincodeModal
          titulo="Crear Partido"
          descripcion="Solo el administrador puede crear el partido."
          onConfirm={crearPartido}
          onCancel={() => setConfirmarCrear(false)}
        />
      )}
    </div>
  )
}
