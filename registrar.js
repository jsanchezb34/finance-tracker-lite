const form = document.getElementById("form-gasto");
const mensaje = document.getElementById("mensaje");

function hoyISO() {
  const h = new Date();
  const mes = String(h.getMonth() + 1).padStart(2, "0");
  const dia = String(h.getDate()).padStart(2, "0");
  return `${h.getFullYear()}-${mes}-${dia}`;
}

function ponerFechaDeHoy() {
  document.getElementById("fecha").value = hoyISO();
}

form.addEventListener("submit", e => {
  e.preventDefault(); // evita que la página se recargue

  const gasto = {
    fecha: document.getElementById("fecha").value,
    categoria: document.getElementById("categoria").value.trim(),
    detalle: document.getElementById("detalle").value.trim(),
    monto: parseFloat(document.getElementById("monto").value)
  };

  console.log("Gasto capturado:", gasto);
  mensaje.textContent = "Gasto capturado (todavía no se guarda).";

  form.reset();
  ponerFechaDeHoy();
});

ponerFechaDeHoy();