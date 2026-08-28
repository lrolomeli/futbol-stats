'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell,
} from 'recharts'

interface Comparativa {
  jugador: {
    id: number
    nombre: string
    numero: number
  }
  totalPartidos: number
  totalGoles: number
  totalAsistencias: number
  totalRecuperaciones: number
  totalFaltas: number
  totalBalonesPerdidos: number
  totalTirosAPorteria: number
  totalTirosAfuera: number
  promedioEvaluacion: number
  efectividadTiro: number
  golesPorPartido: number
  asistenciasPorPartido: number
  recuperacionesPorPartido: number
  faltasPorPartido: number
  balonesPerdidosPorPartido: number
}

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6', '#f43f5e', '#84cc16']

type MetricaKey = keyof Pick<Comparativa,
  'totalGoles' | 'totalAsistencias' | 'totalRecuperaciones' | 'totalFaltas' |
  'golesPorPartido' | 'asistenciasPorPartido' | 'recuperacionesPorPartido' |
  'faltasPorPartido' | 'efectividadTiro' | 'promedioEvaluacion'
>

interface MetricaOption {
  key: MetricaKey
  label: string
  tipo: 'total' | 'promedio' | 'porcentaje'
}

const METRICAS: MetricaOption[] = [
  { key: 'totalGoles', label: 'Goles (Total)', tipo: 'total' },
  { key: 'totalAsistencias', label: 'Asistencias (Total)', tipo: 'total' },
  { key: 'totalRecuperaciones', label: 'Recuperaciones (Total)', tipo: 'total' },
  { key: 'totalFaltas', label: 'Faltas (Total)', tipo: 'total' },
  { key: 'golesPorPartido', label: 'Goles / Partido', tipo: 'promedio' },
  { key: 'asistenciasPorPartido', label: 'Asistencias / Partido', tipo: 'promedio' },
  { key: 'recuperacionesPorPartido', label: 'Recuperaciones / Partido', tipo: 'promedio' },
  { key: 'faltasPorPartido', label: 'Faltas / Partido', tipo: 'promedio' },
  { key: 'efectividadTiro', label: 'Efectividad de Tiro %', tipo: 'porcentaje' },
  { key: 'promedioEvaluacion', label: 'Evaluación Jueces', tipo: 'promedio' },
]

export default function HistorialPage() {
  const router = useRouter()
  const [datos, setDatos] = useState<Comparativa[]>([])
  const [metricaActiva, setMetricaActiva] = useState<MetricaKey>('totalGoles')
  const [tabActiva, setTabActiva] = useState<'graficos' | 'tabla' | 'radar'>('graficos')
  const [radarSeleccionados, setRadarSeleccionados] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/historial/comparar')
      .then(res => res.json())
      .then(data => {
        setDatos(data)
        setRadarSeleccionados(data.filter((d: Comparativa) => d.totalPartidos > 0).map((d: Comparativa) => d.jugador.id))
      })
  }, [])

  const toggleRadarJugador = (id: number) => {
    setRadarSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const todosRadar = () => {
    setRadarSeleccionados(datos.filter(d => d.totalPartidos > 0).map(d => d.jugador.id))
  }

  const ningunoRadar = () => setRadarSeleccionados([])

  const metricaSeleccionada = METRICAS.find(m => m.key === metricaActiva)!

  const datosGrafico = [...datos]
    .filter(d => (d as any)[metricaActiva] > 0)
    .sort((a, b) => (b as any)[metricaActiva] - (a as any)[metricaActiva])
    .map(d => ({
      nombre: `#${d.jugador.numero}`,
      fullName: d.jugador.nombre,
      valor: (d as any)[metricaActiva],
    }))

  const datosRadarRaw = datos
    .filter(d => d.totalPartidos > 0 && radarSeleccionados.includes(d.jugador.id))
    .map(d => ({
      id: d.jugador.id,
      nombre: `#${d.jugador.numero} ${d.jugador.nombre.split(' ')[0]}`,
      goles: Math.min(100, d.golesPorPartido * 20),
      asistencias: Math.min(100, d.asistenciasPorPartido * 20),
      recuperaciones: Math.min(100, d.recuperacionesPorPartido * 10),
      efectividad: d.efectividadTiro,
      evaluacion: (d.promedioEvaluacion / 5) * 100,
    }))

  const radarData = [
    { stat: 'Goles/P', ...Object.fromEntries(datosRadarRaw.map(d => [d.nombre, d.goles])) },
    { stat: 'Asist./P', ...Object.fromEntries(datosRadarRaw.map(d => [d.nombre, d.asistencias])) },
    { stat: 'Recup./P', ...Object.fromEntries(datosRadarRaw.map(d => [d.nombre, d.recuperaciones])) },
    { stat: 'Conv. Gol', ...Object.fromEntries(datosRadarRaw.map(d => [d.nombre, d.efectividad])) },
    { stat: 'Eval. Jueces', ...Object.fromEntries(datosRadarRaw.map(d => [d.nombre, d.evaluacion])) },
  ]

  const formatoValor = (valor: number, tipo: string) => {
    if (tipo === 'porcentaje') return `${valor}%`
    if (tipo === 'promedio') return valor.toFixed(2)
    return valor.toString()
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      <Navbar titulo="Estadísticas Históricas" mostrarVolver hrefVolver="/" />

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-gray-800 p-1 rounded-xl">
          {[
            { key: 'graficos' as const, label: 'Gráficos' },
            { key: 'tabla' as const, label: 'Tabla' },
            { key: 'radar' as const, label: 'Radar' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabActiva(tab.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tabActiva === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {datos.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay datos históricos disponibles</p>
        ) : (
          <>
            {/* TAB: Gráficos */}
            {tabActiva === 'graficos' && (
              <>
                {/* Selector de métrica */}
                <div className="bg-gray-800 p-4 rounded-xl">
                  <label className="text-gray-400 text-sm mb-2 block">Métrica a comparar:</label>
                  <select
                    value={metricaActiva}
                    onChange={(e) => setMetricaActiva(e.target.value as MetricaKey)}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {METRICAS.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Gráfico de barras */}
                <div className="bg-gray-800 p-4 rounded-xl">
                  <h3 className="text-white font-semibold mb-4">{metricaSeleccionada.label}</h3>
                  {datosGrafico.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={datosGrafico} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <XAxis dataKey="nombre" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value: number) => [formatoValor(value, metricaSeleccionada.tipo), 'Valor']}
                          labelFormatter={(label: string, payload: any) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                          {datosGrafico.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-400 text-center py-8">Sin datos para esta métrica</p>
                  )}
                </div>

                {/* Métricas clave resumen */}
                <div className="bg-gray-800 p-4 rounded-xl">
                  <h3 className="text-white font-semibold mb-3">Resumen del Equipo</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-400">
                        {datos.reduce((sum, d) => sum + d.totalGoles, 0)}
                      </p>
                      <p className="text-xs text-gray-400">Total Goles</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">
                        {datos.reduce((sum, d) => sum + d.totalAsistencias, 0)}
                      </p>
                      <p className="text-xs text-gray-400">Total Asistencias</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">
                        {datos.reduce((sum, d) => sum + d.totalRecuperaciones, 0)}
                      </p>
                      <p className="text-xs text-gray-400">Total Recuperaciones</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-400">
                        {datos.reduce((sum, d) => sum + d.totalFaltas, 0)}
                      </p>
                      <p className="text-xs text-gray-400">Total Faltas</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB: Tabla */}
            {tabActiva === 'tabla' && (
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-3 py-3 text-left text-gray-300 font-semibold">#</th>
                        <th className="px-3 py-3 text-left text-gray-300 font-semibold">Jugador</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">PJ</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">G</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">A</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">R</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">F</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">G/P</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">A/P</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">R/P</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">F/P</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">ET%</th>
                        <th className="px-3 py-3 text-center text-gray-300 font-semibold">Eval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos
                        .filter(d => d.totalPartidos > 0)
                        .sort((a, b) => b.golesPorPartido - a.golesPorPartido)
                        .map(d => (
                          <tr
                            key={d.jugador.id}
                            onClick={() => router.push(`/historial/jugador/${d.jugador.id}`)}
                            className="border-b border-gray-700/50 hover:bg-gray-750 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-3 text-primary-400 font-bold">#{d.jugador.numero}</td>
                            <td className="px-3 py-3 text-white font-medium">{d.jugador.nombre}</td>
                            <td className="px-3 py-3 text-center text-gray-300">{d.totalPartidos}</td>
                            <td className="px-3 py-3 text-center text-green-400 font-bold">{d.totalGoles}</td>
                            <td className="px-3 py-3 text-center text-blue-400 font-bold">{d.totalAsistencias}</td>
                            <td className="px-3 py-3 text-center text-yellow-400 font-bold">{d.totalRecuperaciones}</td>
                            <td className="px-3 py-3 text-center text-red-400 font-bold">{d.totalFaltas}</td>
                            <td className="px-3 py-3 text-center text-white">{d.golesPorPartido}</td>
                            <td className="px-3 py-3 text-center text-white">{d.asistenciasPorPartido}</td>
                            <td className="px-3 py-3 text-center text-white">{d.recuperacionesPorPartido}</td>
                            <td className="px-3 py-3 text-center text-white">{d.faltasPorPartido}</td>
                            <td className="px-3 py-3 text-center text-white">{d.efectividadTiro}%</td>
                            <td className="px-3 py-3 text-center text-purple-400 font-bold">
                              {d.promedioEvaluacion > 0 ? d.promedioEvaluacion.toFixed(1) : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: Radar */}
            {tabActiva === 'radar' && (
              <>
                {/* Selector de jugadores */}
                <div className="bg-gray-800 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">Seleccionar jugadores</h3>
                    <div className="flex gap-2">
                      <button onClick={todosRadar} className="text-xs text-primary-400 hover:text-primary-300">Todos</button>
                      <span className="text-gray-600">|</span>
                      <button onClick={ningunoRadar} className="text-xs text-gray-400 hover:text-white">Ninguno</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {datos
                      .filter(d => d.totalPartidos > 0)
                      .sort((a, b) => a.jugador.numero - b.jugador.numero)
                      .map((d, i) => {
                        const activo = radarSeleccionados.includes(d.jugador.id)
                        const colorIdx = datos.filter(x => x.totalPartidos > 0).findIndex(x => x.jugador.id === d.jugador.id)
                        return (
                          <button
                            key={d.jugador.id}
                            onClick={() => toggleRadarJugador(d.jugador.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2 ${
                              activo
                                ? 'border-current'
                                : 'bg-gray-700 text-gray-500 border-transparent'
                            }`}
                            style={activo ? {
                              backgroundColor: COLORS[colorIdx % COLORS.length] + '22',
                              color: COLORS[colorIdx % COLORS.length],
                            } : {}}
                          >
                            #{d.jugador.numero} {d.jugador.nombre.split(' ')[0]}
                          </button>
                        )
                      })}
                  </div>
                </div>

                {/* Gráfico radar */}
                <div className="bg-gray-800 p-4 rounded-xl">
                  <h3 className="text-white font-semibold mb-2">Perfil de Jugadores</h3>
                  <p className="text-gray-400 text-xs mb-4">
                    Escala 0-100 · Promedio por partido
                  </p>
                  {datosRadarRaw.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="stat" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <PolarRadiusAxis tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 100]} />
                        {datosRadarRaw.map((d, i) => (
                          <Radar
                            key={d.nombre}
                            name={d.nombre}
                            dataKey={d.nombre}
                            stroke={COLORS[
                              datos.filter(x => x.totalPartidos > 0).findIndex(x => x.jugador.id === d.id) % COLORS.length
                            ]}
                            fill={COLORS[
                              datos.filter(x => x.totalPartidos > 0).findIndex(x => x.jugador.id === d.id) % COLORS.length
                            ]}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        ))}
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          formatter={(value: number) => [value.toFixed(1), '']}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-400 text-center py-8">Selecciona al menos un jugador</p>
                  )}
                  {/* Leyenda */}
                  {datosRadarRaw.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4 justify-center">
                      {datosRadarRaw.map(d => {
                        const colorIdx = datos.filter(x => x.totalPartidos > 0).findIndex(x => x.jugador.id === d.id)
                        return (
                          <div key={d.nombre} className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[colorIdx % COLORS.length] }} />
                            <span className="text-gray-300 text-xs">{d.nombre}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
