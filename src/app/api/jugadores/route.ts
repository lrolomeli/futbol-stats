import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const jugadores = await prisma.jugador.findMany({
    where: { activo: true },
    orderBy: { numero: 'asc' }
  })
  return NextResponse.json(jugadores)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const jugador = await prisma.jugador.create({
    data: {
      nombre: body.nombre,
      numero: body.numero,
      posicion: body.posicion
    }
  })
  return NextResponse.json(jugador, { status: 201 })
}
