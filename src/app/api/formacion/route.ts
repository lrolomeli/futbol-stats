import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  CLAVE_DEFENSIVA,
  FORMACION_VACIA,
  esClaveFormacion,
  posicionesDe
} from '@/lib/formacion'
import type { ClaveFormacion, DatosFormacion, FormacionData } from '@/lib/formacion'

export const dynamic = 'force-dynamic'

const PIN_EDICION = '098651'

export async function GET(request: NextRequest) {
  const pedida = request.nextUrl.searchParams.get('clave')
  const clave = esClaveFormacion(pedida) ? pedida : CLAVE_DEFENSIVA

  const formacion = await prisma.formacion.findUnique({ where: { clave } })
  return NextResponse.json({
    clave,
    datos: formacion ? (formacion.datos as FormacionData) : FORMACION_VACIA(clave),
    updatedAt: formacion?.updatedAt ?? null
  })
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (body?.pincode !== PIN_EDICION) {
    return NextResponse.json({ error: 'Pincode incorrecto' }, { status: 401 })
  }

  const clave = esClaveFormacion(body?.clave) ? body.clave : CLAVE_DEFENSIVA
  const datos: DatosFormacion = (body?.datos ?? FORMACION_VACIA(clave)) as DatosFormacion

  const validacion = await validarDatos(datos, clave)
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

  await prisma.formacion.upsert({
    where: { clave },
    create: { clave, datos },
    update: { datos }
  })

  return NextResponse.json({ success: true, clave })
}

async function validarDatos(datos: DatosFormacion, clave: ClaveFormacion) {
  if (!datos || typeof datos !== 'object') {
    return { ok: false, error: 'Datos inválidos' }
  }

  const posicionesPermitidas = new Set<string>(posicionesDe(clave).map(p => p.key))
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
      if (ids.length > 1) {
        return { ok: false, error: `Solo un jugador por celda (${posicion} minuto ${minuto})` }
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
