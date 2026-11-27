/* Hormonapedia · interactivos (sin dependencias, sin guardar datos) */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var lang = document.documentElement.lang === "en" ? "en" : "es";
  var TX = {
    es: { next: "Siguiente pregunta →", end: "Ver resultado", again: "Volver a jugar", ok: "¡Correcto!", ko: "No exactamente.", score: function (a, n) { return "Has acertado " + a + " de " + n + "."; }, q: function (i, n) { return "Pregunta " + i + " de " + n; }, none: "Sin resultados" },
    en: { next: "Next question →", end: "See result", again: "Play again", ok: "Correct!", ko: "Not quite.", score: function (a, n) { return "You got " + a + " out of " + n + "."; }, q: function (i, n) { return "Question " + i + " of " + n; }, none: "No results" },
  }[lang];

  // menú móvil
  var b = $(".burger"), m = $("#menu");
  if (b && m) b.addEventListener("click", function () { var o = m.classList.toggle("open"); b.setAttribute("aria-expanded", o); });

  // desplegable Explorar
  var mb = $(".mbtn"), mg = $("#mega");
  if (mb && mg) {
    var setM = function (o) { mg.classList.toggle("open", o); mb.setAttribute("aria-expanded", o); };
    mb.addEventListener("click", function (e) { e.stopPropagation(); setM(!mg.classList.contains("open")); });
    document.addEventListener("click", function (e) { if (!mg.contains(e.target)) setM(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && mg.classList.contains("open")) { setM(false); mb.focus(); } });
  }
  // marca la sección actual en el menú
  if (m) {
    var cut = function (p) { return p.slice(-10) === "index.html" ? p.slice(0, -10) : p; };
    var here = cut(location.pathname);
    $$("a", m).forEach(function (a) {
      var p = cut(a.pathname);
      if (p.length > 4 && here.indexOf(p) === 0) {
        a.classList.add("on"); a.setAttribute("aria-current", here === p ? "page" : "true");
        if (mg && mg.contains(a) && mb) mb.classList.add("on");
      }
    });
  }

  // filtros de áreas y figuras
  $$('[data-filter="areas"]').forEach(function (f) {
    var grid = f.nextElementSibling;
    f.addEventListener("click", function (e) {
      var g = e.target.getAttribute("data-g"); if (!g) return;
      $$("button", f).forEach(function (x) { x.classList.toggle("on", x === e.target); });
      $$("[data-g]", grid).forEach(function (c) { c.hidden = g !== "*" && c.getAttribute("data-g") !== g; });
    });
  });
  var ff = $('[data-filter="figs"]');
  if (ff) {
    var ep = "*", ar = "*", sel = $("#fig-area");
    var apply = function () { $$("#figs [data-e]").forEach(function (c) { c.hidden = (ep !== "*" && c.getAttribute("data-e") !== ep) || (ar !== "*" && c.getAttribute("data-a") !== ar); }); };
    ff.addEventListener("click", function (e) { var v = e.target.getAttribute("data-e"); if (!v) return; ep = v; $$("button", ff).forEach(function (x) { x.classList.toggle("on", x === e.target); }); apply(); });
    sel.addEventListener("change", function () { ar = sel.value; apply(); });
  }

  // buscador de la portada
  var q = $("#q"), res = $("#results");
  if (q && res) {
    var root = $('link[rel="stylesheet"][href*="assets/site.css"]').getAttribute("href").replace(/assets\/site\.css.*$/, "");
    var siteRoot = root;
    var idx = null, pre = location.protocol === "file:" || /index\.html$/.test(location.pathname) ? "index.html" : "";
    var norm = function (s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
    var load = function (cb) { if (idx) return cb(); fetch(root + "assets/search-" + lang + ".json").then(function (r) { return r.json(); }).then(function (j) { idx = j; cb(); }).catch(function () { idx = []; cb(); }); };
    var run = function () {
      var v = norm(q.value.trim());
      if (v.length < 2) { res.hidden = true; return; }
      load(function () {
        var words = v.split(/\s+/);
        var hits = idx.map(function (p) { var t = norm(p.t), h = norm(p.t + " " + p.d + " " + (p.k || "") + " " + (p.n || "")); if (!words.every(function (w) { return h.indexOf(w) >= 0; })) return null; var sc = 0; words.forEach(function (w) { if (t.indexOf(w) >= 0) sc += 3; else if (norm(p.d).indexOf(w) >= 0) sc += 2; else sc += 1; }); return { p: p, s: sc }; }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 10).map(function (x) { return x.p; });
        res.innerHTML = hits.length ? hits.map(function (p) { return '<a href="' + (/^https?:/.test(p.u) ? p.u + '" rel="noopener' : siteRoot + p.u + pre) + '">' + p.t + "<small>" + (p.k ? p.k + " · " : "") + p.d + "</small></a>"; }).join("") : '<a aria-disabled="true">' + TX.none + "</a>";
        res.hidden = false;
      });
    };
    q.addEventListener("input", run);
    q.form.addEventListener("submit", function () { run(); var a = $("a[href]", res); if (a) location.href = a.href; });
    document.addEventListener("click", function (e) { if (!q.form.contains(e.target)) res.hidden = true; });
  }

  // motor de quiz
  function quiz(box, data) {
    var i = 0, ok = 0;
    function show() {
      if (i >= data.length) {
        box.innerHTML = '<div class="q">' + TX.score(ok, data.length) + '</div><div class="row"><button class="btn primary" type="button">' + TX.again + "</button></div>";
        $("button", box).onclick = function () { i = 0; ok = 0; show(); };
        return;
      }
      var d = data[i];
      box.innerHTML = '<div class="bar"><i style="width:' + (i / data.length * 100) + '%"></i></div><p class="tag">' + (d.t ? d.t + " · " : "") + TX.q(i + 1, data.length) + '</p><div class="q">' + d.q + '</div><div class="opts">' +
        d.o.map(function (o, k) { return '<button type="button" data-k="' + k + '">' + o + "</button>"; }).join("") + '</div><div class="fb" aria-live="polite"></div><div class="row"></div>';
      $$(".opts button", box).forEach(function (bt) {
        bt.onclick = function () {
          var k = +bt.getAttribute("data-k"), right = k === d.a;
          if (right) ok++;
          $$(".opts button", box).forEach(function (x, j) { x.disabled = true; if (j === d.a) x.classList.add("ok"); else if (j === k) x.classList.add("ko"); });
          $(".fb", box).innerHTML = "<b>" + (right ? TX.ok : TX.ko) + "</b> " + (d.x || "");
          var nx = document.createElement("button"); nx.type = "button"; nx.className = "btn primary"; nx.textContent = i + 1 < data.length ? TX.next : TX.end;
          nx.onclick = function () { i++; show(); };
          $(".row", box).appendChild(nx); nx.focus();
        };
      });
    }
    show();
  }
  $$(".quiz[data-quiz]").forEach(function (box) { quiz(box, JSON.parse(box.getAttribute("data-quiz"))); });

  // quiz grande con modos
  var big = $("#bigquiz");
  if (big) {
    var all = JSON.parse(big.getAttribute("data-all"));
    var seeded = function (arr, seed) { var a = arr.slice(), s = seed; for (var k = a.length - 1; k > 0; k--) { s = (s * 9301 + 49297) % 233280; var r = Math.floor(s / 233280 * (k + 1)); var t = a[k]; a[k] = a[r]; a[r] = t; } return a; };
    var d = new Date(), seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    var start = function (mode) {
      var set = mode === "diario" ? seeded(all, seed).slice(0, 10) : mode === "*" ? seeded(all, seed) : all.filter(function (x) { return mode.indexOf("n:") === 0 ? x.nivel === mode.slice(2) : x.tema === mode; });
      quiz(big, set);
    };
    $("#quiz-modes").addEventListener("click", function (e) { var mo = e.target.getAttribute("data-m"); if (!mo) return; $$("#quiz-modes button").forEach(function (x) { x.classList.toggle("on", x === e.target); }); start(mo); });
    start("diario");
  }

  // reflexión de personalidad
  var pf = $("#pers");
  if (pf) {
    var P = JSON.parse(pf.getAttribute("data-pers"));
    pf.addEventListener("submit", function (e) {
      e.preventDefault();
      var sum = {}, n = {};
      P.items.forEach(function (it, i) { var v = +pf["i" + i].value; if (it.r) v = 6 - v; sum[it.k] = (sum[it.k] || 0) + v; n[it.k] = (n[it.k] || 0) + 1; });
      var out = P.dims.map(function (d) {
        var m = sum[d.k] / n[d.k], pct = Math.round((m - 1) / 4 * 100);
        var txt = pct >= 60 ? d.alto : pct <= 40 ? d.bajo : (lang === "es" ? "Te sitúas en una zona intermedia: según el momento, te reconoces en ambos polos." : "You are in the middle range: depending on the moment, you recognise yourself in both ends.");
        return '<div class="box" style="margin-bottom:10px"><h4>' + d.t + '</h4><div class="quiz" style="padding:0;border:0;background:none"><div class="bar"><i style="width:' + pct + '%"></i></div></div><p style="margin:0">' + txt + "</p></div>";
      }).join("");
      var r = $("#pers-res");
      r.innerHTML = "<h2>" + (lang === "es" ? "Tu reflexión" : "Your reflection") + "</h2>" + out + '<p class="note">' + (lang === "es" ? "Estas barras solo resumen tus respuestas a diez frases. No son una medida validada ni un diagnóstico, y pueden cambiar según el momento y el contexto." : "These bars only summarise your answers to ten sentences. They are not a validated measure or a diagnosis, and they may change with time and context.") + "</p>";
      r.scrollIntoView({ behavior: "smooth" });
    });
  }


  // tests de libre uso: puntuación en el navegador
  var lt = $("#ltest");
  if (lt) {
    var D = JSON.parse(lt.getAttribute("data-test"));
    lt.addEventListener("submit", function (e) {
      e.preventDefault();
      var r = $("#ltest-res"), raw = 0, miss = [], alert = false, fsets = $$("fieldset.lq", lt);
      D.items.forEach(function (it, i) {
        var c = $('input[name="i' + i + '"]:checked', lt);
        fsets[i].classList.toggle("miss", !c);
        if (!c) { miss.push(i); return; }
        raw += +c.value;
        if (D.alerta.indexOf(i) >= 0 && +c.value > 0) alert = true;
      });
      if (miss.length) { r.innerHTML = '<p class="note warn">' + D.tx.falta + "</p>"; fsets[miss[0]].scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      var sc = raw * D.mult, band = "";
      D.bandas.forEach(function (b) { if (sc >= b[0] && sc <= b[1]) band = b[2]; });
      var adv = D.consejo != null && (D.bajo ? sc < D.consejo : sc >= D.consejo);
      r.innerHTML = (alert ? '<div class="note crisis">' + D.tx.alerta + "</div>" : "") +
        '<div class="box lres"><h4>' + D.tx.res + '</h4><p class="lsc"><b>' + sc + "</b> " + D.tx.pts + " " + D.max + '</p><div class="quiz" style="padding:0;border:0;background:none"><div class="bar"><i style="width:' + Math.round(sc / D.max * 100) + '%"></i></div></div><p style="margin:0;font-size:17px"><b>' + band + "</b></p>" +
        (adv ? '<p style="margin:8px 0 0">' + D.tx.consejo + "</p>" : "") + '<p style="margin:8px 0 0;color:var(--mute)">' + D.tx.orient + "</p></div>";
      r.scrollIntoView({ behavior: "smooth" });
    });
  }

  // efecto Stroop
  var st = $("#stroop");
  if (st) {
    var C = lang === "es" ? [["ROJO", "#c0392b"], ["AZUL", "#2563eb"], ["VERDE", "#15803d"], ["AMARILLO", "#ca8a04"]] : [["RED", "#c0392b"], ["BLUE", "#2563eb"], ["GREEN", "#15803d"], ["YELLOW", "#ca8a04"]];
    var grid = $(".stroop", st), out = $(".res", st), stop = $('[data-s="stop"]', st), t0 = 0, cur = "", times = {};
    var mk = function (congr) {
      var h = ""; for (var k = 0; k < 12; k++) { var w = C[Math.floor(Math.random() * 4)], ink = w; if (!congr) { do { ink = C[Math.floor(Math.random() * 4)]; } while (ink === w); } else { w = ink; }
        h += congr ? '<span style="color:' + ink[1] + '">■■■■</span>' : '<span style="color:' + ink[1] + '">' + w[0] + "</span>"; }
      return h;
    };
    st.addEventListener("click", function (e) {
      var s = e.target.getAttribute("data-s"); if (!s) return;
      if (s === "stop") { if (!cur) return; times[cur] = (performance.now() - t0) / 1000; stop.disabled = true;
        out.innerHTML = (lang === "es" ? "Lista " : "List ") + cur + ": <b>" + times[cur].toFixed(1) + " s</b>" + (times.A && times.B ? (lang === "es" ? ". Diferencia: " : ". Difference: ") + "<b>" + (times.B - times.A).toFixed(1) + " s</b>" + (lang === "es" ? " más con las palabras que nombran otro color." : " more with words naming another colour.") : ""); cur = ""; return; }
      cur = s; grid.innerHTML = mk(s === "A"); t0 = performance.now(); stop.disabled = false; stop.focus(); out.textContent = "";
    });
  }
})();

/* ===== Portada: una sola animación discreta (las fotos cambian de una en una, con pausa) y apariciones al bajar ===== */
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var box = document.querySelector(".heroimgs");
  var btn = document.querySelector(".mpause");
  if (box && !reduce) {
    var slots = [].slice.call(box.querySelectorAll(".visual"));
    var pool = [];
    try { pool = JSON.parse(box.getAttribute("data-pool") || "[]"); } catch (e) {}
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    var showing = {}, cursor = 0, turn = 0, paused = false, timer = null;
    slots.forEach(function (s) { var im = s.querySelector("img"); if (im) showing[im.getAttribute("src")] = 1; });
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var next = function () {
      for (var pass = 0; pass < 2; pass++) for (var k = 0; k < pool.length; k++) {
        var p = pool[(cursor + k) % pool.length];
        if (showing[p.i] || (pass === 0 && p.a < 1.2)) continue;
        cursor = (cursor + k + 1) % pool.length; return p;
      }
      return null;
    };
    var swap = function (slot, idx) {
      var p = next(); if (!p) return;
      var pre = new Image();
      pre.onload = function () {
        swap.err = 0;
        var old = slot.querySelector("img"); if (old) delete showing[old.getAttribute("src")];
        showing[p.i] = 1;
        var L = document.createElement("div");
        L.className = "layer";
        var pos = p.a < 1 ? "center 22%" : (p.a < 1.25 ? "center 32%" : "center");
        L.innerHTML = '<img src="' + esc(p.i) + '" alt="' + esc(p.t) + '" style="object-position:' + pos + '"><span><small>' + esc(p.k) + "</small>" + esc(p.t) + (p.c ? '<em class="vc">' + esc(p.c) + "</em>" : "") + "</span>";
        [].forEach.call(slot.querySelectorAll(":scope > span, .layer > span"), function (s) { s.style.transition = "opacity .3s"; s.style.opacity = 0; });
        slot.appendChild(L); slot.href = p.u;
        if (idx === 0) { var hc = document.querySelector(".hcred"); if (hc) { hc.style.transition = "opacity .5s"; hc.style.opacity = 0; hc.style.visibility = "hidden"; } }
        setTimeout(function () { [].forEach.call(slot.children, function (c) { if (c !== L) c.remove(); }); }, 1200);
      };
      pre.onerror = function () { if ((swap.err = (swap.err || 0) + 1) < 6) swap(slot, idx); };
      pre.src = p.i;
    };
    var tick = function () { if (!paused && !document.hidden) { swap(slots[turn % slots.length], turn % slots.length); turn++; } };
    if (pool.length > slots.length) {
      timer = setInterval(tick, 8000);
      if (btn) {
        btn.hidden = false;
        btn.addEventListener("click", function () {
          paused = !paused;
          btn.setAttribute("aria-pressed", paused ? "true" : "false");
          btn.textContent = paused ? btn.getAttribute("data-play") : btn.getAttribute("data-pause");
        });
      }
    }
  }
  if (reduce || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("rv-on");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; el.classList.add("in"); io.unobserve(el);
      setTimeout(function () { el.classList.remove("rv", "in"); el.style.transitionDelay = ""; }, 1200);
    });
  }, { rootMargin: "0px 0px -6% 0px" });
  [].forEach.call(document.querySelectorAll("main .card, main .door, main .era, main .shead, main .dark2, main .fam, .prose .fig"), function (el, n) {
    var r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.9) return;
    el.classList.add("rv"); el.style.transitionDelay = (n % 4) * 70 + "ms"; io.observe(el);
  });
})();

/* ejemplos de búsqueda de la portada */
(function () {
  var q = document.getElementById("q"); if (!q) return;
  [].forEach.call(document.querySelectorAll(".qchip"), function (b) {
    b.addEventListener("click", function () { q.value = b.getAttribute("data-q"); q.dispatchEvent(new Event("input", { bubbles: true })); q.focus(); });
  });
})();

/* ampliar fotos al pulsarlas */
(function () {
  var es = (document.documentElement.lang || "es").slice(0, 2) === "es";
  var imgs = [].slice.call(document.querySelectorAll(".prose figure img, .prose p > img, .ficha img, .tlimg img")).filter(function (im) { return !im.closest("a"); });
  if (!imgs.length) return;
  var box = document.createElement("div");
  box.className = "lbox"; box.hidden = true;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", es ? "Imagen ampliada" : "Enlarged image");
  box.innerHTML = '<button type="button" class="lbx" aria-label="' + (es ? "Cerrar" : "Close") + '">×</button><figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(box);
  var bi = box.querySelector("img"), bc = box.querySelector("figcaption"), bx = box.querySelector(".lbx"), last = null;
  var close = function () { box.hidden = true; document.documentElement.classList.remove("lbox-on"); if (last) last.focus(); };
  var open = function (im) {
    last = im; bi.src = im.currentSrc || im.src; bi.alt = im.alt;
    var fc = (im.closest("figure") && im.closest("figure").querySelector("figcaption")) || (im.closest(".ficha") && im.closest(".ficha").querySelector(".fcred"));
    var nm = im.closest(".ficha") && im.closest(".ficha").querySelector("h4");
    bc.innerHTML = (nm ? "<strong>" + nm.textContent + "</strong><br>" : "") + (fc ? fc.innerHTML : (im.alt || "")); bc.hidden = !bc.innerHTML;
    box.hidden = false; document.documentElement.classList.add("lbox-on"); bx.focus();
  };
  imgs.forEach(function (im) {
    im.classList.add("zoomable"); im.tabIndex = 0; im.setAttribute("role", "button");
    im.setAttribute("aria-label", (es ? "Ampliar imagen: " : "Enlarge image: ") + (im.alt || ""));
    im.addEventListener("click", function () { open(im); });
    im.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(im); } });
  });
  box.addEventListener("click", function (e) { if (e.target === box || e.target === bx || e.target === bi) close(); });
  document.addEventListener("keydown", function (e) { if (!box.hidden && (e.key === "Escape" || e.key === "Tab")) { if (e.key === "Escape") close(); else { e.preventDefault(); bx.focus(); } } });
})();

/* Google Analytics G-EZ2X4TY4PF: solo se carga si se aceptan las estadísticas en el aviso de cookies (modo de consentimiento v2, todo denegado por defecto) · 2026-11-27 */
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
(function(){
  var ID='G-EZ2X4TY4PF';
  function cargar(){if(window.gaCargado)return;window.gaCargado=true;gtag('consent','update',{analytics_storage:'granted'});
    var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+ID;document.head.appendChild(s);gtag('js',new Date());gtag('config',ID);}
  function borrar(){document.cookie.split(';').forEach(function(c){var n=c.split('=')[0].trim();if(/^_ga/.test(n))['','.neurolopedia.com','neurolopedia.com'].forEach(function(d){document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'+(d?';domain='+d:'');});});}
  try{var v=JSON.parse(localStorage.getItem('aviso-cookies'));if(v&&v.v===2&&v.estadisticas&&Date.now()-v.d<365*864e5)cargar();}catch(e){}
  document.addEventListener('avisocookies',function(e){if(e.detail&&e.detail.estadisticas)cargar();else{if(window.gaCargado)gtag('consent','update',{analytics_storage:'denied'});borrar();}});
})();
/* Aviso de cookies: configuración (versión 2, la misma que las otras webs con Google Analytics) */
window.AVISO_COOKIES={politica:{es:"/cookies/",en:"/en/cookies/"},color:"#076b83",texto:"#ffffff",version:2,textos:{
  es:{p:'Usamos lo necesario para que la web funcione y, si lo aceptas, Google Analytics para saber qué páginas se visitan y mejorar la web. No usamos cookies de publicidad. Puedes cambiar de opinión cuando quieras en «Configurar cookies», al pie de la página.',estD:'Google Analytics: qué páginas se visitan y desde dónde llegan las visitas, de forma agregada. Solo si lo aceptas.'},
  en:{p:'We use what is needed for the site to work and, if you accept, Google Analytics to see which pages are visited and improve the site. We do not use advertising cookies. You can change your mind at any time in “Cookie settings” at the bottom of the page.',estD:'Google Analytics: which pages are visited and where visits come from, in aggregate. Only if you accept.'}}};
/* Aviso de cookies (RGPD / LSSI) · común a celebraciones.org, catdogpedia.com y worldwinepedia.com · 2026-11-08
   Configuración: window.AVISO_COOKIES = {politica: {es: '/cookies.html', en: ...}, color: '#123', texto: '#fff'} antes de este bloque.
   Categorías: necesarias (siempre), estadisticas, publicidad. Se guarda en localStorage 'aviso-cookies' 12 meses.
   Para activar un script solo con permiso: <script type="text/plain" data-cookies="estadisticas" src="..."></script>
   API: window.avisoCookies.abrir(), .permiso('estadisticas'), evento 'avisocookies' en document. */
(function () {
  var C = window.AVISO_COOKIES || {}, d = document, CLAVE = 'aviso-cookies', VERSION = C.version || 1, DOCE_MESES = 365 * 864e5;
  var L = (d.documentElement.lang || 'es').slice(0, 2);
  var TX = {
    es: { t: 'Cookies', p: 'Usamos solo lo necesario para que la web funcione. Con tu permiso podríamos usar también cookies de estadísticas y de publicidad. Puedes cambiar de opinión cuando quieras en «Configurar cookies», al pie de la página.', mas: 'Política de cookies', ok: 'Aceptar', no: 'Rechazar', conf: 'Configurar', guardar: 'Guardar mi elección', todo: 'Aceptar todas', nec: 'Necesarias', necD: 'Hacen que la web funcione y recuerdan tus preferencias (idioma, esta elección). Siempre activas.', est: 'Estadísticas', estD: 'Nos dirían qué páginas se visitan, de forma agregada. Ahora no se usan.', pub: 'Publicidad', pubD: 'Anuncios y medición de anuncios. Ahora no se usan.', siempre: 'Siempre activas', pie: 'Configurar cookies', cerrar: 'Cerrar' },
    ca: { t: 'Galetes', p: 'Fem servir només el necessari perquè el web funcioni. Amb el teu permís també podríem fer servir galetes d\'estadístiques i de publicitat. Pots canviar d\'opinió quan vulguis a «Configurar galetes», al peu de la pàgina.', mas: 'Política de galetes', ok: 'Acceptar', no: 'Rebutjar', conf: 'Configurar', guardar: 'Desar la meva elecció', todo: 'Acceptar-les totes', nec: 'Necessàries', necD: 'Fan que el web funcioni i recorden les teves preferències (idioma, aquesta elecció). Sempre actives.', est: 'Estadístiques', estD: 'Ens dirien quines pàgines es visiten, de manera agregada. Ara no es fan servir.', pub: 'Publicitat', pubD: 'Anuncis i mesura d\'anuncis. Ara no es fan servir.', siempre: 'Sempre actives', pie: 'Configurar galetes', cerrar: 'Tancar' },
    en: { t: 'Cookies', p: 'We only use what is needed for the site to work. With your permission we could also use statistics and advertising cookies. You can change your mind at any time in “Cookie settings” at the bottom of the page.', mas: 'Cookie policy', ok: 'Accept', no: 'Reject', conf: 'Settings', guardar: 'Save my choice', todo: 'Accept all', nec: 'Necessary', necD: 'They make the site work and remember your preferences (language, this choice). Always on.', est: 'Statistics', estD: 'They would tell us which pages are visited, in aggregate. Not used at the moment.', pub: 'Advertising', pubD: 'Ads and ad measurement. Not used at the moment.', siempre: 'Always on', pie: 'Cookie settings', cerrar: 'Close' },
    fr: { t: 'Cookies', p: 'Nous n\'utilisons que le nécessaire au fonctionnement du site. Avec votre accord, nous pourrions aussi utiliser des cookies de statistiques et de publicité. Vous pouvez changer d\'avis à tout moment via « Paramètres des cookies », en bas de page.', mas: 'Politique de cookies', ok: 'Accepter', no: 'Refuser', conf: 'Paramétrer', guardar: 'Enregistrer mon choix', todo: 'Tout accepter', nec: 'Nécessaires', necD: 'Elles font fonctionner le site et retiennent vos préférences (langue, ce choix). Toujours actives.', est: 'Statistiques', estD: 'Elles nous indiqueraient les pages visitées, de façon agrégée. Non utilisées actuellement.', pub: 'Publicité', pubD: 'Annonces et mesure des annonces. Non utilisées actuellement.', siempre: 'Toujours actives', pie: 'Paramètres des cookies', cerrar: 'Fermer' },
    it: { t: 'Cookie', p: 'Usiamo solo il necessario per far funzionare il sito. Con il tuo consenso potremmo usare anche cookie statistici e pubblicitari. Puoi cambiare idea quando vuoi da «Impostazioni cookie», in fondo alla pagina.', mas: 'Cookie policy', ok: 'Accetta', no: 'Rifiuta', conf: 'Personalizza', guardar: 'Salva la mia scelta', todo: 'Accetta tutti', nec: 'Necessari', necD: 'Fanno funzionare il sito e ricordano le tue preferenze (lingua, questa scelta). Sempre attivi.', est: 'Statistiche', estD: 'Ci direbbero quali pagine vengono visitate, in forma aggregata. Al momento non usati.', pub: 'Pubblicità', pubD: 'Annunci e misurazione degli annunci. Al momento non usati.', siempre: 'Sempre attivi', pie: 'Impostazioni cookie', cerrar: 'Chiudi' }
  };
  var t = TX[L] || TX.en; if (C.textos && C.textos[L]) for (var k in C.textos[L]) t[k] = C.textos[L][k];
  var POL = (C.politica || {})[L] || (C.politica || {}).en || '#';

  function leer() { try { var v = JSON.parse(localStorage.getItem(CLAVE)); if (v && v.v === VERSION && Date.now() - v.d < DOCE_MESES) return v; } catch (e) {} return null; }
  function guardar(est, pub) {
    var v = { v: VERSION, d: Date.now(), estadisticas: !!est, publicidad: !!pub };
    try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) {}
    activar(v); cerrar();
    try { d.dispatchEvent(new CustomEvent('avisocookies', { detail: v })); } catch (e) {}
  }
  function activar(v) {
    d.querySelectorAll('script[type="text/plain"][data-cookies]').forEach(function (s) {
      if (!v[s.dataset.cookies] || s.dataset.hecho) return; s.dataset.hecho = 1;
      var n = d.createElement('script'); if (s.src) n.src = s.src; else n.text = s.text; d.head.appendChild(n);
    });
  }

  var css = '#avc{position:fixed;left:16px;right:16px;bottom:16px;z-index:900;max-width:560px;margin:0 auto 0 0;background:#fff;color:#1d2327;border:1px solid rgba(0,0,0,.12);border-radius:14px;box-shadow:0 10px 36px rgba(0,0,0,.18);padding:18px 18px 16px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '#avc[hidden]{display:none}#avc h2{font-size:16px;margin:0 0 6px;font-weight:700;color:inherit;font-family:inherit}#avc p{margin:0 0 12px}#avc a{color:' + (C.color || '#155e63') + ';text-decoration:underline}' +
    '#avc .avb{display:flex;flex-wrap:wrap;gap:8px}#avc button{flex:1 1 auto;min-width:110px;font-family:inherit;font-weight:600;font-size:14px;line-height:1.15;padding:11px 14px;border-radius:9px;cursor:pointer;border:1.5px solid ' + (C.color || '#155e63') + ';background:' + (C.color || '#155e63') + ';color:' + (C.texto || '#fff') + '}' +
    '#avc button.sec{background:transparent;color:' + (C.color || '#155e63') + '}#avc button:focus-visible{outline:3px solid #f0b400;outline-offset:2px}' +
    '#avc .avcat{border-top:1px solid #e6e8ea;padding:10px 0;display:flex;gap:12px;align-items:flex-start;justify-content:space-between}#avc .avcat b{display:block}#avc .avcat small{color:#5b6670;display:block;font-size:12.5px}' +
    '#avc input{width:20px;height:20px;margin-top:2px;accent-color:' + (C.color || '#155e63') + ';flex:none}#avc .fijo{font-size:12px;color:#5b6670;white-space:nowrap}' +
    '@media(max-width:600px){#avc{left:8px;right:8px;bottom:8px;padding:14px;font-size:13.5px}#avc button{min-width:0;padding:11px 10px}}' +
    '.avc-pie{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;opacity:.9}';
  var caja;
  function montar() {
    if (caja) return caja;
    var st = d.createElement('style'); st.textContent = css; d.head.appendChild(st);
    caja = d.createElement('div'); caja.id = 'avc'; caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-labelledby', 'avc-t'); caja.hidden = true;
    d.body.appendChild(caja); return caja;
  }
  function vistaInicial() {
    montar().innerHTML = '<h2 id="avc-t">🍪 ' + t.t + '</h2><p>' + t.p + ' <a href="' + POL + '">' + t.mas + '</a></p>' +
      '<div class="avb"><button type="button" data-a="no">' + t.no + '</button><button type="button" class="sec" data-a="conf">' + t.conf + '</button><button type="button" data-a="ok">' + t.ok + '</button></div>';
    eventos();
  }
  function vistaConfig() {
    var v = leer() || {};
    var fila = function (k, nom, des) { return '<label class="avcat"><span><b>' + nom + '</b><small>' + des + '</small></span><input type="checkbox" data-k="' + k + '"' + (v[k] ? ' checked' : '') + '></label>'; };
    montar().innerHTML = '<h2 id="avc-t">🍪 ' + t.t + '</h2><p><a href="' + POL + '">' + t.mas + '</a></p>' +
      '<div class="avcat"><span><b>' + t.nec + '</b><small>' + t.necD + '</small></span><span class="fijo">' + t.siempre + '</span></div>' +
      fila('estadisticas', t.est, t.estD) + fila('publicidad', t.pub, t.pubD) +
      '<div class="avb" style="margin-top:6px"><button type="button" data-a="no">' + t.no + '</button><button type="button" class="sec" data-a="guardar">' + t.guardar + '</button><button type="button" data-a="ok">' + t.todo + '</button></div>';
    eventos();
  }
  function eventos() {
    caja.querySelectorAll('button[data-a]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.a;
        if (a === 'ok') guardar(1, 1);
        else if (a === 'no') guardar(0, 0);
        else if (a === 'conf') { vistaConfig(); var i = caja.querySelector('input'); if (i) i.focus(); }
        else if (a === 'guardar') guardar(caja.querySelector('[data-k=estadisticas]').checked, caja.querySelector('[data-k=publicidad]').checked);
      };
    });
  }
  function abrir(config) { if (config) vistaConfig(); else vistaInicial(); caja.hidden = false; }
  function cerrar() { if (caja) caja.hidden = true; }
  function enlacePie() {
    var f = d.querySelector('footer'); if (!f || f.querySelector('.avc-pie')) return;
    var b = d.createElement('button'); b.type = 'button'; b.className = 'avc-pie'; b.textContent = t.pie; b.onclick = function () { abrir(true); var i = caja.querySelector('input'); if (i) i.focus(); };
    var ref = null; f.querySelectorAll('a').forEach(function (a) { if (!ref && POL !== '#' && (a.getAttribute('href') === POL || a.pathname === POL)) ref = a; });
    if (ref) {
      var li = ref.closest('li');
      if (li) { var nli = d.createElement('li'); nli.appendChild(b); li.parentNode.insertBefore(nli, li.nextSibling); }
      else { var cs = getComputedStyle(ref); b.style.fontSize = cs.fontSize; b.style.color = cs.color; ref.parentNode.insertBefore(b, ref.nextSibling); if (cs.display === 'block') { b.style.display = 'block'; b.style.margin = cs.marginTop + ' 0 ' + cs.marginBottom; b.style.textAlign = 'left'; } else ref.parentNode.insertBefore(d.createTextNode(' · '), b); }
    } else {
      var p = d.createElement('p'); p.style.cssText = 'text-align:center;font-size:13px;margin:10px 0 0'; p.appendChild(b); f.appendChild(p);
    }
  }
  function inicio() {
    var v = leer();
    enlacePie();
    if (v) activar(v); else abrir(false);
  }
  window.avisoCookies = { abrir: function () { abrir(true); }, permiso: function (k) { var v = leer(); return !!(v && v[k]); } };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', inicio); else inicio();
})();
