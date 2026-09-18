import os
from PIL import Image, ImageDraw, ImageFont

# 1. Configuración de preguntas reordenadas y sus coordenadas en la plantilla
PREGUNTAS_INICIALES = [
    {"campo": "portero_init", "pregunta": "Portero que INICIA", "caja": (148, 514, 78, 21)},
    {"campo": "def_izq_init", "pregunta": "Defensa Izquierdo que INICIA", "caja": (31, 424, 78, 21)},
    {"campo": "def_der_init", "pregunta": "Defensa Derecho que INICIA", "caja": (282, 424, 78, 21)},
    {"campo": "lat_izq_init", "pregunta": "Lateral Izquierdo que INICIA", "caja": (10, 264, 78, 21)},
    {"campo": "lat_der_init", "pregunta": "Lateral Derecho que INICIA", "caja": (298, 264, 78, 21)},
    {"campo": "medio_init",   "pregunta": "Mediocampo que INICIA", "caja": (128, 314, 82, 21)},
    {"campo": "del_init",     "pregunta": "Delantero que INICIA", "caja": (150, 124, 78, 21)},
]

PREGUNTAS_CAMBIOS = [
    {"campo": "portero_sub", "pregunta": "CAMBIO Portero (Entra)", "caja": (228, 514, 82, 21)},
    {"campo": "def_izq_sub", "pregunta": "CAMBIO Defensa Izquierdo (Entra)", "caja": (111, 424, 82, 21)},
    {"campo": "def_der_sub", "pregunta": "CAMBIO Defensa Derecho (Entra)", "caja": (362, 424, 82, 21)},
    {"campo": "lat_izq_sub", "pregunta": "CAMBIO Lateral Izquierdo (Entra)", "caja": (90, 264, 82, 21)},
    {"campo": "lat_der_sub", "pregunta": "CAMBIO Lateral Derecho (Entra)", "caja": (378, 264, 82, 21)},
    {"campo": "medio_sub",   "pregunta": "CAMBIO Mediocampo (Entra)", "caja": (243, 314, 85, 22)},
    {"campo": "del_sub",     "pregunta": "CAMBIO Delantero (Entra)", "caja": (230, 124, 82, 21)},
]

CAJA_MITAD = (7, 24, 120, 61)


def dibujar_texto_centrado_negrita(draw, texto, caja, font, color=(0, 0, 0)):
    """Centra y escribe el texto en negrita dentro del recuadro (x, y, w, h)."""
    if not texto or not str(texto).strip():
        return

    x, y, w, h = caja
    bbox = draw.textbbox((0, 0), str(texto), font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    pos_x = x + (w - text_w) / 2
    pos_y = y + (h - text_h) / 2 - bbox[1]

    draw.text((pos_x, pos_y), str(texto), fill=color, font=font)


def ejecutar_interactivo(imagen_base="plantilla.jpg"):
    if not os.path.exists(imagen_base):
        print(f"Error: No se encontró la imagen '{imagen_base}'.")
        return

    print("\n==========================================")
    print("      CONFIGURACIÓN DE ALINEACIÓN")
    print("==========================================")
    print("(Presiona ENTER directamente para omitir algún campo)\n")

    # 1. Nombre del archivo de salida
    nombre_salida = input("1. Nombre del archivo de salida (ej. tiempo1.jpg): ").strip()
    if not nombre_salida:
        nombre_salida = "resultado.jpg"
    if not (nombre_salida.endswith(".jpg") or nombre_salida.endswith(".png")):
        nombre_salida += ".jpg"

    # 2. Mitad del juego
    mitad = ""
    while True:
        mitad = input("2. Mitad del juego ([1] Primera Mitad / [2] Segunda Mitad): ").strip()
        if mitad in ["1", "2", ""]:
            break
        print("Opción inválida. Ingresa 1 o 2.")

    # 3. Alineación Inicial
    print("\n--- ALINEACIÓN QUE INICIA ---")
    datos_render = []

    if mitad:
        datos_render.append((mitad, CAJA_MITAD, True))

    for item in PREGUNTAS_INICIALES:
        val = input(f"- {item['pregunta']}: ").strip()
        if val:
            datos_render.append((val, item["caja"], False))

    # 4. Cambios / Sustituciones
    print("\n--- CAMBIOS / SUSTITUCIONES ---")
    for item in PREGUNTAS_CAMBIOS:
        val = input(f"- {item['pregunta']}: ").strip()
        if val:
            datos_render.append((val, item["caja"], False))

    # 5. Cargar Fuentes en NEGRITA (arialbd.ttf es Arial Bold)
    try:
        fuente_bold_normal = ImageFont.truetype("arialbd.ttf", size=13)
        fuente_bold_titulo = ImageFont.truetype("arialbd.ttf", size=24)
    except IOError:
        # Si no localiza la fuente TTF en Linux, carga la predeterminada
        fuente_bold_normal = ImageFont.load_default()
        fuente_bold_titulo = ImageFont.load_default()

    # 6. Generar Imagen
    with Image.open(imagen_base) as img:
        draw = ImageDraw.Draw(img)

        for texto, caja, es_titulo in datos_render:
            fuente = fuente_bold_titulo if es_titulo else fuente_bold_normal
            dibujar_texto_centrado_negrita(draw, texto, caja, fuente)

        img.save(nombre_salida, quality=95)
        print(f"\n¡Imagen generada con texto en NEGRITA exitosamente!: {nombre_salida}\n")


if __name__ == "__main__":
    ejecutar_interactivo("plantilla.jpg")