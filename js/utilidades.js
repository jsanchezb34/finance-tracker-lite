// Funciones de apoyo: fechas, texto y cálculos

/* ---------- Fechas ---------- */

export function hoyISO() {
  const h = new Date();
  const mes = String(h.getMonth() + 1).padStart(2, "0");
  const dia = String(h.getDate()).padStart(2, "0");
  return `${h.getFullYear()}-${mes}-${dia}`;
}

export function formatearFecha(fecha) {
  const [year, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

export function formatearFechaCompleta(fecha) {
  const [year, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${year}`;
}

export function etiquetaPeriodo(p) {
  const fin = p.fin ? formatearFechaCompleta(p.fin) : "hoy";
  return `${formatearFechaCompleta(p.inicio)} – ${fin}`;
}

/* ---------- Texto ---------- */

export function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function escapar(texto) {
  return String(texto).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* ---------- Cálculos ---------- */

export function sumarMontos(gastos) {
  return gastos.reduce((s, g) => s + g.monto, 0);
}

export function obtenerUltimos(gastos, cantidad) {
  return gastos.slice(-cantidad).reverse(); // reverse() deja el más reciente primero
}

export function obtenerPeriodoActual(periodos) {
  const ordenados = periodos
    .filter(p => p.inicio)
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const periodo = ordenados[0];
  if (!periodo) return null;
  return { ...periodo, fin: periodo.fin || hoyISO() };
}

export function gastosDelPeriodo(gastos, periodo) {
  return gastos.filter(g => g.fecha >= periodo.inicio && g.fecha <= periodo.fin);
}

export function totalesPorCategoria(gastos) {
  const totales = {};
  gastos.forEach(g => {
    totales[g.categoria] = (totales[g.categoria] || 0) + g.monto;
  });
  return Object.entries(totales).sort((a, b) => b[1] - a[1]);
}

export function agruparTop(totales, cantidad) {
  const top = totales.slice(0, cantidad);
  const resto = totales.slice(cantidad).reduce((suma, [, total]) => suma + total, 0);
  if (resto > 0) top.push(["Resto", resto]);
  return top;
}

/* ---------- Errores (útil en el móvil, donde no hay consola) ---------- */

export function mostrarError(err) {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p style="color:red;padding:1rem">Error: ${escapar(err.message)}</p>`
  );
}
