/**
 * CrearLibre — gallery.js
 * Base de datos IndexedDB, guardado/carga/borrado de dibujos, miniaturas
 * (tanto la tira "Mis creaciones" como la galería completa de la pestaña
 * "Dibujos"), y las acciones de Guardar / Bajar / Nuevo dibujo.
 */

const NOMBRE_DB = 'crearlibre-db';
const VERSION_DB = 1;
const ALMACEN_GALERIA = 'galeria';

function abrirBaseDeDatos() {
  return new Promise((resolve) => {
    if (!window.indexedDB) { resolve(null); return; }
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      if (!db.objectStoreNames.contains(ALMACEN_GALERIA)) {
        db.createObjectStore(ALMACEN_GALERIA, { keyPath: 'id', autoIncrement: true });
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => resolve(null); // sin IndexedDB, seguimos funcionando solo en memoria
  });
}
let dbPromise = null;
function obtenerDB() {
  if (!dbPromise) dbPromise = abrirBaseDeDatos();
  return dbPromise;
}

async function guardarEnGaleriaDB(dataUrl) {
  const db = await obtenerDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(ALMACEN_GALERIA, 'readwrite');
    const solicitud = tx.objectStore(ALMACEN_GALERIA).add({ dataUrl, fecha: Date.now() });
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => resolve(null);
  });
}
async function listarGaleriaDB() {
  const db = await obtenerDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(ALMACEN_GALERIA, 'readonly');
    const solicitud = tx.objectStore(ALMACEN_GALERIA).getAll();
    solicitud.onsuccess = () => resolve((solicitud.result || []).sort((a, b) => b.id - a.id));
    solicitud.onerror = () => resolve([]);
  });
}
async function eliminarDeGaleriaDB(id) {
  const db = await obtenerDB();
  if (!db || id == null) return;
  const tx = db.transaction(ALMACEN_GALERIA, 'readwrite');
  tx.objectStore(ALMACEN_GALERIA).delete(id);
}
async function vaciarGaleriaDB() {
  const db = await obtenerDB();
  if (!db) return;
  const tx = db.transaction(ALMACEN_GALERIA, 'readwrite');
  tx.objectStore(ALMACEN_GALERIA).clear();
}

/* ---------- Estado en memoria + referencias del DOM ---------- */
const galeria = []; // { id, dataUrl }
const listaGaleria = document.getElementById('lista-galeria');
const galeriaVacia = document.getElementById('galeria-vacia');
const tiraMiniaturas = document.getElementById('tira-miniaturas');
const plantillaItem = document.getElementById('plantilla-item-galeria');
const plantillaMiniatura = document.getElementById('plantilla-miniatura-tira');
const MAX_MINIATURAS_TIRA = 8;

function cargarImagenEnLienzo(dataUrl) {
  window.CrearLibreCanvas.cargarImagen(dataUrl);
  window.CrearLibreApp?.irAPintar();
}

function renderizarGaleria() {
  listaGaleria.innerHTML = '';
  galeriaVacia.classList.toggle('oculto', galeria.length > 0);
  galeria.forEach((item, indice) => {
    const nodo = plantillaItem.content.cloneNode(true);
    nodo.querySelector('.miniatura-galeria').src = item.dataUrl;
    nodo.querySelector('.boton-item-galeria').addEventListener('click', () => cargarImagenEnLienzo(item.dataUrl));
    nodo.querySelector('.boton-borrar-item-galeria').addEventListener('click', async () => {
      await eliminarDeGaleriaDB(item.id);
      galeria.splice(indice, 1);
      renderizarGaleria();
      renderizarTiraMiniaturas();
    });
    listaGaleria.appendChild(nodo);
  });
}

function renderizarTiraMiniaturas() {
  tiraMiniaturas.innerHTML = '';
  galeria.slice(0, MAX_MINIATURAS_TIRA).forEach((item) => {
    const nodo = plantillaMiniatura.content.cloneNode(true);
    nodo.querySelector('.miniatura-tira-imagen').src = item.dataUrl;
    nodo.querySelector('.miniatura-tira-item').addEventListener('click', () => cargarImagenEnLienzo(item.dataUrl));
    tiraMiniaturas.appendChild(nodo);
  });
}

async function cargarGaleriaGuardada() {
  const registros = await listarGaleriaDB();
  galeria.length = 0;
  registros.forEach((r) => galeria.push({ id: r.id, dataUrl: r.dataUrl }));
  renderizarGaleria();
  renderizarTiraMiniaturas();
}

async function vaciarGaleria() {
  await vaciarGaleriaDB();
  galeria.length = 0;
  renderizarGaleria();
  renderizarTiraMiniaturas();
}

/* ---------- Toast de confirmación ---------- */
let temporizadorToast = null;
function mostrarToast(mensaje) {
  const toast = document.getElementById('save-toast');
  toast.querySelector('span:last-child').textContent = mensaje;
  toast.classList.add('toast-visible');
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove('toast-visible'), 2200);
}

/* ---------- Guardar / Bajar / Nuevo dibujo ---------- */
document.getElementById('btn-save').addEventListener('click', async () => {
  const dataUrl = window.CrearLibreCanvas.obtenerImagenActual();
  const id = await guardarEnGaleriaDB(dataUrl);
  galeria.unshift({ id: id ?? ('local-' + Date.now()), dataUrl });
  renderizarGaleria();
  renderizarTiraMiniaturas();
  mostrarToast('¡Tu dibujo está a salvo! ✨');
  window.CrearLibreApp?.anunciar('Dibujo guardado en la galería');
  window.CrearLibreAudio?.tono({ frecuencia: 392, duracion: 0.14 });
  window.CrearLibreAudio?.tono({ frecuencia: 494, duracion: 0.14, retraso: 0.11 });
  window.CrearLibreAudio?.tono({ frecuencia: 587, duracion: 0.22, retraso: 0.22 });
});

document.getElementById('btn-download').addEventListener('click', () => {
  const fecha = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const enlace = document.createElement('a');
  enlace.download = 'crearlibre-' + fecha + '.png';
  enlace.href = window.CrearLibreCanvas.obtenerImagenActual();
  enlace.click();
  window.CrearLibreApp?.anunciar('Descargando dibujo');
  window.CrearLibreAudio?.tono({ frecuencia: 500, duracion: 0.18 });
});

document.getElementById('btn-nuevo-dibujo').addEventListener('click', () => {
  window.CrearLibreCanvas.borrarTodo();
  window.CrearLibreApp?.anunciar('Lienzo listo para un dibujo nuevo');
});

/* ---------- API pública (adult-panel.js llama a vaciarGaleria) ---------- */
window.CrearLibreGallery = {
  cargarGaleriaGuardada,
  vaciarGaleria,
  mostrarToast
};
