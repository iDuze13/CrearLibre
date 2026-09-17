/**
 * CrearLibre — canvas.js
 * Motor de dibujo: maneja las tres capas del lienzo (fondo, dibujo,
 * plantilla), el ajuste de tamaño respetando devicePixelRatio sin perder
 * lo ya dibujado, el trazo con suavizado por curvas cuadráticas, el
 * "imán de líneas" (más suavizado para compensar temblor/espasticidad),
 * y el dibujo por teclado para quien no usa puntero.
 *
 * Expone `window.CrearLibreCanvas` con la API que usan tools.js y app.js.
 */

const capaFondo = document.getElementById('capa-fondo');
const lienzoPrincipal = document.getElementById('lienzo-principal');
const capaPlantilla = document.getElementById('capa-plantilla');

const ctxFondo = capaFondo.getContext('2d');
const ctxDibujo = lienzoPrincipal.getContext('2d');
const ctxPlantilla = capaPlantilla.getContext('2d');

/* ---------- Estado del motor (lo actualiza tools.js) ---------- */
const estado = {
  herramienta: 'pincel',      // 'pincel' | 'sello' | 'goma'
  color: '#031f41',
  grosor: 10,
  sello: '⭐',
  imanLineasActivo: true,     // suaviza más el trazo para compensar temblor
  plantillaActual: 'ninguna'
};

/* ---------- Pilas de deshacer / rehacer ---------- */
const pilaDeshacer = [];
const pilaRehacer = [];

function actualizarBotonesHistorial() {
  const btnDeshacer = document.getElementById('btn-undo');
  const btnRehacer = document.getElementById('btn-redo');
  if (btnDeshacer) btnDeshacer.disabled = pilaDeshacer.length === 0;
  if (btnRehacer) btnRehacer.disabled = pilaRehacer.length === 0;
}

function guardarEstadoDeshacer() {
  pilaDeshacer.push(lienzoPrincipal.toDataURL());
  pilaRehacer.length = 0; // una acción nueva invalida lo que se podía rehacer
  actualizarBotonesHistorial();
}

function restaurarDesdeDataUrl(dataUrl) {
  const img = new Image();
  img.onload = () => {
    ctxDibujo.clearRect(0, 0, lienzoPrincipal.clientWidth, lienzoPrincipal.clientHeight);
    ctxDibujo.drawImage(img, 0, 0, lienzoPrincipal.clientWidth, lienzoPrincipal.clientHeight);
  };
  img.src = dataUrl;
}

function deshacer() {
  const anterior = pilaDeshacer.pop();
  if (!anterior) return false;
  pilaRehacer.push(lienzoPrincipal.toDataURL());
  restaurarDesdeDataUrl(anterior);
  actualizarBotonesHistorial();
  return true;
}

function rehacer() {
  const siguiente = pilaRehacer.pop();
  if (!siguiente) return false;
  pilaDeshacer.push(lienzoPrincipal.toDataURL());
  restaurarDesdeDataUrl(siguiente);
  actualizarBotonesHistorial();
  return true;
}

function borrarTodo() {
  guardarEstadoDeshacer();
  ctxDibujo.clearRect(0, 0, lienzoPrincipal.clientWidth, lienzoPrincipal.clientHeight);
}

/* ---------- Conexión de los botones Deshacer / Rehacer ---------- */
document.getElementById('btn-undo').addEventListener('click', () => {
  if (!deshacer()) return; // no había nada para deshacer
  window.CrearLibreApp?.anunciar('Se deshizo el último trazo');
  window.CrearLibreAudio?.tono({ frecuencia: 440, duracion: 0.14 });
  window.CrearLibreAudio?.tono({ frecuencia: 330, duracion: 0.16, retraso: 0.09 });
});
document.getElementById('btn-redo').addEventListener('click', () => {
  if (!rehacer()) return; // no había nada para rehacer
  window.CrearLibreApp?.anunciar('Se rehizo el trazo');
  window.CrearLibreAudio?.tono({ frecuencia: 330, duracion: 0.14 });
  window.CrearLibreAudio?.tono({ frecuencia: 440, duracion: 0.16, retraso: 0.09 });
});

/* ---------- Ajuste de tamaño sin perder lo dibujado ---------- */
function ajustarCanvas() {
  const rect = lienzoPrincipal.parentElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return; // el panel está oculto: no tocar el lienzo

  const dpr = window.devicePixelRatio || 1;
  const anchoNuevo = Math.max(1, Math.round(rect.width * dpr));
  const altoNuevo = Math.max(1, Math.round(rect.height * dpr));
  const yaTieneEseTamano = lienzoPrincipal.width === anchoNuevo && lienzoPrincipal.height === altoNuevo;
  if (yaTieneEseTamano) return; // nada que hacer, no perdamos el dibujo redimensionando sin necesidad

  // Redimensionar un <canvas> borra su contenido: guardamos una copia
  // antes y la volvemos a pintar después, en el tamaño nuevo.
  const teniaContenidoPrevio = lienzoPrincipal.width > 0 && lienzoPrincipal.height > 0;
  const imagenPrevia = teniaContenidoPrevio ? lienzoPrincipal.toDataURL('image/png') : null;

  [capaFondo, lienzoPrincipal, capaPlantilla].forEach((c) => {
    c.width = anchoNuevo;
    c.height = altoNuevo;
  });
  ctxFondo.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctxDibujo.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctxPlantilla.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Fondo blanco persistente (capa inferior, según el brief original).
  ctxFondo.fillStyle = '#ffffff';
  ctxFondo.fillRect(0, 0, capaFondo.clientWidth, capaFondo.clientHeight);

  window.CrearLibreTemplates?.dibujar(estado.plantillaActual);

  if (imagenPrevia) {
    const img = new Image();
    img.onload = () => {
      ctxDibujo.drawImage(img, 0, 0, lienzoPrincipal.clientWidth, lienzoPrincipal.clientHeight);
    };
    img.src = imagenPrevia;
  }
}
window.addEventListener('resize', ajustarCanvas);

/* ---------- Dibujo con puntero (mouse / touch / lápiz) ---------- */
let dibujando = false;
let ultimoPunto = null;

function posicionRelativa(evento) {
  const rect = lienzoPrincipal.getBoundingClientRect();
  return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
}

function pintarPunto(p) {
  if (estado.herramienta === 'sello') {
    ctxDibujo.font = '40px sans-serif';
    ctxDibujo.textAlign = 'center';
    ctxDibujo.textBaseline = 'middle';
    ctxDibujo.fillText(estado.sello, p.x, p.y);
    window.CrearLibreAudio?.tonoSello(estado.sello);
  } else {
    ctxDibujo.fillStyle = estado.herramienta === 'goma' ? '#ffffff' : estado.color;
    ctxDibujo.globalCompositeOperation = estado.herramienta === 'goma' ? 'destination-out' : 'source-over';
    ctxDibujo.beginPath();
    ctxDibujo.arc(p.x, p.y, estado.grosor / 2, 0, Math.PI * 2);
    ctxDibujo.fill();
  }
}

lienzoPrincipal.addEventListener('pointerdown', (evento) => {
  lienzoPrincipal.setPointerCapture(evento.pointerId);
  guardarEstadoDeshacer();
  dibujando = true;
  const p = posicionRelativa(evento);
  ultimoPunto = p;
  ctxDibujo.beginPath();
  ctxDibujo.moveTo(p.x, p.y);
  pintarPunto(p);
  if (estado.herramienta !== 'sello') window.CrearLibreAudio?.iniciarSonidoDibujo();
});

lienzoPrincipal.addEventListener('pointermove', (evento) => {
  if (!dibujando) return;
  if (estado.herramienta === 'sello') return; // los sellos se estampan de a uno, no se "dibuja" arrastrando

  const pReal = posicionRelativa(evento);

  // Imán de líneas: el trazo "sigue" al puntero con un poco de retraso,
  // así los micro-temblores del pulso no quedan marcados en el dibujo.
  const factor = estado.imanLineasActivo ? 0.35 : 1;
  const p = {
    x: ultimoPunto.x + (pReal.x - ultimoPunto.x) * factor,
    y: ultimoPunto.y + (pReal.y - ultimoPunto.y) * factor
  };

  ctxDibujo.lineJoin = 'round';
  ctxDibujo.lineCap = 'round';
  ctxDibujo.lineWidth = estado.grosor;
  ctxDibujo.strokeStyle = estado.herramienta === 'goma' ? '#ffffff' : estado.color;
  ctxDibujo.globalCompositeOperation = estado.herramienta === 'goma' ? 'destination-out' : 'source-over';

  const medio = { x: (ultimoPunto.x + p.x) / 2, y: (ultimoPunto.y + p.y) / 2 };
  ctxDibujo.quadraticCurveTo(ultimoPunto.x, ultimoPunto.y, medio.x, medio.y);
  ctxDibujo.stroke();
  ultimoPunto = p;

  window.CrearLibreAudio?.actualizarSonidoDibujo(pReal.y, lienzoPrincipal.clientHeight);
});

function terminarTrazo() {
  dibujando = false;
  ultimoPunto = null;
  window.CrearLibreAudio?.detenerSonidoDibujo();
}
lienzoPrincipal.addEventListener('pointerup', terminarTrazo);
lienzoPrincipal.addEventListener('pointercancel', terminarTrazo);

/* ---------- Dibujo por teclado (accesibilidad para quien no usa puntero) ---------- */
let posTeclado = { x: 60, y: 60 };
lienzoPrincipal.addEventListener('keydown', (evento) => {
  const paso = 12;
  let semovio = true;
  if (evento.key === 'ArrowRight') posTeclado.x += paso;
  else if (evento.key === 'ArrowLeft') posTeclado.x -= paso;
  else if (evento.key === 'ArrowDown') posTeclado.y += paso;
  else if (evento.key === 'ArrowUp') posTeclado.y -= paso;
  else if (evento.key === ' ' || evento.key === 'Enter') {
    guardarEstadoDeshacer();
    pintarPunto(posTeclado);
    semovio = false;
  } else {
    semovio = false;
  }
  if (semovio || evento.key === ' ' || evento.key === 'Enter') evento.preventDefault();
});

/* ---------- API pública para tools.js, gallery.js y app.js ---------- */
window.CrearLibreCanvas = {
  estado,
  ctxFondo, ctxDibujo, ctxPlantilla,
  capaFondo, lienzoPrincipal, capaPlantilla,
  ajustarCanvas,
  guardarEstadoDeshacer,
  deshacer,
  rehacer,
  borrarTodo,
  actualizarBotonesHistorial,
  obtenerImagenActual: () => lienzoPrincipal.toDataURL('image/png'),
  cargarImagen: (dataUrl) => {
    guardarEstadoDeshacer();
    restaurarDesdeDataUrl(dataUrl);
  }
};