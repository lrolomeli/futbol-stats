import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { FORMACION_VACIA } from '@/lib/formacion'
import type { DatosFormacion, FormacionData } from '@/lib/formacion'

export const dynamic = 'force-dynamic'

export async function GET() {
  const formacion = await prisma.formacion.findFirst()
  return NextResponse.json({
    datos: formacion ? (formacion.datos as FormacionData) : FORMACION_VACIA(),
    updatedAt: formacion?.updatedAt ?? null
  })
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const datos: DatosFormacion = (body?.datos ?? FORMACION_VACIA()) as DatosFormacion

  const validacion = await validarDatos(datos)
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 })
  }

  const jugadoresActivos = await prisma.jugador.findMany({
    where: { activo: true },
    select: { id: true }
  })
  const idsValidos = new Set(jugadoresActivos.map(j => j.id))

  for (const posicion in datos) {
    for (const minuto in datos[posicion]) {
      datos[posicion][minuto] = [...new Set(datos[posicion][minuto])]
        .filter(id => idsValidos.has(id))
    }
  }

  const existente = await prisma.formacion.findFirst()
  if (existente) {
    await prisma.formacion.update({
      where: { id: existente.id },
      data: { datos }
    })
  } else {
    await prisma.formacion.create({ data: { datos } })
  }

  return NextResponse.json({ success: true })
}

async function validarDatos(datos: DatosFormacion) {
  if (!datos || typeof datos !== 'object') {
    return { ok: false, error: 'Datos inválidos' }
  }

  const posicionesPermitidas = new Set([
    'portero',
    'defensa_izquierdo',
    'defensa_derecho',
    'lateral_izquierdo',
    'lateral_derecho',
    'centrocampista',
    'delantero'
  ])
  const minutosPermitidos = new Set(['0', '10', '20', '30'])

  const usadosPorMinuto: Record<string, Set<number>> = {}

  for (const posicion in datos) {
    if (!posicionesPermitidas.has(posicion)) {
      return { ok: false, error: `Posición desconocida: ${posicion}` }
    }
    const celdas = datos[posicion]
    if (!celdas || typeof celdas !== 'object') {
      return { ok: false, error: `Celda inválida en ${posicion}` }
    }
    for (const minuto in celdas) {
      if (!minutosPermitidos.has(minuto)) {
        return { ok: false, error: `Minuto desconocido: ${minuto}` }
      }
      const ids = celdas[minuto]
      if (!Array.isArray(ids) || ids.some(id => !Number.isInteger(id))) {
        return { ok: false, error: `Lista inválida en ${posicion} minuto ${minuto}` }
      }
      usadosPorMinuto[minuto] = usadosPorMinuto[minuto] ?? new Set()
      for (const id of ids) {
        if (usadosPorMinuto[minuto].has(id)) {
          return { ok: false, error: `El jugador ${id} está repetido en el minuto ${minuto}` }
        }
        usadosPorMinuto[minuto].add(id)
      }
    }
  }

  return { ok: true }
}