import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}))
  const { action, jugadorId } = body
  const partidoId = parseInt(params.id)

  if (!jugadorId) {
    return NextResponse.json({ error: 'jugadorId requerido' }, { status: 400 })
  }

  const partido = await prisma.partido.findUnique({ where: { id: partidoId } })
  if (!partido) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  if (partido.estado !== 'pendiente') {
    return NextResponse.json({ error: 'El partido ya comenzó' }, { status: 403 })
  }

  if (action === 'agregar') {
    await prisma.$transaction([
      prisma.matchJugador.upsert({
        where: { partidoId_jugadorId: { partidoId, jugadorId } },
        update: { enCancha: true, esSuplente: false },
        create: { partidoId, jugadorId, enCancha: true, esSuplente: false }
      }),
      prisma.statsObjetivas.upsert({
        where: { partidoId_jugadorId: { partidoId, jugadorId } },
        update: {},
        create: { partidoId, jugadorId }
      })
    ])
  } else if (action === 'quitar') {
    await prisma.$transaction([
      prisma.statsObjetivas.deleteMany({ where: { partidoId, jugadorId } }),
      prisma.matchJugador.deleteMany({ where: { partidoId, jugadorId } })
    ])
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const partidoActualizado = await prisma.partido.findUnique({
    where: { id: partidoId },
    include: {
      jugadoresEnCancha: { include: { jugador: true } },
      statsObjetivas: { include: { jugador: true } }
    }
  })

  return NextResponse.json(partidoActualizado)
}
