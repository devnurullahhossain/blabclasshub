/* B-lab class hub behaviour. Reads everything from js/data.js.
   Sections: helpers, renderers, profile popup, live features (countdown, counters, cursor, tilt), events. */
(function(){
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var $ = function(id){ return document.getElementById(id); };
  var osReduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var forced = false;
  try { forced = localStorage.getItem('blab-motion') === 'on'; } catch (e) {}
  var reduce = osReduce && !forced;   /* the Motion button in the header lets a visitor switch animations on */
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- helpers ---------- */
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function initials(name){ var p = name.trim().split(/\s+/); return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function photoSrc(f){ return (window.PHOTOS && window.PHOTOS[f]) || ('images/students/' + f); }

  /* Monogram tile, used when a student has no photo yet. */
  function mono(i){
    return '<svg class="mg mg' + (i % 6) + '" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100"/>' +
      '<text x="50" y="53" text-anchor="middle" dominant-baseline="central" font-size="42">' + esc(initials(PEOPLE[i].n)) + '</text></svg>';
  }
  /* Real photo when p.f is set, otherwise the monogram. */
  function face(i, alt){
    var p = PEOPLE[i];
    if (!p.f) return mono(i);
    return '<img src="' + photoSrc(p.f) + '" alt="' + esc(alt || '') + '" width="480" height="480" loading="lazy" decoding="async" data-id="' + i + '">';
  }
  /* A missing or broken photo falls back to the monogram. Error events do not bubble, so listen in capture. */
  document.addEventListener('error', function(e){
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.getAttribute('data-id') !== null) t.outerHTML = mono(parseInt(t.getAttribute('data-id'), 10));
  }, true);

  function pill(st){ return '<span class="pill pill--' + STATUS[st][1] + '">' + STATUS[st][0] + '</span>'; }
  function trackName(k){ return TRACKS[k].name; }
  var DOT = '<span class="live-dot" title="Live project" aria-hidden="true"></span>';

  var ICONS = {
    file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    slides:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
    link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    template:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    check:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'
  };

  var state = {q:'', track:'all', view:'grid'};
  var ring = [], ringPos = 0;
  var grid = $('grid'), chips = $('chips'), count = $('count'), dlg = $('dlg');

  function visible(){
    var q = state.q.trim().toLowerCase(), out = [];
    PEOPLE.forEach(function(p, i){
      if (state.track !== 'all' && p.t !== state.track) return;
      if (q) {
        var hay = [p.n, p.r, p.p, trackName(p.t)].concat(p.s).join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      out.push(i);
    });
    return out;
  }

  /* ---------- renderers ---------- */
  function renderWall(){
    $('wall').innerHTML = PEOPLE.map(function(p, i){
      return '<button class="tile' + (p.st === 'live' ? ' is-live' : '') + '" type="button" data-id="' + i + '" data-cursor="View" style="--i:' + i + '" aria-label="Open profile of ' + esc(p.n) + '">' +
        face(i) + (p.st === 'live' ? DOT : '') + '<span class="tl">' + esc(p.n.split(' ')[0]) + '</span></button>';
    }).join('');
  }

  function renderMarquee(){
    var items = [];
    Object.keys(TRACKS).forEach(function(k){ items = items.concat(TRACKS[k].tools); });
    items = items.concat(['Freelancing', 'Portfolio', 'First client']);
    var one = '<ul>' + items.concat(items).map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    $('marq').innerHTML = one + one.replace('<ul>', '<ul aria-hidden="true">');
  }

  function renderTracks(){
    var keys = Object.keys(TRACKS);
    $('tracks').innerHTML = keys.map(function(k, n){
      var t = TRACKS[k];
      var ids = PEOPLE.map(function(p, i){ return i; }).filter(function(i){ return PEOPLE[i].t === k; });
      var withPhoto = ids.filter(function(i){ return PEOPLE[i].f; }).slice(0, 7);
      var shown = withPhoto.length ? withPhoto : ids.slice(0, 7);
      var stack = shown.map(function(i){ return '<span class="f">' + face(i) + '</span>'; }).join('');
      return '<li class="tr' + (n === 0 ? ' open' : '') + '" data-k="' + k + '">' +
        '<button class="tr-btn" type="button" aria-expanded="' + (n === 0) + '" aria-controls="tr-' + k + '">' +
        '<span class="tr-n">' + pad(n + 1) + '</span><span class="tr-name">' + esc(t.name) + '</span>' +
        '<span class="tr-tools">' + t.tools.map(function(x){ return '<span>' + esc(x) + '</span>'; }).join('') + '</span>' +
        '<span class="tr-plus" aria-hidden="true"></span></button>' +
        '<div class="tr-body" id="tr-' + k + '"><div class="tr-in"><div class="tr-grid"><span></span>' +
        '<p>' + esc(t.blurb) + '</p>' +
        '<div class="faces"><span class="stackrow">' + stack + '</span><span><b>' + ids.length + ' students</b><br>' +
        '<button class="link-btn" type="button" data-see="' + k + '">See them</button></span></div>' +
        '</div></div></div></li>';
    }).join('');
  }

  function slot(){ return Math.floor(Date.now() / (5 * 60 * 1000)); }
  var lastSpot = -1;

  function renderSpot(){
    var cand = PEOPLE.map(function(p, i){ return i; }).filter(function(i){ return PEOPLE[i].f; });
    if (!cand.length) cand = PEOPLE.map(function(p, i){ return i; });
    var i = cand[slot() % cand.length];
    if (i === lastSpot) return;
    lastSpot = i;
    var p = PEOPLE[i];
    $('spot').innerHTML =
      '<div class="spot-ph">' + face(i, p.n) + '<span class="sticker">Spotlight · now</span></div>' +
      '<div><p class="kicker">Roll ' + pad(i + 1) + ' · ' + esc(trackName(p.t)) + '</p>' +
      '<h3>' + esc(p.n) + '</h3><p class="role">' + esc(p.r) + '</p>' +
      '<p class="bio">' + esc(p.b) + '</p>' +
      '<div class="chips">' + p.s.map(function(x){ return '<span class="chip" style="cursor:default">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<p class="proj">Featured project<b>' + esc(p.p) + '</b></p>' +
      '<button class="btn" type="button" data-open="' + i + '">Open profile</button></div>';
  }

  function renderChips(){
    var html = '<button class="chip" type="button" data-track="all" aria-pressed="' + (state.track === 'all') + '">All<small>' + PEOPLE.length + '</small></button>';
    Object.keys(TRACKS).forEach(function(k){
      var n = PEOPLE.filter(function(p){ return p.t === k; }).length;
      html += '<button class="chip" type="button" data-track="' + k + '" aria-pressed="' + (state.track === k) + '">' + esc(trackName(k)) + '<small>' + n + '</small></button>';
    });
    chips.innerHTML = html;
  }

  function renderGrid(){
    var ids = visible();
    grid.className = 'grid' + (state.view === 'list' ? ' grid--list' : '');
    count.textContent = 'Showing ' + ids.length + ' of ' + PEOPLE.length + ' students';
    if (!ids.length) {
      grid.innerHTML = '<li class="empty">No student matches that search.<button type="button" id="clearBtn">Clear filters</button></li>';
      return;
    }
    grid.innerHTML = ids.map(function(i){
      var p = PEOPLE[i];
      return '<li><button class="card" type="button" data-id="' + i + '" data-cursor="View" aria-label="Open profile of ' + esc(p.n) + '">' +
        '<div class="ph">' + face(i) + '<span class="roll">' + pad(i + 1) + '</span>' + (p.st === 'live' ? DOT : '') + '</div>' +
        '<span class="ct"><span class="nm">' + esc(p.n) + '</span><span class="rl">' + esc(p.r) + '</span>' +
        '<span class="sk">' + esc(p.s.slice(0, 2).join(' · ')) + '</span></span>' +
        '<span class="row">' + pill(p.st) + '<span class="trk">' + esc(trackName(p.t)) + '</span></span></button></li>';
    }).join('');
  }

  function renderLive(){
    var ids = PEOPLE.map(function(p, i){ return i; }).filter(function(i){ return PEOPLE[i].st === 'live'; });
    if (!ids.length) { $('live').hidden = true; return; }
    $('liveList').innerHTML = ids.map(function(i){
      var p = PEOPLE[i];
      return '<li><button class="lv" type="button" data-id="' + i + '" data-cursor="View" aria-label="Open profile of ' + esc(p.n) + '">' +
        '<span class="lv-top"><span class="lv-ph">' + face(i) + '</span><span><span class="lv-name">' + esc(p.n) + '</span><span class="lv-role">' + esc(p.r) + '</span></span></span>' +
        '<span class="lv-proj">' + esc(p.p) + '</span>' +
        '<span class="lv-foot"><span class="lv-badge"><i class="live-dot is-inline" aria-hidden="true"></i>Live</span><span class="trk">' + esc(trackName(p.t)) + '</span></span></button></li>';
    }).join('');
  }

  function renderSkillMap(){
    var counts = {};
    PEOPLE.forEach(function(p){ p.s.forEach(function(s){ counts[s] = (counts[s] || 0) + 1; }); });
    var list = Object.keys(counts).map(function(k){ return [k, counts[k]]; }).sort(function(a, b){ return b[1] - a[1] || a[0].localeCompare(b[0]); });
    var max = list.length ? list[0][1] : 1;
    $('smRows').innerHTML = list.map(function(r, n){
      return '<div class="sm-row" style="--n:' + n + '"><span class="sm-name">' + esc(r[0]) + '</span><span class="sm-bar"><i style="--w:' + Math.round(r[1] / max * 100) + '%"></i></span><b>' + r[1] + '</b></div>';
    }).join('');
  }

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function renderNotices(){
    $('notes').innerHTML = NOTICES.map(function(n){
      var d = n.d.split('-'), dt = new Date(+d[0], +d[1] - 1, +d[2]);
      return '<li class="note"><time class="nd" datetime="' + n.d + '"><b>' + pad(dt.getDate()) + '</b><span>' + MONTHS[dt.getMonth()] + ' · ' + DAYS[dt.getDay()] + '</span></time>' +
        '<div><h3>' + esc(n.title) + '</h3><p>' + esc(n.time) + '. ' + esc(n.text) + '</p></div>' +
        '<span class="tag' + (n.kind ? ' tag--' + n.kind : '') + '">' + esc(n.tag) + '</span></li>';
    }).join('');
  }

  function renderResources(){
    $('res').innerHTML = RESOURCES.map(function(r){
      var inner = '<span class="ri" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[r.icon] || ICONS.file) + '</svg></span>' +
        '<div><span class="rk">' + esc(r.kind) + (r.href ? ' · opens in a new tab' : '') + '</span><h3>' + esc(r.title) + '</h3><p>' + esc(r.text) + '</p></div>';
      return '<li>' + (r.href ? '<a class="rcard" href="' + esc(r.href) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="rcard">' + inner + '</div>') + '</li>';
    }).join('');
  }

  function renderFooter(){
    var rows = SITE.schedule.map(function(r){ return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; });
    var d = Date.parse(NEXT_CLASS.at);
    if (!isNaN(d)) rows.push('<div><dt>Next class</dt><dd>' + esc(NEXT_CLASS.title) + '</dd></div>');
    $('fSchedule').innerHTML = rows.join('');
    var contact = [];
    if (SITE.email) contact.push('<div><dt>Batch email</dt><dd class="foot-mail"><span id="fMail">' + esc(SITE.email) + '</span> <button class="ghost" id="fCopy" type="button">Copy</button></dd></div>');
    contact.push('<div><dt>Class group</dt><dd>Link is pinned in the batch group</dd></div>');
    contact.push('<div><dt>Spotted a mistake?</dt><dd>Message your batch lead</dd></div>');
    $('fContact').innerHTML = contact.join('');
    $('fUpdated').textContent = 'Updated ' + SITE.updated;
  }

  /* ---------- profile popup ---------- */
  function openProfile(id){
    var p = PEOPLE[id];
    $('mPh').innerHTML = face(id, p.n);
    $('mRoll').textContent = 'ROLL ' + pad(id + 1) + ' / ' + PEOPLE.length;
    $('mName').textContent = p.n;
    $('mRole').textContent = p.r + ' · ' + trackName(p.t);
    $('mMeta').innerHTML = pill(p.st);
    $('mBio').textContent = p.b;
    $('mSkills').innerHTML = p.s.map(function(x){ return '<span class="chip">' + esc(x) + '</span>'; }).join('');
    $('mProj').textContent = p.p;
    var link = $('mLink');
    if (p.l) { link.href = p.l; link.hidden = false; } else { link.hidden = true; }
    $('mShare').textContent = 'Copy profile link';
    ringPos = ring.indexOf(id);
    if (ringPos < 0) { ring = PEOPLE.map(function(x, i){ return i; }); ringPos = id; }
    $('mPos').textContent = (ringPos + 1) + ' OF ' + ring.length;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    try { history.replaceState(null, '', '#roll-' + pad(id + 1)); } catch (e) {}
  }
  function step(d){
    if (!ring.length) return;
    ringPos = (ringPos + d + ring.length) % ring.length;
    openProfile(ring[ringPos]);
  }
  dlg.addEventListener('close', function(){
    try { if (/^#roll-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  });
  dlg.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  function copyText(text, btn, label){
    function done(t){ var old = label; btn.textContent = t; setTimeout(function(){ btn.textContent = old; }, 1800); }
    function fallback(){
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); done(ok ? 'Copied' : 'Select and copy');
    }
    try { navigator.clipboard.writeText(text).then(function(){ done('Copied'); }, fallback); } catch (e) { fallback(); }
  }

  /* ---------- live features ---------- */
  function calendarLink(t){
    function g(d){ return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var end = new Date(t + (NEXT_CLASS.hours || 2) * 3600e3);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('B-lab: ' + NEXT_CLASS.title) +
      '&dates=' + g(new Date(t)) + '/' + g(end) + '&details=' + encodeURIComponent('B-lab 8th batch class');
  }

  function countdown(){
    var target = Date.parse(NEXT_CLASS.at);
    $('ccTitle').textContent = NEXT_CLASS.title;
    if (isNaN(target)) { $('count-card').hidden = true; $('dock').hidden = true; return; }
    $('calLink').href = calendarLink(target);
    function tick(){
      var diff = Math.max(0, target - Date.now()), s = Math.floor(diff / 1000);
      var v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      ['tD', 'tH', 'tM', 'tS'].forEach(function(id, n){ $(id).textContent = pad(v[n]); });
      $('ccLabel').textContent = diff === 0 ? 'Class is on now' : 'Next class in';
      var short = v[0] > 0 ? v[0] + 'd ' + pad(v[1]) + 'h' : pad(v[1]) + ':' + pad(v[2]) + ':' + pad(v[3]);
      $('dockText').textContent = diff === 0 ? 'Class is on now' : 'Next class in ' + short;
    }
    tick(); setInterval(tick, 1000);
  }

  function counters(){
    var live = PEOPLE.filter(function(p){ return p.st === 'live'; }).length;
    $('liveNow').textContent = live;
    var targets = {sStudents: PEOPLE.length, sTracks: Object.keys(TRACKS).length, sLive: live};
    Object.keys(targets).forEach(function(id){
      var el = $(id), end = targets[id];
      if (reduce) { el.textContent = end; return; }
      var t0 = null;
      function frame(t){
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * e);
        if (k < 1) requestAnimationFrame(frame);
      }
      el.textContent = end;
      requestAnimationFrame(function(t){ el.textContent = 0; frame(t); });
    });
  }

  function reveals(){
    var els = document.querySelectorAll('.sec-head, .tracks, .spot, .notes, .res, .tools, .livegrid, .skillmap');
    Array.prototype.forEach.call(els, function(el){ el.classList.add('rv'); });
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(els, function(el){ el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold: 0.08});
    Array.prototype.forEach.call(els, function(el){ io.observe(el); });
  }

  function progress(){
    var bar = $('prog'), ticking = false;
    function update(){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
      $('dock').classList.toggle('show', window.scrollY > 700);
      ticking = false;
    }
    window.addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
    update();
  }

  function cursor(){
    if (!finePointer || reduce) return;
    var c = document.createElement('div');
    c.className = 'cur'; c.setAttribute('aria-hidden', 'true'); c.innerHTML = '<span></span>';
    document.body.appendChild(c);
    var label = c.firstChild, x = 0, y = 0, cx = 0, cy = 0, started = false;
    window.addEventListener('mousemove', function(e){
      x = e.clientX; y = e.clientY;
      if (!started) { started = true; cx = x; cy = y; c.classList.add('on'); loop(); }
    }, {passive: true});
    document.addEventListener('mouseleave', function(){ c.classList.remove('on'); });
    document.addEventListener('mouseenter', function(){ if (started) c.classList.add('on'); });
    document.addEventListener('mouseover', function(e){
      var t = e.target.closest ? e.target.closest('[data-cursor], a, button, input, .tr-btn') : null;
      if (!t) { c.classList.remove('is-hover', 'is-link'); return; }
      var txt = t.getAttribute('data-cursor');
      if (txt) { label.textContent = txt; c.classList.add('is-hover'); c.classList.remove('is-link'); }
      else { c.classList.add('is-link'); c.classList.remove('is-hover'); }
    });
    function loop(){
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      c.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    }
  }

  function tilt(){
    if (!finePointer || reduce) return;
    var hero = document.querySelector('.hero'), wall = $('wall');
    hero.addEventListener('mousemove', function(e){
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      wall.style.transform = 'rotateY(' + (nx * 9).toFixed(2) + 'deg) rotateX(' + (-ny * 7).toFixed(2) + 'deg)';
    });
    hero.addEventListener('mouseleave', function(){ wall.style.transform = ''; });
  }

  /* ---------- events ---------- */
  function surprise(){
    ring = PEOPLE.map(function(p, i){ return i; });
    openProfile(Math.floor(Math.random() * PEOPLE.length));
  }
  $('q').addEventListener('input', function(e){ state.q = e.target.value; renderGrid(); });
  chips.addEventListener('click', function(e){
    var b = e.target.closest('button[data-track]');
    if (!b) return;
    state.track = b.getAttribute('data-track');
    renderChips(); renderGrid();
  });
  $('view').addEventListener('click', function(e){
    var b = e.target.closest('button[data-view]');
    if (!b) return;
    state.view = b.getAttribute('data-view');
    Array.prototype.forEach.call($('view').children, function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    renderGrid();
  });
  $('shuffleBtn').addEventListener('click', surprise);
  if ($('heroShuffle')) $('heroShuffle').addEventListener('click', surprise);
  $('wall').addEventListener('click', function(e){
    var b = e.target.closest('button[data-id]');
    if (!b) return;
    ring = PEOPLE.map(function(p, i){ return i; });
    openProfile(parseInt(b.getAttribute('data-id'), 10));
  });
  grid.addEventListener('click', function(e){
    if (e.target.id === 'clearBtn') { state.q = ''; state.track = 'all'; $('q').value = ''; renderChips(); renderGrid(); return; }
    var b = e.target.closest('button[data-id]');
    if (!b) return;
    ring = visible();
    openProfile(parseInt(b.getAttribute('data-id'), 10));
  });
  $('spot').addEventListener('click', function(e){
    var b = e.target.closest('button[data-open]');
    if (!b) return;
    ring = PEOPLE.map(function(p, i){ return i; });
    openProfile(parseInt(b.getAttribute('data-open'), 10));
  });
  $('tracks').addEventListener('click', function(e){
    var see = e.target.closest('button[data-see]');
    if (see) {
      state.track = see.getAttribute('data-see'); state.q = ''; $('q').value = '';
      renderChips(); renderGrid();
      $('students').scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
      return;
    }
    var btn = e.target.closest('.tr-btn');
    if (!btn) return;
    var li = btn.parentNode, open = li.classList.contains('open');
    Array.prototype.forEach.call($('tracks').children, function(x){
      x.classList.remove('open'); x.firstChild.setAttribute('aria-expanded', 'false');
    });
    if (!open) { li.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  });
  $('liveList').addEventListener('click', function(e){
    var b = e.target.closest('button[data-id]');
    if (!b) return;
    ring = PEOPLE.map(function(p, i){ return i; }).filter(function(i){ return PEOPLE[i].st === 'live'; });
    openProfile(parseInt(b.getAttribute('data-id'), 10));
  });
  $('toTop').addEventListener('click', function(){ window.scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'}); });
  $('mClose').addEventListener('click', function(){ dlg.close(); });
  $('mPrev').addEventListener('click', function(){ step(-1); });
  $('mNext').addEventListener('click', function(){ step(1); });
  $('mShare').addEventListener('click', function(){
    var url = location.href.split('#')[0] + '#roll-' + pad(ring[ringPos] + 1);
    copyText(url, $('mShare'), 'Copy profile link');
  });
  dlg.addEventListener('click', function(e){ if (e.target === dlg) dlg.close(); });
  document.addEventListener('keydown', function(e){
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || dlg.open) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return;
    e.preventDefault(); $('q').focus();
    $('students').scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
  });
  $('themeBtn').addEventListener('click', function(){
    var cur = root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('blab-theme', next); } catch (e) {}
  });
  try { var saved = localStorage.getItem('blab-theme'); if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved); } catch (e) {}

  function openFromHash(){
    var m = /^#roll-(\d+)$/.exec(location.hash);
    if (!m) return;
    var id = parseInt(m[1], 10) - 1;
    if (id >= 0 && id < PEOPLE.length) { ring = PEOPLE.map(function(p, i){ return i; }); openProfile(id); }
  }
  window.addEventListener('hashchange', openFromHash);

  /* ---------- first paint ---------- */
  renderWall(); renderMarquee(); renderLive(); renderTracks(); renderSkillMap(); renderSpot();
  renderChips(); renderGrid(); renderNotices(); renderResources(); renderFooter();
  var fc = $('fCopy');
  if (fc) fc.addEventListener('click', function(){ copyText($('fMail').textContent, fc, 'Copy'); });
  countdown(); counters(); reveals(); progress(); cursor(); tilt();
  setInterval(renderSpot, 10000);
  if (osReduce) {
    var mb = $('motionBtn');
    mb.hidden = false;
    mb.setAttribute('aria-pressed', forced ? 'true' : 'false');
    mb.querySelector('.lbl').textContent = forced ? 'Motion on' : 'Motion off';
    mb.addEventListener('click', function(){
      try { localStorage.setItem('blab-motion', forced ? 'off' : 'on'); } catch (e) {}
      location.reload();
    });
  }
  openFromHash();
})();
