import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { partidoId: string; juezToken: string } }
) {
  const partido = await prisma.partido.findUnique({
    where: { id: parseInt(params.partidoId) },
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

  const todosLosJugadores = partido.jugadoresEnCancha.map(mc => mc.jugador)

  // Todas las asignaciones de este partido (todos los jueces)
  const todasLasAsignaciones = await prisma.evaluacionJuez.findMany({
    where: {
      partidoId: parseInt(params.partidoId),
      completado: false
    }
  })

  // Jugadores asignados a ESTE juez
  const asignacionesEsteJuez = todasLasAsignaciones.filter(a => a.juezToken === params.juezToken)
  const jugadoresAsignados = asignacionesEsteJuez.map(a => {
    const jugador = todosLosJugadores.find(j => j.id === a.jugadorId)!
    return { ...a, jugador }
  })

  // IDs de jugadores asignados a OTROS jueces
  const idsAsignadosOtros = todasLasAsignaciones
    .filter(a => a.juezToken !== params.juezToken)
    .map(a => a.jugadorId)

  // Jugadores disponibles (no asignados a nadie)
  const jugadoresDisponibles = todosLosJugadores.filter(j => !idsAsignadosOtros.includes(j.id) && !asignacionesEsteJuez.some(a => a.jugadorId === j.id))

  // Evaluaciones completadas de este juez
  const evaluaciones = await prisma.evaluacionJuez.findMany({
    where: {
      partidoId: parseInt(params.partidoId),
      juezToken: params.juezToken,
      completado: true
    }
  })

  const tieneAsignaciones = asignacionesEsteJuez.length > 0

  return NextResponse.json({
    partido,
    jugadores: todosLosJugadores,
    jugadoresAsignados,
    jugadoresDisponibles,
    tieneAsignaciones,
    evaluaciones
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { partidoId: string; juezToken: string } }
) {
  const body = await request.json()

  // Acción: asignar jugadores
  if (body.action === 'asignar') {
    const { jugadorIds } = body

    // Verificar que no estén asignados a otros jueces
    const existentes = await prisma.evaluacionJuez.findMany({
      where: {
        partidoId: parseInt(params.partidoId),
        jugadorId: { in: jugadorIds },
        completado: false
      }
    })

    const asignadosAOtros = existentes.filter(e => e.juezToken !== params.juezToken)
    if (asignadosAOtros.length > 0) {
      return NextResponse.json({ error: 'Algunos jugadores ya están asignados a otro juez' }, { status: 409 })
    }

    // Crear registros de asignación
    for (const jugadorId of jugadorIds) {
      await prisma.evaluacionJuez.upsert({
        where: {
          partidoId_jugadorId_juezToken: {
            partidoId: parseInt(params.partidoId),
            jugadorId,
            juezToken: params.juezToken
          }
        },
        update: {},
        create: {
          partidoId: parseInt(params.partidoId),
          jugadorId,
          juezToken: params.juezToken,
          puntuacion: 0,
          completado: false
        }
      })
    }

    return NextResponse.json({ mensaje: 'Jugadores asignados correctamente' })
  }

  // Acción: guardar evaluación subjetiva
  if (body.action === 'guardar') {
    for (const ev of body.evaluaciones) {
      await prisma.evaluacionJuez.update({
        where: {
          partidoId_jugadorId_juezToken: {
            partidoId: parseInt(params.partidoId),
            jugadorId: ev.jugadorId,
            juezToken: params.juezToken
          }
        },
        data: {
          puntuacion: ev.puntuacion,
          completado: true
        }
      })
    }

    return NextResponse.json({ mensaje: 'Evaluación guardada correctamente' })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
