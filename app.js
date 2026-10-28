async function cargarTexto(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${ruta} (${respuesta.status})`);
  }
  return respuesta.text();
}

function parsearCSV(texto) {
  const lineas = texto.trim().split(/\r?\n/).slice(1); // slice(1) quita el encabezado
  return lineas.map(linea => {
    const [fecha, categoria, detalle, monto] = linea.split(",");
    return { fecha, categoria, detalle, monto: parseFloat(monto) };
  });
}

function parsearPeriodos(texto) {
  const lineas = texto.trim().split(/\r?\n/).slice(1);
  return lineas.map(linea => {
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

function obtenerUltimos(gastos, cantidad) {
  return gastos.slice(-cantidad).reverse(); // reverse() deja el más reciente primero
}

function formatearFecha(fecha) {
  const [year, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

function formatearFechaCompleta(fecha) {
  const [year, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${year}`;
}

function mostrarLista(gastos, contenedor, conDetalle = false) {
  contenedor.innerHTML = gastos.map(g => `
    <div class="fila${conDetalle ? " con-detalle" : ""}">
      <span>${formatearFecha(g.fecha)}</span>
      <span>${g.categoria}</span>
      ${conDetalle ? `<span>${g.detalle}</span>` : ""}
      <span>${g.monto.toFixed(2)}</span>
    </div>
  `).join("");
}

/* ---------- Periodos ---------- */

function hoyISO() {
  const h = new Date();
  const mes = String(h.getMonth() + 1).padStart(2, "0");
  const dia = String(h.getDate()).padStart(2, "0");
  return `${h.getFullYear()}-${mes}-${dia}`;
}

function obtenerPeriodoActual(periodos) {
  const ordenados = [...periodos].sort((a, b) => b.inicio.localeCompare(a.inicio));
  const periodo = ordenados[0];
  if (!periodo) return null;
  return { ...periodo, fin: periodo.fin || hoyISO() };
}

function gastosDelPeriodo(gastos, periodo) {
  return gastos.filter(g => g.fecha >= periodo.inicio && g.fecha <= periodo.fin);
}

function sumarMontos(gastos) {
  return gastos.reduce((s, g) => s + g.monto, 0);
}

function mostrarResumen(periodo, gastosPeriodo) {
  document.getElementById("gasto-total").textContent = Math.round(sumarMontos(gastosPeriodo));
  document.getElementById("ingreso").textContent = periodo.ingreso;
  document.getElementById("presupuesto").textContent = periodo.presupuesto;
  document.getElementById("desde").textContent = `Desde ${formatearFechaCompleta(periodo.inicio)}`;
}

/* ---------- Dona ---------- */

function totalesPorCategoria(gastos) {
  const totales = {};
  gastos.forEach(g => {
    totales[g.categoria] = (totales[g.categoria] || 0) + g.monto;
  });
  return Object.entries(totales).sort((a, b) => b[1] - a[1]);
}

function agruparTop(totales, cantidad) {
  const top = totales.slice(0, cantidad);
  const resto = totales.slice(cantidad).reduce((suma, [, total]) => suma + total, 0);
  if (resto > 0) top.push(["Resto", resto]);
  return top;
}

const COLORES = ["#083d5c", "#0b5f8a", "#1a86bf", "#33b8fc", "#7cd0fd", "#b5e4fe"];
const COLORES_TEXTO = ["#ffffff", "#ffffff", "#ffffff", "#083d5c", "#083d5c", "#083d5c"];
const COLOR_DISPONIBLE = "#bdbdbd";
const TEXTO_DISPONIBLE = "#000000";
const COLOR_SOBREGIRO = "#d93025";
const TEXTO_SOBREGIRO = "#ffffff";

const NS = "http://www.w3.org/2000/svg";
const RADIO = 35;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

let grupos = [];
let colores = [];
let coloresTexto = [];
let suma = 0;

function porcentaje(total) {
  return Math.round((total / suma) * 100);
}

function mostrarBanner(indices) {
  const banner = document.getElementById("banner");
  banner.innerHTML = `
    <div class="popup">
      ${indices.map(i => `
        <p>
          <span class="punto" style="background:${colores[i]}"></span>
          ${grupos[i][0]} ${porcentaje(grupos[i][1])}%
        </p>
      `).join("")}
      <button id="cerrar-popup" class="boton" type="button">Cerrar</button>
    </div>
  `;
  banner.hidden = false;

  document.getElementById("cerrar-popup").addEventListener("click", () => {
    banner.hidden = true;
  });
}

function mostrarDona(gastosPeriodo, presupuesto) {
  const gastado = sumarMontos(gastosPeriodo);
  const haySobregiro = gastado > presupuesto;
  grupos = agruparTop(totalesPorCategoria(gastosPeriodo), 5);

  if (haySobregiro) {
    // las categorías se reducen para ocupar solo el presupuesto
    const factor = presupuesto / gastado;
    grupos = grupos.map(([nombre, total]) => [nombre, total * factor]);
    grupos.push(["Sobregiro", gastado - presupuesto]);
  } else if (presupuesto > gastado) {
    grupos.push(["Disponible", presupuesto - gastado]);
  }

  suma = grupos.reduce((s, [, total]) => s + total, 0);
  if (suma === 0) return;

  colores = grupos.map(([nombre], i) => {
    if (nombre === "Disponible") return COLOR_DISPONIBLE;
    if (nombre === "Sobregiro") return COLOR_SOBREGIRO;
    return COLORES[i];
  });
  coloresTexto = grupos.map(([nombre], i) => {
    if (nombre === "Disponible") return TEXTO_DISPONIBLE;
    if (nombre === "Sobregiro") return TEXTO_SOBREGIRO;
    return COLORES_TEXTO[i];
  });

  const svg = document.getElementById("dona");
  svg.innerHTML = "";
  let acumulado = 0;

  grupos.forEach(([, total], i) => {
    const largo = (total / suma) * CIRCUNFERENCIA;

    const circulo = document.createElementNS(NS, "circle");
    circulo.setAttribute("cx", 50);
    circulo.setAttribute("cy", 50);
    circulo.setAttribute("r", RADIO);
    circulo.setAttribute("stroke", colores[i]);
    circulo.setAttribute("stroke-dasharray", `${largo} ${CIRCUNFERENCIA - largo}`);
    circulo.setAttribute("stroke-dashoffset", -acumulado);
    circulo.setAttribute("transform", "rotate(-90 50 50)");
    circulo.addEventListener("click", () => mostrarBanner([i]));
    svg.appendChild(circulo);

    if (porcentaje(total) >= 4) {
      const angulo = ((acumulado + largo / 2) / CIRCUNFERENCIA) * 2 * Math.PI - Math.PI / 2;
      const texto = document.createElementNS(NS, "text");
      texto.setAttribute("x", 50 + RADIO * Math.cos(angulo));
      texto.setAttribute("y", 50 + RADIO * Math.sin(angulo));
      texto.setAttribute("text-anchor", "middle");
      texto.setAttribute("dominant-baseline", "central");
      texto.setAttribute("fill", coloresTexto[i]);
      texto.textContent = `${porcentaje(total)}%`;
      svg.appendChild(texto);
    }

    acumulado += largo;
  });

  if (haySobregiro) {
    const aviso = document.createElementNS(NS, "text");
    aviso.setAttribute("x", 50);
    aviso.setAttribute("y", 50);
    aviso.setAttribute("text-anchor", "middle");
    aviso.setAttribute("dominant-baseline", "central");
    aviso.setAttribute("class", "advertencia");
    aviso.textContent = "⚠";
    svg.appendChild(aviso);
  }

  document.getElementById("btn-detalle").addEventListener("click", () => {
    mostrarBanner(grupos.map((_, i) => i));
  });

  document.getElementById("banner").addEventListener("click", e => {
    if (e.target === e.currentTarget) {
      e.currentTarget.hidden = true;
    }
  });
}

/* ---------- Inicio ---------- */

async function iniciar() {
  const gastos = parsearCSV(await cargarTexto("data/gastos.csv"));
  const contenedor = document.getElementById("lista-filas");
  const pagina = document.body.dataset.pagina;

  if (pagina === "inicio") {
    mostrarLista(obtenerUltimos(gastos, 10), contenedor);

    const periodos = parsearPeriodos(await cargarTexto("data/periodos.csv"));
    const periodo = obtenerPeriodoActual(periodos);
    if (periodo) {
      const gastosPeriodo = gastosDelPeriodo(gastos, periodo);
      mostrarResumen(periodo, gastosPeriodo);
      mostrarDona(gastosPeriodo, periodo.presupuesto);
    }
  } else if (pagina === "gastos") {
    const periodos = parsearPeriodos(await cargarTexto("data/periodos.csv"));
    iniciarFiltros(gastos, periodos, contenedor);
  }
}

iniciar();

/* ---------- Filtros ---------- */

function etiquetaPeriodo(p) {
  const fin = p.fin ? formatearFechaCompleta(p.fin) : "hoy";
  return `${formatearFechaCompleta(p.inicio)} – ${fin}`;
}

function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function iniciarFiltros(gastos, periodos, contenedor) {
  const selCategoria = document.getElementById("filtro-categoria");
  const selPeriodo = document.getElementById("filtro-periodo");
  const campoDesde = document.getElementById("filtro-desde");
  const campoHasta = document.getElementById("filtro-hasta");
  const campoTexto = document.getElementById("filtro-texto");

  const categorias = [...new Set(gastos.map(g => g.categoria))]
    .sort((a, b) => a.localeCompare(b));
  categorias.forEach(c => selCategoria.add(new Option(c, c)));

  const periodosOrdenados = periodos
    .filter(p => p.inicio)
    .sort((a, b) => b.inicio.localeCompare(a.inicio)); // el más nuevo primero
  periodosOrdenados.forEach((p, i) => selPeriodo.add(new Option(etiquetaPeriodo(p), i)));

  function actualizar() {
    const categoria = selCategoria.value;
    const desde = campoDesde.value;
    const hasta = campoHasta.value;
    const texto = normalizar(campoTexto.value.trim());

    const filtrados = gastos.filter(g =>
      (!categoria || g.categoria === categoria) &&
      (!desde || g.fecha >= desde) &&
      (!hasta || g.fecha <= hasta) &&
      (!texto || normalizar(g.detalle || "").includes(texto))
    );

    document.getElementById("total-valor").textContent =
      `Bs ${sumarMontos(filtrados).toFixed(2)}`;

    if (filtrados.length === 0) {
      contenedor.innerHTML = "<p>No hay gastos con esos filtros.</p>";
      return;
    }
    mostrarLista([...filtrados].reverse(), contenedor, true);
  }

  selCategoria.addEventListener("change", actualizar);

  selPeriodo.addEventListener("change", () => {
    const periodo = periodosOrdenados[selPeriodo.value];
    campoDesde.value = periodo ? periodo.inicio : "";
    campoHasta.value = periodo ? (periodo.fin || hoyISO()) : "";
    actualizar();
  });

  [campoDesde, campoHasta].forEach(campo => {
    campo.addEventListener("input", () => {
      selPeriodo.value = "";
      actualizar();
    });
  });

  campoTexto.addEventListener("input", actualizar);

  actualizar();
}