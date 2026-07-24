import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const { jugadorSalienteId, jugadorEntranteId } = body

  // Sacar al jugador de cancha
  await prisma.matchJugador.update({
    where: {
      partidoId_jugadorId: {
        partidoId: parseInt(params.id),
        jugadorId: jugadorSalienteId
      }
    },
    data: { enCancha: false }
  })

  // Verificar si el jugador entrante ya estaba en el partido
  const existente = await prisma.matchJugador.findUnique({
    where: {
      partidoId_jugadorId: {
        partidoId: parseInt(params.id),
        jugadorId: jugadorEntranteId
      }
    }
  })

  if (existente) {
    // Si ya existia (era suplente), ponerlo en cancha
    await prisma.matchJugador.update({
      where: { id: existente.id },
      data: { enCancha: true }
    })
  } else {
    // Si es nuevo, agregarlo
    await prisma.matchJugador.create({
      data: {
        partidoId: parseInt(params.id),
        jugadorId: jugadorEntranteId,
        enCancha: true,
        esSuplente: true
      }
    })

    // Crear stats iniciales para el nuevo jugador
    await prisma.statsObjetivas.create({
      data: {
        partidoId: parseInt(params.id),
        jugadorId: jugadorEntranteId
      }
    })
  }

  const partido = await prisma.partido.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      jugadoresEnCancha: {
        include: { jugador: true }
      },
      statsObjetivas: {
        include: { jugador: true }
      }
    }
  })

  return NextResponse.json(partido)
}
