/* ================================================================
   PPW — Shared client app
   - Cursor-reactive radar / dot-grid background
   - Nav toggle
   - Mock data (used when API offline; real API code untouched)
   ================================================================ */

/* -- Background canvas -------------------------------------------- */
(function initBackdrop() {
  if (document.body.dataset.bg === "off") return;

  // Inject canvas
  var wrap = document.createElement("div");
  wrap.className = "bg-canvas";
  var canvas = document.createElement("canvas");
  wrap.appendChild(canvas);
  document.body.prepend(wrap);

  // Scanlines
  var scan = document.createElement("div");
  scan.className = "bg-scanlines";
  document.body.prepend(scan);

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0;
  var mx = -9999, my = -9999;
  var smx = mx, smy = my;          // smoothed mouse
  var spacing = 28;
  var radius = 240;                // cursor falloff
  var t0 = performance.now();
  var hasRadarSweep = document.body.dataset.bg === "radar";

  // Radar contacts (blips) — scattered across upper-right quadrant
  var contacts = [];
  var prevSweepAng = 0;
  (function seedContacts() {
    var seed = [
      { ang: 0.31, dist: 0.28 }, { ang: 0.82, dist: 0.41 },
      { ang: 1.14, dist: 0.19 }, { ang: 1.57, dist: 0.35 },
      { ang: 2.05, dist: 0.52 }, { ang: 2.44, dist: 0.24 },
      { ang: 2.91, dist: 0.45 }, { ang: 3.33, dist: 0.31 },
      { ang: 3.76, dist: 0.58 }, { ang: 4.12, dist: 0.22 },
      { ang: 4.55, dist: 0.39 }, { ang: 5.01, dist: 0.47 },
      { ang: 5.44, dist: 0.33 }, { ang: 5.88, dist: 0.26 },
      { ang: 0.55, dist: 0.61 }, { ang: 1.92, dist: 0.68 }
    ];
    contacts = seed.map(function (c) { return { ang: c.ang, dist: c.dist, hit: null }; });
  })();

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function pointer(ev) {
    var t = ev.touches ? ev.touches[0] : ev;
    if (!t) return;
    mx = t.clientX;
    my = t.clientY;
  }
  window.addEventListener("mousemove", pointer, { passive: true });
  window.addEventListener("touchmove", pointer, { passive: true });
  window.addEventListener("mouseleave", function () { mx = -9999; my = -9999; });

  function drawGrid(elapsed) {
    // Background gradient — deep ink with a soft purple wash
    var g = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, Math.max(w, h));
    g.addColorStop(0, "rgba(139,43,226,0.08)");
    g.addColorStop(0.4, "rgba(75,22,133,0.04)");
    g.addColorStop(1, "rgba(7,6,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Dot grid with cursor falloff
    var cols = Math.ceil(w / spacing) + 2;
    var rows = Math.ceil(h / spacing) + 2;
    for (var i = -1; i < cols; i++) {
      for (var j = -1; j < rows; j++) {
        var x = i * spacing + (spacing / 2);
        var y = j * spacing + (spacing / 2);
        var dx = x - smx, dy = y - smy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var f = Math.max(0, 1 - d / radius);
        // baseline dot
        var baseA = 0.06;
        var alpha = baseA + f * 0.4;
        var size = 1 + f * 1.6;
        // tint shifts to gold near cursor, purple far away
        if (f > 0.0) {
          var rC = Math.round(139 + (255 - 139) * f);
          var gC = Math.round(43 + (184 - 43) * f);
          var bC = Math.round(226 + (0 - 226) * f);
          ctx.fillStyle = "rgba(" + rC + "," + gC + "," + bC + "," + alpha + ")";
        } else {
          ctx.fillStyle = "rgba(139,43,226," + alpha + ")";
        }
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cursor glow halo
    if (mx > -1000) {
      var hg = ctx.createRadialGradient(smx, smy, 0, smx, smy, radius);
      hg.addColorStop(0, "rgba(255,184,0,0.10)");
      hg.addColorStop(0.5, "rgba(139,43,226,0.06)");
      hg.addColorStop(1, "rgba(139,43,226,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(smx - radius, smy - radius, radius * 2, radius * 2);
    }

    // Optional radar sweep (landing page only)
    if (hasRadarSweep) {
      var cx = w * 0.85;
      var cy = h * 0.12;
      var R = Math.max(w, h) * 0.9;
      var a = (elapsed * 0.00035) % (Math.PI * 2);

      // Detect which contacts the sweep line just crossed since the last frame.
      var prev = prevSweepAng;
      var cur = a;
      contacts.forEach(function (c) {
        var crossed;
        if (cur >= prev) {
          crossed = c.ang > prev && c.ang <= cur;
        } else {
          // wrapped past 0
          crossed = c.ang > prev || c.ang <= cur;
        }
        if (crossed) {
          c.hit = elapsed;
        }
      });
      prevSweepAng = a;

      var grad = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
      if (grad) {
        grad.addColorStop(0, "rgba(255,184,0,0.18)");
        grad.addColorStop(0.05, "rgba(255,184,0,0.05)");
        grad.addColorStop(0.1, "rgba(255,184,0,0)");
        grad.addColorStop(1, "rgba(255,184,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
      }
      // sweep line
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.strokeStyle = "rgba(255,184,0,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R, 0);
      ctx.stroke();
      ctx.restore();
      // concentric rings
      ctx.strokeStyle = "rgba(255,184,0,0.05)";
      for (var rr = 1; rr <= 6; rr++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R / 6) * rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ----- Contacts (blips) -----
      var pingMs = 3200;
      contacts.forEach(function (c) {
        var px = cx + Math.cos(c.ang) * (R * c.dist);
        var py = cy + Math.sin(c.ang) * (R * c.dist);
        // skip blips off-screen
        if (px < -50 || px > w + 50 || py < -50 || py > h + 50) return;

        var age = c.hit ? elapsed - c.hit : pingMs + 1;
        var live = age >= 0 && age < pingMs;
        var t = live ? age / pingMs : 1;       // 0 = just hit, 1 = faded
        var brightness = live ? (1 - t) : 0;   // 0..1 highlight strength

        // base dim dot
        ctx.fillStyle = "rgba(255,184,0," + (0.18 + brightness * 0.72) + ")";
        ctx.beginPath();
        ctx.arc(px, py, 2 + brightness * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // expanding shockwave ring during ping
        if (live) {
          var ringR = 4 + t * 36;
          ctx.strokeStyle = "rgba(255,184,0," + (0.5 * (1 - t)) + ")";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(px, py, ringR, 0, Math.PI * 2);
          ctx.stroke();

          // inner highlight ring (sharper, shorter-lived)
          if (t < 0.5) {
            var innerR = 2 + t * 12;
            ctx.strokeStyle = "rgba(255,210,90," + (0.7 * (1 - t * 2)) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, innerR, 0, Math.PI * 2);
            ctx.stroke();
          }

          // small glow halo
          var halo = ctx.createRadialGradient(px, py, 0, px, py, 18);
          halo.addColorStop(0, "rgba(255,184,0," + (0.18 * (1 - t)) + ")");
          halo.addColorStop(1, "rgba(255,184,0,0)");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(px, py, 18, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  function loop(now) {
    var elapsed = now - t0;
    // smooth mouse
    smx += (mx - smx) * 0.12;
    smy += (my - smy) * 0.12;
    ctx.clearRect(0, 0, w, h);
    drawGrid(elapsed);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* -- Nav toggle --------------------------------------------------- */
(function initNav() {
  var btn = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    btn.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  });
})();

/* -- Live clock --------------------------------------------------- */
(function initClock() {
  var els = document.querySelectorAll("[data-clock]");
  if (!els.length) return;
  function pad(n) { return n < 10 ? "0" + n : n; }
  function tick() {
    var d = new Date();
    var z = d.getUTCHours();
    var m = d.getUTCMinutes();
    var s = d.getUTCSeconds();
    var stamp = pad(z) + ":" + pad(m) + ":" + pad(s) + "Z";
    els.forEach(function (e) { e.textContent = stamp; });
  }
  tick();
  setInterval(tick, 1000);
})();

/* -- Mil-spec utils ----------------------------------------------- */
window.PPW = window.PPW || {};

PPW.formatNum = function (n) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString();
};

PPW.short = function (n) {
  if (n == null || isNaN(n)) return "—";
  n = Number(n);
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
};

PPW.callsign = function (name) {
  if (!name) return "UNK-00";
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
};

PPW.MEDALS = [
  { icon: "V",  name: "Long Service",    desc: "4+ years of active service in PPW.",                tier: "gold"   },
  { icon: "✈",  name: "Aviator",         desc: "Primary theatre: air operations.",                  tier: "gold"   },
  { icon: "⚡",  name: "High Activity",   desc: "Consistently above 80% activity score.",            tier: "purple" },
  { icon: "★",  name: "Veteran",         desc: "5+ years of dedicated service.",                    tier: "gold"   },
  { icon: "◆",  name: "All-Rounder",     desc: "Versatile contributor across multiple theatres.",   tier: "purple" },
  { icon: "⬡",  name: "Command Staff",   desc: "Serves in squadron command or officer role.",       tier: "gold"   },
  { icon: "»",  name: "NCO",             desc: "Non-commissioned officer or sergeant grade.",       tier: "purple" },
  { icon: "⚓",  name: "Naval",           desc: "Primary theatre: naval operations.",               tier: "purple" }
];

