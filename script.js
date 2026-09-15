(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The same navigation works as a compact menu on smaller screens.
  const menu = $('.menu-toggle');
  const nav = $('#primary-nav');
  if (menu && nav) {
    menu.hidden = false;
    const closeMenu = () => {
      nav.classList.remove('is-open');
      menu.setAttribute('aria-expanded', 'false');
    };
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menu.focus();
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.site-header')) closeMenu();
    });
    const desktop = window.matchMedia('(min-width: 1001px)');
    desktop.addEventListener('change', closeMenu);
  }

  // Long texts are complete in the HTML, whether scripts run or not.
  const readerUpdates = [];
  $$('[data-reader-shell]').forEach(shell => {
    const panel = $('.reading-panel', shell);
    const toggle = $('.reader-toggle', shell);
    const bar = $('.reading-progress > span', shell);
    if (!panel || !toggle || !bar) return;
    const noun = panel.id === 'neo-reader' ? 'dialogue' : 'story';
    toggle.hidden = false;
    const update = () => {
      const range = panel.scrollHeight - panel.clientHeight;
      const progress = range > 1 ? Math.max(0, Math.min(1, panel.scrollTop / range)) : 1;
      bar.style.width = `${progress * 100}%`;
    };
    readerUpdates.push(update);
    panel.addEventListener('scroll', update, { passive: true });
    toggle.addEventListener('click', () => {
      const expanded = !shell.classList.contains('is-expanded');
      shell.classList.toggle('is-expanded', expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = `${expanded ? 'Compact' : 'Expand'} ${noun} ${expanded ? '↙' : '↗'}`;
      update();
    });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(panel);
    update();
  });

  // Chapter links move within the reading panel without covering its heading.
  $$('.act-links a').forEach(link => link.addEventListener('click', e => {
    const target = document.getElementById(link.hash.slice(1));
    const panel = $('#neo-reader');
    if (!target || !panel) return;
    e.preventDefault();
    const expanded = panel.closest('.reader-shell').classList.contains('is-expanded');
    if (expanded) target.scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'start' });
    else {
      const offset = target.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 18;
      panel.scrollTo({ top: Math.max(0, offset), behavior: reduceMotion.matches ? 'instant' : 'smooth' });
      const bounds = panel.getBoundingClientRect();
      if (bounds.top < 60 || bounds.top > window.innerHeight * .6) panel.closest('.reader-shell').scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'start' });
      panel.focus({ preventScroll: true });
    }
  }));

  const world = $('#twenty-seconds');
  const finale = $('#white-finale');
  const themeMeta = $('meta[name="theme-color"]');
  let paletteFrame = 0;
  const updatePalette = () => {
    paletteFrame = 0;
    if (!world) return;
    const box = world.getBoundingClientRect();
    const active = box.top < window.innerHeight * .55 && box.bottom > window.innerHeight * .35;
    const light = !!finale && finale.getBoundingClientRect().top <= 100;
    document.body.classList.toggle('world-chapter', active && !light);
    document.body.classList.toggle('light-chapter', light);
    if (themeMeta) themeMeta.setAttribute('content', light ? '#faf9f6' : active ? '#071423' : '#07120f');
  };
  const queuePalette = () => {
    if (!paletteFrame) paletteFrame = requestAnimationFrame(updatePalette);
  };
  window.addEventListener('scroll', queuePalette, { passive: true });
  window.addEventListener('resize', () => { queuePalette(); readerUpdates.forEach(fn => fn()); }, { passive: true });
  updatePalette();

  // A physical cover over the link: mouse drag, horizontal touch drag, or click.
  const stage = $('#comic-stage');
  const cover = $('#comic-cover');
  const passage = $('#hidden-passage');
  const bookLink = $('#world-link');
  const replace = $('#replace-comic');
  const status = $('#reveal-status');
  if (!stage || !cover || !passage || !bookLink || !replace) return;
  let x = 0, y = 0, drag = null, revealed = false, suppressUntil = 0;
  let size = { width: 1, height: 1 };
  let animationTimer = 0;
  const dimensions = () => {
    const box = stage.getBoundingClientRect();
    return { width: Math.max(1, box.width), height: Math.max(1, box.height) };
  };
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
  const updateReveal = () => {
    const c = cover.getBoundingClientRect();
    const l = bookLink.getBoundingClientRect();
    // Only enable the link once its entire hit area is uncovered.
    const exposed = c.right < l.left - 8 || c.left > l.right + 8 || c.bottom < l.top - 8 || c.top > l.bottom + 8;
    if (exposed !== revealed) {
      revealed = exposed;
      if (status) status.textContent = exposed ? 'The door is open. The World Glitch book link is revealed.' : 'The comic covers the passage.';
    }
    passage.classList.toggle('is-revealed', exposed);
    passage.setAttribute('aria-hidden', String(!exposed));
    bookLink.setAttribute('tabindex', exposed ? '0' : '-1');
    cover.setAttribute('aria-expanded', String(exposed));
    replace.hidden = Math.abs(x) + Math.abs(y) < 3;
  };
  const paint = () => {
    const angle = clamp(x / size.width * 2.2, 2.2);
    cover.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
    updateReveal();
  };
  const stopAnimation = () => {
    clearTimeout(animationTimer);
    animationTimer = 0;
    cover.classList.remove('is-moving');
  };
  const moveAside = () => {
    stopAnimation();
    size = dimensions();
    x = size.width * .98; y = 0;
    cover.classList.add('is-moving');
    paint();
    // Wait for the transition to expose the actual link, then update focusability.
    animationTimer = window.setTimeout(() => { stopAnimation(); updateReveal(); }, reduceMotion.matches ? 0 : 650);
  };
  const reset = (focus = false) => {
    stopAnimation();
    x = 0; y = 0;
    cover.classList.add('is-moving');
    // Make the link inaccessible as soon as its cover returns.
    passage.classList.remove('is-revealed');
    passage.setAttribute('aria-hidden', 'true');
    bookLink.setAttribute('tabindex', '-1');
    cover.setAttribute('aria-expanded', 'false');
    revealed = false;
    cover.style.transform = 'translate3d(0px, 0px, 0) rotate(0deg)';
    replace.hidden = true;
    if (status) status.textContent = 'The comic is back in place.';
    animationTimer = window.setTimeout(() => { stopAnimation(); updateReveal(); }, reduceMotion.matches ? 0 : 650);
    if (focus) cover.focus({ preventScroll: true });
  };
  const release = (event, cancel) => {
    if (!drag || event.pointerId !== drag.id) return;
    const current = drag;
    drag = null;
    cover.classList.remove('is-dragging');
    if (cancel) { x = current.x; y = current.y; paint(); }
    if (cover.hasPointerCapture(current.id)) cover.releasePointerCapture(current.id);
    if (current.moved || cancel) suppressUntil = performance.now() + 400;
  };
  cover.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || drag) return;
    stopAnimation();
    size = dimensions();
    suppressUntil = 0;
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, moved: false, type: event.pointerType };
    cover.setPointerCapture(event.pointerId);
  });
  cover.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    // touch-action: pan-y lets the browser keep vertical page scrolling.
    if (drag.type === 'touch' && !drag.moved && Math.abs(dy) > Math.abs(dx)) return;
    drag.moved = true;
    cover.classList.add('is-dragging');
    event.preventDefault();
    x = clamp(drag.x + dx, size.width * .98);
    y = clamp(drag.y + (drag.type === 'touch' ? 0 : dy), size.height * .98);
    paint();
  });
  cover.addEventListener('pointerup', e => release(e, false));
  cover.addEventListener('pointercancel', e => release(e, true));
  cover.addEventListener('lostpointercapture', e => release(e, true));
  cover.addEventListener('dragstart', e => e.preventDefault());
  cover.addEventListener('click', event => {
    if (event.detail !== 0 && performance.now() < suppressUntil) { event.preventDefault(); return; }
    if (Math.abs(x) + Math.abs(y) > 5) reset(); else moveAside();
  });
  cover.addEventListener('transitionend', updateReveal);
  replace.addEventListener('click', () => reset(true));
  cover.disabled = false;
  stage.classList.add('is-ready');
  passage.setAttribute('aria-hidden', 'true');
  bookLink.setAttribute('tabindex', '-1');
  size = dimensions();
  paint();
  const resizeCover = () => {
    const next = dimensions();
    if (next.width === size.width && next.height === size.height) return;
    if (drag) release({ pointerId: drag.id }, true);
    stopAnimation();
    x = clamp(x / size.width * next.width, next.width * .98);
    y = clamp(y / size.height * next.height, next.height * .98);
    size = next;
    paint();
  };
  if ('ResizeObserver' in window) new ResizeObserver(resizeCover).observe(stage);
  else window.addEventListener('resize', resizeCover, { passive: true });
})();
