import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const PARTIDOS_PIN = '098651'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  if (!partido) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  return NextResponse.json(partido)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const partido = await prisma.partido.update({
    where: { id: parseInt(params.id) },
    data: { estado: body.estado }
  })
  return NextResponse.json(partido)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null)
  if (body?.pincode !== PARTIDOS_PIN) {
    return NextResponse.json({ error: 'Pincode incorrecto' }, { status: 401 })
  }

  await prisma.partido.delete({ where: { id: parseInt(params.id) } })
  return NextResponse.json({ mensaje: 'Partido eliminado' })
}
