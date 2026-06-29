let ACTS = [];
let SESSIONS = [];
let NPCS = [];
let VAULT = [];
let RELIQUARY = [];
let CLUES = [];
let MAPSPOTS = [];
let DEEPNODES = [];
const $ = s => document.querySelector(s);
fetch('data.yml')
  .then(res => {
    if (!res.ok) throw new Error('Failed to load data.yml');
    return res.text();
  })
  .then(yaml => {
    const data = jsyaml.load(yaml);
    ACTS = data.acts || [];
    SESSIONS = data.sessions || [];
    NPCS = data.npcs || [];
    VAULT = data.vault || [];
    RELIQUARY = data.reliquary || [];
    CLUES = data.clues || [];
    MAPSPOTS = data.mapspots || [];
    DEEPNODES = data.deepnodes || [];
    // Sort sessions numerically just in case
    SESSIONS.sort((a, b) => a.id - b.id);

    init();
  })
  .catch(err => {
    console.error('Error loading campaign data:', err);
  });

/* ---------- Helper Utilities ---------- */


function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

/* ---------- Navigation ---------- */
document.querySelectorAll('nav button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('section.view').forEach(x => x.classList.remove('active'));
    
    b.classList.add('active');
    document.getElementById(b.dataset.view).classList.add('active');
    window.scrollTo(0, 0);
  });
});

/* ---------- Render Functions ---------- */
let actFilter = 0;
let term = "";
let placeFilter = "All";
let npcTerm = "";
let npcFuse = null;
const places = [
  "All",
  "Greenwatch",
  "With the army",
  "Cattlekeep",
  "Richard's Vale",
  "Zadash",
  "Elsewhere & Unknown"
];

function renderChronicle() {
  const root = $('#chronicle-list');
  root.innerHTML = '';
  
  ACTS.forEach(a => {
    if (actFilter && actFilter !== a.id) return;
    
    const entries = SESSIONS.filter(s => 
      s.act === a.id && 
      (!term || (s.title + ' ' + s.description).toLowerCase().includes(term))
    );
    if (!entries.length) return;
    
    root.appendChild(el(`<div class="actband">${a.name}<small>${a.range}</small></div>`));
    
    const th = el(`<div class="thread" style="--threadcolor:${a.color}"></div>`);
    entries.forEach(s => {
      th.appendChild(el(`
        <div class="entry">
          <span class="num">Session ${s.id}</span>
          <span class="date">${s.date}</span>
          <h4>${s.title}</h4>
          <p>${s.description}</p>
        </div>
      `));
    });
    root.appendChild(th);
  });
  
  if (!root.children.length) {
    root.appendChild(el(`
      <p class="lede">Nothing in the record matches that. Check the spelling, or ask the table.</p>
    `));
  }
}

function npcBucket(n) {
  for (const p of ["Greenwatch", "With the army", "Cattlekeep", "Richard's Vale", "Zadash"]) {
    if (n.where.startsWith(p) || n.where.includes(p)) return p;
  }
  return "Elsewhere & Unknown";
}

function renderNpcs() {
  const root = $('#npc-list');
  root.innerHTML = '';

  // Start with all NPCs or Fuse results
  let list;
  if (npcTerm && npcFuse) {
    list = npcFuse.search(npcTerm).map(r => r.item);
  } else {
    list = NPCS;
  }

  // Apply place filter on top
  list
    .filter(n => placeFilter === "All" || npcBucket(n) === placeFilter)
    .forEach(n => {
      root.appendChild(el(`
        <div class="npc">
          <span class="dot ${n.status}"></span>
          <h4>${n.name}</h4>
          <div class="role">${n.role}</div>
          <p>${n.description}</p>
          <span class="where">${n.where}</span>
        </div>
      `));
    });

  // Show empty-state if nothing matched
  if (!root.children.length) {
    root.appendChild(el(`
      <div class="empty">
        <p class="lede">No one in the Compendium matches that. Try a different name or description.</p>
      </div>
    `));
  }
}

/* ---------- App Initialization ---------- */
function init() {
  // 1. Act Filters
  const af = $('#actfilters');
  af.appendChild(el(`<button class="on" data-a="0">All Acts</button>`));
  
  ACTS.forEach(a => {
    af.appendChild(el(`<button data-a="${a.id}">Act ${['I', 'II', 'III', 'IV'][a.id - 1]}</button>`));
  });
  
  af.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    af.querySelectorAll('button').forEach(b => b.classList.remove('on'));
    e.target.classList.add('on');
    actFilter = +e.target.dataset.a;
    renderChronicle();
  });
  
  // 2. Searchbox listener
  $('#searchbox').addEventListener('input', e => {
    term = e.target.value.toLowerCase();
    renderChronicle();
  });
  
  // 3. Render Chronicle
  renderChronicle();

  // 3b. Build Fuse.js index for NPC search
  npcFuse = new Fuse(NPCS, {
    keys: ['name', 'role', 'description', 'where'],
    threshold: 0.35,
    ignoreLocation: true,
  });

  // 3c. NPC searchbox listener
  $('#npc-searchbox').addEventListener('input', e => {
    npcTerm = e.target.value.trim();
    renderNpcs();
  });

  /* ---------- Temporal Slider ---------- */
  // The temporal slider uses #tsrange / #tsval (in index.html)
  // and is initialised by initTemporalSlider() later in init().
  
  // 4. NPC filters
  const nf = $('#npcfilters');
  places.forEach((p, i) => {
    nf.appendChild(el(`<button ${i === 0 ? 'class="on"' : ''}>${p}</button>`));
  });
  
  nf.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    nf.querySelectorAll('button').forEach(b => b.classList.remove('on'));
    e.target.classList.add('on');
    placeFilter = e.target.textContent;
    renderNpcs();
  });
  
  // 5. Render NPCs
  renderNpcs();
  
  // 6. Render Vault items
  VAULT.forEach(v => {
    const node = el(`
      <div class="plaque${v.img ? ' hasimg' : ''}" data-acq="${v.acqAt || 1}">
        ${v.img ? `<img class="vimg" src="img/vault/${v.img}.jpg" data-base="img/vault/${v.img}" data-tried="jpg" alt="${v.name}" loading="lazy">` : ''}
        <div class="plaque-body">
          <h4>${v.name}</h4>
          <div class="prov">${v.prov}</div>
          <p>${v.description}</p>
          <div class="holder">${v.holder}</div>
        </div>
      </div>
    `);
    
    const im = node.querySelector('.vimg');
    if (im) {
      im.addEventListener('error', () => {
        const tried = im.getAttribute('data-tried');
        const base = im.getAttribute('data-base');
        if (tried === 'jpg') {
          im.setAttribute('data-tried', 'png');
          im.src = base + '.png';
        } else {
          node.classList.remove('hasimg');
          im.remove();
        }
      });
    }
    $('#vault-list').appendChild(node);
  });
  
  // 7. Render Reliquary items
  RELIQUARY.forEach(v => {
    const node = el(`
      <div class="plaque${v.img ? ' hasimg' : ''}" data-acq="${v.acqAt || 1}" style="border-top-color:var(--seal)">
        ${v.img ? `<img class="vimg" src="img/vault/${v.img}.jpg" data-base="img/vault/${v.img}" data-tried="jpg" alt="${v.name}" loading="lazy">` : ''}
        <div class="plaque-body">
          <h4 style="color:var(--vellum)">${v.name}</h4>
          <div class="prov">${v.prov}</div>
          <p>${v.description}</p>
          <div class="holder">${v.holder}</div>
        </div>
      </div>
    `);
    
    const im = node.querySelector('.vimg');
    if (im) {
      im.addEventListener('error', () => {
        const tried = im.getAttribute('data-tried');
        const base = im.getAttribute('data-base');
        if (tried === 'jpg') {
          im.setAttribute('data-tried', 'png');
          im.src = base + '.png';
        } else {
          node.classList.remove('hasimg');
          im.remove();
        }
      });
    }
    $('#reliquary-list').appendChild(node);
  });
  
  // 8. Render Clues
  CLUES.forEach(c => {
    $('#clue-list').appendChild(el(`
      <div class="clue" data-since="${c.sinceAt || 1}">
        <h4>${c.title}</h4>
        <div class="quote">${c.q}</div>
        <p>${c.description}</p>
      </div>
    `));
  });
  
  // 9. Render Map Spots
  const mw = $('#mapwrap');
  const mapInner = mw.querySelector('.map-inner');
  const mp = $('#mappanel');
  const mpClose = mp.querySelector('.mappanel-close');
  const mpContent = mp.querySelector('.mappanel-content');

  MAPSPOTS.forEach(s => {
    const b = el(`
      <button class="spot ${s.visited ? 'visited' : 'unvisited'}" style="left:${s.x}%;top:${s.y}%" aria-label="${s.name}" title="${s.name}"></button>
    `);
    b.addEventListener('click', () => {
      mapInner.querySelectorAll('.spot').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      mpContent.innerHTML = `<h4>${s.name}</h4><p>${s.blurb}</p>`;
      mpClose.style.display = 'block';
    });
    mapInner.appendChild(b);
  });

  if (mpClose) {
    mpClose.addEventListener('click', () => {
      mapInner.querySelectorAll('.spot').forEach(x => x.classList.remove('sel'));
      mpContent.innerHTML = `<h4>Stormbaum</h4><p>Click a marker to read about a place.</p>`;
      mpClose.style.display = 'none';
    });
  }

  // 9b. Render Deep Road Nodes (plotted onto the SVG; coords match its viewBox)
  const deepSvg = document.querySelector('#deepwrap .deepmap');
  const dp = $('#deeppanel');
  if (deepSvg && dp) {
    const SVGNS = 'http://www.w3.org/2000/svg';
    const dpClose = dp.querySelector('.mappanel-close');
    const dpContent = dp.querySelector('.mappanel-content');

    DEEPNODES.forEach(d => {
      const cls = d.kind === 'dread' ? 'dn-dread' : (d.visited ? 'dn-visited' : 'dn-rumor');
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'dnode ' + cls);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', d.name);

      const circle = document.createElementNS(SVGNS, 'circle');
      circle.setAttribute('cx', d.x);
      circle.setAttribute('cy', d.y);
      circle.setAttribute('r', d.kind === 'dread' ? 6 : 7);
      g.appendChild(circle);

      // Labels near the right edge anchor leftward so they stay on-map.
      const onRight = d.x > 480;
      const label = document.createElementNS(SVGNS, 'text');
      label.setAttribute('class', 'dlabel');
      label.setAttribute('x', onRight ? d.x - 14 : d.x + 14);
      label.setAttribute('y', d.y + 5);
      if (onRight) label.setAttribute('text-anchor', 'end');
      label.textContent = d.name;
      g.appendChild(label);

      function select() {
        deepSvg.querySelectorAll('.dnode').forEach(x => x.classList.remove('dsel'));
        g.classList.add('dsel');
        dpContent.innerHTML = `<h4>${d.name}</h4><p>${d.blurb}</p>`;
        if (dpClose) dpClose.style.display = 'block';
      }
      g.addEventListener('click', select);
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
      deepSvg.appendChild(g);
    });

    if (dpClose) {
      dpClose.addEventListener('click', () => {
        deepSvg.querySelectorAll('.dnode').forEach(x => x.classList.remove('dsel'));
        dpContent.innerHTML = `<h4>The Deep Roads</h4><p>Click a marker to read Despona&rsquo;s notes.</p>`;
        dpClose.style.display = 'none';
      });
    }
  }

  // (Temporal slider is initialised by initTemporalSlider() later in init().)

  // Set fixed aspect-ratio dynamically for Deep Roads map wrapper
  const dw = document.getElementById('deepwrap');
  if (dw) {
    dw.style.setProperty('--aspect-ratio', 760 / 1040);
  }

  // Helper function to dynamically set viewport custom variables (immunizes against webview viewport units resolution bugs)
  function updateViewportVars() {
    document.documentElement.style.setProperty('--viewport-w', window.innerWidth + 'px');
    document.documentElement.style.setProperty('--viewport-h', window.innerHeight + 'px');
  }
  window.addEventListener('resize', updateViewportVars);
  updateViewportVars();

  // Helper function to handle DOM parent context switching for fullscreen
  function toggleFullscreen(wrapper, state) {
    const isFs = (state !== undefined) ? state : !wrapper.classList.contains('fullscreen');
    if (isFs === wrapper.classList.contains('fullscreen')) return;

    if (isFs) {
      wrapper.classList.add('fullscreen');
      updateViewportVars();
      // Center in visible viewport area using exact browser window height pixels (safely bypasses CSS vh viewport resolution bugs)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      wrapper.style.top = `calc(${scrollTop}px + ${window.innerHeight * 0.5}px)`;
      
      // Remember original spot in DOM
      wrapper._placeholder = document.createComment('fs-placeholder');
      wrapper.parentNode.insertBefore(wrapper._placeholder, wrapper);
      document.body.appendChild(wrapper);
    } else {
      wrapper.classList.remove('fullscreen');
      wrapper.style.top = '';
      if (wrapper._placeholder) {
        wrapper._placeholder.parentNode.insertBefore(wrapper, wrapper._placeholder);
        wrapper._placeholder.remove();
        wrapper._placeholder = null;
      }
    }

    // Reset zoom and pan states
    wrapper.dispatchEvent(new CustomEvent('fullscreen-toggle'));
  }

  // Zoom and Pan controller
  function initZoomPan(wrapperId, targetSelector) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const target = wrapper.querySelector(targetSelector);
    if (!target) return;

    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    function updateTransform() {
      target.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    function reset() {
      scale = 1;
      panX = 0;
      panY = 0;
      target.style.transform = '';
      target.style.cursor = '';
    }

    wrapper.addEventListener('fullscreen-toggle', reset);

    // Zoom on wheel (relative to cursor)
    wrapper.addEventListener('wheel', (e) => {
      if (!wrapper.classList.contains('fullscreen')) return;
      e.preventDefault();

      const zoomIntensity = 0.12;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const rect = target.getBoundingClientRect();

      const delta = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
      const newScale = Math.min(Math.max(scale * delta, 1), 6);

      if (newScale === scale) return;

      const targetX = mouseX - rect.left - rect.width / 2;
      const targetY = mouseY - rect.top - rect.height / 2;

      panX -= targetX * (newScale / scale - 1);
      panY -= targetY * (newScale / scale - 1);
      scale = newScale;

      if (scale === 1) {
        panX = 0;
        panY = 0;
      }

      target.style.cursor = scale > 1 ? 'grab' : '';
      updateTransform();
    }, { passive: false });

    // Drag-to-pan
    target.addEventListener('mousedown', (e) => {
      if (!wrapper.classList.contains('fullscreen')) return;
      if (scale <= 1) return;
      isDragging = true;
      target.style.cursor = 'grabbing';
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        target.style.cursor = scale > 1 ? 'grab' : '';
      }
    });

    // Touch support for pinch-to-zoom
    let touchStartDist = 0;
    let touchStartScale = 1;

    target.addEventListener('touchstart', (e) => {
      if (!wrapper.classList.contains('fullscreen')) return;
      if (e.touches.length === 1 && scale > 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartScale = scale;
      }
    });

    target.addEventListener('touchmove', (e) => {
      if (!wrapper.classList.contains('fullscreen')) return;
      if (isDragging && e.touches.length === 1) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / touchStartDist;
        scale = Math.min(Math.max(touchStartScale * factor, 1), 6);
        if (scale === 1) {
          panX = 0;
          panY = 0;
        }
        updateTransform();
      }
    });

    target.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  // Initialize Zoom & Pan on all map wraps
  initZoomPan('mapwrap', '.map-inner');
  initZoomPan('keepwrap', '#keepmap-ground');
  initZoomPan('keepwrap', '#keepmap-upper');
  initZoomPan('deepwrap', '.deepmap');

  // Helper function to setup map fullscreen toggles
  function setupFullscreen(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const btn = wrapper.querySelector('.map-fullscreen-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      toggleFullscreen(wrapper);
    });
  }
  setupFullscreen('mapwrap');
  setupFullscreen('keepwrap');
  setupFullscreen('deepwrap');

  // Keypress Escape key to close any active fullscreens
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.mapwrap.fullscreen, .keepwrap.fullscreen, .deepwrap.fullscreen').forEach(w => {
        toggleFullscreen(w, false);
      });
    }
  });
  
  // 11. Temporal Slider Setup
  initTemporalSlider();

}

/* ---- TEMPORAL SLIDER ---- */
function initTemporalSlider() {
  const range = document.getElementById('tsrange');
  const valEl = document.getElementById('tsval');
  // The session data is the single source of truth for the slider's span.
  if (!SESSIONS.length) {
    range.disabled = true;
    valEl.textContent = '—';
    return;
  }
  const FIRST = SESSIONS[0].id;
  const NOW = SESSIONS[SESSIONS.length - 1].id;
  range.min = FIRST;
  range.max = NOW;
  range.value = NOW;

  function statusAsOf(n, who) {
    if (who.diedAt && n < who.diedAt) return 'alive';
    return who.status;
  }

  function apply(n) {
    valEl.textContent = (n >= NOW) ? 'Session ' + NOW + ' — Now' : 'Session ' + n;
    
    // CHRONICLE: hide entries after n
    document.querySelectorAll('#chronicle-list .entry').forEach(e => {
      const num = +e.querySelector('.num').textContent.replace(/\D/g, '');
      e.style.display = (num <= n) ? '' : 'none';
    });
    
    // MAP markers: visited only if reached by n
    document.querySelectorAll('#mapwrap .spot').forEach((el, i) => {
      const s = MAPSPOTS[i];
      if (!s) return;
      const reachedYet = s.reached && n >= s.reached;
      if (s.visited) {
        el.classList.toggle('visited', reachedYet);
        el.classList.toggle('unvisited', !reachedYet);
      }
    });
    
    // DEEP map: all deep travel is current-era (43+), so fade all if n<43
    document.querySelectorAll('.deepmap .dn-visited').forEach(g => {
      g.style.opacity = (n >= 43) ? '' : '0.3';
    });
    
    // VAULT + RELIQUARY: hide items not yet acquired
    document.querySelectorAll('#vault-list .plaque, #reliquary-list .plaque').forEach(p => {
      const acq = +p.getAttribute('data-acq') || 1;
      p.style.display = (acq <= n) ? '' : 'none';
    });
    
    // DUCHY page: fade elements not yet true
    document.querySelectorAll('#duchy [data-since]').forEach(elm => {
      const since = +elm.getAttribute('data-since') || 1;
      elm.style.display = (since <= n) ? '' : 'none';
    });
    
    // LIVING SCENE: dragons/banner/kobolds by session
    if (window.__gwSceneState) window.__gwSceneState(n);
    
    // CLUE BOARD: hide clues not yet discovered
    document.querySelectorAll('#clue-list .clue').forEach(c => {
      const since = +c.getAttribute('data-since') || 1;
      c.style.display = (since <= n) ? '' : 'none';
    });
    
    // COMPENDIUM: recompute status dot
    document.querySelectorAll('#npc-list .npc').forEach((card, i) => {
      const data = window.__NPCREF[i];
      if (!data) return;
      const st = statusAsOf(n, data);
      const dot = card.querySelector('.dot');
      dot.className = 'dot ' + st;
    });
  }
  
  range.addEventListener('input', () => apply(+range.value));
  window.__NPCREF = NPCS;
  apply(Number(range.value) || NOW);
}

/* ---- VELKORA'S LEDGER (easter egg) ---- */
(function() {
  function bg() { return document.getElementById('vkmodal-bg'); }
  function open() { const b = bg(); if (b) { b.classList.add('open'); b.setAttribute('aria-hidden', 'false'); } }
  function shut() { const b = bg(); if (b) { b.classList.remove('open'); b.setAttribute('aria-hidden', 'true'); } }
  
  // All binding via delegation so nothing is referenced before it exists.
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t) return;
    if (t.id === 'vkledger-trigger') { open(); return; }
    if (t.id === 'vkclose') { shut(); return; }
    if (t.id === 'vkmodal-bg') { shut(); return; }
  });
  
  document.addEventListener('keydown', e => {
    if (e.target && e.target.id === 'vkledger-trigger' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      open();
    }
    if (e.key === 'Escape') shut();
  });
})();

/* ---- LIVING GREENWATCH: real-clock daylight + slider state ---- */
(function() {
  const scene = document.getElementById('gwscene');
  if (!scene) return;
  const ST_LAT = 44.95, ST_LNG = -93.09;
  
  // crude but seasonally-correct sunrise/sunset (local hours) for St Paul
  function dayInfo(now) {
    const start = new Date(now.getFullYear(), 0, 0);
    const n = Math.floor((now - start) / 86400000);
    const decl = -23.45 * Math.cos((Math.PI / 180) * (360 / 365 * (n + 10)));
    const latR = ST_LAT * Math.PI / 180, decR = decl * Math.PI / 180;
    let x = -Math.tan(latR) * Math.tan(decR);
    x = Math.max(-1, Math.min(1, x));
    const ha = Math.acos(x) * 180 / Math.PI; // degrees
    const halfDay = ha / 15; // hours
    const noon = 13.1;
    return { sunrise: noon - halfDay, sunset: noon + halfDay, noon };
  }
  
  function setSky() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const { sunrise, sunset } = dayInfo(now);
    const top = document.getElementById('sky-top'), bot = document.getElementById('sky-bot');
    const orb = document.getElementById('gw-orb'), core = document.getElementById('gw-orb-core');
    const stars = document.getElementById('gw-stars');
    let lit;
    const dawn0 = sunrise - 1, dawn1 = sunrise + 1, dusk0 = sunset - 1, dusk1 = sunset + 1;
    
    if (h <= dawn0 || h >= dusk1) { // night
      top.setAttribute('stop-color', '#0b1020'); bot.setAttribute('stop-color', '#141528');
      stars.setAttribute('opacity', '0.9'); lit = true;
      orb.setAttribute('fill', 'url(#gw-moon)'); core.setAttribute('fill', '#eef2f7');
    } else if (h < dawn1) { // dawn
      top.setAttribute('stop-color', '#26324f'); bot.setAttribute('stop-color', '#c98a5a');
      stars.setAttribute('opacity', '0.25'); lit = true;
      orb.setAttribute('fill', 'url(#gw-sun)'); core.setAttribute('fill', '#fff0cc');
    } else if (h <= dusk0) { // day
      top.setAttribute('stop-color', '#2f5c86'); bot.setAttribute('stop-color', '#a9c2cf');
      stars.setAttribute('opacity', '0'); lit = false;
      orb.setAttribute('fill', 'url(#gw-sun)'); core.setAttribute('fill', '#fff7e0');
    } else { // dusk
      top.setAttribute('stop-color', '#243049'); bot.setAttribute('stop-color', '#d4884e');
      stars.setAttribute('opacity', '0.3'); lit = true;
      orb.setAttribute('fill', 'url(#gw-sun)'); core.setAttribute('fill', '#ffcaa0');
    }
    scene.classList.toggle('lit', lit);
    
    // arc the orb across the sky between sunrise and sunset
    const frac = Math.max(0, Math.min(1, (h - sunrise) / (sunset - sunrise)));
    const cx = 80 + frac * 840;
    const cy = 320 - Math.sin(frac * Math.PI) * 285;
    let oy = cy, ocx = cx;
    
    if (h < sunrise || h > sunset) { // moon: opposite arc
      const nf = ((h < sunrise ? h + 24 : h) - sunset) / ((sunrise + 24) - sunset);
      const f2 = Math.max(0, Math.min(1, nf));
      ocx = 80 + f2 * 840; oy = 315 - Math.sin(f2 * Math.PI) * 250;
    }
    orb.setAttribute('cx', ocx); orb.setAttribute('cy', oy);
    core.setAttribute('cx', ocx); core.setAttribute('cy', oy);
  }
  
  setSky();
  setInterval(setSky, 60000); // update each minute

  // ---- slider state: dragons (pre-30), banner+kobolds (post-grant) ----
  window.__gwSceneState = function(n) {
    const scene = document.getElementById('gwscene');
    const dragons = document.getElementById('gw-dragons');
    const banner = document.getElementById('gw-banner');
    const kobolds = document.getElementById('gw-kobolds');
    const cap = document.getElementById('gw-caption');
    if (dragons) dragons.setAttribute('opacity', n < 30 ? '1' : '0');
    if (banner) banner.setAttribute('opacity', n >= 24 ? '1' : '0');
    if (kobolds) kobolds.setAttribute('opacity', n >= 30 ? '1' : '0');
    if (cap) cap.textContent = n < 24 ? 'Greenwatch — held by dragons' : (n < 30 ? 'Greenwatch — the taking' : 'Greenwatch');
    scene.classList.toggle('held', n >= 24);
  };
  window.__gwSceneState(46);
})();

/* ---- SEASONS (driven by real date) ---- */
(function() {
  const scene = document.getElementById('gwscene');
  if (!scene) return;
  
  // 0=Jan..11=Dec, Northern hemisphere
  function season(m) {
    if (m <= 1 || m === 11) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 7) return 'summer';
    return 'autumn';
  }
  
  function rand(a, b) { return a + Math.random() * (b - a); }
  
  function spawnSnow(g) {
    let f = '';
    for (let i = 0; i < 34; i++) {
      const x = rand(0, 1000), d = rand(7, 16), delay = rand(0, d), r = rand(1, 2.2);
      f += `<circle cx="${x}" cy="-10" r="${r}" fill="#dfeaf2" opacity="0.85"><animate attributeName="cy" values="-10;250" dur="${d}s" begin="-${delay}s" repeatCount="indefinite"/><animate attributeName="cx" values="${x};${x+rand(-30,30)};${x}" dur="${d}s" begin="-${delay}s" repeatCount="indefinite"/></circle>`;
    }
    g.innerHTML = f;
  }
  
  function spawnLeaves(g) {
    let f = '';
    for (let i = 0; i < 18; i++) {
      const x = rand(0, 1000), d = rand(9, 16), delay = rand(0, d);
      f += `<path d="M0,0 q3,-3 6,0 q-3,3 -6,0z" fill="${['#a8642e', '#8a4a22', '#c08038'][i % 3]}" opacity="0.8"><animate attributeName="transform" attributeType="XML" type="translate" values="${x},-10;${x+rand(-60,60)},240" dur="${d}s" begin="-${delay}s" repeatCount="indefinite" additive="sum"/><animateTransform attributeName="transform" type="rotate" values="0;360" dur="${rand(3,6)}s" begin="-${delay}s" repeatCount="indefinite" additive="sum"/></path>`;
    }
    g.innerHTML = f;
  }
  
  function spawnFireflies(g) {
    let f = '';
    for (let i = 0; i < 14; i++) {
      const x = rand(60, 940), y = rand(150, 225), d = rand(3, 6), delay = rand(0, d);
      f += `<circle cx="${x}" cy="${y}" r="1.6" fill="#ffe9a0"><animate attributeName="opacity" values="0;1;0" dur="${d}s" begin="-${delay}s" repeatCount="indefinite"/><animate attributeName="cy" values="${y};${y-rand(8,20)};${y}" dur="${rand(6,10)}s" begin="-${delay}s" repeatCount="indefinite"/></circle>`;
    }
    g.innerHTML = f;
  }
  
  window.__gwSeason = function() {
    const s = season(new Date().getMonth());
    const snow = document.getElementById('gw-snow'), leaves = document.getElementById('gw-leaves'), fire = document.getElementById('gw-fireflies');
    snow.innerHTML = ''; leaves.innerHTML = ''; fire.innerHTML = '';
    
    scene.classList.remove('s-winter', 's-spring', 's-summer', 's-autumn');
    scene.classList.add('s-' + s);
    if (s === 'winter') spawnSnow(snow);
    else if (s === 'autumn') spawnLeaves(leaves);
    else if (s === 'summer') spawnFireflies(fire);
  };
  window.__gwSeason();
})();

/* ---- ROTATING LANDING FLOURISH ---- */
(function() {
  const el = document.getElementById('gw-flourish');
  if (!el) return;
  const lines = [
    "The root pulses, a half-beat slow.",
    "Steve's drills run before the dawn.",
    "Somewhere below, something is still digging.",
    "The crown comes off its stand cold these mornings.",
    "Six hundred wagons on the eastern road, and counting.",
    "Christopher shelves books above a sleeping god.",
    "The deep has gone quiet, the way a held breath is quiet.",
    "A letter four words long still waits for its fifth.",
    "No word from the capital. No word from Alistair.",
    "The forge below wants a song it has not been given."
  ];
  el.textContent = lines[Math.floor(Math.random() * lines.length)];
})();

/* ---- GREENWATCH KEEP MAP ---- */
(function() {
  const ROOMS = {
    workshop: ["The Castle Workshop", "Where the keep's own repairs and small crafts are done. Not Terrick's grand artisan street — this is the household's quiet workshop."],
    stonehouse: ["The Stonehouse", "Cold storage cut into stone. Keeps in summer, ice in winter."],
    stables: ["The Private Stables", "The dukes' own stables — Erik's dark mustang Ulf among them, and Mila the blink dog tends to nap in the straw."],
    throne: ["The Throne Room", "The seat of the duchy, red carpet to the dais. Where the dukes hold court, hear petitions, and receive the couriers nobody invited."],
    "dining-private": ["The Private Keep Dining House", "Where the dukes and their inner circle eat — Steve, Christopher, the lieutenants. Quieter talk than the public hall hears."],
    bath: ["The Bath House", "Hot water hauled and heated. A rare luxury on the frontier, and the dukes earned it."],
    storage: ["Storage", "Grain, arms, and the duchy's reserves. Watched more carefully since the settlers began arriving."],
    kitchen: ["The Castle Kitchen", "Feeds the keep. Somewhere in here is a secret door — the household swears it leads somewhere, though where is the household's own business."],
    "dining-public": ["The Public Keep Dining Hall", "The great hall where the keep's people, soldiers, and guests are fed together. Loud, warm, and the best place to hear what the duchy is really thinking."],
    gate: ["The Keep Gate", "The way in. Beyond it, the courtyard, the walls, and the town rising around them."],
    will: ["William's Room", "The Duke's own chambers."],
    war: ["The War Room", "Where the maps are spread and the hard decisions are made. The duchy's plans for the deep, the settlers, and the things below begin here."],
    red: ["Red's Room", "The goliath's quarters — with a dumbwaiter, because someone his size appreciates not taking the stairs for everything."],
    guest: ["The Private Guest Room", "For visitors the dukes actually trust. The others are housed where they can be watched."],
    common: ["The Common Room / Private Dining", "The dukes' shared living space — where the three of them actually relax, when they ever do."],
    erik: ["Erik's Room", "The druid's chambers. Closest, by the keep's own logic, to the stairs that lead down to the root."],
    stair: ["The Grand Stair", "Down to the ground floor and the throne room — and, by a different and older stair, to the House Beneath the House."]
  };
  const wrap = document.getElementById('keepwrap');
  const panel = document.getElementById('keeppanel');
  const pClose = panel.querySelector('.mappanel-close');
  const pContent = panel.querySelector('.mappanel-content');
  
  wrap.querySelectorAll('.khot').forEach(g => {
    const sel = () => {
      wrap.querySelectorAll('.khot').forEach(x => x.classList.remove('km-sel'));
      g.classList.add('km-sel');
      const d = ROOMS[g.getAttribute('data-room')];
      if (d) {
        pContent.innerHTML = `<h4>${d[0]}</h4><p>${d[1]}</p>`;
        pClose.style.display = 'block';
      }
    };
    g.addEventListener('click', sel);
    g.addEventListener('keypress', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sel();
      }
    });
  });

  if (pClose) {
    pClose.addEventListener('click', () => {
      wrap.querySelectorAll('.khot').forEach(x => x.classList.remove('km-sel'));
      pContent.innerHTML = '<h4>Greenwatch Keep</h4><p>Click a room to read about it.</p>';
      pClose.style.display = 'none';
    });
  }
  
  // Floor toggle
  document.querySelectorAll('.kt-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.kt-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      const f = b.getAttribute('data-floor');
      document.getElementById('keepmap-ground').style.display = f === 'ground' ? 'block' : 'none';
      document.getElementById('keepmap-upper').style.display = f === 'upper' ? 'block' : 'none';
      pContent.innerHTML = '<h4>Greenwatch Keep</h4><p>Click a room to read about it.</p>';
      pClose.style.display = 'none';
    });
  });

  // Calculate and set aspect-ratio dynamically for Keep Map
  const keepImg = document.querySelector('#keepmap-ground img');
  if (keepImg) {
    const setKeepAspect = () => {
      const aspect = keepImg.naturalWidth / keepImg.naturalHeight;
      if (aspect && aspect > 0 && isFinite(aspect)) {
        wrap.style.setProperty('--aspect-ratio', aspect);
      }
    };
    if (keepImg.complete) {
      setKeepAspect();
    } else {
      keepImg.addEventListener('load', setKeepAspect);
    }
  }
})();
