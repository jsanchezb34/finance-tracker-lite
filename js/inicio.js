// Página de inicio (index.html)

import { cargarGastos, cargarPeriodos } from "./datos.js";
import {
  obtenerUltimos, obtenerPeriodoActual, gastosDelPeriodo,
  sumarMontos, formatearFechaCompleta, esDiezmo, mostrarError
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
  if (!periodo) return;

  const gastosPeriodo = gastosDelPeriodo(gastos, periodo);
  const casilla = document.getElementById("incluir-diezmo");

  // Por defecto no se cuentan el diezmo ni las ofrendas; la casilla los incluye
  function actualizar() {
    const incluir = casilla && casilla.checked;
    const considerados = incluir ? gastosPeriodo : gastosPeriodo.filter(g => !esDiezmo(g));
    mostrarResumen(periodo, considerados);
    mostrarDona(considerados, periodo.presupuesto);
  }

  if (casilla) casilla.addEventListener("change", actualizar);
  actualizar();
}

iniciar().catch(mostrarError);
iniciarDolar().catch(mostrarError); // independiente: si falla, el resto de la página sigue