import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { jugadorId: string } }
) {
  const jugador = await prisma.jugador.findUnique({
    where: { id: parseInt(params.jugadorId) }
  })

  if (!jugador) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }

  const stats = await prisma.statsObjetivas.findMany({
    where: { jugadorId: parseInt(params.jugadorId) },
    include: { partido: true }
  })

  // Calcular promedios históricos
  const totalPartidos = stats.length
  const promedios = {
    goles: totalPartidos > 0 ? stats.reduce((sum, s) => sum + s.goles, 0) / totalPartidos : 0,
    asistencias: totalPartidos > 0 ? stats.reduce((sum, s) => sum + s.asistencias, 0) / totalPartidos : 0,
    recuperaciones: totalPartidos > 0 ? stats.reduce((sum, s) => sum + s.recuperaciones, 0) / totalPartidos : 0,
    tirosAPorteria: totalPartidos > 0 ? stats.reduce((sum, s) => sum + s.tirosAPorteria, 0) / totalPartidos : 0,
    faltas: totalPartidos > 0 ? stats.reduce((sum, s) => sum + s.faltas, 0) / totalPartidos : 0,
    balonesPerdidos: totalPartidos > 0 ? stats.reduce((sum, s) => sum + s.balonesPerdidos, 0) / totalPartidos : 0,
    tirosAfuera: totalPartidos > 0 ? stats.reduce((sum, s) => sum + s.tirosAfuera, 0) / totalPartidos : 0
  }

  return NextResponse.json({
    jugador,
    stats,
    promedios,
    totalPartidos
  })
}
