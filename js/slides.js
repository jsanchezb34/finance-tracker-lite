// Dona por periodo en formato slideshow (página de informes)

import { hoyISO, etiquetaPeriodo, gastosDelPeriodo } from "./utilidades.js";
import { calcularDona, dibujarDona, cerrarBannerAlTocarFondo } from "./dona.js";

const INTERVALO_SLIDES = 4000;

export function iniciarSlides(gastos, periodos) {
  const ordenados = periodos
    .filter(p => p.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio)); // del más antiguo al más nuevo
  if (ordenados.length === 0) return;

  const zona = document.getElementById("slide");
  const svg = document.getElementById("slide-dona");
  const titulo = document.getElementById("slide-titulo");
  const resumen = document.getElementById("slide-resumen");
  const puntos = document.getElementById("slide-puntos");
  const botonAuto = document.getElementById("slide-auto");

  let indice = ordenados.length - 1; // empieza en el periodo más reciente
  let temporizador = null;

  puntos.innerHTML = ordenados.map((_, i) =>
    `<button type="button" class="punto-slide" data-i="${i}" aria-label="Periodo ${i + 1}"></button>`
  ).join("");

  function mostrar(i) {
    indice = (i + ordenados.length) % ordenados.length;
    const p = ordenados[indice];
    const presupuesto = p.presupuesto || 0;
    const gastosPeriodo = gastosDelPeriodo(gastos, { ...p, fin: p.fin || hoyISO() });
    const dona = calcularDona(gastosPeriodo, presupuesto);

    titulo.textContent = etiquetaPeriodo(p);
    resumen.textContent = `Gastado Bs ${dona.gastado.toFixed(2)} de Bs ${presupuesto.toFixed(2)}`;

    if (dona.suma === 0) {
      svg.innerHTML = "";
    } else {
      dibujarDona(svg, dona);
    }

    puntos.querySelectorAll(".punto-slide").forEach((b, n) => {
      b.classList.toggle("activo", n === indice);
    });
  }

  function pausar() {
    clearInterval(temporizador);
    temporizador = null;
    botonAuto.textContent = "Reanudar";
    botonAuto.setAttribute("aria-pressed", "false");
  }

  function reanudar() {
    clearInterval(temporizador);
    temporizador = setInterval(() => mostrar(indice + 1), INTERVALO_SLIDES);
    botonAuto.textContent = "Pausar";
    botonAuto.setAttribute("aria-pressed", "true");
  }

  function irA(i) {
    pausar(); // cualquier acción manual pausa el avance automático
    mostrar(i);
  }

  document.getElementById("slide-prev").addEventListener("click", () => irA(indice - 1));
  document.getElementById("slide-next").addEventListener("click", () => irA(indice + 1));

  puntos.addEventListener("click", e => {
    const punto = e.target.closest(".punto-slide");
    if (punto) irA(Number(punto.dataset.i));
  });

  botonAuto.addEventListener("click", () => {
    if (temporizador) pausar();
    else reanudar();
  });

  // tocar la dona (para ver el detalle) también pausa
  zona.addEventListener("click", pausar);

  // deslizar con el dedo
  let inicioX = null;
  zona.addEventListener("touchstart", e => {
    inicioX = e.touches[0].clientX;
  }, { passive: true });

  zona.addEventListener("touchend", e => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    inicioX = null;
    if (Math.abs(dx) > 40) irA(indice + (dx < 0 ? 1 : -1));
  });

  cerrarBannerAlTocarFondo();
  mostrar(indice);
  reanudar();
}
