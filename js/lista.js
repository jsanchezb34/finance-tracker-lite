// Dibuja la lista de gastos

import { formatearFecha } from "./utilidades.js";

export function mostrarLista(gastos, contenedor, conDetalle = false) {
  contenedor.innerHTML = gastos.map(g => `
    <div class="fila${conDetalle ? " con-detalle" : ""}">
      <span>${formatearFecha(g.fecha)}</span>
      <span>${g.categoria}</span>
      ${conDetalle ? `<span>${g.detalle}</span>` : ""}
      <span>${g.monto.toFixed(2)}</span>
    </div>
  `).join("");
}
