import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const partidos = await prisma.partido.findMany({
    include: {
      jugadoresEnCancha: {
        include: { jugador: true }
      },
      statsObjetivas: true
    },
    orderBy: { fecha: 'desc' }
  })
  return NextResponse.json(partidos)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const partido = await prisma.partido.create({
    data: {
      rival: body.rival,
      fecha: new Date(body.fecha),
      cancha: body.cancha,
      jugadoresEnCancha: {
        create: body.jugadoresIds.map((id: number) => ({
          jugadorId: id,
          enCancha: true,
          esSuplente: false
        }))
      }
    },
    include: {
      jugadoresEnCancha: {
        include: { jugador: true }
      }
    }
  })

  // Crear stats iniciales en 0 para cada jugador
  for (const jugadorId of body.jugadoresIds) {
    await prisma.statsObjetivas.create({
      data: {
        partidoId: partido.id,
        jugadorId: jugadorId
      }
    })
  }

  return NextResponse.json(partido, { status: 201 })
}
