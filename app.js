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
      <div class="popup-fila popup-encabezado">
        <span></span>
        <span>Categoría</span>
        <span>Monto</span>
        <span>%</span>
      </div>
      ${indices.map(i => `
        <div class="popup-fila">
          <span class="punto" style="background:${colores[i]}"></span>
          <span>${grupos[i][0]}</span>
          <span>${grupos[i][2].toFixed(2)}</span>
          <span>${porcentaje(grupos[i][1])}%</span>
        </div>
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
    grupos = agruparTop(totalesPorCategoria(gastosPeriodo), 5)
    .map(([nombre, total]) => [nombre, total, total]);

  if (haySobregiro) {
    // las categorías se reducen para ocupar solo el presupuesto
    const factor = presupuesto / gastado;
    grupos = grupos.map(([nombre, total, real]) => [nombre, total * factor, real]);
    grupos.push(["Sobregiro", gastado - presupuesto, gastado - presupuesto]);
  } else if (presupuesto > gastado) {
    grupos.push(["Disponible", presupuesto - gastado, presupuesto - gastado]);
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

/* ---------- Informes ---------- */

const ALTO_BARRAS = 160;

function iniciarInformes(gastos, periodos) {
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

    } else if (pagina === "informes") {
    const periodos = parsearPeriodos(await cargarTexto("data/periodos.csv"));
    iniciarInformes(gastos, periodos);
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

function coincideTexto(valor, entrada) {
  const palabras = entrada
    .split(",")
    .map(p => normalizar(p.trim()))
    .filter(p => p !== "");
  return palabras.length === 0 ||
    palabras.some(p => normalizar(valor || "").includes(p));
}

function escapar(texto) {
  return String(texto).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function cumpleDetalle(valor, condicion, entrada) {
  const palabras = entrada
    .split(",")
    .map(p => normalizar(p.trim()))
    .filter(p => p !== "");
  if (palabras.length === 0) return true;

  const texto = normalizar(valor || "");
  switch (condicion) {
    case "igual":       return palabras.some(p => texto === p);
    case "no-igual":    return palabras.every(p => texto !== p);
    case "contiene":    return palabras.some(p => texto.includes(p));
    case "no-contiene": return palabras.every(p => !texto.includes(p));
    default:            return true;
  }
}

function iniciarFiltros(gastos, periodos, contenedor) {
  const selCategoria = document.getElementById("filtro-categoria");
  const selPeriodo = document.getElementById("filtro-periodo");
  const campoDesde = document.getElementById("filtro-desde");
  const campoHasta = document.getElementById("filtro-hasta");
  const campoTexto = document.getElementById("filtro-texto");
  const menu = document.getElementById("menu-filtro");
  const botones = document.querySelectorAll(".btn-filtro");

  const categorias = [...new Set(gastos.map(g => g.categoria))]
    .sort((a, b) => a.localeCompare(b));
  categorias.forEach(c => selCategoria.add(new Option(c, c)));

  const periodosOrdenados = periodos
    .filter(p => p.inicio)
    .sort((a, b) => b.inicio.localeCompare(a.inicio)); // el más nuevo primero
  periodosOrdenados.forEach((p, i) => selPeriodo.add(new Option(etiquetaPeriodo(p), i)));

  /* ---- Estado de los filtros de columna ---- */
  const estado = {
    orden: "desc",            // "desc": más reciente primero
    antesDe: "",
    despuesDe: "",
    categorias: new Set(),    // vacío = todas
    detalleCond: "contiene",
    detalleTexto: "",
    masDe: "",
    menosDe: ""
  };

  const MENUS = {
    fecha: () => `
      <label><input type="radio" name="orden" value="asc" ${estado.orden === "asc" ? "checked" : ""}> Del más antiguo al más reciente</label>
      <label><input type="radio" name="orden" value="desc" ${estado.orden === "desc" ? "checked" : ""}> Del más reciente al más antiguo</label>
      <label>Antes de <input type="date" data-campo="antesDe" value="${estado.antesDe}"></label>
      <label>Después de <input type="date" data-campo="despuesDe" value="${estado.despuesDe}"></label>
      <button type="button" class="limpiar">Limpiar</button>`,
    categoria: () => `
      <div class="lista-checks">
        ${categorias.map(c => `
          <label><input type="checkbox" value="${escapar(c)}" ${estado.categorias.has(c) ? "checked" : ""}> ${escapar(c)}</label>
        `).join("")}
      </div>
      <button type="button" class="limpiar">Limpiar</button>`,
    detalle: () => `
      <select data-campo="detalleCond">
        ${[["igual", "es igual a"], ["no-igual", "no es igual a"], ["contiene", "contiene"], ["no-contiene", "no contiene"]]
          .map(([v, t]) => `<option value="${v}" ${estado.detalleCond === v ? "selected" : ""}>${t}</option>`).join("")}
      </select>
      <input type="text" data-campo="detalleTexto" placeholder="Texto (varios, separados por coma)" value="${escapar(estado.detalleTexto)}">
      <button type="button" class="limpiar">Limpiar</button>`,
    monto: () => `
      <label>Más de <input type="number" data-campo="masDe" inputmode="decimal" step="0.01" value="${estado.masDe}"></label>
      <label>Menos de <input type="number" data-campo="menosDe" inputmode="decimal" step="0.01" value="${estado.menosDe}"></label>
      <button type="button" class="limpiar">Limpiar</button>`
  };

  const LIMPIAR = {
    fecha: () => { estado.orden = "desc"; estado.antesDe = ""; estado.despuesDe = ""; },
    categoria: () => estado.categorias.clear(),
    detalle: () => { estado.detalleCond = "contiene"; estado.detalleTexto = ""; },
    monto: () => { estado.masDe = ""; estado.menosDe = ""; }
  };

  function pasaColumnas(g) {
    const masDe = parseFloat(estado.masDe);
    const menosDe = parseFloat(estado.menosDe);
    return (!estado.antesDe || g.fecha < estado.antesDe) &&
      (!estado.despuesDe || g.fecha > estado.despuesDe) &&
      (estado.categorias.size === 0 || estado.categorias.has(g.categoria)) &&
      cumpleDetalle(g.detalle, estado.detalleCond, estado.detalleTexto) &&
      (isNaN(masDe) || g.monto > masDe) &&
      (isNaN(menosDe) || g.monto < menosDe);
  }

  function marcarActivos() {
    const activos = {
      fecha: estado.orden !== "desc" || estado.antesDe !== "" || estado.despuesDe !== "",
      categoria: estado.categorias.size > 0,
      detalle: estado.detalleTexto.trim() !== "",
      monto: estado.masDe !== "" || estado.menosDe !== ""
    };
    botones.forEach(b => b.classList.toggle("activo", activos[b.dataset.col]));
  }

  function actualizar() {
    marcarActivos();

    const categoria = selCategoria.value;
    const desde = campoDesde.value;
    const hasta = campoHasta.value;

    const filtrados = gastos.filter(g =>
      (!categoria || g.categoria === categoria) &&
      (!desde || g.fecha >= desde) &&
      (!hasta || g.fecha <= hasta) &&
      coincideTexto(g.detalle, campoTexto.value) &&
      pasaColumnas(g)
    );

    document.getElementById("total-valor").textContent =
      `Bs ${sumarMontos(filtrados).toFixed(2)}`;

    if (filtrados.length === 0) {
      contenedor.innerHTML = "<p>No hay gastos con esos filtros.</p>";
      return;
    }

    const ordenados = [...filtrados].sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (estado.orden === "desc") ordenados.reverse();
    mostrarLista(ordenados, contenedor, true);
  }

  /* ---- Menús de columna ---- */
  let columnaAbierta = null;

  function abrirMenu(col) {
    columnaAbierta = col;
    menu.innerHTML = MENUS[col]();
    menu.hidden = false;
  }

  function cerrarMenu() {
    menu.hidden = true;
    columnaAbierta = null;
  }

  botones.forEach(boton => {
    boton.addEventListener("click", e => {
      e.stopPropagation();
      if (columnaAbierta === boton.dataset.col) {
        cerrarMenu();
      } else {
        abrirMenu(boton.dataset.col);
      }
    });
  });

  document.addEventListener("click", e => {
    if (!menu.hidden && !menu.contains(e.target)) cerrarMenu();
  });

  menu.addEventListener("click", e => {
    e.stopPropagation(); // evita que el clic cierre el menú
    if (e.target.classList.contains("limpiar")) {
      LIMPIAR[columnaAbierta]();
      abrirMenu(columnaAbierta);
      actualizar();
    }
  });

  menu.addEventListener("input", e => {
    const campo = e.target;
    if (campo.name === "orden") {
      estado.orden = campo.value;
    } else if (campo.type === "checkbox") {
      if (campo.checked) estado.categorias.add(campo.value);
      else estado.categorias.delete(campo.value);
    } else if (campo.dataset.campo) {
      estado[campo.dataset.campo] = campo.value;
    }
    actualizar();
  });

  /* ---- Filtros del panel ---- */
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