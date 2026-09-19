import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extraerJugadoresDeFormacion, FORMACION_VACIA } from '@/lib/formacion'
import type { FormacionData } from '@/lib/formacion'

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

  let jugadoresIds: number[] = body.jugadoresIds ?? []

  if (jugadoresIds.length === 0) {
    const formacion = await prisma.formacion.findFirst()
    const datos = (formacion?.datos as FormacionData) ?? FORMACION_VACIA()
    jugadoresIds = extraerJugadoresDeFormacion(datos)

    const jugadoresActivos = await prisma.jugador.findMany({
      where: { activo: true },
      select: { id: true }
    })
    const idsActivos = new Set(jugadoresActivos.map(j => j.id))
    jugadoresIds = jugadoresIds.filter(id => idsActivos.has(id))
  }

  if (jugadoresIds.length === 0) {
    return NextResponse.json(
      { error: 'No hay jugadores en la formación. Asigná jugadores en /admin/formacion antes de crear un partido.' },
      { status: 400 }
    )
  }

  const partido = await prisma.partido.create({
    data: {
      rival: body.rival,
      fecha: new Date(body.fecha),
      cancha: body.cancha,
      jugadoresEnCancha: {
        create: jugadoresIds.map((id: number) => ({
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

  for (const jugadorId of jugadoresIds) {
    await prisma.statsObjetivas.create({
      data: {
        partidoId: partido.id,
        jugadorId: jugadorId
      }
    })
  }

  return NextResponse.json(partido, { status: 201 })
}
