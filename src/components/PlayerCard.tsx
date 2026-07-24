'use client'

interface PlayerCardProps {
  numero: number
  nombre: string
  posicion?: string
  stats: {
    goles: number
    asistencias: number
    recuperaciones: number
    tirosAPorteria: number
    faltas: number
    balonesPerdidos: number
    tirosAfuera: number
  }
  onStatChange: (stat: string, incremento: number) => void
}

export default function PlayerCard({ numero, nombre, posicion, stats, onStatChange }: PlayerCardProps) {
  const statConfig = [
    { key: 'goles', label: 'GOL' },
    { key: 'asistencias', label: 'ASI' },
    { key: 'recuperaciones', label: 'REC' },
    { key: 'tirosAPorteria', label: 'T.P' },
    { key: 'faltas', label: 'FAL' },
    { key: 'balonesPerdidos', label: 'B.P' },
    { key: 'tirosAfuera', label: 'T.A' },
  ]

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold">
          #{numero}
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">{nombre}</h3>
          {posicion && <p className="text-gray-400 text-sm">{posicion}</p>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {statConfig.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-1">{label}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onStatChange(key, -1)}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold flex items-center justify-center transition-colors active:scale-95"
              >
                -
              </button>
              <span className="w-6 text-center text-lg font-bold text-white">
                {(stats as any)[key]}
              </span>
              <button
                onClick={() => onStatChange(key, 1)}
                className="w-8 h-8 rounded-full bg-primary-600 hover:bg-primary-500 text-white font-bold flex items-center justify-center transition-colors active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
