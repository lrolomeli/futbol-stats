import { posicionesDe } from '@/lib/formacion'
import type { ClaveFormacion, ClavePosicionDe, FormacionData } from '@/lib/formacion'

export type TiempoImagen = 1 | 2

interface Caja {
  x: number
  y: number
  w: number
  h: number
}

interface Punto {
  x: number
  y: number
}

interface ParCajas {
  superior: Punto
  inferior: Punto
}

const ANCHO_CAJA = 17
const ALTO_CAJA = 4.5
const ANCHO_CAJA_TIEMPO = 26
const ALTO_CAJA_TIEMPO = 10

const CAJAS_DEFENSIVA = {
  delantero_izquierdo: {
    superior: { x: 26.6, y: 22.2 },
    inferior: { x: 26.6, y: 29.2 }
  },
  delantero_derecho: {
    superior: { x: 69.4, y: 22.2 },
    inferior: { x: 69.4, y: 29.2 }
  },
  centrocampista: {
    superior: { x: 49.0, y: 40.5 },
    inferior: { x: 49.0, y: 47.7 }
  },
  defensa_izquierdo: {
    superior: { x: 21.6, y: 60.1 },
    inferior: { x: 21.6, y: 67.2 }
  },
  defensa_central: {
    superior: { x: 49.0, y: 67.2 },
    inferior: { x: 49.0, y: 74.4 }
  },
  defensa_derecho: {
    superior: { x: 74.6, y: 60.1 },
    inferior: { x: 74.6, y: 67.2 }
  },
  portero: {
    superior: { x: 49.0, y: 90.5 },
    inferior: { x: 49.0, y: 97.5 }
  }
} satisfies Record<ClavePosicionDe<'defensiva'>, ParCajas>

const CAJAS_OFENSIVA = {
  delantero_punta: {
    superior: { x: 50.0, y: 28.5 },
    inferior: { x: 50.0, y: 36.3 }
  },
  lateral_izquierdo: {
    superior: { x: 20.0, y: 45.0 },
    inferior: { x: 20.0, y: 52.2 }
  },
  centrocampista: {
    superior: { x: 50.0, y: 56.8 },
    inferior: { x: 50.0, y: 64.0 }
  },
  lateral_derecho: {
    superior: { x: 80.0, y: 45.0 },
    inferior: { x: 80.0, y: 52.2 }
  },
  defensa_izquierdo: {
    superior: { x: 26.6, y: 72.6 },
    inferior: { x: 26.6, y: 79.8 }
  },
  defensa_derecho: {
    superior: { x: 73.4, y: 72.6 },
    inferior: { x: 73.4, y: 79.8 }
  },
  portero: {
    superior: { x: 50.0, y: 89.5 },
    inferior: { x: 50.0, y: 96.5 }
  }
} satisfies Record<ClavePosicionDe<'ofensiva'>, ParCajas>

const CAJAS_POR_CLAVE: Record<ClaveFormacion, Record<string, ParCajas>> = {
  defensiva: CAJAS_DEFENSIVA,
  ofensiva: CAJAS_OFENSIVA
}

const PLANTILLA_POR_CLAVE: Record<ClaveFormacion, string> = {
  defensiva: '/formacion-defensiva.png',
  ofensiva: '/formacion-ofensiva.png'
}

// Solo el numero del tiempo (1 o 2), en el punto "editable" del mapa de cada
// imagen. El punto "etiqueta" es la palabra fija que ya viene impresa, asi que
// no se dibuja aca.
const CAJA_TIEMPO_POR_CLAVE: Record<ClaveFormacion, Punto> = {
  defensiva: { x: 48.0, y: 13.0 },
  ofensiva: { x: 82.5, y: 11.0 }
}

const FUENTE_NORMAL_PORCENTAJE = 2.2
const FUENTE_TITULO_PORCENTAJE = 4.1
const FUENTE_MINIMA_PORCENTAJE = 1.4

function dibujarTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  caja: Caja,
  tamanoBase: number,
  tamanoMinimo: number
): void {
  const contenido = String(texto).trim()
  if (!contenido) return

  ctx.save()
  ctx.fillStyle = '#000000'
  ctx.font = `bold ${tamanoBase}px Arial, Helvetica, sans-serif`
  let medidas = ctx.measureText(contenido)
  const margen = 2

  if (medidas.width > caja.w - margen) {
    let tamano = tamanoBase
    while (tamano > tamanoMinimo && medidas.width > caja.w - margen) {
      tamano -= 0.5
      ctx.font = `bold ${tamano}px Arial, Helvetica, sans-serif`
      medidas = ctx.measureText(contenido)
    }
  }

  const tamanoActual = parseInt(ctx.font.match(/(\d+)px/)?.[1] ?? String(tamanoBase), 10)
  const ascent = medidas.actualBoundingBoxAscent ?? tamanoActual
  const descent = medidas.actualBoundingBoxDescent ?? tamanoActual * 0.25

  const posX = caja.x + (caja.w - medidas.width) / 2
  const posY = caja.y + caja.h / 2 + (ascent - descent) / 2

  ctx.textBaseline = 'alphabetic'
  ctx.fillText(contenido, posX, posY)
  ctx.restore()
}

function cargarPlantilla(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la plantilla'))
    img.src = url
  })
}

function aPixels(
  punto: Punto,
  ancho: number,
  alto: number,
  naturalAncho: number,
  naturalAlto: number
): Caja {
  const w = (ancho / 100) * naturalAncho
  const h = (alto / 100) * naturalAlto
  return {
    x: ((punto.x - ancho / 2) / 100) * naturalAncho,
    y: ((punto.y - alto / 2) / 100) * naturalAlto,
    w,
    h
  }
}

export async function descargarImagenFormacion(
  tiempo: TiempoImagen,
  datos: FormacionData,
  jugadorPorId: ReadonlyMap<number, { nombre: string }>,
  clave: ClaveFormacion,
  prefijo: string
): Promise<void> {
  const plantilla = await cargarPlantilla(PLANTILLA_POR_CLAVE[clave])
  const naturalAncho = plantilla.naturalWidth
  const naturalAlto = plantilla.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = naturalAncho
  canvas.height = naturalAlto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no soporta la generación de imagen')
  ctx.drawImage(plantilla, 0, 0)

  const tamanoNormal = (naturalAlto / 100) * FUENTE_NORMAL_PORCENTAJE
  const tamanoTitulo = (naturalAlto / 100) * FUENTE_TITULO_PORCENTAJE
  const tamanoMinimo = (naturalAlto / 100) * FUENTE_MINIMA_PORCENTAJE

  const cajaTiempo = aPixels(
    CAJA_TIEMPO_POR_CLAVE[clave],
    ANCHO_CAJA_TIEMPO,
    ALTO_CAJA_TIEMPO,
    naturalAncho,
    naturalAlto
  )
  dibujarTexto(ctx, String(tiempo), cajaTiempo, tamanoTitulo, tamanoMinimo)

  const columnaInicio = tiempo === 1 ? '0' : '20'
  const columnaCambios = tiempo === 1 ? '10' : '30'
  const cajas = CAJAS_POR_CLAVE[clave]

  for (const { key } of posicionesDe(clave)) {
    const par = cajas[key]
    const inicio = jugadorPorId.get(datos[key]?.[columnaInicio]?.[0])
    const cambio = jugadorPorId.get(datos[key]?.[columnaCambios]?.[0])
    if (inicio) {
      dibujarTexto(
        ctx,
        inicio.nombre,
        aPixels(par.superior, ANCHO_CAJA, ALTO_CAJA, naturalAncho, naturalAlto),
        tamanoNormal,
        tamanoMinimo
      )
    }
    if (cambio) {
      dibujarTexto(
        ctx,
        cambio.nombre,
        aPixels(par.inferior, ANCHO_CAJA, ALTO_CAJA, naturalAncho, naturalAlto),
        tamanoNormal,
        tamanoMinimo
      )
    }
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95))
  if (!blob) throw new Error('No se pudo generar el archivo de imagen')

  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${prefijo}-${tiempo === 1 ? '1er-tiempo' : '2do-tiempo'}.jpg`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
