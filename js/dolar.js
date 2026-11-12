// Gráfico de puntos del tipo de cambio del dólar (página de inicio)

import { cargarDolar } from "./datos.js";
import { formatearFecha, formatearFechaCompleta } from "./utilidades.js";

const NS = "http://www.w3.org/2000/svg";
const ANCHO = 320;
const ALTO = 180;
const MARGEN = { izq: 34, der: 12, arriba: 14, abajo: 26 };

function crear(tipo, atributos = {}, texto = "") {
  const elemento = document.createElementNS(NS, tipo);
  Object.entries(atributos).forEach(([clave, valor]) => elemento.setAttribute(clave, valor));
  if (texto) elemento.textContent = texto;
  return elemento;
}

function describir(d) {
  const fechas = d.hasta && d.hasta !== d.desde
    ? `${formatearFechaCompleta(d.desde)} – ${formatearFechaCompleta(d.hasta)}`
    : formatearFechaCompleta(d.desde);
  const fuente = d.fuente === "bcb" ? "BCB oficial" : "aproximado (tus periodos)";
  return `${fechas} · Bs ${d.tco.toFixed(2)} · ${fuente}`;
}

export async function iniciarDolar() {
  const datos = (await cargarDolar())
    .filter(d => d.desde && !isNaN(d.tco))
    .sort((a, b) => a.desde.localeCompare(b.desde));

  const ultimo = document.getElementById("dolar-ultimo");
  const detalle = document.getElementById("dolar-detalle");
  const svg = document.getElementById("dolar-svg");

  if (datos.length === 0) {
    ultimo.textContent = "Aún no hay datos del dólar.";
    svg.hidden = true;
    detalle.hidden = true;
    return;
  }

  /* ---- Resumen: último valor y variación ---- */
  const final = datos[datos.length - 1];
  let texto = `Último: Bs ${final.tco.toFixed(2)} (${formatearFechaCompleta(final.desde)})`;
  if (datos.length > 1) {
    const cambio = final.tco - datos[datos.length - 2].tco;
    const signo = cambio > 0 ? "+" : cambio < 0 ? "−" : "";
    texto += ` · ${signo}${Math.abs(cambio).toFixed(2)} frente al valor anterior`;
  }
  ultimo.textContent = texto;

  /* ---- Escalas ---- */
  const tiempos = datos.map(d => Date.parse(d.desde));
  const dia = 24 * 60 * 60 * 1000;
  let tMin = Math.min(...tiempos);
  let tMax = Math.max(...tiempos);
  if (tMin === tMax) { tMin -= dia; tMax += dia; }

  const valores = datos.map(d => d.tco);
  const vMin = Math.min(...valores);
  const vMax = Math.max(...valores);
  const paso = (vMax - vMin) <= 2 ? 0.5 : 1;
  const colchon = Math.max((vMax - vMin) * 0.15, 0.1);
  const yBajo = Math.floor((vMin - colchon) / paso) * paso;
  const yAlto = Math.ceil((vMax + colchon) / paso) * paso;

  const anchoUtil = ANCHO - MARGEN.izq - MARGEN.der;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = t => MARGEN.izq + ((t - tMin) / (tMax - tMin)) * anchoUtil;
  const y = v => MARGEN.arriba + ((yAlto - v) / (yAlto - yBajo)) * altoUtil;

  /* ---- Dibujo ---- */
  svg.innerHTML = "";

  for (let v = yBajo; v <= yAlto + 1e-9; v += paso) {
    svg.appendChild(crear("line", {
      x1: MARGEN.izq, x2: ANCHO - MARGEN.der, y1: y(v), y2: y(v), class: "rejilla"
    }));
    svg.appendChild(crear("text", {
      x: MARGEN.izq - 5, y: y(v), "text-anchor": "end", "dominant-baseline": "central"
    }, v.toFixed(1)));
  }

  svg.appendChild(crear("text", {
    x: MARGEN.izq, y: ALTO - 8, "text-anchor": "start"
  }, formatearFecha(datos[0].desde)));
  svg.appendChild(crear("text", {
    x: ANCHO - MARGEN.der, y: ALTO - 8, "text-anchor": "end"
  }, formatearFecha(final.desde)));

  // línea que une los puntos en orden de fecha (va antes de los puntos para quedar detrás)
  svg.appendChild(crear("polyline", {
    points: datos.map(d => `${x(Date.parse(d.desde))},${y(d.tco)}`).join(" "),
    class: "linea-dolar"
  }));

  const RADIO_PUNTO = 2.5;
  const RADIO_ACTIVO = 4;
  const posiciones = datos.map(d => [x(Date.parse(d.desde)), y(d.tco)]);

  const puntos = datos.map((d, i) => {
    const punto = crear("circle", {
      cx: posiciones[i][0],
      cy: posiciones[i][1],
      r: RADIO_PUNTO,
      class: d.fuente === "bcb" ? "bcb" : "aprox"
    });
    punto.appendChild(crear("title", {}, describir(d)));
    svg.appendChild(punto);
    return punto;
  });

  function seleccionar(i) {
    puntos.forEach((p, n) => {
      p.classList.toggle("activo", n === i);
      p.setAttribute("r", n === i ? RADIO_ACTIVO : RADIO_PUNTO);
    });
    detalle.textContent = describir(datos[i]);
  }

  // Al tocar el gráfico se elige el punto más cercano (zona de toque amplia aunque los puntos sean pequeños)
  svg.addEventListener("click", e => {
    const caja = svg.getBoundingClientRect();
    if (!caja.width) return;
    const escala = ANCHO / caja.width;
    const toqueX = (e.clientX - caja.left) * escala;
    const toqueY = (e.clientY - caja.top) * escala;

    let mejor = -1;
    let distanciaMejor = Infinity;
    posiciones.forEach(([px, py], i) => {
      const distancia = Math.hypot(px - toqueX, py - toqueY);
      if (distancia < distanciaMejor) {
        distanciaMejor = distancia;
        mejor = i;
      }
    });
    if (distanciaMejor <= 14) seleccionar(mejor);
  });

  seleccionar(datos.length - 1);
}