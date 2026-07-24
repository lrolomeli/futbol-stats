import Link from 'next/link'

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

        <div className="text-center pt-8">
          <p className="text-gray-500 text-sm">
            Los jueces acceden directamente con el link del partido
          </p>
        </div>
      </div>
    </div>
  )
}
