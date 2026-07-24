'use client'

import Link from 'next/link'

interface NavbarProps {
  titulo?: string
  mostrarVolver?: boolean
  hrefVolver?: string
}

export default function Navbar({ titulo, mostrarVolver = false, hrefVolver = '/' }: NavbarProps) {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-primary-400 hover:text-primary-300 font-semibold">
          <span className="text-lg">🏠</span>
          <span className="text-sm">Inicio</span>
        </Link>
        {titulo && <h1 className="text-white font-semibold text-center flex-1">{titulo}</h1>}
        {mostrarVolver && (
          <Link href={hrefVolver} className="text-gray-400 hover:text-white text-sm">
            ← Volver
          </Link>
        )}
        {!mostrarVolver && <div className="w-16"></div>}
      </div>
    </nav>
  )
}
