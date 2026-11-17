/* =========================================================
   INDUCOR · Motor de la presentación
   - Escala 16:9 a cualquier pantalla
   - Pasos dentro de cada diapositiva (data-at / data-only)
   - "Magic move": elementos con el mismo data-morph viajan
     de una diapositiva a la siguiente
   - Formas de fondo que cambian de lugar
   ========================================================= */
(() => {
  const stage = document.getElementById('stage');
  if (location.search.includes('static')) document.documentElement.classList.add('static');
  const slides = [...document.querySelectorAll('.slide')];
  const brand = document.getElementById('brand');
  const layer = document.getElementById('morphLayer');
  const bar = document.getElementById('bar');
  const num = document.getElementById('num');
  const shapes = { a: stage.querySelector('.shape-a'), b: stage.querySelector('.shape-b'), c: stage.querySelector('.shape-c') };

  document.getElementById('total').textContent = String(slides.length).padStart(2, '0');

  let cur = 0, step = 0, scale = 1, running = [];

  /* ---------- Escalado ---------- */
  function fit() {
    scale = Math.min(innerWidth / 1600, innerHeight / 900);
    stage.style.setProperty('--s', scale);
  }
  addEventListener('resize', fit);
  fit();

  /* ---------- Posiciones de las formas por diapositiva [x, y, escala, giro] ---------- */
  const layouts = [
    { a: [1240, -130, 1.3], b: [960, 380, 1.2], c: [130, 780, .8, 20] },
    { a: [1500, 770, .7], b: [-260, -260, 1], c: [720, 810, .5, 45] },
    { a: [-120, 700, .9], b: [1200, -300, 1.1], c: [1470, 790, .6, 10] },
    { a: [1460, 760, .8], b: [-300, 500, 1], c: [60, 810, .5, 30] },
    { a: [1470, 780, .8], b: [-200, -320, 1.2], c: [1500, 300, .6, 60] },
    { a: [1470, 760, .7], b: [1150, 520, 1], c: [1460, 760, .5, 15] },
    { a: [1490, -170, .7], b: [-350, 450, 1.1], c: [1500, 780, .4, 45] },
    { a: [1480, 770, .7], b: [1200, -260, 1], c: [760, 800, .4, 25] },
    { a: [1150, 180, 1.33], b: [850, -100, 1.6], c: [1380, 120, 1, 35] },
    { a: [1470, 740, .8], b: [-320, -300, 1.1], c: [40, 820, .5, 10] },
    { a: [1480, -190, .8], b: [1250, 560, 1], c: [1500, 790, .5, 50] },
    { a: [1480, 770, .7], b: [-250, 520, 1], c: [40, 820, .4, 20] },
    { a: [1320, 720, 1], b: [-300, -350, 1.2], c: [1480, 120, .5, 15] },
    { a: [-160, 720, .8], b: [1250, -300, 1], c: [1500, 820, .4, 30] },
    { a: [-130, 700, 1.1], b: [-280, -300, 1.1], c: [760, 800, .5, 40] }
  ];
  function moveShapes(i) {
    const L = layouts[i % layouts.length];
    shapes.a.style.transform = `translate(${L.a[0]}px,${L.a[1]}px) scale(${L.a[2]})`;
    if (shapes.b) shapes.b.style.transform = `translate(${L.b[0]}px,${L.b[1]}px) scale(${L.b[2]})`;
    if (shapes.c) shapes.c.style.transform = `translate(${L.c[0]}px,${L.c[1]}px) scale(${L.c[2]}) rotate(${L.c[3]}deg)`;
  }

  /* ---------- Contadores ---------- */
  const fmt = (v, dec) => v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function countUp(el, from = 0) {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const dur = 1400, t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(from + (to - from) * e, dec) + suf;
      if (p < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* ---------- Pasos ---------- */
  const maxStep = s => {
    let m = 0;
    s.querySelectorAll('[data-at],[data-only]').forEach(el => {
      m = Math.max(m, +(el.dataset.at || 0), +(el.dataset.only || 0));
    });
    return m;
  };

  function applyStep(s, n) {
    s.dataset.step = n;
    for (let k = 1; k <= 9; k++) s.classList.toggle('s' + k, k <= n);
    s.querySelectorAll('[data-at]').forEach(el => {
      const at = +el.dataset.at, was = el.classList.contains('on'), on = at <= n;
      el.classList.toggle('on', on);
      el.classList.toggle('cur', at === n);
      if (on && !was) el.querySelectorAll('.count').forEach(c => countUp(c));
    });
    s.querySelectorAll('[data-only]').forEach(el => el.classList.toggle('on', +el.dataset.only === n));
    if (s.dataset.hook === 'roadmap') roadmap(n);
  }

  /* Hoja de ruta: contador de días */
  const dayEl = document.getElementById('day');
  let dayNow = 0;
  function roadmap(n) {
    const target = [0, 15, 30, 60, 90][n] ?? 90;
    dayEl.dataset.count = target;
    countUp(dayEl, dayNow);
    dayNow = target;
  }

  /* ---------- Magic move ---------- */
  function morphables(s, idx) {
    const list = [...s.querySelectorAll('[data-morph]')];
    if (idx > 0) list.push(brand);
    return list;
  }
  function finishMorphs() {
    running.forEach(f => f());
    running = [];
  }
  function morph(pairs, rectsA) {
    const st = stage.getBoundingClientRect();
    pairs.forEach(([a, b], i) => {
      const ra = rectsA[i], rb = b.getBoundingClientRect();
      if (!ra.width || !rb.width) return;
      if (Math.abs(ra.left - rb.left) < 1 && Math.abs(ra.top - rb.top) < 1 && Math.abs(ra.height - rb.height) < 1) return;
      const csA = getComputedStyle(a), csB = getComputedStyle(b);
      const clone = b.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-morph');
      clone.className = b.className + ' morph-clone';
      Object.assign(clone.style, {
        left: (rb.left - st.left) / scale + 'px',
        top: (rb.top - st.top) / scale + 'px',
        width: rb.width / scale + 'px',
        height: rb.height / scale + 'px',
        font: csB.font, letterSpacing: csB.letterSpacing, lineHeight: csB.lineHeight,
        color: csB.color, textAlign: csB.textAlign, transformOrigin: '0 0', animation: 'none'
      });
      clone.textContent = '';
      b.childNodes.forEach(n => clone.appendChild(n.cloneNode(true)));
      layer.appendChild(clone);

      const dx = (ra.left - rb.left) / scale, dy = (ra.top - rb.top) / scale, k = ra.height / rb.height;
      a.style.visibility = 'hidden';
      b.style.visibility = 'hidden';
      const anim = clone.animate([
        { transform: `translate(${dx}px,${dy}px) scale(${k})`, color: csA.color },
        { transform: 'translate(0,0) scale(1)', color: csB.color }
      ], { duration: 1000, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' });
      let done = false;
      const end = () => {
        if (done) return; done = true;
        a.style.visibility = ''; b.style.visibility = '';
        clone.remove();
      };
      anim.onfinish = end;
      running.push(end);
    });
  }

  /* ---------- Navegación ---------- */
  function go(idx, toStep = 0) {
    if (idx < 0 || idx >= slides.length) return;
    finishMorphs();
    if (idx === cur) { step = toStep; applyStep(slides[cur], step); return; }

    const from = slides[cur], to = slides[idx];
    const fromList = morphables(from, cur);
    const toList = morphables(to, idx);
    const pairs = [];
    toList.forEach(b => {
      const a = fromList.find(x => x.dataset.morph === b.dataset.morph);
      if (a && a !== b) pairs.push([a, b]);
    });
    const rectsA = pairs.map(([a]) => a.getBoundingClientRect());

    // Preparar destino sin transiciones (estado de pasos instantáneo)
    to.classList.add('no-trans');
    applyStep(to, toStep);
    void to.offsetWidth;
    to.classList.remove('no-trans');

    from.classList.remove('active', 'enter');
    to.classList.add('active');
    to.classList.remove('enter'); void to.offsetWidth; to.classList.add('enter');

    stage.dataset.theme = to.dataset.theme;
    stage.classList.toggle('chrome', idx > 0);

    cur = idx; step = toStep;
    morph(pairs, rectsA);
    onEnter(to);
    ui();
  }

  function onEnter(s) {
    s.querySelectorAll('.count').forEach(c => {
      if (c.closest('[data-at]') && !c.closest('[data-at]').classList.contains('on')) return;
      if (c.id === 'day') return;
      countUp(c);
    });
    if (s.dataset.hook === 'roadmap') { dayNow = 0; roadmap(step); }
  }

  function ui() {
    moveShapes(cur);
    bar.style.width = ((cur + 1) / slides.length * 100) + '%';
    num.textContent = String(cur + 1).padStart(2, '0');
    history.replaceState(null, '', '#' + (cur + 1));
  }

  function next() {
    if (step < maxStep(slides[cur])) { step++; applyStep(slides[cur], step); }
    else if (cur === slides.length - 1) go(0, 0);
    else go(cur + 1, 0);
  }
  function prev() {
    if (step > 0) { step--; applyStep(slides[cur], step); }
    else if (cur > 0) go(cur - 1, maxStep(slides[cur - 1]));
  }

  /* ---------- Teclado, clic, táctil ---------- */
  addEventListener('keydown', e => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === 'Home') go(0, 0);
    else if (e.key === 'End') go(slides.length - 1, maxStep(slides[slides.length - 1]));
    else if (e.key.toLowerCase() === 'f') toggleFs();
  });
  stage.addEventListener('click', e => { if (!e.target.closest('a,button')) next(); });
  stage.addEventListener('contextmenu', e => { e.preventDefault(); prev(); });
  document.getElementById('next').onclick = next;
  document.getElementById('prev').onclick = prev;
  document.getElementById('fs').onclick = toggleFs;
  document.getElementById('home').onclick = () => go(0, 0);
  document.getElementById('restart').onclick = () => go(0, 0);
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  let tx = null;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
  });

  /* ---------- Gráfico 80 visitas / 1 venta ---------- */
  const dots = document.getElementById('dots');
  for (let i = 0; i < 80; i++) {
    const d = document.createElement('i');
    d.style.setProperty('--i', i);
    if (i === 79) d.className = 'sold';
    dots.appendChild(d);
  }

  /* ---------- Cierre: la regla gira y cambia de lugar ---------- */
  const chips = [...document.querySelectorAll('.o-chip')];
  setInterval(() => {
    if (!slides[cur].classList.contains('cierre')) return;
    chips.forEach(c => c.dataset.pos = (+c.dataset.pos + 3) % 4);
  }, 2000);

  /* ---------- Inicio ---------- */
  const start = Math.min(Math.max((parseInt(location.hash.slice(1)) || 1) - 1, 0), slides.length - 1);
  slides.forEach(s => applyStep(s, 0));
  const hs = parseInt(location.hash.split('.')[1]) || 0;
  if (hs) { step = Math.min(hs, maxStep(slides[start])); applyStep(slides[start], step); }
  slides[start].classList.add('active', 'enter');
  cur = start;
  stage.dataset.theme = slides[start].dataset.theme;
  stage.classList.toggle('chrome', start > 0);
  onEnter(slides[start]);
  ui();
  setTimeout(() => stage.classList.remove('intro'), 2000);
})();
