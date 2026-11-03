"""Lee el tipo de cambio oficial de la portada del BCB y lo guarda en data/dolar.csv.

Usa solo la biblioteca estándar de Python (no hay que instalar nada).
Cada fila indica desde y hasta qué fecha rige un valor (por fines de semana
y feriados, un mismo valor puede regir varios días).
"""

import csv
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

URL = os.environ.get("BCB_URL", "https://www.bcb.gob.bo/")
ARCHIVO = Path(__file__).resolve().parent.parent / "data" / "dolar.csv"
ENCABEZADO = ["vigente_desde", "vigente_hasta", "tco"]

MESES = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "SETIEMBRE": 9, "OCTUBRE": 10,
    "NOVIEMBRE": 11, "DICIEMBRE": 12,
}


def descargar(url, intentos=3):
    ultimo_error = None
    for n in range(1, intentos + 1):
        try:
            pedido = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; finance-tracker-lite)"},
            )
            with urllib.request.urlopen(pedido, timeout=60) as respuesta:
                return respuesta.read().decode("utf-8", errors="replace")
        except Exception as error:
            ultimo_error = error
            print(f"Intento {n} fallido: {error}")
            time.sleep(5 * n)
    sys.exit(f"No se pudo descargar {url}: {ultimo_error}")


def convertir_numero(texto):
    """'12,09' -> 12.09  (también acepta '1.234,56' y '12.09')."""
    texto = texto.strip()
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    return float(texto)


def extraer(html):
    tarjeta = re.search(r"<article[^>]*is-tc-oficial.*?</article>", html, re.S)
    if not tarjeta:
        sys.exit("No se encontró la tarjeta 'Tipo de cambio oficial' (¿cambió la página?)")
    tarjeta = tarjeta.group(0)

    numero = re.search(r'class="bcb-tco-num"[^>]*>\s*([\d.,]+)\s*<', tarjeta)
    if not numero:
        sys.exit("No se encontró el valor (bcb-tco-num) dentro de la tarjeta")
    tco = convertir_numero(numero.group(1))
    if not 1 < tco < 100:
        sys.exit(f"Valor fuera de lo esperado: {tco}")

    fecha = re.search(r'<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"[^>]*>(.*?)</time>', tarjeta, re.S)
    if not fecha:
        sys.exit("No se encontró la fecha de vigencia (<time>)")
    fecha_attr, texto = fecha.group(1), " ".join(fecha.group(2).upper().split())

    fechas = []
    for dia, mes, anio in re.findall(r"(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚÑ]+),?\s+(\d{4})", texto):
        if mes in MESES:
            fechas.append(f"{int(anio):04d}-{MESES[mes]:02d}-{int(dia):02d}")

    if fechas:
        desde, hasta = min(fechas), max(fechas)
        if hasta != fecha_attr:
            print(f"Aviso: el texto termina el {hasta} pero datetime dice {fecha_attr}")
    else:
        desde = hasta = fecha_attr
    return desde, hasta, tco


def leer_filas():
    if not ARCHIVO.exists():
        return []
    with ARCHIVO.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def guardar(filas):
    ARCHIVO.parent.mkdir(parents=True, exist_ok=True)
    with ARCHIVO.open("w", newline="", encoding="utf-8") as f:
        escritor = csv.DictWriter(f, fieldnames=ENCABEZADO, lineterminator="\n")
        escritor.writeheader()
        escritor.writerows(filas)


def main():
    desde, hasta, tco = extraer(descargar(URL))
    nueva = {"vigente_desde": desde, "vigente_hasta": hasta, "tco": f"{tco:.2f}"}
    print(f"BCB: {nueva['tco']} Bs/USD, vigente del {desde} al {hasta}")

    filas = leer_filas()
    existente = next((f for f in filas if f["vigente_hasta"] == hasta), None)

    if existente:
        if existente == nueva:
            print("Sin cambios: ese valor ya estaba guardado")
            return
        existente.update(nueva)
        print("Fila existente actualizada")
    else:
        filas.append(nueva)
        print("Fila nueva agregada")

    filas.sort(key=lambda f: f["vigente_hasta"])
    guardar(filas)


if __name__ == "__main__":
    main()