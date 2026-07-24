import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRedisClient } from '@/lib/redis'

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

  // Publicar actualización en Redis para tiempo real
  try {
    const redis = await getRedisClient()
    await redis.publish(`partido:${params.id}:stats`, JSON.stringify({
      jugadorId: body.jugadorId,
      stat,
      valor: nuevoValor
    }))
  } catch (e) {
    console.error('Error publicando en Redis:', e)
  }

  return NextResponse.json(statsActualizadas)
}
