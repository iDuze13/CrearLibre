/**
 * CrearLibre — app.js
 * Punto de entrada de la aplicación. Importa el resto de los módulos en
 * el orden que necesitan (canvas.js primero, porque tools.js y
 * adult-panel.js dependen de `window.CrearLibreCanvas` al cargarse),
 * maneja las pestañas Pintar / Formas / Dibujos, expone `anunciar()`
 * para los lectores de pantalla, y arranca la app.
 */

import './canvas.js';
import './tools.js';
import './audio.js';
import './gallery.js';
import './adult-panel.js';

/* ---------- Anuncios para lectores de pantalla (aria-live) ---------- */
const anunciadorEstado = document.getElementById('anunciador-estado');
function anunciar(mensaje) {
  anunciadorEstado.textContent = mensaje;
}

/* ---------- Pestañas Pintar / Formas / Dibujos ---------- */
const pestañas = {
  pintar: { boton: document.getElementById('nav-pintar'), panel: document.getElementById('panel-pintar') },
  formas: { boton: document.getElementById('nav-formas'), panel: document.getElementById('panel-formas') },
  dibujos: { boton: document.getElementById('nav-dibujos'), panel: document.getElementById('panel-dibujos') }
};

function activarPestaña(nombre) {
  Object.entries(pestañas).forEach(([clave, { boton, panel }]) => {
    const activa = clave === nombre;
    boton.setAttribute('aria-selected', String(activa));
    boton.tabIndex = activa ? 0 : -1;
    panel.hidden = !activa;
    panel.classList.toggle('oculto', !activa);
  });
  // El lienzo pudo haber quedado con un tamaño desactualizado mientras
  // el panel estaba oculto (display:none no tiene ancho/alto real).
  if (nombre === 'pintar') requestAnimationFrame(() => window.CrearLibreCanvas.ajustarCanvas());
}

Object.entries(pestañas).forEach(([clave, { boton }]) => {
  boton.addEventListener('click', () => {
    activarPestaña(clave);
    window.CrearLibreAudio?.tono({ frecuencia: 370, duracion: 0.15, volumen: 0.1 });
  });
});

/* ---------- Pantalla completa ---------- */
const btnPantallaCompleta = document.getElementById('btn-pantalla-completa');
btnPantallaCompleta.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    anunciar('Este navegador no permite pantalla completa en este momento.');
  }
});
document.addEventListener('fullscreenchange', () => {
  const activa = !!document.fullscreenElement;
  btnPantallaCompleta.setAttribute('aria-pressed', String(activa));
  const usoIcono = btnPantallaCompleta.querySelector('use');
  usoIcono.setAttribute('href', activa ? '#icono-pantalla-completa-salir' : '#icono-pantalla-completa');
});

/* ---------- Registro del service worker (funcionamiento offline) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Si falla el registro (por ejemplo al abrir el archivo sin
      // servidor local), la app sigue funcionando igual, solo que sin
      // caché offline.
    });
  });
}

/* ---------- API pública para el resto de los módulos ---------- */
window.CrearLibreApp = {
  anunciar,
  irAPintar: () => activarPestaña('pintar')
};

/* ---------- Arranque ---------- */
window.CrearLibreCanvas.ajustarCanvas();
window.CrearLibreGallery.cargarGaleriaGuardada();
