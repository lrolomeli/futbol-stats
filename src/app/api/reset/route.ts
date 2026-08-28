import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const RESET_PIN = '098651'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { pincode } = body

  if (pincode !== RESET_PIN) {
    return NextResponse.json({ error: 'Pincode incorrecto' }, { status: 401 })
  }

  await prisma.$transaction([
    prisma.jugador.deleteMany(),
    prisma.partido.deleteMany(),
  ])

  return NextResponse.json({ success: true })
}
