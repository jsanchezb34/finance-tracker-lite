// Página de gastos (gastos.html)

import { cargarGastos, cargarPeriodos } from "./datos.js";
import { mostrarError } from "./utilidades.js";
import { iniciarFiltros } from "./filtros.js";

async function iniciar() {
  const [gastos, periodos] = await Promise.all([cargarGastos(), cargarPeriodos()]);
  iniciarFiltros(gastos, periodos, document.getElementById("lista-filas"));
}

iniciar().catch(mostrarError);
