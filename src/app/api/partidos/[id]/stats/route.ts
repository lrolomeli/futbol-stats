import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { emitEstadisticas } from '@/lib/socket'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const { stat, incremento } = body

  const statActual = await prisma.statsObjetivas.findFirst({
    where: {
      partidoId: parseInt(params.id),
      jugadorId: body.jugadorId
    }
  })

  if (!statActual) {
    return NextResponse.json({ error: 'Stats no encontradas' }, { status: 404 })
  }

  const nuevoValor = Math.max(0, (statActual as any)[stat] + incremento)

  const statsActualizadas = await prisma.statsObjetivas.update({
    where: { id: statActual.id },
    data: { [stat]: nuevoValor }
  })

  // Emitir actualización por websocket para tiempo real
  emitEstadisticas(parseInt(params.id), {
    jugadorId: body.jugadorId,
    stat,
    valor: nuevoValor
  })

  return NextResponse.json(statsActualizadas)
}
