// Página de inicio (index.html)

import { cargarGastos, cargarPeriodos } from "./datos.js";
import {
  obtenerUltimos, obtenerPeriodoActual, gastosDelPeriodo,
  sumarMontos, formatearFechaCompleta, mostrarError
} from "./utilidades.js";
import { mostrarLista } from "./lista.js";
import { mostrarDona } from "./dona.js";
import { iniciarDolar } from "./dolar.js";

function mostrarResumen(periodo, gastosPeriodo) {
  document.getElementById("gasto-total").textContent = Math.round(sumarMontos(gastosPeriodo));
  document.getElementById("ingreso").textContent = periodo.ingreso;
  document.getElementById("presupuesto").textContent = periodo.presupuesto;
  document.getElementById("desde").textContent = `Desde ${formatearFechaCompleta(periodo.inicio)}`;
}

async function iniciar() {
  const [gastos, periodos] = await Promise.all([cargarGastos(), cargarPeriodos()]);

  mostrarLista(obtenerUltimos(gastos, 10), document.getElementById("lista-filas"));

  const periodo = obtenerPeriodoActual(periodos);
  if (periodo) {
    const gastosPeriodo = gastosDelPeriodo(gastos, periodo);
    mostrarResumen(periodo, gastosPeriodo);
    mostrarDona(gastosPeriodo, periodo.presupuesto);
  }
}

iniciar().catch(mostrarError);
iniciarDolar().catch(mostrarError); // independiente: si falla, el resto de la página sigue