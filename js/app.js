/* B-lab class hub behaviour. Reads everything from js/data.js.
   Sections: helpers, renderers, profile popup, live features (countdown, counters, cursor, tilt), events. */
(function(){
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var $ = function(id){ return document.getElementById(id); };
  var reduce = false;   /* animations are always on, even when the phone or PC has reduce motion switched on */
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- helpers ---------- */
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function initials(name){ var p = name.trim().split(/\s+/); return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function photoSrc(f){ if (/^(https?:)?\/\//i.test(f) || /^data:image\//i.test(f)) return f; return (window.PHOTOS && window.PHOTOS[f]) || ('images/students/' + f); }

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
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
  var SOCIAL = {fb:'Facebook', ig:'Instagram', li:'LinkedIn', be:'Behance', yt:'YouTube', gh:'GitHub', wa:'WhatsApp', web:'Website'};
  var MARKET = {fiverr:'Fiverr', upwork:'Upwork', fl:'Freelancer', pph:'PeoplePerHour'};
  function safeUrl(u, key){
    u = String(u || '').trim();
    if (!u) return '';
    if (key === 'wa') { u = u.replace(/[^0-9]/g, ''); return u ? 'https://wa.me/' + u : ''; }
    if (/^[a-z][a-z0-9+.\-]*:(?!\d)/i.test(u) && !/^https?:\/\//i.test(u)) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return /^https?:\/\/[^\s"<>]+$/i.test(u) ? u : '';
  }
  function linkGroup(k, map, cls){
    var out = Object.keys(map).map(function(key){
      var u = safeUrl(k[key], key);
      return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + map[key] + ARROW + '</a>' : '';
    }).filter(Boolean);
    return out.length ? '<div class="m-links ' + cls + '">' + out.join('') + '</div>' : '';
  }
  function tcStyle(k){ return TRACKS[k] && TRACKS[k].c ? ' style="--tc:' + TRACKS[k].c + '"' : ''; }
  function skillTrack(s){
    var keys = Object.keys(TRACKS);
    for (var n = 0; n < keys.length; n++) if (TRACKS[keys[n]].tools.indexOf(s) >= 0) return keys[n];
    return '';
  }
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
        face(i) + (p.st === 'live' ? DOT : '') + (p.w ? '<span class="starmark" title="First client won">&#9733;</span>' : '') + '<span class="tl">' + esc(p.n.split(' ')[0]) + '</span></button>';
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
      return '<li class="tr' + (n === 0 ? ' open' : '') + '" data-k="' + k + '"' + tcStyle(k) + '>' +
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
      html += '<button class="chip" type="button" data-track="' + k + '"' + tcStyle(k) + ' aria-pressed="' + (state.track === k) + '">' + esc(trackName(k)) + '<small>' + n + '</small></button>';
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
        '<span class="row">' + pill(p.st) + '<span class="trk"' + tcStyle(p.t) + '>' + esc(trackName(p.t)) + '</span></span></button></li>';
    }).join('');
  }

  function renderLive(){
    var ids = PEOPLE.map(function(p, i){ return i; }).filter(function(i){ return PEOPLE[i].st === 'live'; });
    if (!ids.length) { $('live').hidden = true; return; }
    $('liveList').innerHTML = ids.map(function(i){
      var p = PEOPLE[i];
      return '<li><button class="lv"' + tcStyle(p.t) + ' type="button" data-id="' + i + '" data-cursor="View" aria-label="Open profile of ' + esc(p.n) + '">' +
        '<span class="lv-top"><span class="lv-ph">' + face(i) + '</span><span><span class="lv-name">' + esc(p.n) + '</span><span class="lv-role">' + esc(p.r) + '</span></span></span>' +
        '<span class="lv-proj">' + esc(p.p) + '</span>' +
        '<span class="lv-foot"><span class="lv-badge"><i class="live-dot is-inline" aria-hidden="true"></i>Live</span><span class="trk"' + tcStyle(p.t) + '>' + esc(trackName(p.t)) + '</span></span></button></li>';
    }).join('');
    renderProgress();
  }

  function renderProgress(){
    var n = PEOPLE.length, c = {live: 0, wip: 0, todo: 0};
    PEOPLE.forEach(function(p){ c[p.st]++; });
    function pc(v){ return Math.round(v / n * 100); }
    $('bprog').innerHTML = '<div class="bp-bar" role="img" aria-label="' + c.live + ' live, ' + c.wip + ' in progress, ' + c.todo + ' not started"><i class="b-live" style="--w:' + pc(c.live) + '%"></i><i class="b-wip" style="--w:' + pc(c.wip) + '%"></i><i class="b-todo" style="--w:' + pc(c.todo) + '%"></i></div>' +
      '<div class="bp-leg"><span><i style="background:var(--live)"></i><b>' + c.live + '</b> live (' + pc(c.live) + '%)</span><span><i style="background:var(--spark)"></i><b>' + c.wip + '</b> in progress</span><span><i style="background:var(--idle-ink);opacity:.5"></i><b>' + c.todo + '</b> not started</span></div>';
  }

  function renderSkillMap(){
    var counts = {};
    PEOPLE.forEach(function(p){ p.s.forEach(function(s){ counts[s] = (counts[s] || 0) + 1; }); });
    var list = Object.keys(counts).map(function(k){ return [k, counts[k]]; }).sort(function(a, b){ return b[1] - a[1] || a[0].localeCompare(b[0]); });
    var max = list.length ? list[0][1] : 1;
    $('smRows').innerHTML = list.map(function(r, n){
      var st = skillTrack(r[0]), col = st ? TRACKS[st].c : '';
      return '<div class="sm-row" style="--n:' + n + (col ? ';--tc:' + col : '') + '"><span class="sm-name">' + esc(r[0]) + '</span><span class="sm-bar"><i style="--w:' + Math.round(r[1] / max * 100) + '%"></i></span><b>' + r[1] + '</b></div>';
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

  function renderHire(){
    var c = SITE.contact || {};
    $('hireIntro').textContent = HIRE.intro;
    var btns = [];
    var msg = encodeURIComponent('Hello B-lab team, I would like to hire a student for a project.');
    var wa = safeUrl(c.whatsapp, 'wa');
    if (wa) btns.push('<a class="btn btn--wa" href="' + wa + '?text=' + msg + '" target="_blank" rel="noopener">Message on WhatsApp</a>');
    var ms = safeUrl(c.messenger);
    if (ms) btns.push('<a class="btn btn--line" href="' + esc(ms) + '" target="_blank" rel="noopener">Messenger</a>');
    if (c.email && /^[^\s@<>"]+@[^\s@<>"]+$/.test(c.email)) btns.push('<a class="btn btn--line" href="mailto:' + esc(c.email) + '?subject=' + encodeURIComponent('Project for B-lab students') + '">Email us</a>');
    if (!btns.length) btns.push('<a class="btn btn--spark" href="#students">Browse the students</a>');
    $('hireCta').innerHTML = btns.join('');
    $('hireSteps').innerHTML = HIRE.steps.map(function(s){ return '<li><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></li>'; }).join('');
    $('hireSvc').innerHTML = Object.keys(TRACKS).map(function(key){
      var t = TRACKS[key];
      return '<li style="--tc:' + t.c + '"><h3>' + esc(t.name) + '</h3><p>' + esc(t.blurb) + '</p><div class="tools-row">' + t.tools.map(function(x){ return '<span>' + esc(x) + '</span>'; }).join('') + '</div></li>';
    }).join('');
  }
  function renderFaq(){
    $('faqList').innerHTML = FAQ.map(function(f){ return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('');
  }


  /* ---------- class tracker ---------- */
  var SHORT_M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtD(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? parseInt(m[3], 10) + ' ' + SHORT_M[parseInt(m[2], 10) - 1] : (s || ''); }
  function isPast(d){ var t = Date.parse(d + 'T23:59:59+06:00'); return !isNaN(t) && t < Date.now(); }
  function cnt(str, ch){ var n = 0; for (var i = 0; i < str.length; i++) if (str.charAt(i) === ch) n++; return n; }
  function recOf(i){
    var T = window.TRACKER, r = T && T.rows && T.rows[i];
    if (!r) return null;
    var nC = T.classes.length, nW = T.work.length, p = cnt(r.att || '', 'P'), d = cnt(r.sub || '', '1'), late = 0;
    T.work.forEach(function(w, j){ if ((r.sub || '').charAt(j) !== '1' && isPast(w.due)) late++; });
    return {p: p, nC: nC, att: nC ? Math.round(p / nC * 100) : 0, d: d, nW: nW, late: late, r: r};
  }
  function renderTracker(){
    var T = window.TRACKER, sec = $('tracker');
    if (!T || !T.rows || !T.rows.length || (!T.classes.length && !T.work.length)) { sec.hidden = true; return; }
    sec.hidden = false;
    var recs = PEOPLE.map(function(p, i){ return recOf(i); });
    var have = recs.filter(Boolean);
    var tp = 0, tc = 0, td = 0, tw = 0, full = 0, lateStu = 0;
    have.forEach(function(r){ tp += r.p; tc += r.nC; td += r.d; tw += r.nW; if (r.nC && r.p === r.nC) full++; if (r.late) lateStu++; });
    function pc(a, b){ return b ? Math.round(a / b * 100) : 0; }
    $('tkSum').innerHTML =
      '<div class="tk-card"><b>' + pc(tp, tc) + '%</b><span>Average attendance</span></div>' +
      '<div class="tk-card"><b>' + pc(td, tw) + '%</b><span>Work handed in</span></div>' +
      '<div class="tk-card"><b>' + full + '</b><span>Perfect attendance</span></div>' +
      '<div class="tk-card"><b>' + lateStu + '</b><span>Students with late work</span></div>';
    var q = $('tkQ').value.trim().toLowerCase(), onlyLate = $('tkLate').checked;
    var head = '<thead><tr><th class="tk-s" scope="col">Student</th><th scope="col">Attendance</th>' +
      T.work.map(function(w){ return '<th class="tk-w" scope="col"><span>' + esc(w.t) + '</span><small>' + esc(fmtD(w.due)) + '</small></th>'; }).join('') +
      '<th scope="col">Done</th></tr></thead>';
    var body = PEOPLE.map(function(p, i){
      var r = recs[i]; if (!r) return '';
      if (q && p.n.toLowerCase().indexOf(q) < 0) return '';
      if (onlyLate && !r.late) return '';
      var sq = r.r.att.split('').slice(0, T.classes.length).map(function(ch, n){
        return '<i class="' + (ch === 'P' ? 'k-p' : 'k-a') + '" title="' + esc(T.classes[n].t) + ': ' + (ch === 'P' ? 'present' : 'absent') + '"></i>';
      }).join('');
      var cells = T.work.map(function(w, n){
        var done = (r.r.sub || '').charAt(n) === '1';
        if (done) return '<td><span class="k-ok" title="Handed in">&#10003;</span></td>';
        return isPast(w.due) ? '<td><span class="k-late" title="Late">Late</span></td>' : '<td><span class="k-open" title="Not due yet">&ndash;</span></td>';
      }).join('');
      return '<tr' + (q ? ' class="hit"' : '') + '><th class="tk-s" scope="row"><button type="button" data-id="' + i + '"><span class="tk-av">' + face(i) + '</span><span class="tk-n">' + esc(p.n) + '</span></button></th>' +
        '<td><span class="tk-att"><span class="tk-sq">' + sq + '</span><b>' + r.att + '%</b></span></td>' + cells +
        '<td><b class="tk-done' + (r.d === r.nW ? ' all' : '') + '">' + r.d + '/' + r.nW + '</b></td></tr>';
    }).join('');
    $('tkTable').innerHTML = head + '<tbody>' + (body || '<tr><td class="tk-none" colspan="' + (T.work.length + 3) + '">No student matches.</td></tr>') + '</tbody>';
  }
  function recordHtml(i){
    var r = recOf(i);
    if (!r) return '';
    return '<h4>Class record</h4><div class="rec"><div><b>' + r.att + '%</b><span>Attendance (' + r.p + ' of ' + r.nC + ' classes)</span><i style="--w:' + r.att + '%"></i></div>' +
      '<div><b>' + r.d + ' of ' + r.nW + '</b><span>Work handed in' + (r.late ? ' · ' + r.late + ' late' : '') + '</span><i style="--w:' + (r.nW ? Math.round(r.d / r.nW * 100) : 0) + '%"></i></div></div>';
  }

  /* ---------- success stories ---------- */
  function renderStories(){
    var S = window.STORIES || [], c = SITE.contact || {};
    var msg = encodeURIComponent('Hello B-lab team, I would like to share my client story for the website.');
    var wa = safeUrl(c.whatsapp, 'wa'), mail = c.email && /^[^\s@<>"]+@[^\s@<>"]+$/.test(c.email) ? c.email : '';
    var cta = wa ? '<a class="btn btn--spark" href="' + wa + '?text=' + msg + '" target="_blank" rel="noopener">Share your story</a>' :
      (mail ? '<a class="btn btn--spark" href="mailto:' + esc(mail) + '?subject=' + encodeURIComponent('My client story') + '">Share your story</a>' : '');
    var cards = S.map(function(s){
      var p = PEOPLE[s.s], stars = '';
      for (var n = 0; n < (s.stars || 0); n++) stars += '&#9733;';
      return '<figure class="story"' + (p ? tcStyle(p.t) : '') + '>' + (s.sample ? '<span class="st-sample">Sample story</span>' : '') +
        (stars ? '<span class="st-stars" aria-label="' + s.stars + ' out of 5">' + stars + '</span>' : '') +
        '<blockquote>' + esc(s.quote) + '</blockquote>' +
        (s.result ? '<span class="st-res">' + esc(s.result) + '</span>' : '') +
        '<figcaption>' + (p ? '<button type="button" class="st-who" data-id="' + s.s + '"><span class="tk-av">' + face(s.s) + '</span><span><b>' + esc(p.n) + '</b><small>' + esc(p.r) + '</small></span></button>' : '<span></span>') +
        (s.client ? '<span class="st-client">for ' + esc(s.client) + '</span>' : '') + '</figcaption></figure>';
    }).join('');
    var invite = '<div class="story story--invite"><span class="st-mark" aria-hidden="true">&ldquo;</span><h3>' + (S.length ? 'Worked with one of us?' : 'The first stories are on their way') + '</h3>' +
      '<p>' + (S.length ? 'Tell us how it went and your words can appear here.' : 'Our students are finishing their first client projects. When a client says something kind, it will appear on this page.') + '</p>' + cta + '</div>';
    $('storyList').innerHTML = cards + invite;
  }

  function renderFooter(){
    var rows = SITE.schedule.map(function(r){ return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; });
    var d = Date.parse(NEXT_CLASS.at);
    if (!isNaN(d)) rows.push('<div><dt>Next class</dt><dd>' + esc(NEXT_CLASS.title) + '</dd></div>');
    $('fSchedule').innerHTML = rows.join('');
    var contact = [];
    if (SITE.email) contact.push('<div><dt>Batch email</dt><dd class="foot-mail"><span id="fMail">' + esc(SITE.email) + '</span> <button class="ghost" id="fCopy" type="button">Copy</button></dd></div>');
    var cg = SITE.contact || {};
    var gu = safeUrl(cg.group);
    contact.push('<div><dt>Class group</dt><dd>' + (gu ? '<a href="' + esc(gu) + '" target="_blank" rel="noopener">Open the class group</a>' : 'Link is pinned in the batch group') + '</dd></div>');
    var wu = safeUrl(cg.whatsapp, 'wa');
    if (wu) contact.push('<div><dt>WhatsApp</dt><dd><a href="' + wu + '" target="_blank" rel="noopener">Message the batch</a></dd></div>');
    contact.push('<div><dt>Spotted a mistake?</dt><dd>Message your batch lead</dd></div>');
    $('fContact').innerHTML = contact.join('');
    $('fUpdated').textContent = 'Updated ' + SITE.updated;
  }

  /* ---------- profile popup ---------- */
  var currentId = 0;
  function openProfile(id){
    currentId = id;
    var p = PEOPLE[id];
    $('mPh').innerHTML = face(id, p.n);
    $('mRoll').textContent = 'ROLL ' + pad(id + 1) + ' / ' + PEOPLE.length;
    $('mName').textContent = p.n;
    $('mRole').textContent = p.r + ' · ' + trackName(p.t);
    $('mMeta').innerHTML = pill(p.st);
    $('mBio').textContent = p.b;
    $('mSkills').innerHTML = p.s.map(function(x){ return '<span class="chip">' + esc(x) + '</span>'; }).join('');
    $('mProj').textContent = p.p;
    $('mTrack').innerHTML = recordHtml(id);
    var k = p.k || {};
    var mk = linkGroup(k, MARKET, 'mk'), so = linkGroup(k, SOCIAL, '');
    $('mLinksWrap').innerHTML = (mk ? '<h4>Hire on</h4>' + mk : '') + (so ? '<h4>Find me on</h4>' + so : '') + (!mk && !so ? '<h4>Links</h4><p class="m-none">Social and marketplace links will be added soon.</p>' : '');
    $('mMeta').innerHTML = pill(p.st) + (p.w ? '<br><span class="star">&#9733; First client won</span>' : '');
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


  /* ---------- student ID card (drawn on a canvas, no libraries) ---------- */
  var MONO_COLORS = [['#0B6E5C', '#F2F7F4'], ['#F2B33D', '#2A1D00'], ['#E3F1EB', '#0B6E5C'], ['#143F36', '#F2B33D'], ['#EDE7D8', '#0E3A31'], ['#0E5A4A', '#E3F1EB']];
  function loadImg(src){
    return new Promise(function(res){
      var im = new Image();
      im.onload = function(){ res(im); };
      im.onerror = function(){ res(null); };
      im.src = src;
    });
  }
  function rrect(x, c, px, py, w, h, r){
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }
  function fit(x, text, maxW, font, start, min){
    var s = start;
    do { x.font = font.replace('{s}', s); s -= 4; } while (x.measureText(text).width > maxW && s > min);
    return s + 4;
  }
  function drawCard(id){
    var p = PEOPLE[id], W = 1080, H = 1350;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    var fonts = ['800 90px "Bricolage Grotesque"', 'italic 50px "Instrument Serif"', '500 26px "DM Mono"'];
    var ready = Promise.all(fonts.map(function(f){ return document.fonts && document.fonts.load ? document.fonts.load(f).catch(function(){}) : null; }));
    var timeout = new Promise(function(r){ setTimeout(r, 1500); });
    var photo = p.f ? loadImg(photoSrc(p.f)) : Promise.resolve(null);
    return Promise.all([Promise.race([ready, timeout]), photo]).then(function(r){
      var im = r[1];
      /* background */
      x.fillStyle = '#0E3A31'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 2;
      for (var g = 0; g <= W; g += 54) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, H); x.stroke(); }
      for (var g2 = 0; g2 <= H; g2 += 54) { x.beginPath(); x.moveTo(0, g2); x.lineTo(W, g2); x.stroke(); }
      var gl = x.createRadialGradient(900, 150, 0, 900, 150, 620);
      gl.addColorStop(0, 'rgba(242,179,61,.34)'); gl.addColorStop(1, 'rgba(242,179,61,0)');
      x.fillStyle = gl; x.fillRect(0, 0, W, H);
      /* brand row */
      x.fillStyle = '#F2F7F4'; rrect(x, 0, 80, 70, 76, 76, 22); x.fill();
      x.fillStyle = '#0E3A31'; x.font = '800 54px "Bricolage Grotesque", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('B', 118, 110);
      x.fillStyle = '#F2B33D'; x.beginPath(); x.arc(146, 82, 8, 0, 7); x.fill();
      x.textAlign = 'left'; x.fillStyle = '#F2F7F4'; x.font = '800 46px "Bricolage Grotesque", Arial, sans-serif';
      x.fillText('B-lab', 176, 110);
      x.textAlign = 'right'; x.fillStyle = '#F2B33D'; x.font = '500 24px "DM Mono", monospace';
      x.fillText('8TH BATCH · ' + String(SITE.program || '').toUpperCase(), W - 80, 110);
      /* photo */
      var px = 80, py = 200, ps = 600;
      x.save(); rrect(x, 0, px, py, ps, ps, 56); x.clip();
      if (im) { x.drawImage(im, px, py, ps, ps); }
      else {
        var col = MONO_COLORS[id % 6];
        x.fillStyle = col[0]; x.fillRect(px, py, ps, ps);
        x.fillStyle = col[1]; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 250px "Bricolage Grotesque", Arial, sans-serif';
        x.fillText(initials(p.n), px + ps / 2, py + ps / 2 + 10);
      }
      x.restore();
      x.lineWidth = 8; x.strokeStyle = '#F2B33D'; rrect(x, 0, px, py, ps, ps, 56); x.stroke();
      if (p.st === 'live') {
        x.fillStyle = '#2EE59D'; x.beginPath(); x.arc(px + ps - 52, py + 52, 17, 0, 7); x.fill();
        x.lineWidth = 5; x.strokeStyle = 'rgba(46,229,157,.55)'; x.beginPath(); x.arc(px + ps - 52, py + 52, 30, 0, 7); x.stroke();
      }
      /* roll number */
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#9FC2B7'; x.font = '500 24px "DM Mono", monospace'; x.fillText('ROLL', 740, 262);
      x.fillStyle = '#F2B33D'; x.font = '800 190px "Bricolage Grotesque", Arial, sans-serif'; x.fillText(pad(id + 1), 730, 430);
      x.fillStyle = '#9FC2B7'; x.font = '500 26px "DM Mono", monospace'; x.fillText('OF ' + PEOPLE.length, 742, 480);
      if (p.w) { x.fillStyle = '#F2B33D'; rrect(x, 0, 742, 560, 238, 54, 27); x.fill(); x.fillStyle = '#2A1D00'; x.font = '500 20px "DM Mono", monospace'; x.fillText('★ FIRST CLIENT', 764, 594); }
      /* name and role */
      x.fillStyle = '#F2F7F4';
      var ns = fit(x, p.n, W - 160, '800 {s}px "Bricolage Grotesque", Arial, sans-serif', 108, 56);
      x.font = '800 ' + ns + 'px "Bricolage Grotesque", Arial, sans-serif';
      x.fillText(p.n, 80, 905);
      x.fillStyle = '#F2B33D';
      var rs = fit(x, p.r, W - 160, 'italic {s}px "Instrument Serif", Georgia, serif', 58, 34);
      x.font = 'italic ' + rs + 'px "Instrument Serif", Georgia, serif';
      x.fillText(p.r, 80, 972);
      x.fillStyle = '#9FC2B7'; x.font = '500 24px "DM Mono", monospace';
      x.fillText(trackName(p.t).toUpperCase(), 80, 1024);
      /* skills */
      var cx = 80, cy = 1056;
      x.font = '500 26px "DM Mono", monospace';
      p.s.forEach(function(s){
        var w = x.measureText(s).width + 44;
        if (cx + w > W - 80) { cx = 80; cy += 64; }
        x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 2; rrect(x, 0, cx, cy, w, 48, 24); x.stroke();
        x.fillStyle = '#F2F7F4'; x.fillText(s, cx + 22, cy + 33);
        cx += w + 12;
      });
      /* footer */
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(80, 1236, W - 160, 2);
      x.fillStyle = '#F2F7F4'; x.font = '800 36px "Bricolage Grotesque", Arial, sans-serif';
      x.fillText('Learn it. Build it. ', 80, 1296);
      var lw = x.measureText('Learn it. Build it. ').width;
      x.fillStyle = '#F2B33D'; x.font = 'italic 44px "Instrument Serif", Georgia, serif'; x.fillText('Earn', 80 + lw, 1296);
      var ew = x.measureText('Earn ').width;
      x.fillStyle = '#F2F7F4'; x.font = '800 36px "Bricolage Grotesque", Arial, sans-serif'; x.fillText('from it.', 80 + lw + ew, 1296);
      x.textAlign = 'right'; x.fillStyle = '#9FC2B7'; x.font = '500 22px "DM Mono", monospace';
      x.fillText(String(SITE.url || ''), W - 80, 1296);
      return cv;
    });
  }
  var idDlg = $('idDlg'), idBlob = null, idName = 'blab-id.png';
  function openCard(id){
    var btn = $('mCard'), old = btn.textContent;
    btn.textContent = 'Making your card...';
    drawCard(id).then(function(cv){
      cv.toBlob(function(blob){
        btn.textContent = old;
        if (!blob) return;
        idBlob = blob;
        idName = 'blab-id-' + pad(id + 1) + '-' + PEOPLE[id].n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
        if ($('idImg').getAttribute('data-url')) URL.revokeObjectURL($('idImg').getAttribute('data-url'));
        var u = URL.createObjectURL(blob);
        $('idImg').src = u; $('idImg').setAttribute('data-url', u);
        var canShare = false;
        try { canShare = !!(navigator.canShare && navigator.canShare({files: [new File([blob], idName, {type: 'image/png'})]})); } catch (e) {}
        $('idShare').hidden = !canShare;
        if (!idDlg.open) { if (idDlg.showModal) idDlg.showModal(); else idDlg.setAttribute('open', ''); }
      }, 'image/png');
    }).catch(function(){ btn.textContent = old; });
  }
  $('mCard').addEventListener('click', function(){ openCard(currentId); });
  $('idClose').addEventListener('click', function(){ idDlg.close(); });
  idDlg.addEventListener('click', function(e){ if (e.target === idDlg) idDlg.close(); });
  $('idDl').addEventListener('click', function(){
    if (!idBlob) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(idBlob); a.download = idName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    $('idHint').textContent = 'Saved. Post it and tag the class.';
  });
  $('idShare').addEventListener('click', function(){
    if (!idBlob) return;
    try { navigator.share({files: [new File([idBlob], idName, {type: 'image/png'})], title: 'My B-lab ID card'}).catch(function(){}); } catch (e) {}
  });
  (function(){
    var st = $('idStage');
    st.addEventListener('pointermove', function(e){
      var r = st.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      st.style.setProperty('--ry', ((px - .5) * 16) + 'deg'); st.style.setProperty('--rx', ((.5 - py) * 12) + 'deg');
      st.style.setProperty('--gx', (px * 100) + '%'); st.style.setProperty('--gy', (py * 100) + '%'); st.style.setProperty('--go', '1');
    });
    st.addEventListener('pointerleave', function(){ st.style.setProperty('--rx', '0deg'); st.style.setProperty('--ry', '0deg'); st.style.setProperty('--go', '0'); });
  })();

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
    var els = document.querySelectorAll('.sec-head, .tracks, .spot, .notes, .res, .tools, .livegrid, .skillmap, .hire, .faq, .tk-sum, .tk-wrap, .stories');
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
  /* ---------- colour themes ---------- */
  var ACCENTS = {
    emerald: {name: 'Emerald', a: '#0E3A31', b: '#F2B33D'},
    ocean:   {name: 'Ocean', a: '#0B2F55', b: '#6FA8FF', l: {'--accent': '#1457B8', '--accent-soft': '#DCE8FA', '--hero-bg': '#0B2F55', '--hero-muted': '#A9C4E6'}, d: {'--accent': '#6FA8FF', '--accent-soft': '#13253F', '--hero-bg': '#0C2542', '--hero-muted': '#A9C4E6', '--on-accent': '#0A1B33'}},
    violet:  {name: 'Violet', a: '#2A1659', b: '#B79BFF', l: {'--accent': '#6B3FD4', '--accent-soft': '#E8E0FA', '--hero-bg': '#2A1659', '--hero-muted': '#BFB0E8'}, d: {'--accent': '#A98BFF', '--accent-soft': '#221840', '--hero-bg': '#211048', '--hero-muted': '#BFB0E8', '--on-accent': '#1B0F3D'}},
    sunset:  {name: 'Sunset', a: '#4A1D2B', b: '#FF7A8C', l: {'--accent': '#B8324A', '--accent-soft': '#FADDE2', '--hero-bg': '#4A1D2B', '--hero-muted': '#E3B5BE'}, d: {'--accent': '#FF7A8C', '--accent-soft': '#3A1620', '--hero-bg': '#3A1521', '--hero-muted': '#E3B5BE', '--on-accent': '#3A0A14'}}
  };
  var ACC_VARS = ['--accent', '--accent-soft', '--hero-bg', '--hero-muted', '--on-accent'];
  var accent = 'emerald';
  try { accent = localStorage.getItem('blab-accent') || 'emerald'; } catch (e) {}
  if (!ACCENTS[accent]) accent = 'emerald';
  function isDark(){ var t = root.getAttribute('data-theme'); return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function applyAccent(){
    ACC_VARS.forEach(function(v){ root.style.removeProperty(v); });
    var t = ACCENTS[accent], set = t && (isDark() ? t.d : t.l);
    if (set) Object.keys(set).forEach(function(v){ root.style.setProperty(v, set[v]); });
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', (set && set['--hero-bg']) || (isDark() ? '#0F3027' : '#0E3A31'));
    Array.prototype.forEach.call($('pal').querySelectorAll('button'), function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-a') === accent)); });
  }
  $('pal').innerHTML = Object.keys(ACCENTS).map(function(k){
    return '<button type="button" data-a="' + k + '" aria-pressed="false"><i style="--a:' + ACCENTS[k].a + ';--b:' + ACCENTS[k].b + '"></i>' + ACCENTS[k].name + '</button>';
  }).join('');
  $('palBtn').addEventListener('click', function(e){
    e.stopPropagation();
    var open = $('pal').hidden;
    $('pal').hidden = !open; $('palBtn').setAttribute('aria-expanded', String(open));
  });
  $('pal').addEventListener('click', function(e){
    var b = e.target.closest('button[data-a]');
    if (!b) return;
    accent = b.getAttribute('data-a');
    try { localStorage.setItem('blab-accent', accent); } catch (e2) {}
    applyAccent();
  });
  document.addEventListener('click', function(e){ if (!e.target.closest('.palwrap')) { $('pal').hidden = true; $('palBtn').setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { $('pal').hidden = true; } });
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAccent); } catch (e) {} }

  /* ---------- announcement bar ---------- */
  (function(){
    var b = SITE.banner;
    if (!b || !b.text) return;
    try { if (sessionStorage.getItem('blab-banner') === b.text) return; } catch (e) {}
    $('bannerText').textContent = b.text;
    $('bannerText').setAttribute('href', b.href || '#notices');
    $('banner').hidden = false;
    $('bannerX').addEventListener('click', function(){
      $('banner').hidden = true;
      try { sessionStorage.setItem('blab-banner', b.text); } catch (e) {}
    });
  })();

  /* ---------- share row ---------- */
  (function(){
    var url = 'https://' + (SITE.url || location.host);
    var text = 'B-lab Class Hub: meet the students of the E-Learning and Earning 8th batch. ' + url;
    $('shareRow').innerHTML =
      '<a href="https://wa.me/?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">Share on WhatsApp</a>' +
      '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">Facebook</a>' +
      '<button type="button" id="shCopy">Copy link</button>';
    $('shCopy').addEventListener('click', function(){ copyText(url, $('shCopy'), 'Copy link'); });
  })();

  /* ---------- search palette (Ctrl+K) ---------- */
  var cmdk = $('cmdk'), ckSel = 0, ckItems = [];
  var SECTIONS = [['Live now', '#live'], ['What we learn', '#learn'], ['Student spotlight', '#spotlight'], ['Students', '#students'], ['Notice board', '#notices'], ['Class tracker', '#tracker'], ['Success stories', '#stories'], ['Class library', '#resources'], ['Hire the batch', '#hire'], ['FAQ', '#faq']];
  function ckBuild(q){
    q = q.trim().toLowerCase();
    var out = [];
    SECTIONS.forEach(function(s){ if (!q || s[0].toLowerCase().indexOf(q) >= 0) out.push({type: 'sec', t: s[0], href: s[1]}); });
    PEOPLE.forEach(function(p, i){
      var hay = (p.n + ' ' + p.r + ' ' + p.s.join(' ') + ' ' + p.p + ' ' + trackName(p.t)).toLowerCase();
      if (!q || hay.indexOf(q) >= 0) out.push({type: 'stu', id: i, t: p.n, s: p.r + ' · ' + p.p});
    });
    return out.slice(0, 40);
  }
  function ckRender(){
    ckItems = ckBuild($('ckQ').value);
    if (ckSel >= ckItems.length) ckSel = 0;
    $('ckList').innerHTML = ckItems.length ? ckItems.map(function(it, n){
      var av = it.type === 'stu' ? '<span class="ck-av">' + face(it.id) + '</span>' : '<span class="ck-av">#</span>';
      return '<li role="option" data-n="' + n + '" aria-selected="' + (n === ckSel) + '">' + av + '<span><span class="ck-t">' + esc(it.t) + '</span>' + (it.s ? '<span class="ck-s">' + esc(it.s) + '</span>' : '') + '</span><span class="ck-tag">' + (it.type === 'stu' ? 'Student' : 'Section') + '</span></li>';
    }).join('') : '<li class="ck-empty">Nothing found. Try a skill like Photoshop.</li>';
    var cur = $('ckList').querySelector('[aria-selected="true"]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({block: 'nearest'});
  }
  function ckOpen(){ $('ckQ').value = ''; ckSel = 0; ckRender(); if (!cmdk.open) { if (cmdk.showModal) cmdk.showModal(); else cmdk.setAttribute('open', ''); } $('ckQ').focus(); }
  function ckGo(n){
    var it = ckItems[n]; if (!it) return;
    cmdk.close();
    if (it.type === 'sec') { var el = document.querySelector(it.href); if (el) el.scrollIntoView({behavior: 'smooth'}); }
    else { ring = PEOPLE.map(function(p, i){ return i; }); openProfile(it.id); }
  }
  $('cmdBtn').addEventListener('click', ckOpen);
  $('ckQ').addEventListener('input', function(){ ckSel = 0; ckRender(); });
  $('ckQ').addEventListener('keydown', function(e){
    if (e.key === 'ArrowDown') { e.preventDefault(); ckSel = Math.min(ckSel + 1, ckItems.length - 1); ckRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ckSel = Math.max(ckSel - 1, 0); ckRender(); }
    else if (e.key === 'Enter') { e.preventDefault(); ckGo(ckSel); }
  });
  $('ckList').addEventListener('click', function(e){ var li = e.target.closest('li[data-n]'); if (li) ckGo(parseInt(li.getAttribute('data-n'), 10)); });
  cmdk.addEventListener('click', function(e){ if (e.target === cmdk) cmdk.close(); });
  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); ckOpen(); }
  });

  $('themeBtn').addEventListener('click', function(){
    var cur = root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('blab-theme', next); } catch (e) {}
    applyAccent();
  });
  try { var saved = localStorage.getItem('blab-theme'); if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved); } catch (e) {}
  applyAccent();

  function openFromHash(){
    var m = /^#roll-(\d+)$/.exec(location.hash);
    if (!m) return;
    var id = parseInt(m[1], 10) - 1;
    if (id >= 0 && id < PEOPLE.length) { ring = PEOPLE.map(function(p, i){ return i; }); openProfile(id); }
  }
  window.addEventListener('hashchange', openFromHash);

  /* ---------- first paint ---------- */
  function renderAll(){
    renderWall(); renderMarquee(); renderLive(); renderTracks(); renderSkillMap(); renderSpot();
    renderChips(); renderGrid(); renderNotices(); renderTracker(); renderStories(); renderResources(); renderFooter(); renderHire(); renderFaq();
    var fc = $('fCopy');
    if (fc) fc.addEventListener('click', function(){ copyText($('fMail').textContent, fc, 'Copy'); });
  }
  if (window.BlabSheet) BlabSheet.applyCache();
  renderAll();
  countdown(); counters(); reveals(); progress(); cursor(); tilt();
  $('tkQ').addEventListener('input', renderTracker);
  $('tkLate').addEventListener('change', renderTracker);
  $('tkTable').addEventListener('click', function(e){
    var b = e.target.closest('button[data-id]'); if (!b) return;
    ring = PEOPLE.map(function(p, i){ return i; }); openProfile(parseInt(b.getAttribute('data-id'), 10));
  });
  $('storyList').addEventListener('click', function(e){
    var b = e.target.closest('button[data-id]'); if (!b) return;
    ring = PEOPLE.map(function(p, i){ return i; }); openProfile(parseInt(b.getAttribute('data-id'), 10));
  });
  if (window.BlabSheet && BlabSheet.enabled()) BlabSheet.refresh(function(){
    lastSpot = -1;
    renderAll();
    var live = PEOPLE.filter(function(p){ return p.st === 'live'; }).length;
    $('liveNow').textContent = live; $('sStudents').textContent = PEOPLE.length; $('sLive').textContent = live;
  });
  setInterval(renderSpot, 10000);
  (function(){
    var hero = document.querySelector('.hero');
    if (!hero || !finePointer) return;
    hero.addEventListener('pointermove', function(e){
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  })();
  openFromHash();
})();
