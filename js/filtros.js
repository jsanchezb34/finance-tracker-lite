// Filtros de la página de gastos (panel + menús por columna)

import {
  normalizar, escapar, sumarMontos, hoyISO, etiquetaPeriodo
} from "./utilidades.js";
import { mostrarLista } from "./lista.js";

function coincideTexto(valor, entrada) {
  const palabras = entrada
    .split(",")
    .map(p => normalizar(p.trim()))
    .filter(p => p !== "");
  return palabras.length === 0 ||
    palabras.some(p => normalizar(valor || "").includes(p));
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

export function iniciarFiltros(gastos, periodos, contenedor) {
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
