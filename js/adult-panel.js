/**
 * CrearLibre — adult-panel.js
 * Modal accesible protegido por pulsación larga (3s) para docentes/
 * terapeutas: atrapamiento de foco, cierre con Escape, y todos sus
 * interruptores (sonidos, modo simplificado, imán de líneas, sonido al
 * dibujar, lectura de voz). También centraliza el patrón genérico de
 * "mantener presionado para confirmar", usado acá y en Borrar todo /
 * Vaciar galería.
 */

const { estado } = window.CrearLibreCanvas;

/* =========================================================================
   Patrón genérico: mantener presionado para confirmar una acción crítica.
   Sin cuadros nativos de alerta — solo la barra de progreso visual y el
   tono ascendente de audio.js.
   ========================================================================= */
function conectarHold(boton, elementoRelleno, alCompletar) {
  const ms = Number(boton.dataset.holdMs || 2000);
  let inicio = null, raf = null;

  function paso() {
    const transcurrido = Date.now() - inicio;
    const porcentaje = Math.min((transcurrido / ms) * 100, 100);
    if (elementoRelleno) elementoRelleno.style.width = porcentaje + '%';
    window.CrearLibreAudio?.actualizarTonoHold(porcentaje);
    if (transcurrido >= ms) { cancelar(); alCompletar(); return; }
    raf = requestAnimationFrame(paso);
  }
  function iniciar(evento) {
    evento.preventDefault();
    inicio = Date.now();
    window.CrearLibreAudio?.iniciarTonoHold();
    raf = requestAnimationFrame(paso);
  }
  function cancelar() {
    if (raf) cancelAnimationFrame(raf);
    raf = null; inicio = null;
    if (elementoRelleno) elementoRelleno.style.width = '0%';
    window.CrearLibreAudio?.detenerTonoHold();
  }
  boton.addEventListener('pointerdown', iniciar);
  boton.addEventListener('pointerup', cancelar);
  boton.addEventListener('pointerleave', cancelar);
  boton.addEventListener('pointercancel', cancelar);
}

/* =========================================================================
   Apertura / cierre del cajón, con foco atrapado y retorno de foco.
   ========================================================================= */
const cajon = document.getElementById('adult-drawer');
const fondoModal = document.getElementById('fondo-modal');
const btnAjustes = document.getElementById('btn-ajustes');
const btnCerrarCajon = document.getElementById('close-drawer');

function elementosEnfocablesDelCajon() {
  return Array.from(cajon.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])'))
    .filter((el) => el.offsetParent !== null);
}

function atraparFoco(evento) {
  if (evento.key !== 'Tab') return;
  const enfocables = elementosEnfocablesDelCajon();
  if (enfocables.length === 0) return;
  const primero = enfocables[0];
  const ultimo = enfocables[enfocables.length - 1];
  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}

function abrirCajon() {
  cajon.hidden = false;
  fondoModal.hidden = false;
  btnCerrarCajon.focus();
  cajon.addEventListener('keydown', atraparFoco);
  window.CrearLibreAudio?.tono({ frecuencia: 440, duracion: 0.14 });
  window.CrearLibreAudio?.tono({ frecuencia: 560, duracion: 0.2, retraso: 0.1 });
}
function cerrarCajon() {
  cajon.hidden = true;
  fondoModal.hidden = true;
  cajon.removeEventListener('keydown', atraparFoco);
  btnAjustes.focus();
}

conectarHold(btnAjustes, document.getElementById('progreso-ajustes'), abrirCajon);
btnCerrarCajon.addEventListener('click', cerrarCajon);
fondoModal.addEventListener('click', cerrarCajon);
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && !cajon.hidden) cerrarCajon();
});

/* =========================================================================
   Borrar todo y Vaciar galería: mismo patrón de mantener presionado.
   ========================================================================= */
conectarHold(document.getElementById('btn-clear'), document.getElementById('clear-progress'), () => {
  window.CrearLibreCanvas.borrarTodo();
  window.CrearLibreApp?.anunciar('Se borró todo el dibujo');
  window.CrearLibreAudio?.tono({ frecuencia: 600, duracion: 0.1 });
  window.CrearLibreAudio?.tono({ frecuencia: 300, duracion: 0.22, retraso: 0.09 });
});

conectarHold(document.getElementById('btn-purgar-galeria'), document.getElementById('purge-progress'), async () => {
  await window.CrearLibreGallery.vaciarGaleria();
  window.CrearLibreApp?.anunciar('Se vació la galería local');
  window.CrearLibreAudio?.tono({ frecuencia: 600, duracion: 0.1 });
  window.CrearLibreAudio?.tono({ frecuencia: 300, duracion: 0.22, retraso: 0.09 });
});

/* =========================================================================
   Interruptores del cajón
   ========================================================================= */

/* --- Efectos sonoros (con sincronía de ida y vuelta con el header) --- */
const checkSilenciar = document.getElementById('check-silenciar');
const btnSilenciarRapido = document.getElementById('btn-silenciar-rapido');

function sincronizarSilencio(silenciadoNuevo) {
  window.CrearLibreAudio?.setSilenciado(silenciadoNuevo);
  checkSilenciar.checked = !silenciadoNuevo;
  btnSilenciarRapido.setAttribute('aria-pressed', String(silenciadoNuevo));
  btnSilenciarRapido.querySelector('use').setAttribute('href', silenciadoNuevo ? '#icono-volumen-apagado' : '#icono-volumen');
}
checkSilenciar.addEventListener('change', () => sincronizarSilencio(!checkSilenciar.checked));
btnSilenciarRapido.addEventListener('click', () => {
  sincronizarSilencio(btnSilenciarRapido.getAttribute('aria-pressed') !== 'true');
});

/* --- Modo interfaz simplificada: solo dibujo libre, 3 colores básicos --- */
const COLORES_BASICOS = ['#ba1a1a', '#031f41', '#ffba27'];
document.getElementById('check-modo-simple').addEventListener('change', (evento) => {
  const activo = evento.target.checked;
  document.body.classList.toggle('modo-simple', activo);
  if (activo) {
    if (estado.herramienta === 'sello') window.CrearLibreTools.seleccionarHerramienta('pincel');
    if (!COLORES_BASICOS.includes(estado.color)) {
      document.querySelector('.color-dot[data-color="#031f41"]').click();
    }
    if (document.getElementById('nav-formas').getAttribute('aria-selected') === 'true') {
      window.CrearLibreApp?.irAPintar();
    }
  }
  window.CrearLibreApp?.anunciar(activo
    ? 'Modo simplificado activado: solo dibujo libre con tres colores básicos.'
    : 'Modo simplificado desactivado.');
});

/* --- Imán de líneas --- */
document.getElementById('check-iman-lineas').addEventListener('change', (evento) => {
  estado.imanLineasActivo = evento.target.checked;
  window.CrearLibreApp?.anunciar(estado.imanLineasActivo ? 'Imán de líneas activado' : 'Imán de líneas desactivado');
});

/* --- Sonido al dibujar (opcional, apagado por defecto) --- */
document.getElementById('check-sonido-dibujo').addEventListener('change', (evento) => {
  window.CrearLibreAudio?.setSonidoAlDibujarActivo(evento.target.checked);
  window.CrearLibreApp?.anunciar(evento.target.checked ? 'Sonido al dibujar activado' : 'Sonido al dibujar desactivado');
});

/* --- Lectura de voz de los controles (Speech Synthesis) --- */
let lecturaVozActiva = false;
function nombreLegible(el) {
  const etiqueta = el.getAttribute('aria-label');
  if (etiqueta) return etiqueta.replace(/\s+/g, ' ').trim();
  // Sin aria-label: leemos solo el texto visible, ignorando íconos SVG decorativos.
  const copia = el.cloneNode(true);
  copia.querySelectorAll('[aria-hidden="true"]').forEach((nodo) => nodo.remove());
  return copia.textContent.replace(/\s+/g, ' ').trim();
}
function hablar(texto) {
  if (!texto || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterancia = new SpeechSynthesisUtterance(texto);
  utterancia.lang = 'es-AR';
  utterancia.rate = 0.95;
  window.speechSynthesis.speak(utterancia);
}
document.addEventListener('pointerdown', (evento) => {
  if (!lecturaVozActiva) return;
  const el = evento.target.closest('button, [role="radio"], input[type="checkbox"]');
  if (el) hablar(nombreLegible(el));
}, true);
document.addEventListener('focusin', (evento) => {
  if (!lecturaVozActiva) return;
  const el = evento.target.closest('button, [role="radio"], input[type="checkbox"]');
  if (el) hablar(nombreLegible(el));
});
document.getElementById('check-lectura-voz').addEventListener('change', (evento) => {
  lecturaVozActiva = evento.target.checked;
  window.CrearLibreApp?.anunciar(lecturaVozActiva ? 'Lectura en voz alta activada' : 'Lectura en voz alta desactivada');
  if (lecturaVozActiva) hablar('Lectura en voz alta activada');
  else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});

window.CrearLibreAdultPanel = { conectarHold };
