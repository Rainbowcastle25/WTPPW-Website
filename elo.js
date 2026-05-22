/* ================================================================
   PPW — ELO page logic
   - Theatre tabs (air / ground / squadrons)
   - Podium top 3
   - Searchable, sortable table
   - Inline row expand with rating history sparkline
   - FIX: search query is preserved when switching theatres
   ================================================================ */

(function () {
  /* ------- API config ------- */
  var apiBase = (document.querySelector('meta[name="ppw-api-base"]') || {}).content || "";
  var apiKey  = (document.querySelector('meta[name="ppw-api-key"]')  || {}).content || "";

  var theatres = { air: [], ground: [], squadrons: [] };

  /* Map a raw API player object to the internal shape */
  function mapApiPlayer(p) {
    var w  = p.wins   || p.w  || 0;
    var l  = p.losses || p.l  || 0;
    var d  = p.draws  || p.d  || 0;
    var gp = p.matches_played || p.gp || (w + l + d) || 0;
    var elo = p.elo || p.rating || 1000;
    return {
      name:        p.player_name || p.name || "Unknown",
      squadron:    p.squadron    || "WTPPW",
      full:        p.full        || "",
      elo:         elo,
      peak:        p.peak_elo   || p.peak || elo,
      w: w, l: l, d: d, gp: gp,
      kd:          p.kd  != null ? p.kd  : null,
      kps:         p.kps != null ? p.kps : null,
      provisional: gp < 15
    };
  }

  /* Load live data from the API; replace mock on success */
  if (apiBase) {
    var headers = apiKey ? { "X-API-Key": apiKey } : {};
    Promise.all([
      fetch(apiBase + "/api/elo-leaderboard?role=air&page=1&limit=100",    { headers: headers }).then(function (r) { return r.json(); }),
      fetch(apiBase + "/api/elo-leaderboard?role=ground&page=1&limit=100", { headers: headers }).then(function (r) { return r.json(); })
    ]).then(function (results) {
      var airRaw    = results[0];
      var groundRaw = results[1];

      var airPlayers    = (airRaw.players    || airRaw.data    || (Array.isArray(airRaw)    ? airRaw    : [])).map(mapApiPlayer);
      var groundPlayers = (groundRaw.players || groundRaw.data || (Array.isArray(groundRaw) ? groundRaw : [])).map(mapApiPlayer);

      /* Sort descending by ELO */
      airPlayers.sort(function (a, b)    { return b.elo - a.elo; });
      groundPlayers.sort(function (a, b) { return b.elo - a.elo; });

      theatres = {
        air:       airPlayers,
        ground:    groundPlayers,
        squadrons: []
      };
      render();
    }).catch(function (err) {
      console.error("[ELO]", err);
      bodyEl.innerHTML = '<tr><td colspan="11" class="empty">Unable to load leaderboard — API unavailable.</td></tr>';
      podiumEl.style.display = "none";
    });
  }

  // Persistent UI state — search lives OUTSIDE the per-theatre cache, so
  // it's NEVER cleared when switching tabs.
  var state = {
    theatre: "air",
    query: "",
    sq: "all",
    limit: 25,
    expanded: null    // currently expanded player name
  };

  /* Build a synthetic rating history (for the sparkline) per player */
  function buildHistory(p) {
    var n = 30;
    var points = [];
    var current = p.elo;
    var peak = p.peak || current + 30;
    var base = Math.max(1000, current - 220);
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var seed = p.name.length * 9.7 + i * 0.8;
      var noise = Math.sin(seed) * 22 + Math.sin(seed * 0.5) * 14;
      var v = base + (current - base) * t + noise;
      v = Math.min(peak, Math.max(base - 40, v));
      points.push(Math.round(v));
    }
    points[n - 1] = p.elo;
    return points;
  }

  /* ------- DOM ------- */
  var tabs        = document.querySelectorAll(".elo-tab");
  var searchInput = document.getElementById("elo-search");
  var sqSelect    = document.getElementById("elo-sq");
  var limitSelect = document.getElementById("elo-limit");
  var podiumEl    = document.getElementById("podium");
  var bodyEl      = document.getElementById("elo-body");
  var shownEl     = document.getElementById("elo-shown");
  var pagerInfo   = document.getElementById("pager-info");
  var theatreTitle = document.getElementById("theatre-title");
  var theatreSub   = document.getElementById("theatre-sub");
  var theatreBadge = document.getElementById("theatre-badge");
  var metaCount    = document.getElementById("meta-count");
  var metaTop      = document.getElementById("meta-top");

  /* ------- handlers ------- */
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var t = tab.dataset.theatre;
      if (t === state.theatre) return;
      state.theatre = t;
      state.expanded = null;
      tabs.forEach(function (b) { b.classList.remove("active"); });
      tab.classList.add("active");
      // NOTE: state.query is intentionally NOT reset here.
      render();
    });
  });

  searchInput.addEventListener("input", function () {
    state.query = searchInput.value.trim().toLowerCase();
    render();
  });

  sqSelect.addEventListener("change", function () {
    state.sq = sqSelect.value;
    render();
  });

  limitSelect.addEventListener("change", function () {
    state.limit = parseInt(limitSelect.value, 10);
    render();
  });

  /* Delegate row click → expand */
  bodyEl.addEventListener("click", function (e) {
    var row = e.target.closest("tr.elo-row");
    if (!row) return;
    var name = row.dataset.name;
    state.expanded = (state.expanded === name) ? null : name;
    render();
  });

  /* ------- helpers ------- */
  function getCurrentData() {
    return theatres[state.theatre] || [];
  }

  function getTheatreCopy() {
    switch (state.theatre) {
      case "ground":
        return { title: "Ground Theatre", sub: "Tank · IFV · SPAA · TD · MBT — Realistic & Sim · All BR brackets", badge: "GRD" };
      case "squadrons":
        return { title: "Squadron Ladder", sub: "Squadron vs Squadron · SRE / SQB rating · All theatres combined", badge: "SQD" };
      default:
        return { title: "Air Theatre", sub: "Fighter / Attacker / Bomber · Realistic & Sim · All BR brackets", badge: "AIR" };
    }
  }

  function filterRows(data) {
    var q = state.query;
    var sq = state.sq;
    return data.filter(function (p) {
      if (q) {
        var hay = (p.name + " " + (p.squadron || "") + " " + (p.full || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      if (sq !== "all" && state.theatre !== "squadrons") {
        if ((p.squadron || "").toUpperCase() !== sq.toUpperCase()) return false;
      }
      return true;
    });
  }

  /* ------- rendering ------- */
  function podiumHtml(rows) {
    var top3 = rows.slice(0, 3);
    if (top3.length < 1) { podiumEl.style.display = "none"; return; }
    podiumEl.style.display = "";
    var cards = top3.map(function (p, i) {
      var place = i + 1;
      var label = state.theatre === "squadrons" ? "TOP SQUADRON" : "TOP PILOT · " + (state.theatre === "ground" ? "GROUND" : "AIR");
      var sub   = state.theatre === "squadrons" ? (p.full || "") : (p.squadron ? "SQDN · " + p.squadron : "");
      return [
        '<article class="podium-card p', place, '" data-name="', p.name, '">',
          '<div class="place">0', place, '</div>',
          '<div class="kicker">', place === 1 ? label : (place === 2 ? "2ND PLACE" : "3RD PLACE"), '</div>',
          '<div class="name">', p.name, '</div>',
          '<div class="sq">', sub, '</div>',
          '<div class="elo"><span class="lbl">Rating</span>', PPW.formatNum(p.elo), '</div>',
          '<div class="wl">',
            '<span><span class="w">', p.w, 'W</span></span>',
            '<span><span class="l">', p.l, 'L</span></span>',
            '<span><span class="d">', p.d, 'D</span></span>',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
    podiumEl.innerHTML = cards;
  }

  function sparkline(points, w, h) {
    var min = Math.min.apply(null, points);
    var max = Math.max.apply(null, points);
    var range = Math.max(20, max - min);
    var stepX = w / (points.length - 1);
    var coords = points.map(function (v, i) {
      return [i * stepX, h - ((v - min) / range) * (h - 12) - 6];
    });
    var dPath = coords.map(function (c, i) {
      return (i === 0 ? "M" : "L") + c[0].toFixed(1) + " " + c[1].toFixed(1);
    }).join(" ");
    var areaPath = dPath + " L" + w.toFixed(1) + " " + h + " L0 " + h + " Z";

    var gridLines = "";
    for (var g = 1; g <= 3; g++) {
      var gy = (h / 4) * g;
      gridLines += '<line x1="0" y1="' + gy + '" x2="' + w + '" y2="' + gy + '" stroke="rgba(139,43,226,0.12)" stroke-dasharray="2 4"/>';
    }

    var dotEnd = coords[coords.length - 1];
    return [
      '<svg viewBox="0 0 ', w, ' ', h, '" preserveAspectRatio="none">',
        '<defs><linearGradient id="elo-area" x1="0" y1="0" x2="0" y2="1">',
          '<stop offset="0%" stop-color="#FFB800" stop-opacity="0.25"/>',
          '<stop offset="100%" stop-color="#FFB800" stop-opacity="0"/>',
        '</linearGradient></defs>',
        gridLines,
        '<path d="', areaPath, '" fill="url(#elo-area)"/>',
        '<path d="', dPath, '" fill="none" stroke="#FFB800" stroke-width="1.5"/>',
        '<circle cx="', dotEnd[0].toFixed(1), '" cy="', dotEnd[1].toFixed(1), '" r="3" fill="#FFB800"/>',
      '</svg>'
    ].join("");
  }

  function detailRow(p) {
    var hist = buildHistory(p);
    var winRate = Math.round((p.w / (p.gp || (p.w + p.l + p.d || 1))) * 100);
    return [
      '<tr class="elo-detail"><td colspan="11">',
        '<div class="detail-inner"><div class="detail-grid">',
          '<div class="chart-wrap">',
            '<div class="chart-hd"><span>RATING HISTORY · LAST 30 ENGAGEMENTS</span><span>Peak ', PPW.formatNum(p.peak), '</span></div>',
            sparkline(hist, 520, 150),
          '</div>',
          '<div class="meta-grid">',
            '<div class="meta-cell"><div class="k">Current ELO</div><div class="v">', PPW.formatNum(p.elo), '</div></div>',
            '<div class="meta-cell"><div class="k">Peak ELO</div><div class="v">', PPW.formatNum(p.peak), '</div></div>',
            '<div class="meta-cell"><div class="k">K / D</div><div class="v fg">', (p.kd != null ? p.kd.toFixed(2) : "—"), '</div></div>',
            '<div class="meta-cell"><div class="k">KPS</div><div class="v fg">', (p.kps != null ? p.kps.toFixed(2) : "—"), '</div></div>',
            '<div class="meta-cell"><div class="k">Win Rate</div><div class="v fg">', winRate, '%</div></div>',
            '<div class="meta-cell"><div class="k">Games Played</div><div class="v fg">', p.gp, '</div></div>',
          '</div>',
        '</div></div>',
      '</td></tr>'
    ].join("");
  }

  function placeMarkup(idx) {
    var cls = idx === 1 ? "p1" : idx === 2 ? "p2" : idx === 3 ? "p3" : "";
    return '<span class="place ' + cls + '"><span class="ord">' + idx + '</span></span>';
  }

  function bodyHtml(rows) {
    if (rows.length === 0) {
      return '<tr><td colspan="11" class="empty">No matches found. Adjust your search or filters.</td></tr>';
    }
    var html = "";
    rows.slice(0, state.limit).forEach(function (p, idx) {
      var rank      = idx + 1;
      var winRate   = Math.round((p.w / (p.gp || (p.w + p.l + p.d || 1))) * 100);
      var isExpanded = state.expanded === p.name;
      var sqLabel   = state.theatre === "squadrons" ? p.full : p.squadron;
      var kd        = p.kd  != null ? p.kd.toFixed(2)  : "—";
      var kps       = p.kps != null ? p.kps.toFixed(2) : "—";
      var kdHigh    = p.kd  != null && p.kd  >= 2.0 ? " high" : "";
      var kpsHigh   = p.kps != null && p.kps >= 2.5 ? " high" : "";
      html += [
        '<tr class="elo-row', isExpanded ? " expanded" : "", '" data-name="', p.name, '">',
          '<td>', placeMarkup(rank), '</td>',
          '<td><span class="name">', p.name, '</span>', p.provisional ? '<span class="provisional">~PROV</span>' : "", '</td>',
          '<td class="optional sq">', sqLabel || "—", '</td>',
          '<td class="elo">', PPW.formatNum(p.elo), '</td>',
          '<td class="kd', kdHigh, '">', kd, '</td>',
          '<td class="kps', kpsHigh, ' optional">', kps, '</td>',
          '<td class="wld"><span class="w">', p.w, 'W</span> <span class="d">·</span> <span class="l">', p.l, 'L</span> <span class="d">·</span> <span class="d">', p.d, 'D</span></td>',
          '<td class="gp optional">', p.gp, '</td>',
          '<td class="wr optional-2"><span class="v">', winRate, '%</span></td>',
          '<td class="peak optional"><span class="v">', PPW.formatNum(p.peak), '</span></td>',
          '<td><span class="arrow">›</span></td>',
        '</tr>'
      ].join("");
      if (isExpanded) html += detailRow(p);
    });
    return html;
  }

  function render() {
    if (searchInput.value.trim().toLowerCase() !== state.query) {
      searchInput.value = state.query;
    }

    var copy = getTheatreCopy();
    theatreTitle.textContent = copy.title;
    theatreSub.textContent   = copy.sub;
    theatreBadge.textContent = copy.badge;

    sqSelect.style.display = state.theatre === "squadrons" ? "none" : "";

    var data     = getCurrentData();
    var filtered = filterRows(data);

    metaCount.textContent = data.length;
    metaTop.textContent   = data[0] ? PPW.formatNum(data[0].elo) : "—";
    shownEl.textContent   = " · " + Math.min(filtered.length, state.limit);

    podiumHtml(filtered);
    bodyEl.innerHTML = bodyHtml(filtered);
    pagerInfo.textContent = "Showing " + Math.min(filtered.length, state.limit) + " of " + filtered.length + " · Page 1 of 1";
  }

  /* Delegate clicks on podium card → expand corresponding row */
  podiumEl.addEventListener("click", function (e) {
    var card = e.target.closest(".podium-card");
    if (!card) return;
    var name = card.dataset.name;
    state.expanded = state.expanded === name ? null : name;
    render();
    var row = bodyEl.querySelector('tr[data-name="' + name + '"]');
    if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  render();
})();
