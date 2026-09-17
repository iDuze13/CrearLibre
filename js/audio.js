/**
 * CrearLibre — audio.js
 * Tonos cálidos procedurales (300-600Hz) vía Web Audio API, sin archivos
 * de audio externos. Solo suenan en acciones puntuales (elegir
 * herramienta/color/sello, guardar, deshacer, confirmar con "mantener
 * presionado"): nunca un tono continuo por cada trazo, porque eso sería
 * sobrecarga sensorial en vez de calma.
 *
 * Respeta el interruptor "Efectos sonoros" del panel del acompañante
 * (ver adult-panel.js), que llama a `setSilenciado(true/false)`.
 */

let silenciado = false;
let sonidoAlDibujarActivo = false;
let audioCtx = null;

function obtenerAudioContext() {
  if (silenciado) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/**
 * Reproduce un tono corto con una envolvente suave (ataque rápido,
 * caída exponencial) para que nunca se escuche un "click" seco.
 */
function tono({ frecuencia = 440, duracion = 0.18, tipo = 'sine', volumen = 0.14, retraso = 0 } = {}) {
  const ctx = obtenerAudioContext();
  if (!ctx) return;
  const inicio = ctx.currentTime + retraso;
  const osc = ctx.createOscillator();
  const ganancia = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, inicio);
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.linearRampToValueAtTime(volumen, inicio + 0.02);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(ganancia).connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
}

function tonoSello(emoji) {
  const frecuencias = window.CrearLibreTools?.FRECUENCIA_SELLO || {};
  tono({ frecuencia: frecuencias[emoji] || 440, duracion: 0.25, tipo: 'triangle' });
}

/* ---------- Zumbido suave y opcional mientras se dibuja ----------
   El tono sube o baja según la altura del trazo en el lienzo, como un
   "theremín" cálido y discreto. Apagado por defecto. */
let osciladorDibujo = null, gananciaDibujo = null;
function iniciarSonidoDibujo() {
  if (!sonidoAlDibujarActivo) return;
  const ctx = obtenerAudioContext();
  if (!ctx) return;
  osciladorDibujo = ctx.createOscillator();
  gananciaDibujo = ctx.createGain();
  osciladorDibujo.type = 'sine';
  osciladorDibujo.frequency.setValueAtTime(400, ctx.currentTime);
  gananciaDibujo.gain.setValueAtTime(0.0001, ctx.currentTime);
  gananciaDibujo.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.1);
  osciladorDibujo.connect(gananciaDibujo).connect(ctx.destination);
  osciladorDibujo.start();
}
function actualizarSonidoDibujo(y, altoLienzo) {
  if (!osciladorDibujo || !audioCtx) return;
  const proporcion = 1 - Math.min(Math.max(y / Math.max(altoLienzo, 1), 0), 1);
  osciladorDibujo.frequency.setValueAtTime(320 + proporcion * 240, audioCtx.currentTime);
}
function detenerSonidoDibujo() {
  if (!osciladorDibujo || !audioCtx) return;
  const ahora = audioCtx.currentTime;
  gananciaDibujo.gain.cancelScheduledValues(ahora);
  gananciaDibujo.gain.setValueAtTime(gananciaDibujo.gain.value, ahora);
  gananciaDibujo.gain.linearRampToValueAtTime(0.0001, ahora + 0.15);
  osciladorDibujo.stop(ahora + 0.18);
  osciladorDibujo = null; gananciaDibujo = null;
}

/* ---------- Tono continuo para los botones de "mantener presionado" ----------
   Sube de tono a medida que avanza el mantener-presionado (borrar todo,
   vaciar galería, abrir el panel acompañante), dando una pista auditiva
   de que la acción se está por confirmar. */
let osciladorHold = null, gananciaHold = null;
function iniciarTonoHold() {
  const ctx = obtenerAudioContext();
  if (!ctx) return;
  osciladorHold = ctx.createOscillator();
  gananciaHold = ctx.createGain();
  osciladorHold.type = 'sine';
  osciladorHold.frequency.setValueAtTime(320, ctx.currentTime);
  gananciaHold.gain.setValueAtTime(0.0001, ctx.currentTime);
  gananciaHold.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.05);
  osciladorHold.connect(gananciaHold).connect(ctx.destination);
  osciladorHold.start();
}
function actualizarTonoHold(porcentaje0a100) {
  if (!osciladorHold || !audioCtx) return;
  osciladorHold.frequency.setValueAtTime(320 + (porcentaje0a100 / 100) * 280, audioCtx.currentTime);
}
function detenerTonoHold() {
  if (!osciladorHold || !audioCtx) return;
  const ahora = audioCtx.currentTime;
  gananciaHold.gain.cancelScheduledValues(ahora);
  gananciaHold.gain.setValueAtTime(gananciaHold.gain.value, ahora);
  gananciaHold.gain.linearRampToValueAtTime(0.0001, ahora + 0.12);
  osciladorHold.stop(ahora + 0.15);
  osciladorHold = null; gananciaHold = null;
}

/* ---------- Interruptores controlados desde adult-panel.js ---------- */
function setSilenciado(valor) {
  silenciado = valor;
}
function setSonidoAlDibujarActivo(valor) {
  sonidoAlDibujarActivo = valor;
}

window.CrearLibreAudio = {
  tono,
  tonoSello,
  iniciarSonidoDibujo, actualizarSonidoDibujo, detenerSonidoDibujo,
  iniciarTonoHold, actualizarTonoHold, detenerTonoHold,
  setSilenciado, setSonidoAlDibujarActivo
};
