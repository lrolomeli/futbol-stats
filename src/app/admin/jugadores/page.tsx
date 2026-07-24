'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

interface Jugador {
  id: number
  nombre: string
  numero: number
  posicion: string | null
}

export default function JugadoresPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [nombre, setNombre] = useState('')
  const [numero, setNumero] = useState('')
  const [posicion, setPosicion] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    cargarJugadores()
  }, [])

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }

  const cargarJugadores = async () => {
    try {
      const res = await fetch('/api/jugadores')
      if (!res.ok) throw new Error('Error al cargar jugadores')
      const data = await res.json()
      setJugadores(data)
    } catch (e) {
      mostrarMensaje('error', 'No se pudieron cargar los jugadores')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !numero) return

    setCargando(true)
    setMensaje(null)

    const data = { nombre, numero: parseInt(numero), posicion: posicion || null }

    try {
      let res: Response

      if (editando) {
        res = await fetch(`/api/jugadores/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
      } else {
        res = await fetch('/api/jugadores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
      }

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || 'Error al guardar el jugador')
      }

      mostrarMensaje('exito', editando ? 'Jugador actualizado' : 'Jugador agregado correctamente')
      setNombre('')
      setNumero('')
      setPosicion('')
      setEditando(null)
      await cargarJugadores()
    } catch (e: any) {
      mostrarMensaje('error', e.message || 'No se pudo guardar el jugador. Verifica que la base de datos esté activa.')
    } finally {
      setCargando(false)
    }
  }

  const handleEditar = (jugador: Jugador) => {
    setNombre(jugador.nombre)
    setNumero(jugador.numero.toString())
    setPosicion(jugador.posicion || '')
    setEditando(jugador.id)
    setMensaje(null)
  }

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar este jugador?')) return

    try {
      const res = await fetch(`/api/jugadores/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      mostrarMensaje('exito', 'Jugador eliminado')
      await cargarJugadores()
    } catch (e) {
      mostrarMensaje('error', 'No se pudo eliminar el jugador')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar titulo="Jugadores" mostrarVolver hrefVolver="/admin" />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Mensaje de feedback */}
        {mensaje && (
          <div className={`p-3 rounded-lg text-center font-medium ${
            mensaje.tipo === 'exito'
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : 'bg-red-600/20 text-red-400 border border-red-600/30'
          }`}>
            {mensaje.tipo === 'exito' ? '✓' : '✕'} {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-xl space-y-3">
          <h2 className="text-white font-semibold">
            {editando ? 'Editar Jugador' : 'Agregar Jugador'}
          </h2>

          <input
            type="text"
            placeholder="Nombre del jugador"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Número"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              min="1"
              max="99"
            />
            <input
              type="text"
              placeholder="Posición (opcional)"
              value={posicion}
              onChange={(e) => setPosicion(e.target.value)}
              className="bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {cargando ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Agregar'}
            </button>
            {editando && (
              <button
                type="button"
                onClick={() => { setEditando(null); setNombre(''); setNumero(''); setPosicion('') }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div>
          <h2 className="text-white font-semibold text-lg mb-3">Plantilla ({jugadores.length})</h2>
          {jugadores.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay jugadores registrados. Agrega el primero arriba.</p>
          ) : (
            <div className="space-y-2">
              {jugadores.map(jugador => (
                <div key={jugador.id} className="bg-gray-800 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
                      #{jugador.numero}
                    </div>
                    <div>
                      <p className="text-white font-medium">{jugador.nombre}</p>
                      {jugador.posicion && (
                        <p className="text-gray-400 text-sm">{jugador.posicion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditar(jugador)}
                      className="text-primary-400 hover:text-primary-300 px-3 py-1 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(jugador.id)}
                      className="text-red-400 hover:text-red-300 px-3 py-1 text-sm"
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
    </div>
  )
}
