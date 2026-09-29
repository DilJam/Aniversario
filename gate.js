/* =============================================================
   🔐  gate.js — El index es obligatorio para entrar
   -------------------------------------------------------------
   Reglas:
   1) La contraseña (fecha DD/MM/AAAA) se ingresa SOLO en index.html.
   2) Al desbloquear el index se marca sessionStorage.anv_ok = '1'.
   3) Cada página de aniversario comprueba esa marca:
        · marca presente  → se abre normal (pasaste por el index).
        · marca ausente   → se redirige al index: NO se puede abrir
                            la URL directa ni saltarse el índice.
   4) Si el navegador no tiene sessionStorage (modo privado raro),
      se usa como respaldo la puerta con la fecha en cada página,
      para que nunca quede abierta "así por así".

   Cómo se usa (DEBE ir antes de </head>, sin defer ni async):

       <script src="./gate.js"></script>
   ============================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var INDEX_URL = './index.html';
  window.__GATE_LOADED__ = true;

  /* ── ¿Existe sessionStorage? (se sondea una sola vez) ── */
  var storage = null;
  try {
    window.sessionStorage.setItem('__gate_probe', '1');
    window.sessionStorage.removeItem('__gate_probe');
    storage = window.sessionStorage;
  } catch (e) { storage = null; }

  function passedIndex() {
    if (!storage) return false;
    try { return storage.getItem('anv_ok') === '1'; } catch (e) { return false; }
  }

  /* ── Estilos de la puerta (autocontenidos, no dependen de la página) ── */
  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var styleEl = document.createElement('style');
    styleEl.id = 'gate-style';
    styleEl.textContent = [
      /* Evita el "flash" del contenido antes de existir la puerta */
      'html.gate-pending body { visibility: hidden !important; }',
      'html.gate-locked, html.gate-locked body { overflow: hidden !important; }',

      '#gate-overlay {',
      '  position: fixed; inset: 0; box-sizing: border-box;',
      '  z-index: 2147483647;',
      '  display: flex; align-items: center; justify-content: center;',
      '  padding: 24px;',
      '  background: radial-gradient(ellipse at center, #1a0a3e 0%, #080818 100%);',
      '  font-family: \'Indie Flower\', \'Dancing Script\', cursive;',
      '  color: #e9d5ff; text-align: center;',
      '  opacity: 1; visibility: visible !important;',
      '  transition: opacity 0.8s ease, visibility 0.8s ease;',
      '  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);',
      '}',
      '#gate-overlay *, #gate-overlay *::before, #gate-overlay *::after { box-sizing: border-box; }',
      '#gate-overlay.gate-unlocked { opacity: 0; visibility: hidden !important; pointer-events: none; }',

      '.gate-box {',
      '  text-align: center; padding: 40px 32px; border-radius: 24px;',
      '  background: rgba(10, 5, 30, 0.85);',
      '  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);',
      '  border: 1px solid rgba(167,139,250,0.25);',
      '  box-shadow: 0 0 0 1px rgba(167,139,250,0.08), 0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);',
      '  width: min(400px, 90vw); max-width: 100%;',
      '  animation: gateFadeIn 0.8s ease both;',
      '}',

      '.gate-icon {',
      '  font-size: 64px; line-height: 1; margin: 0 0 16px; display: block;',
      '  animation: gatePulse 2s ease-in-out infinite;',
      '  filter: drop-shadow(0 0 20px rgba(167,139,250,0.6));',
      '}',

      '.gate-title {',
      '  font-family: \'Dancing Script\', cursive; font-weight: 700;',
      '  font-size: 28px; color: #a78bfa;',
      '  text-shadow: 0 0 10px rgba(167,139,250,0.7);',
      '  margin: 0 0 8px;',
      '}',

      '.gate-subtitle { font-size: 14px; color: #c4b5fd; margin: 0 0 24px; line-height: 1.5; }',
      '.gate-subtitle strong { color: #e9d5ff; }',
      '.gate-subtitle small { font-size: 12px; color: rgba(196,181,253,0.65); }',

      '.gate-input-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }',

      '.gate-input {',
      '  width: 100%;',
      '  background: rgba(20, 8, 50, 0.8);',
      '  border: 1.5px solid rgba(167,139,250,0.3);',
      '  border-radius: 12px; padding: 14px 16px;',
      '  color: #e9d5ff; font-family: \'Indie Flower\', cursive;',
      '  font-size: 20px; text-align: center; letter-spacing: 3px;',
      '  outline: none;',
      '  transition: border-color 0.3s ease, box-shadow 0.3s ease;',
      '}',
      '.gate-input:focus { border-color: rgba(167,139,250,0.8); box-shadow: 0 0 20px rgba(167,139,250,0.2); }',
      '.gate-input::placeholder { color: rgba(196,181,253,0.4); font-size: 14px; letter-spacing: 1px; }',
      '.gate-input.is-wrong { border-color: rgba(239, 68, 68, 0.7); animation: gateShake 0.4s ease; }',
      '.gate-btn {',
      '  cursor: pointer; width: 100%;',
      '  border: 1.5px solid rgba(167,139,250,0.4);',
      '  background: linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.3));',
      '  color: #e9d5ff; padding: 14px; border-radius: 12px;',
      '  font-size: 18px; font-family: \'Indie Flower\', cursive;',
      '  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;',
      '}',
      '.gate-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(124,58,237,0.4); border-color: rgba(167,139,250,0.8); }',
      '.gate-btn:active { transform: translateY(0); }',
      '.gate-btn:disabled { opacity: .6; cursor: wait; }',

      '.gate-error { font-size: 13px; color: rgba(239, 68, 68, 0.8); min-height: 20px; margin-top: 8px; }',
      '.gate-hint { margin-top: 16px; font-size: 12px; color: rgba(196,181,253,0.4); line-height: 1.4; }',

      '.gate-particle {',
      '  position: fixed; bottom: -40px; pointer-events: none; z-index: 2147483647;',
      '  user-select: none; animation: gateFloat linear forwards;',
      '}',

      '@keyframes gateFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }',
      '@keyframes gatePulse {',
      '  0%,100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(167,139,250,0.6)); }',
      '  50%     { transform: scale(1.08); filter: drop-shadow(0 0 40px rgba(167,139,250,0.9)); }',
      '}',
      '@keyframes gateShake {',
      '  0%,100% { transform: translateX(0); }',
      '  20% { transform: translateX(-8px); } 40% { transform: translateX(8px); }',
      '  60% { transform: translateX(-5px); } 80% { transform: translateX(5px); }',
      '}',
      '@keyframes gateFloat {',
      '  0%   { transform: translateY(0) rotate(0deg) scale(0.6); opacity: 0; }',
      '  12%  { opacity: 0.9; }',
      '  100% { transform: translateY(-110vh) rotate(340deg) scale(1.2); opacity: 0; }',
      '}',

      '@media (prefers-reduced-motion: reduce) {',
      '  #gate-overlay .gate-box, #gate-overlay .gate-icon, #gate-overlay .gate-input.is-wrong { animation: none !important; }',
      '}'
    ].join('\n');
    (document.head || root).appendChild(styleEl);

    var fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Indie+Flower&display=swap';
    document.head.appendChild(fontLink);
  }

  /* =============================================================
     MODO 1 — Pasaste por el index (está desbloqueado): pasa.
     No se pinta nada extra: el contenido se ve normal.
     ============================================================= */
  if (storage && passedIndex()) {
    window.__GATE_PASSED__ = true;

    /* Si el index vuelve a cerrarse (botón "atrás"), esta página
       deja de servir y hay que pasar de nuevo por el índice. */
    window.addEventListener('pageshow', function (event) {
      if (event.persisted && !passedIndex()) window.location.replace(INDEX_URL);
    });
    return;
  }

  /* =============================================================
     MODO 2 — Apertura directa (sin pasar por el index):
     contenido oculto + aviso breve + redirección al index.
     ============================================================= */
  if (storage) {
    injectStyles();
    root.classList.add('gate-pending', 'gate-locked');

    var goHome = function () { window.location.replace(INDEX_URL); };
    var redirectTimer = setTimeout(goHome, 900);

    document.addEventListener('DOMContentLoaded', function () {
      if (!document.body || document.getElementById('gate-overlay')) return;
      var splash = document.createElement('div');
      splash.id = 'gate-overlay';
      splash.setAttribute('role', 'alertdialog');
      splash.setAttribute('aria-label', 'Esta puerta pasa por el inicio');
      splash.innerHTML =
        '<div class="gate-box">' +
          '<span class="gate-icon">🔒</span>' +
          '<div class="gate-title">Primero el inicio 💜</div>' +
          '<div class="gate-subtitle">' +
            'Esta sorpresa se abre desde la portada,<br>' +
            'hay que pasar por ahí y poner la <strong>fecha especial</strong>.' +
          '</div>' +
          '<button class="gate-btn" type="button">🏠 Ir al inicio</button>' +
        '</div>';
      document.body.appendChild(splash);
      root.classList.remove('gate-pending'); /* ya existe el aviso */

      splash.querySelector('.gate-btn').addEventListener('click', function () {
        clearTimeout(redirectTimer);
        goHome();
      });
    });

    window.addEventListener('pageshow', function (event) {
      if (event.persisted && !passedIndex()) goHome();
    });
    return;
  }

  /* =============================================================
     MODO 3 — RESPALDO: el navegador no tiene sessionStorage.
     Se pide la fecha en cada página para que nunca quede abierta
     (mismo hash y misma normalización que index.html).
     ============================================================= */
  injectStyles();
  root.classList.add('gate-pending', 'gate-locked');

  var SECRET_HASH = '0ebbfd70e2ffb1098ebb70823da2ee4778899eee7d8a116240cce48ff1fa40cf';

  async function sha256Hex(texto) {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      try {
        var buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      } catch (e) { /* usa el respaldo de abajo */ }
    }
    return sha256Fallback(texto);
  }

  /* Respaldo compacto de SHA-256 (por si el navegador no expone crypto.subtle) */
  function sha256Fallback(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const maxWord = Math.pow(2, 32);
    let i, j, result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = sha256Fallback.h = sha256Fallback.h || [];
    let k = sha256Fallback.k = sha256Fallback.k || [];
    let primeCounter = k.length;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;
    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  var unlocked = false;
  var overlay = null, input = null, btn = null, errMsg = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'gate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Puerta con contraseña');
    overlay.innerHTML =
      '<div class="gate-box">' +
        '<span class="gate-icon">🔒</span>' +
        '<div class="gate-title">Solo para nosotros 💜</div>' +
        '<div class="gate-subtitle">' +
          'Ingresa la <strong>fecha especial</strong> para entrar a este recuerdo<br>' +
          '<small>(formato: DD/MM/AAAA)</small>' +
        '</div>' +
        '<div class="gate-input-group">' +
          '<input class="gate-input" id="gateInput" type="text" inputmode="numeric" placeholder="Ej: 15/06/2023" maxlength="10" autocomplete="off" spellcheck="false" />' +
          '<button class="gate-btn" id="gateBtn" type="button">🔓 Desbloquear</button>' +
        '</div>' +
        '<div class="gate-error" id="gateError"></div>' +
        '<div class="gate-hint">💜 Solo tú sabes esta fecha — es nuestra magia</div>' +
      '</div>';
    document.body.appendChild(overlay);

    input = overlay.querySelector('#gateInput');
    btn = overlay.querySelector('#gateBtn');
    errMsg = overlay.querySelector('#gateError');

    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });
    input.addEventListener('input', function (e) {
      var val = e.target.value.replace(/[^0-9]/g, '');
      if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
      if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5);
      if (val.length > 10) val = val.slice(0, 10);
      e.target.value = val;
    });
  }

  /* Mientras esté cerrada, el contenido no recibe foco ni clics */
  function setContentLock(isLocked) {
    if (!overlay || !document.body) return;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === overlay) return;
      try { el.inert = isLocked; } catch (e) { /* navegador sin soporte de inert */ }
    });
  }

  function showError(msg) {
    errMsg.textContent = msg;
    input.classList.add('is-wrong');
    input.focus();
    setTimeout(function () { input.classList.remove('is-wrong'); }, 600);
  }

  function celebrate() {
    for (var i = 0; i < 20; i++) {
      (function (n) {
        setTimeout(function () {
          if (!overlay || !overlay.isConnected) return;
          var p = document.createElement('div');
          p.className = 'gate-particle';
          p.textContent = ['💜', '✨', '💕', '🫶', '💛', '🌼'][Math.floor(Math.random() * 6)];
          p.style.cssText = 'left:' + (Math.random() * 100) + 'vw; font-size:' + (Math.random() * 12 + 16) +
            'px; animation-duration:' + (Math.random() * 3 + 3) + 's; animation-delay:0s; opacity:1;';
          document.body.appendChild(p);
          setTimeout(function () { p.remove(); }, 5000);
        }, n * 80);
      })(i);
    }
  }

  async function tryUnlock() {
    var val = input.value.trim();
    if (!val) { showError('💜 Ingresa una fecha...'); return; }

    /* Se compara la HUELLA, nunca la fecha en claro */
    var normalized = val.replace(/\s/g, '').toUpperCase();
    btn.disabled = true;
    var digest = '';
    try { digest = await sha256Hex(normalized); } catch (e) { digest = ''; }
    btn.disabled = false;

    if (digest && digest === SECRET_HASH) {
      unlock();
    } else {
      showError('❌ Fecha incorrecta... Intenta de nuevo, mi amor 💜');
      input.value = '';
    }
  }

  function unlock() {
    unlocked = true;
    errMsg.textContent = '';
    input.classList.remove('is-wrong');
    root.classList.remove('gate-pending', 'gate-locked');
    setContentLock(false);
    var icon = overlay.querySelector('.gate-icon');
    if (icon) icon.textContent = '🔓';
    overlay.classList.add('gate-unlocked');
    celebrate();
    window.dispatchEvent(new CustomEvent('gate:unlocked'));
  }

  function focusInput() {
    if (unlocked || !input) return;
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }

  function lock() {
    if (!overlay) return;
    unlocked = false;
    root.classList.add('gate-locked');
    overlay.classList.remove('gate-unlocked');
    var icon = overlay.querySelector('.gate-icon');
    if (icon) icon.textContent = '🔒';
    if (input) input.value = '';
    if (errMsg) errMsg.textContent = '';
    setContentLock(true);
    setTimeout(focusInput, 80);
  }

  function start() {
    if (overlay) return;
    buildOverlay();
    lock();
    /* Ya existe la puerta: se puede revelar el contenido por detrás */
    root.classList.remove('gate-pending');
    setTimeout(focusInput, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  /* Si el navegador restaura la página desde la caché (botón "atrás"),
     la puerta se vuelve a cerrar: nunca se queda abierta. */
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) { if (unlocked) lock(); else start(); }
  });
})();
