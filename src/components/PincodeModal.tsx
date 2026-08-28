'use client'

import { useState } from 'react'

const PIN = '098651'

interface PincodeModalProps {
  titulo: string
  descripcion?: string
  onConfirm: (pincode: string) => void | Promise<void>
  onCancel: () => void
}

export default function PincodeModal({ titulo, descripcion, onConfirm, onCancel }: PincodeModalProps) {
  const [pincode, setPincode] = useState('')
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)

  const confirmar = async () => {
    if (pincode !== PIN) {
      setError(true)
      return
    }
    setCargando(true)
    await onConfirm(pincode)
    setCargando(false)
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => !cargando && onCancel()}>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg text-center mb-1">{titulo}</h3>
        {descripcion && (
          <p className="text-gray-400 text-sm text-center mb-4">{descripcion}</p>
        )}

        <input
          type="password"
          inputMode="numeric"
          placeholder="Pincode"
          value={pincode}
          onChange={e => { setPincode(e.target.value); setError(false) }}
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-center tracking-widest"
        />

        {error && (
          <p className="text-red-400 text-sm text-center mt-2">Pincode incorrecto</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={cargando}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={cargando || !pincode}
            className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {cargando ? '...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
