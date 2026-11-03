// Página de informes (informes.html)

import { cargarGastos, cargarPeriodos } from "./datos.js";
import { mostrarError } from "./utilidades.js";
import { iniciarBarras } from "./barras.js";
import { iniciarSlides } from "./slides.js";

async function iniciar() {
  const [gastos, periodos] = await Promise.all([cargarGastos(), cargarPeriodos()]);
  iniciarBarras(gastos, periodos);
  iniciarSlides(gastos, periodos);
}

iniciar().catch(mostrarError);
