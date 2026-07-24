import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creando jugadores de prueba...')

  const jugadores = [
    { nombre: 'Marco López', numero: 1, posicion: 'Portero' },
    { nombre: 'Diego García', numero: 2, posicion: 'Defensa' },
    { nombre: 'Carlos Ruiz', numero: 3, posicion: 'Defensa' },
    { nombre: 'Andrés Martínez', numero: 4, posicion: 'Mediocampista' },
    { nombre: 'Juan Pérez', numero: 5, posicion: 'Mediocampista' },
    { nombre: 'Luis Hernández', numero: 6, posicion: 'Delantero' },
    { nombre: 'Miguel Sánchez', numero: 7, posicion: 'Delantero' },
    { nombre: 'Pedro Gómez', numero: 8, posicion: 'Mediocampista' },
    { nombre: 'Roberto Díaz', numero: 9, posicion: 'Delantero' },
    { nombre: 'Fernando Torres', numero: 10, posicion: 'Mediocampista' },
    { nombre: 'Sergio Ramos', numero: 11, posicion: 'Defensa' },
    { nombre: 'Antonio Blanco', numero: 12, posicion: 'Portero' },
  ]

  for (const jugador of jugadores) {
    await prisma.jugador.upsert({
      where: { id: jugadores.indexOf(jugador) + 1 },
      update: {},
      create: jugador
    })
  }

  console.log('¡Jugadores creados!')
  console.log('Creando partido de prueba...')

  const partido = await prisma.partido.create({
    data: {
      rival: 'Real Madrid',
      fecha: new Date(),
      cancha: 'Cancha Principal',
      estado: 'pendiente'
    }
  })

  // Agregar los primeros 7 jugadores al partido
  const jugadoresEnPartido = [1, 2, 3, 4, 5, 6, 7]
  for (const jugadorId of jugadoresEnPartido) {
    await prisma.matchJugador.create({
      data: {
        partidoId: partido.id,
        jugadorId,
        enCancha: true,
        esSuplente: false
      }
    })

    await prisma.statsObjetivas.create({
      data: {
        partidoId: partido.id,
        jugadorId
      }
    })
  }

  // Agregar 3 suplentes
  const suplentes = [8, 9, 10]
  for (const jugadorId of suplentes) {
    await prisma.matchJugador.create({
      data: {
        partidoId: partido.id,
        jugadorId,
        enCancha: false,
        esSuplente: true
      }
    })
  }

  console.log(`¡Partido creado! ID: ${partido.id}`)
  console.log(`Token de acceso: ${partido.tokenAcceso}`)
  console.log('Link de evaluación para jueces:', `/evaluacion/${partido.id}/${partido.tokenAcceso}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
