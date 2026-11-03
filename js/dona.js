// Gráfico de dona (se usa en inicio y en los slides de informes)

import { sumarMontos, totalesPorCategoria, agruparTop } from "./utilidades.js";

const COLORES = ["#083d5c", "#0b5f8a", "#1a86bf", "#33b8fc", "#7cd0fd", "#b5e4fe"];
const COLORES_TEXTO = ["#ffffff", "#ffffff", "#ffffff", "#083d5c", "#083d5c", "#083d5c"];
const COLOR_DISPONIBLE = "#bdbdbd";
const TEXTO_DISPONIBLE = "#000000";
const COLOR_SOBREGIRO = "#d93025";
const TEXTO_SOBREGIRO = "#ffffff";

const NS = "http://www.w3.org/2000/svg";
const RADIO = 35;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export function calcularDona(gastosPeriodo, presupuesto) {
  const gastado = sumarMontos(gastosPeriodo);
  const haySobregiro = gastado > presupuesto;

  // cada grupo: [nombre, valor en la dona, monto real]
  let grupos = agruparTop(totalesPorCategoria(gastosPeriodo), 5)
    .map(([nombre, total]) => [nombre, total, total]);

  if (haySobregiro) {
    // las categorías se reducen para ocupar solo el presupuesto
    const factor = presupuesto / gastado;
    grupos = grupos.map(([nombre, total, real]) => [nombre, total * factor, real]);
    grupos.push(["Sobregiro", gastado - presupuesto, gastado - presupuesto]);
  } else if (presupuesto > gastado) {
    grupos.push(["Disponible", presupuesto - gastado, presupuesto - gastado]);
  }

  const suma = grupos.reduce((s, [, total]) => s + total, 0);

  const colores = grupos.map(([nombre], i) => {
    if (nombre === "Disponible") return COLOR_DISPONIBLE;
    if (nombre === "Sobregiro") return COLOR_SOBREGIRO;
    return COLORES[i];
  });
  const coloresTexto = grupos.map(([nombre], i) => {
    if (nombre === "Disponible") return TEXTO_DISPONIBLE;
    if (nombre === "Sobregiro") return TEXTO_SOBREGIRO;
    return COLORES_TEXTO[i];
  });

  return { grupos, colores, coloresTexto, suma, haySobregiro, gastado };
}

function porcentajeDe(dona, total) {
  return Math.round((total / dona.suma) * 100);
}

function mostrarBanner(dona, indices) {
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
          <span class="punto" style="background:${dona.colores[i]}"></span>
          <span>${dona.grupos[i][0]}</span>
          <span>${dona.grupos[i][2].toFixed(2)}</span>
          <span>${porcentajeDe(dona, dona.grupos[i][1])}%</span>
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

export function cerrarBannerAlTocarFondo() {
  document.getElementById("banner").addEventListener("click", e => {
    if (e.target === e.currentTarget) {
      e.currentTarget.hidden = true;
    }
  });
}

export function dibujarDona(svg, dona) {
  svg.classList.add("dona");
  svg.innerHTML = "";
  let acumulado = 0;

  dona.grupos.forEach(([, total], i) => {
    const largo = (total / dona.suma) * CIRCUNFERENCIA;

    const circulo = document.createElementNS(NS, "circle");
    circulo.setAttribute("cx", 50);
    circulo.setAttribute("cy", 50);
    circulo.setAttribute("r", RADIO);
    circulo.setAttribute("stroke", dona.colores[i]);
    circulo.setAttribute("stroke-dasharray", `${largo} ${CIRCUNFERENCIA - largo}`);
    circulo.setAttribute("stroke-dashoffset", -acumulado);
    circulo.setAttribute("transform", "rotate(-90 50 50)");
    circulo.addEventListener("click", () => mostrarBanner(dona, [i]));
    svg.appendChild(circulo);

    if (porcentajeDe(dona, total) >= 4) {
      const angulo = ((acumulado + largo / 2) / CIRCUNFERENCIA) * 2 * Math.PI - Math.PI / 2;
      const texto = document.createElementNS(NS, "text");
      texto.setAttribute("x", 50 + RADIO * Math.cos(angulo));
      texto.setAttribute("y", 50 + RADIO * Math.sin(angulo));
      texto.setAttribute("text-anchor", "middle");
      texto.setAttribute("dominant-baseline", "central");
      texto.setAttribute("fill", dona.coloresTexto[i]);
      texto.textContent = `${porcentajeDe(dona, total)}%`;
      svg.appendChild(texto);
    }

    acumulado += largo;
  });

  if (dona.haySobregiro) {
    const aviso = document.createElementNS(NS, "text");
    aviso.setAttribute("x", 50);
    aviso.setAttribute("y", 50);
    aviso.setAttribute("text-anchor", "middle");
    aviso.setAttribute("dominant-baseline", "central");
    aviso.setAttribute("class", "advertencia");
    aviso.textContent = "⚠";
    svg.appendChild(aviso);
  }
}

// Dona de la página de inicio (con botón "Ver detalle")
export function mostrarDona(gastosPeriodo, presupuesto) {
  const dona = calcularDona(gastosPeriodo, presupuesto);
  if (dona.suma === 0) return;

  dibujarDona(document.getElementById("dona"), dona);

  document.getElementById("btn-detalle").addEventListener("click", () => {
    mostrarBanner(dona, dona.grupos.map((_, i) => i));
  });

  cerrarBannerAlTocarFondo();
}
