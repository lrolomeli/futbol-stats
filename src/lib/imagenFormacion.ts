import { POSICIONES } from '@/lib/formacion'
import type { FormacionData } from '@/lib/formacion'

export type TiempoImagen = 1 | 2

interface Caja {
  x: number
  y: number
  w: number
  h: number
}

const CAJA_MITAD: Caja = { x: 7, y: 24, w: 120, h: 61 }

const CAJAS_INICIALES: Record<string, Caja> = {
  portero: { x: 148, y: 514, w: 78, h: 21 },
  defensa_izquierdo: { x: 31, y: 424, w: 78, h: 21 },
  defensa_derecho: { x: 282, y: 424, w: 78, h: 21 },
  lateral_izquierdo: { x: 10, y: 264, w: 78, h: 21 },
  lateral_derecho: { x: 298, y: 264, w: 78, h: 21 },
  centrocampista: { x: 128, y: 314, w: 82, h: 21 },
  delantero: { x: 150, y: 124, w: 78, h: 21 },
}

const CAJAS_CAMBIOS: Record<string, Caja> = {
  portero: { x: 228, y: 514, w: 82, h: 21 },
  defensa_izquierdo: { x: 111, y: 424, w: 82, h: 21 },
  defensa_derecho: { x: 362, y: 424, w: 82, h: 21 },
  lateral_izquierdo: { x: 90, y: 264, w: 82, h: 21 },
  lateral_derecho: { x: 378, y: 264, w: 82, h: 21 },
  centrocampista: { x: 243, y: 314, w: 85, h: 22 },
  delantero: { x: 230, y: 124, w: 82, h: 21 },
}

const FUENTE_NORMAL = 'bold 13px Arial, Helvetica, sans-serif'
const FUENTE_TITULO = 'bold 24px Arial, Helvetica, sans-serif'

function dibujarTexto(ctx: CanvasRenderingContext2D, texto: string, caja: Caja, fuente: string): void {
  const contenido = String(texto).trim()
  if (!contenido) return

  ctx.save()
  ctx.fillStyle = '#000000'
  ctx.font = fuente
  let medidas = ctx.measureText(contenido)
  const margen = 2

  if (medidas.width > caja.w - margen) {
    let tamano = 13
    while (tamano > 8 && medidas.width > caja.w - margen) {
      tamano -= 0.5
      ctx.font = `bold ${tamano}px Arial, Helvetica, sans-serif`
      medidas = ctx.measureText(contenido)
    }
  }

  const tamanoActual = parseInt(ctx.font.match(/(\d+)px/)?.[1] ?? '13', 10)
  const ascent = medidas.actualBoundingBoxAscent ?? tamanoActual
  const descent = medidas.actualBoundingBoxDescent ?? tamanoActual * 0.25

  const posX = caja.x + (caja.w - medidas.width) / 2
  const posY = caja.y + caja.h / 2 + (ascent - descent) / 2

  ctx.textBaseline = 'alphabetic'
  ctx.fillText(contenido, posX, posY)
  ctx.restore()
}

function cargarPlantilla(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la plantilla'))
    img.src = '/plantilla.jpg'
  })
}

export async function descargarImagenFormacion(
  tiempo: TiempoImagen,
  datos: FormacionData,
  jugadorPorId: ReadonlyMap<number, { nombre: string }>
): Promise<void> {
  const plantilla = await cargarPlantilla()

  const canvas = document.createElement('canvas')
  canvas.width = plantilla.naturalWidth
  canvas.height = plantilla.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no soporta la generación de imagen')
  ctx.drawImage(plantilla, 0, 0)

  dibujarTexto(ctx, String(tiempo), CAJA_MITAD, FUENTE_TITULO)

  const columnaInicio = tiempo === 1 ? '0' : '20'
  const columnaCambios = tiempo === 1 ? '10' : '30'

  for (const { key } of POSICIONES) {
    const inicio = jugadorPorId.get(datos[key][columnaInicio][0])
    const cambio = jugadorPorId.get(datos[key][columnaCambios][0])
    if (inicio) dibujarTexto(ctx, inicio.nombre, CAJAS_INICIALES[key], FUENTE_NORMAL)
    if (cambio) dibujarTexto(ctx, cambio.nombre, CAJAS_CAMBIOS[key], FUENTE_NORMAL)
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95))
  if (!blob) throw new Error('No se pudo generar el archivo de imagen')

  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = tiempo === 1 ? 'formacion-1er-tiempo.jpg' : 'formacion-2do-tiempo.jpg'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}