import Link from 'next/link'
import ResetStatsButton from './ResetStatsButton'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">BlueLock Stats</h1>
        <p className="text-gray-400">Sistema de estadísticas de fútbol 7</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Link
          href="/admin"
          className="block w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors active:scale-95"
        >
          Panel de Administración
        </Link>

        <Link
          href="/historial"
          className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors active:scale-95"
        >
          Ver Estadísticas Históricas
        </Link>

        <Link
          href="/mi-formacion"
          className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors active:scale-95"
        >
          Armar mi alineación
        </Link>

        <div className="text-center pt-6">
          <p className="text-gray-500 text-sm">
            Los jueces acceden directamente con el link del partido
          </p>
          <p className="text-gray-500 text-sm mt-1">
            "Armar mi alineación" se guarda solo en tu navegador
          </p>
        </div>

        <div className="w-full pt-4 border-t border-gray-800">
          <ResetStatsButton />
        </div>
      </div>
    </div>
  )
}
