'use client'

interface JudgeScorePadProps {
  jugadorId: number
  nombre: string
  numero: number
  puntuacion: number
  onPuntuar: (jugadorId: number, puntuacion: number) => void
}

export default function JudgeScorePad({ jugadorId, nombre, numero, puntuacion, onPuntuar }: JudgeScorePadProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent-600 flex items-center justify-center text-lg font-bold">
          #{numero}
        </div>
        <h3 className="text-white font-semibold text-lg">{nombre}</h3>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((estrella) => (
          <button
            key={estrella}
            onClick={() => onPuntuar(jugadorId, estrella)}
            className={`w-12 h-12 rounded-lg font-bold text-xl transition-all active:scale-95 ${
              puntuacion === estrella
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {estrella}
          </button>
        ))}
      </div>

      <div className="mt-2 text-center">
        <span className="text-gray-400 text-sm">
          {puntuacion > 0 ? `${'⭐'.repeat(puntuacion)} (${puntuacion}/5)` : 'Sin calificar'}
        </span>
      </div>
    </div>
  )
}
