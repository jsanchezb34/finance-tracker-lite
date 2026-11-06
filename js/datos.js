// Carga y lectura de los archivos CSV

export async function cargarTexto(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${ruta} (${respuesta.status})`);
  }
  return respuesta.text();
}

function lineasDeDatos(texto) {
  return texto
    .trim()
    .split(/\r?\n/)
    .slice(1) // slice(1) quita el encabezado
    .filter(linea => linea.trim() !== ""); // ignora líneas en blanco
}

export function parsearCSV(texto) {
  return lineasDeDatos(texto).map(linea => {
    const [fecha, categoria, detalle, monto] = linea.split(",");
    return { fecha, categoria, detalle, monto: parseFloat(monto) };
  });
}

export function parsearPeriodos(texto) {
  return lineasDeDatos(texto).map(linea => {
    const [id, inicio, fin, ingreso, presupuesto] = linea.split(",");
    return {
      id,
      inicio,
      fin,
      ingreso: parseFloat(ingreso),
      presupuesto: parseFloat(presupuesto)
    };
  });
}

export function parsearDolar(texto) {
  return lineasDeDatos(texto).map(linea => {
    const [desde, hasta, tco, fuente] = linea.split(",");
    return { desde, hasta, tco: parseFloat(tco), fuente: (fuente || "bcb").trim() };
  });
}

export async function cargarGastos() {
  return parsearCSV(await cargarTexto("data/gastos.csv"));
}

export async function cargarPeriodos() {
  return parsearPeriodos(await cargarTexto("data/periodos.csv"));
}

export async function cargarDolar() {
  return parsearDolar(await cargarTexto("data/dolar.csv"));
}