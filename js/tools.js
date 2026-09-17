/**
 * CrearLibre — tools.js
 * Lógica de selección de herramienta (pincel/sello/goma), paleta de
 * colores, sellos, grosor de trazo, y el dibujo de las plantillas guía
 * (capa aparte, inmune a la goma). Depende de `window.CrearLibreCanvas`
 * (canvas.js) y usa `window.CrearLibreAudio` si está disponible.
 */

const { estado, ctxPlantilla, capaPlantilla } = window.CrearLibreCanvas;

/* ---------- Frecuencias para el tonito de cada color y sello ----------
   (Ver audio.js: son solo datos, el sonido en sí lo reproduce ese módulo.) */
const FRECUENCIA_COLOR = {
  '#ba1a1a': 330, '#031f41': 392, '#ffba27': 440, '#006a60': 349,
  '#cd9200': 415, '#485f84': 466, '#473000': 311, '#191c1e': 523,
  '#FF9EC4': 373, '#7FD1F5': 405, '#C9A6F2': 455, '#FFE066': 490,
  '#A8E6A3': 340, '#FFB067': 519, '#8AA9E0': 383, '#7FE0D0': 470,
  '#FF8A80': 545
};
const FRECUENCIA_SELLO = {
  '⭐': 523, '☀️': 440, '🦋': 587, '❤️': 392, '😊': 466,
  '🌸': 410, '🐶': 355, '🐰': 500, '🐢': 320, '🐬': 445,
  '🦄': 560, '🍀': 335, '🌈': 480, '🎈': 375, '🍎': 400,
  '🌙': 300, '⚽': 430, '🎵': 515, '🍦': 460, '🧸': 345
};

/* ---------- Selección de herramienta (Pincel / Sellos / Goma) ---------- */
function seleccionarHerramienta(idHerramienta) {
  estado.herramienta = idHerramienta;
  document.querySelectorAll('#tool-brush, #tool-stamp, #tool-eraser').forEach((btn) => {
    const activo = btn.id === (idHerramienta === 'pincel' ? 'tool-brush' : idHerramienta === 'sello' ? 'tool-stamp' : 'tool-eraser');
    btn.setAttribute('aria-pressed', String(activo));
  });

  // La goma es una acción de "modo" que vive junto a los colores, pero
  // reutiliza el mismo estado.herramienta = 'goma' que el resto del motor.
  const grupoColores = document.getElementById('grupo-colores');
  const grupoSellos = document.getElementById('grupo-sellos');
  const esSello = idHerramienta === 'sello';
  grupoColores.classList.toggle('oculto', esSello);
  grupoSellos.hidden = !esSello;

  window.CrearLibreAudio?.tono({
    frecuencia: idHerramienta === 'pincel' ? 350 : idHerramienta === 'sello' ? 420 : 300,
    duracion: 0.15
  });
}

document.getElementById('tool-brush').addEventListener('click', () => seleccionarHerramienta('pincel'));
document.getElementById('tool-stamp').addEventListener('click', () => seleccionarHerramienta('sello'));
document.getElementById('tool-eraser').addEventListener('click', () => seleccionarHerramienta('goma'));

/* ---------- Paleta de colores ---------- */
document.querySelectorAll('.color-dot').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach((b) => {
      b.setAttribute('aria-checked', 'false');
      b.classList.remove('color-dot-activo');
      b.innerHTML = '';
    });
    boton.setAttribute('aria-checked', 'true');
    boton.classList.add('color-dot-activo');
    boton.innerHTML = '<svg class="icono-svg icono-check-color" aria-hidden="true"><use href="#icono-check"></use></svg>';
    estado.color = boton.dataset.color;
    // Elegir un color no tiene sentido con la goma activa: volvemos a pincel.
    if (estado.herramienta !== 'pincel') seleccionarHerramienta('pincel');
    window.CrearLibreAudio?.tono({ frecuencia: FRECUENCIA_COLOR[estado.color] || 440, duracion: 0.22 });
  });
});

/* ---------- Sellos ---------- */
document.querySelectorAll('.sello-btn').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.sello-btn').forEach((b) => {
      b.setAttribute('aria-checked', 'false');
      b.classList.remove('sello-activo');
    });
    boton.setAttribute('aria-checked', 'true');
    boton.classList.add('sello-activo');
    estado.sello = boton.dataset.sello;
    window.CrearLibreAudio?.tono({ frecuencia: FRECUENCIA_SELLO[estado.sello] || 440, duracion: 0.25, tipo: 'triangle' });
  });
});

/* ---------- Grosor del trazo ---------- */
document.querySelectorAll('.boton-grosor').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.boton-grosor').forEach((b) => {
      b.setAttribute('aria-checked', 'false');
      b.classList.remove('boton-grosor-activo');
    });
    boton.setAttribute('aria-checked', 'true');
    boton.classList.add('boton-grosor-activo');
    estado.grosor = Number(boton.dataset.grosor);
    window.CrearLibreAudio?.tono({ frecuencia: 300 + estado.grosor * 5, duracion: 0.12 });
  });
});

/* ---------- Flechas para recorrer colores/sellos y láminas ---------- */
function desplazar(contenedor, direccion) {
  if (!contenedor) return;
  contenedor.scrollBy({ left: direccion * 170, behavior: 'smooth' });
  window.CrearLibreAudio?.tono({ frecuencia: 380, duracion: 0.08, volumen: 0.08 });
}
function grupoPaletaVisible() {
  const colores = document.getElementById('grupo-colores');
  return colores.classList.contains('oculto') ? document.getElementById('grupo-sellos') : colores;
}
document.getElementById('flecha-paleta-izq').addEventListener('click', () => desplazar(grupoPaletaVisible(), -1));
document.getElementById('flecha-paleta-der').addEventListener('click', () => desplazar(grupoPaletaVisible(), 1));
document.getElementById('flecha-laminas-izq')?.addEventListener('click', () => desplazar(document.getElementById('tira-plantillas'), -1));
document.getElementById('flecha-laminas-der')?.addEventListener('click', () => desplazar(document.getElementById('tira-plantillas'), 1));

/* =========================================================================
   Plantillas guía — capa aparte que la goma nunca toca. Todo se dibuja
   con curvas suaves, escalado proporcionalmente al tamaño real del
   lienzo (diseñado sobre una grilla imaginaria de 480x480).
   ========================================================================= */
function dibujarPlantilla(nombre) {
  const w = capaPlantilla.clientWidth, h = capaPlantilla.clientHeight;
  ctxPlantilla.clearRect(0, 0, w, h);
  if (!nombre || nombre === 'ninguna' || w === 0 || h === 0) return;

  const escala = Math.max(Math.min(w, h) / 480, 0.25);
  const cx = w / 2, cy = h / 2;
  const P = (dx, dy) => ({ x: cx + dx * escala, y: cy + dy * escala });

  const trazo = (...puntos) => {
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(puntos[0].x, puntos[0].y);
    for (let i = 1; i < puntos.length; i += 2) {
      if (puntos[i + 1]) ctxPlantilla.quadraticCurveTo(puntos[i].x, puntos[i].y, puntos[i + 1].x, puntos[i + 1].y);
    }
    ctxPlantilla.stroke();
  };
  const circulo = (dx, dy, r) => {
    const c = P(dx, dy);
    ctxPlantilla.beginPath();
    ctxPlantilla.arc(c.x, c.y, r * escala, 0, Math.PI * 2);
    ctxPlantilla.stroke();
  };
  const estrella = (dx, dy, rExterior, rInterior, puntas = 5) => {
    const c = P(dx, dy);
    ctxPlantilla.beginPath();
    for (let i = 0; i < puntas * 2; i++) {
      const r = (i % 2 === 0 ? rExterior : rInterior) * escala;
      const ang = (Math.PI / puntas) * i - Math.PI / 2;
      const x = c.x + Math.cos(ang) * r;
      const y = c.y + Math.sin(ang) * r;
      if (i === 0) ctxPlantilla.moveTo(x, y); else ctxPlantilla.lineTo(x, y);
    }
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
  };

  ctxPlantilla.strokeStyle = '#b6bac3';
  ctxPlantilla.lineWidth = Math.max(4 * escala, 2.5);
  ctxPlantilla.lineJoin = 'round';
  ctxPlantilla.lineCap = 'round';

  if (nombre === 'flor') {
    trazo(P(4, 150), P(-18, 95), P(2, 42));
    trazo(P(4, 95), P(38, 78), P(18, 58));
    [[-42, 0], [42, 0], [0, -42], [0, 42]].forEach(([dx, dy]) => circulo(dx, dy, 30));
    circulo(0, 0, 20);
  } else if (nombre === 'pez') {
    const c = P(-5, 0);
    ctxPlantilla.beginPath();
    ctxPlantilla.ellipse(c.x, c.y, 95 * escala, 55 * escala, 0, 0, Math.PI * 2);
    ctxPlantilla.stroke();
    trazo(P(85, -10), P(150, -55), P(150, -55));
    trazo(P(85, 10), P(150, 55), P(150, 55));
    ctxPlantilla.beginPath(); ctxPlantilla.moveTo(P(150, -55).x, P(150, -55).y); ctxPlantilla.lineTo(P(150, 55).x, P(150, 55).y); ctxPlantilla.stroke();
    trazo(P(-25, -35), P(-5, -60), P(20, -40));
    const ojo = P(-50, -14);
    ctxPlantilla.beginPath(); ctxPlantilla.arc(ojo.x, ojo.y, 6 * escala, 0, Math.PI * 2); ctxPlantilla.fillStyle = '#b6bac3'; ctxPlantilla.fill();
  } else if (nombre === 'casa') {
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-90, -5).x, P(-90, -5).y);
    ctxPlantilla.lineTo(P(-90, 85).x, P(-90, 85).y);
    ctxPlantilla.quadraticCurveTo(P(-90, 100).x, P(-90, 100).y, P(-75, 100).x, P(-75, 100).y);
    ctxPlantilla.lineTo(P(75, 100).x, P(75, 100).y);
    ctxPlantilla.quadraticCurveTo(P(90, 100).x, P(90, 100).y, P(90, 85).x, P(90, 85).y);
    ctxPlantilla.lineTo(P(90, -5).x, P(90, -5).y);
    ctxPlantilla.stroke();
    trazo(P(-105, -5), P(0, -95), P(0, -95));
    ctxPlantilla.beginPath(); ctxPlantilla.moveTo(P(0, -95).x, P(0, -95).y); ctxPlantilla.lineTo(P(105, -5).x, P(105, -5).y); ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-25, 100).x, P(-25, 100).y);
    ctxPlantilla.lineTo(P(-25, 45).x, P(-25, 45).y);
    ctxPlantilla.quadraticCurveTo(P(-25, 35).x, P(-25, 35).y, P(-15, 35).x, P(-15, 35).y);
    ctxPlantilla.lineTo(P(15, 35).x, P(15, 35).y);
    ctxPlantilla.quadraticCurveTo(P(25, 35).x, P(25, 35).y, P(25, 45).x, P(25, 45).y);
    ctxPlantilla.lineTo(P(25, 100).x, P(25, 100).y);
    ctxPlantilla.stroke();
    circulo(-55, 30, 18);
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-55, 12).x, P(-55, 12).y); ctxPlantilla.lineTo(P(-55, 48).x, P(-55, 48).y);
    ctxPlantilla.moveTo(P(-73, 30).x, P(-73, 30).y); ctxPlantilla.lineTo(P(-37, 30).x, P(-37, 30).y);
    ctxPlantilla.stroke();
  } else if (nombre === 'gato') {
    const cabeza = P(0, -30);
    trazo(P(-75, -95), P(-100, -155), P(-35, -100));
    trazo(P(75, -95), P(100, -155), P(35, -100));
    ctxPlantilla.beginPath(); ctxPlantilla.arc(cabeza.x, cabeza.y, 90 * escala, 0, Math.PI * 2); ctxPlantilla.stroke();
    trazo(P(-45, -35), P(-32, -18), P(-15, -35));
    trazo(P(15, -35), P(32, -18), P(45, -35));
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-8, -8).x, P(-8, -8).y);
    ctxPlantilla.lineTo(P(8, -8).x, P(8, -8).y);
    ctxPlantilla.lineTo(P(0, 4).x, P(0, 4).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    trazo(P(0, 4), P(-15, 20), P(-30, 10));
    trazo(P(0, 4), P(15, 20), P(30, 10));
    [[-50, -10, -105, -20], [-50, 5, -105, 12], [50, -10, 105, -20], [50, 5, 105, 12]].forEach(([x1, y1, x2, y2]) => {
      const a = P(x1, y1), b = P(x2, y2);
      ctxPlantilla.beginPath(); ctxPlantilla.moveTo(a.x, a.y); ctxPlantilla.lineTo(b.x, b.y); ctxPlantilla.stroke();
    });
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-75, 60).x, P(-75, 60).y);
    ctxPlantilla.bezierCurveTo(P(-95, 140).x, P(-95, 140).y, P(95, 140).x, P(95, 140).y, P(75, 60).x, P(75, 60).y);
    ctxPlantilla.stroke();
    [[-35, 140], [35, 140]].forEach(([dx, dy]) => {
      const c = P(dx, dy);
      ctxPlantilla.beginPath();
      ctxPlantilla.ellipse(c.x, c.y, 24 * escala, 14 * escala, 0, 0, Math.PI * 2);
      ctxPlantilla.stroke();
    });
    trazo(P(78, 100), P(150, 90), P(140, 25));
  } else if (nombre === 'auto') {
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-140, 40).x, P(-140, 40).y);
    ctxPlantilla.quadraticCurveTo(P(-140, -15).x, P(-140, -15).y, P(-105, -20).x, P(-105, -20).y);
    ctxPlantilla.quadraticCurveTo(P(-85, -75).x, P(-85, -75).y, P(-35, -85).x, P(-35, -85).y);
    ctxPlantilla.quadraticCurveTo(P(0, -95).x, P(0, -95).y, P(35, -85).x, P(35, -85).y);
    ctxPlantilla.quadraticCurveTo(P(85, -75).x, P(85, -75).y, P(105, -20).x, P(105, -20).y);
    ctxPlantilla.quadraticCurveTo(P(140, -15).x, P(140, -15).y, P(140, 40).x, P(140, 40).y);
    ctxPlantilla.quadraticCurveTo(P(140, 60).x, P(140, 60).y, P(120, 60).x, P(120, 60).y);
    ctxPlantilla.lineTo(P(-120, 60).x, P(-120, 60).y);
    ctxPlantilla.quadraticCurveTo(P(-140, 60).x, P(-140, 60).y, P(-140, 40).x, P(-140, 40).y);
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-70, -25).x, P(-70, -25).y);
    ctxPlantilla.quadraticCurveTo(P(-55, -68).x, P(-55, -68).y, P(-10, -75).x, P(-10, -75).y);
    ctxPlantilla.lineTo(P(-10, -25).x, P(-10, -25).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(10, -25).x, P(10, -25).y);
    ctxPlantilla.lineTo(P(10, -75).x, P(10, -75).y);
    ctxPlantilla.quadraticCurveTo(P(55, -68).x, P(55, -68).y, P(70, -25).x, P(70, -25).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    circulo(-75, 60, 32); circulo(-75, 60, 10);
    circulo(75, 60, 32); circulo(75, 60, 10);
    circulo(-100, 25, 11); circulo(100, 25, 11);
    trazo(P(-20, 32), P(0, 46), P(20, 32));
  } else if (nombre === 'superheroe') {
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-35, -25).x, P(-35, -25).y);
    ctxPlantilla.quadraticCurveTo(P(-95, 10).x, P(-95, 10).y, P(-65, 105).x, P(-65, 105).y);
    ctxPlantilla.lineTo(P(65, 105).x, P(65, 105).y);
    ctxPlantilla.quadraticCurveTo(P(95, 10).x, P(95, 10).y, P(35, -25).x, P(35, -25).y);
    ctxPlantilla.stroke();
    trazo(P(-32, -10), P(-72, -40), P(-65, -80));
    circulo(-65, -80, 14);
    trazo(P(32, -10), P(72, -40), P(65, -80));
    circulo(65, -80, 14);
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-33, -25).x, P(-33, -25).y);
    ctxPlantilla.quadraticCurveTo(P(-42, 35).x, P(-42, 35).y, P(-28, 78).x, P(-28, 78).y);
    ctxPlantilla.lineTo(P(28, 78).x, P(28, 78).y);
    ctxPlantilla.quadraticCurveTo(P(42, 35).x, P(42, 35).y, P(33, -25).x, P(33, -25).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    estrella(0, 18, 18, 8);
    trazo(P(-18, 78), P(-24, 115), P(-18, 148));
    trazo(P(18, 78), P(24, 115), P(18, 148));
    [[-18, 152], [18, 152]].forEach(([dx, dy]) => {
      const c = P(dx, dy);
      ctxPlantilla.beginPath();
      ctxPlantilla.ellipse(c.x, c.y, 16 * escala, 11 * escala, 0, 0, Math.PI * 2);
      ctxPlantilla.stroke();
    });
    const cabezaH = P(0, -90);
    ctxPlantilla.beginPath(); ctxPlantilla.arc(cabezaH.x, cabezaH.y, 52 * escala, 0, Math.PI * 2); ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-42, -98).x, P(-42, -98).y);
    ctxPlantilla.quadraticCurveTo(P(0, -112).x, P(0, -112).y, P(42, -98).x, P(42, -98).y);
    ctxPlantilla.quadraticCurveTo(P(42, -83).x, P(42, -83).y, P(18, -83).x, P(18, -83).y);
    ctxPlantilla.quadraticCurveTo(P(0, -92).x, P(0, -92).y, P(-18, -83).x, P(-18, -83).y);
    ctxPlantilla.quadraticCurveTo(P(-42, -83).x, P(-42, -83).y, P(-42, -98).x, P(-42, -98).y);
    ctxPlantilla.stroke();
    trazo(P(-14, -55), P(0, -45), P(14, -55));
  } else if (nombre === 'oso') {
    circulo(-70, -110, 28);
    circulo(70, -110, 28);
    const cabezaOso = P(0, -35);
    ctxPlantilla.beginPath(); ctxPlantilla.arc(cabezaOso.x, cabezaOso.y, 95 * escala, 0, Math.PI * 2); ctxPlantilla.stroke();
    const hocico = P(0, 5);
    ctxPlantilla.beginPath(); ctxPlantilla.ellipse(hocico.x, hocico.y, 38 * escala, 26 * escala, 0, 0, Math.PI * 2); ctxPlantilla.stroke();
    circulo(0, -10, 10);
    circulo(-32, -45, 7); circulo(32, -45, 7);
    trazo(P(0, 16), P(-14, 30), P(-26, 20));
    trazo(P(0, 16), P(14, 30), P(26, 20));
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-78, 65).x, P(-78, 65).y);
    ctxPlantilla.bezierCurveTo(P(-98, 145).x, P(-98, 145).y, P(98, 145).x, P(98, 145).y, P(78, 65).x, P(78, 65).y);
    ctxPlantilla.stroke();
    [[-38, 145], [38, 145]].forEach(([dx, dy]) => {
      const c = P(dx, dy);
      ctxPlantilla.beginPath();
      ctxPlantilla.ellipse(c.x, c.y, 26 * escala, 16 * escala, 0, 0, Math.PI * 2);
      ctxPlantilla.stroke();
    });
  } else if (nombre === 'cohete') {
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-45, -40).x, P(-45, -40).y);
    ctxPlantilla.quadraticCurveTo(P(-55, -110).x, P(-55, -110).y, P(0, -165).x, P(0, -165).y);
    ctxPlantilla.quadraticCurveTo(P(55, -110).x, P(55, -110).y, P(45, -40).x, P(45, -40).y);
    ctxPlantilla.lineTo(P(45, 90).x, P(45, 90).y);
    ctxPlantilla.quadraticCurveTo(P(45, 105).x, P(45, 105).y, P(30, 100).x, P(30, 100).y);
    ctxPlantilla.lineTo(P(-30, 100).x, P(-30, 100).y);
    ctxPlantilla.quadraticCurveTo(P(-45, 105).x, P(-45, 105).y, P(-45, 90).x, P(-45, 90).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    circulo(0, -50, 24); circulo(0, -50, 11);
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-45, 35).x, P(-45, 35).y);
    ctxPlantilla.lineTo(P(-95, 95).x, P(-95, 95).y);
    ctxPlantilla.lineTo(P(-40, 80).x, P(-40, 80).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(45, 35).x, P(45, 35).y);
    ctxPlantilla.lineTo(P(95, 95).x, P(95, 95).y);
    ctxPlantilla.lineTo(P(40, 80).x, P(40, 80).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-25, 105).x, P(-25, 105).y);
    ctxPlantilla.quadraticCurveTo(P(-15, 140).x, P(-15, 140).y, P(0, 120).x, P(0, 120).y);
    ctxPlantilla.quadraticCurveTo(P(15, 145).x, P(15, 145).y, P(25, 105).x, P(25, 105).y);
    ctxPlantilla.stroke();
    [[-130, -95], [125, -55], [-110, 55], [120, 15]].forEach(([dx, dy]) => estrella(dx, dy, 10, 4));
  } else if (nombre === 'mariposa') {
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-5, -55).x, P(-5, -55).y);
    ctxPlantilla.quadraticCurveTo(P(-140, -90).x, P(-140, -90).y, P(-120, -10).x, P(-120, -10).y);
    ctxPlantilla.quadraticCurveTo(P(-100, 40).x, P(-100, 40).y, P(-5, 5).x, P(-5, 5).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(5, -55).x, P(5, -55).y);
    ctxPlantilla.quadraticCurveTo(P(140, -90).x, P(140, -90).y, P(120, -10).x, P(120, -10).y);
    ctxPlantilla.quadraticCurveTo(P(100, 40).x, P(100, 40).y, P(5, 5).x, P(5, 5).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(-5, 10).x, P(-5, 10).y);
    ctxPlantilla.quadraticCurveTo(P(-90, 20).x, P(-90, 20).y, P(-70, 70).x, P(-70, 70).y);
    ctxPlantilla.quadraticCurveTo(P(-50, 100).x, P(-50, 100).y, P(-5, 55).x, P(-5, 55).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.moveTo(P(5, 10).x, P(5, 10).y);
    ctxPlantilla.quadraticCurveTo(P(90, 20).x, P(90, 20).y, P(70, 70).x, P(70, 70).y);
    ctxPlantilla.quadraticCurveTo(P(50, 100).x, P(50, 100).y, P(5, 55).x, P(5, 55).y);
    ctxPlantilla.closePath();
    ctxPlantilla.stroke();
    ctxPlantilla.beginPath();
    ctxPlantilla.ellipse(P(0, 0).x, P(0, 0).y, 10 * escala, 75 * escala, 0, 0, Math.PI * 2);
    ctxPlantilla.stroke();
    circulo(0, -85, 16);
    trazo(P(-5, -95), P(-25, -125), P(-35, -135));
    trazo(P(5, -95), P(25, -125), P(35, -135));
  } else if (nombre === 'arcoiris') {
    const pivote = P(0, 55);
    [170, 135, 100, 65].forEach((r) => {
      ctxPlantilla.beginPath();
      ctxPlantilla.arc(pivote.x, pivote.y, r * escala, Math.PI, 2 * Math.PI);
      ctxPlantilla.stroke();
    });
    const nube = (dx, dy) => {
      [[-18, 0, 20], [10, -10, 26], [35, 0, 20]].forEach(([ox, oy, r]) => {
        const c = P(dx + ox, dy + oy);
        ctxPlantilla.beginPath(); ctxPlantilla.arc(c.x, c.y, r * escala, 0, Math.PI * 2); ctxPlantilla.stroke();
      });
    };
    nube(-185, 60);
    nube(145, 60);
  }
}

document.querySelectorAll('.tarjeta-plantilla-grande').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.tarjeta-plantilla-grande').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    boton.setAttribute('aria-pressed', 'true');
    estado.plantillaActual = boton.dataset.plantilla;
    window.CrearLibreApp?.irAPintar(); // primero mostramos el lienzo, recién ahí tiene tamaño real
    requestAnimationFrame(() => requestAnimationFrame(() => dibujarPlantilla(estado.plantillaActual)));
    const nombreVisible = boton.querySelector('span:last-child')?.textContent.trim() || '';
    window.CrearLibreApp?.anunciar('Lámina "' + nombreVisible + '" seleccionada');
  });
});

/* ---------- API pública ---------- */
window.CrearLibreTemplates = { dibujar: dibujarPlantilla };
window.CrearLibreTools = { seleccionarHerramienta, FRECUENCIA_COLOR, FRECUENCIA_SELLO };
