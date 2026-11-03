// Gráfico de barras: gasto total por periodo (página de informes)

import { formatearFecha, hoyISO, gastosDelPeriodo, sumarMontos } from "./utilidades.js";

const ALTO_BARRAS = 160;

export function iniciarBarras(gastos, periodos) {
  const selCategoria = document.getElementById("informe-categoria");
  const contenedor = document.getElementById("grafico-barras");

  [...new Set(gastos.map(g => g.categoria))]
    .sort((a, b) => a.localeCompare(b))
    .forEach(c => selCategoria.add(new Option(c, c)));

  const ordenados = periodos
    .filter(p => p.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio)) // del más antiguo al más nuevo
    .map(p => ({ ...p, fin: p.fin || hoyISO() }));

  function dibujar() {
    const categoria = selCategoria.value;
    const base = categoria ? gastos.filter(g => g.categoria === categoria) : gastos;

    const datos = ordenados.map(p => ({
      etiqueta: formatearFecha(p.inicio),
      total: sumarMontos(gastosDelPeriodo(base, p))
    }));
    const maximo = Math.max(...datos.map(d => d.total), 1);

    contenedor.innerHTML = datos.map(d => `
      <div class="barra-col">
        <span class="barra-valor">${Math.round(d.total)}</span>
        <div class="barra" style="height:${Math.round((d.total / maximo) * ALTO_BARRAS)}px"></div>
        <span class="barra-etiqueta">${d.etiqueta}</span>
      </div>
    `).join("");
  }

  selCategoria.addEventListener("change", dibujar);
  dibujar();
}
