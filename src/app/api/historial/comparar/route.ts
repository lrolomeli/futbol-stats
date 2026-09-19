import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const jugadores = await prisma.jugador.findMany({
    where: { activo: true }
  })

  const resultados = []

  for (const jugador of jugadores) {
    const stats = await prisma.statsObjetivas.findMany({
      where: { jugadorId: jugador.id }
    })

    const totalPartidos = stats.length
    const totalGoles = stats.reduce((sum, s) => sum + s.goles, 0)
    const totalAsistencias = stats.reduce((sum, s) => sum + s.asistencias, 0)
    const totalRecuperaciones = stats.reduce((sum, s) => sum + s.recuperaciones, 0)
    const totalFaltas = stats.reduce((sum, s) => sum + s.faltas, 0)
    const totalBalonesPerdidos = stats.reduce((sum, s) => sum + s.balonesPerdidos, 0)
    const totalTirosAPorteria = stats.reduce((sum, s) => sum + s.tirosAPorteria, 0)
    const totalTirosAfuera = stats.reduce((sum, s) => sum + s.tirosAfuera, 0)

    const totalTiros = totalTirosAPorteria + totalTirosAfuera

    resultados.push({
      jugador,
      totalPartidos,
      totalGoles,
      totalAsistencias,
      totalRecuperaciones,
      totalFaltas,
      totalBalonesPerdidos,
      totalTirosAPorteria,
      totalTirosAfuera,
      // Métricas derivadas
      efectividadTiro: totalTiros > 0 ? Math.round((totalTirosAPorteria / totalTiros) * 100) : 0,
      golesPorPartido: totalPartidos > 0 ? +(totalGoles / totalPartidos).toFixed(2) : 0,
      asistenciasPorPartido: totalPartidos > 0 ? +(totalAsistencias / totalPartidos).toFixed(2) : 0,
      recuperacionesPorPartido: totalPartidos > 0 ? +(totalRecuperaciones / totalPartidos).toFixed(2) : 0,
      faltasPorPartido: totalPartidos > 0 ? +(totalFaltas / totalPartidos).toFixed(2) : 0,
      balonesPerdidosPorPartido: totalPartidos > 0 ? +(totalBalonesPerdidos / totalPartidos).toFixed(2) : 0,
    })
  }

  return NextResponse.json(resultados)
}
