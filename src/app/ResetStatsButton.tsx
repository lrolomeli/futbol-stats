'use client'

import { useState } from 'react'

export default function ResetStatsButton() {
  const [abierto, setAbierto] = useState(false)
  const [pincode, setPincode] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  const confirmar = async () => {
    setCargando(true)
    setError(null)
    setExito(false)

    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pincode }),
    })

    setCargando(false)

    if (!res.ok) {
      setError('Pincode incorrecto')
      return
    }

    setExito(true)
    setPincode('')
    setTimeout(() => {
      setAbierto(false)
      setExito(false)
      window.location.reload()
    }, 1200)
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="block w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 text-red-400 hover:text-red-300 font-semibold py-4 px-6 rounded-xl text-center transition-colors active:scale-95"
      >
        Reiniciar Estadísticas
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => !cargando && setAbierto(false)}>
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg text-center mb-2">Reiniciar Todo</h3>
            <p className="text-red-400 text-sm text-center mb-4">
              Esto eliminará TODOS los partidos, jugadores y estadísticas permanentemente.
            </p>

            {exito ? (
              <p className="text-green-400 text-center font-semibold py-2">Estadísticas reiniciadas ✓</p>
            ) : (
              <>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={e => { setPincode(e.target.value); setError(null) }}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-center tracking-widest"
                />

                {error && (
                  <p className="text-red-400 text-sm text-center mt-2">{error}</p>
                )}

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setAbierto(false)}
                    disabled={cargando}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmar}
                    disabled={cargando || !pincode}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {cargando ? '...' : 'Confirmar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
