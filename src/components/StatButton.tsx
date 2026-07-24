'use client'

interface StatButtonProps {
  stat: string
  label: string
  valor: number
  onIncrementar: (stat: string) => void
  onDecrementar: (stat: string) => void
}

export default function StatButton({ stat, label, valor, onIncrementar, onDecrementar }: StatButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDecrementar(stat)}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl flex items-center justify-center transition-colors active:scale-95"
        >
          -
        </button>
        <span className="w-8 text-center text-xl font-bold text-white">{valor}</span>
        <button
          onClick={() => onIncrementar(stat)}
          className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-xl flex items-center justify-center transition-colors active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  )
}
