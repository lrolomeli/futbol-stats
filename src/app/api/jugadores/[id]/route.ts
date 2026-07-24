import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jugador = await prisma.jugador.findUnique({
    where: { id: parseInt(params.id) }
  })
  if (!jugador) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  return NextResponse.json(jugador)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const jugador = await prisma.jugador.update({
    where: { id: parseInt(params.id) },
    data: {
      nombre: body.nombre,
      numero: body.numero,
      posicion: body.posicion,
      activo: body.activo
    }
  })
  return NextResponse.json(jugador)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.jugador.update({
    where: { id: parseInt(params.id) },
    data: { activo: false }
  })
  return NextResponse.json({ mensaje: 'Jugador eliminado' })
}
