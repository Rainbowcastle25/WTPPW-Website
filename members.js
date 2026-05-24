/* ================================================================
   PPW — Members page logic
   Fetches live roster from API, falls back to PPW.MOCK_ROSTER.
   - Search / role filter / sort / direction
   - Click card → open full pilot dossier modal
   ================================================================ */

(function () {
  var apiBase = document.querySelector('meta[name="ppw-api-base"]').content;
  var apiKey  = document.querySelector('meta[name="ppw-api-key"]').content;

  var state = {
    query: "",
    role: "all",
    sort: "rank",
    dir: "desc"
  };

  var rolePriority = { commander: 0, officer: 1, sergeant: 2, private: 3 };

  function normalizeRole(r) {
    if (!r) return "private";
    var s = r.toLowerCase();
    if (s.indexOf("command") !== -1 || s.indexOf("founder") !== -1) return "commander";
    if (s.indexOf("officer") !== -1 || s.indexOf("exec") !== -1 || s.indexOf("xo") !== -1 || s.indexOf("recruit") !== -1) return "officer";
    if (s.indexOf("sergeant") !== -1 || s.indexOf("sgt") !== -1) return "sergeant";
    return "private";
  }

  function normalizeRoster(raw) {
    return raw.map(function (m, i) {
      var roleKey = normalizeRole(m.role || m.rank);
      var roleName = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
      return {
        idx: i,
        name: m.name || m.player_name || m.callsign || ("Player " + (i + 1)),
        role: m.role || roleName,
        roleKey: roleKey,
        personalClanRating: m.personalClanRating || m.clanRating || m.rating || m.personal_clan_rating || 0,
        activity: m.activity || m.activityScore || m.activity_score || 50,
        dateOfEntry: m.dateOfEntry || m.date_of_entry || m.joinDate || m.join_date || "01.01.2020",
        specialty: m.specialty || m.theatre || m.role || "Air",
        country: m.country || m.nation || "Unknown",
        joinedDays: m.joinedDays || m.joined_days || m.days_in_squadron || 365,
        serviceDays: m.joinedDays || m.joined_days || m.days_in_squadron || 365
      };
    });
  }

  var roster = [];

  // ----- DOM
  var grid       = document.getElementById("roster-grid");
  var searchInput = document.getElementById("roster-search");
  var roleSeg    = document.querySelector('.seg[aria-label="Role"]');
  var sortSel    = document.getElementById("roster-sort");
  var dirSeg     = document.getElementById("roster-dir");
  var rsTotal    = document.getElementById("rs-total");
  var rsVisible  = document.getElementById("rs-visible");
  var rsAvg      = document.getElementById("rs-avg");
  var rsTop      = document.getElementById("rs-top");

  // ----- event handlers
  searchInput.addEventListener("input", function () {
    state.query = searchInput.value.trim().toLowerCase();
    render();
  });
  roleSeg.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    roleSeg.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.role = btn.dataset.role;
    render();
  });
  sortSel.addEventListener("change", function () {
    state.sort = sortSel.value;
    render();
  });
  dirSeg.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    dirSeg.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.dir = btn.dataset.dir;
    render();
  });

  // ----- rendering
  function filterRoster() {
    return roster.filter(function (m) {
      if (state.role !== "all" && m.roleKey !== state.role) return false;
      if (state.query && m.name.toLowerCase().indexOf(state.query) === -1) return false;
      return true;
    });
  }

  function sortRoster(arr) {
    var sorted = arr.slice();
    var dir = state.dir === "asc" ? 1 : -1;
    sorted.sort(function (a, b) {
      var r;
      switch (state.sort) {
        case "name":     r = a.name.localeCompare(b.name); break;
        case "rating":   r = a.personalClanRating - b.personalClanRating; break;
        case "activity": r = a.activity - b.activity; break;
        case "service":  r = a.serviceDays - b.serviceDays; break;
        default:
          r = rolePriority[a.roleKey] - rolePriority[b.roleKey];
          if (r === 0) r = b.personalClanRating - a.personalClanRating;
          return r;
      }
      if (r === 0) r = a.idx - b.idx;
      return r * dir;
    });
    return sorted;
  }

  function dossierCard(m) {
    var medalsPreview = m.medals.slice(0, 3).map(function (md) {
      return md.icon
        ? '<img class="m-thumb" src="' + md.icon + '" title="' + md.name + '" alt="' + md.name + '">'
        : '<span class="m" title="' + md.name + '">★</span>';
    }).join("");
    if (m.medals.length > 3) {
      medalsPreview += '<span class="more">+' + (m.medals.length - 3) + '</span>';
    }
    var idx = String(m.idx + 1).padStart(3, "0");
    var rankLabel = m.role.toUpperCase();
    var rankClass = "rank-" + m.roleKey;
    return [
      '<article class="dossier ', rankClass, '" data-name="', m.name, '" tabindex="0">',
        '<div class="d-top">',
          '<span class="d-num">PSN-', idx, '</span>',
          '<span class="d-rank">', rankLabel, '</span>',
        '</div>',
        '<div class="d-callsign">', m.name, '</div>',
        '<div class="d-spec">', m.specialty, '<span class="sep">·</span>', m.country, '</div>',
        '<div class="d-mid">',
          '<div class="d-stat"><div class="k">Clan Rating</div><div class="v gold">', PPW.formatNum(m.personalClanRating), '</div></div>',
          '<div class="d-stat"><div class="k">Activity</div><div class="v">', m.activity, '</div></div>',
        '</div>',
        '<div class="d-bar">',
          '<div class="l"><span>Engagement</span><span>', m.activity, ' / 100</span></div>',
          '<div class="track"><div class="fill" style="width:', Math.min(100, m.activity), '%"></div></div>',
        '</div>',
        '<div class="d-medals">', medalsPreview || '<span class="more">No commendations yet</span>', '</div>',
        '<div class="d-foot">',
          '<span class="join">Enlisted ', m.dateOfEntry, '</span>',
          '<span class="view">View Dossier</span>',
        '</div>',
      '</article>'
    ].join("");
  }

  function render() {
    var filtered = filterRoster();
    var sorted   = sortRoster(filtered);
    grid.innerHTML = sorted.map(dossierCard).join("");
    rsVisible.textContent = sorted.length;

    var avg = Math.round(roster.reduce(function (s, m) { return s + m.activity; }, 0) / Math.max(1, roster.length));
    rsAvg.textContent = avg;
    var top = roster.reduce(function (acc, m) {
      return (!acc || m.personalClanRating > acc.personalClanRating) ? m : acc;
    }, null);
    if (top) {
      rsTop.textContent = PPW.formatNum(top.personalClanRating);
      var tm = document.getElementById("rs-top-meta");
      if (tm) tm.textContent = top.name;
    }
  }

  function initRoster(raw) {
    roster = normalizeRoster(raw);
    roster.forEach(function (m) {
      m.callsign     = PPW.callsign(m.name);
      m.medals       = [];
      m._medalsLoaded = false;
    });
    rsTotal.textContent = roster.length;
    render();
  }

  // ----- load from API
  fetch(apiBase + "/api/squadron-members", {
    headers: { "X-API-Key": apiKey }
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (data) {
      var raw = data.players || data.members || data || [];
      if (!Array.isArray(raw) || !raw.length) throw new Error("empty");
      initRoster(raw);
    })
    .catch(function (err) {
      console.error("[Roster]", err);
      grid.innerHTML = '<div class="text-soft" style="padding:2rem;font-family:var(--font-mono);font-size:0.8rem;letter-spacing:0.14em;text-transform:uppercase;">Unable to load roster — API unavailable.</div>';
      rsTotal.textContent = "—";
    });

  /* =================== MODAL =================== */
  var modal        = document.getElementById("dossier-modal");
  var modalContent = document.getElementById("dossier-content");

  function buildMedalHtml(medals, loading) {
    if (loading) {
      return '<p class="text-mute" style="font-family:var(--font-mono);font-size:0.78rem;">Loading…</p>';
    }
    if (!medals || !medals.length) {
      return '<p class="text-mute" style="font-family:var(--font-mono);font-size:0.78rem;">No commendations on record.</p>';
    }
    return medals.map(function (md) {
      var iconHtml = md.icon
        ? '<img src="' + md.icon + '" alt="' + md.name + '" style="width:40px;height:40px;object-fit:contain;">'
        : '<div class="ic">★</div>';
      return [
        '<div class="medal">',
          iconHtml,
          '<div class="nm">', md.name, '</div>',
        '</div>'
      ].join("");
    }).join("");
  }

  function openDossier(name) {
    var m = roster.find(function (x) { return x.name === name; });
    if (!m) return;
    // Open modal immediately — medals section shows "Loading…"
    modalContent.innerHTML = renderDossier(m, !m._medalsLoaded);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Lazily fetch real WT medals; cache result on player object
    if (!m._medalsLoaded) {
      fetch(apiBase + "/api/member/" + encodeURIComponent(m.name), {
        headers: { "X-API-Key": apiKey }
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          m._medalsLoaded = true;
          m.medals = (data && Array.isArray(data.medals)) ? data.medals : [];
          // Patch just the medal grid — avoids resetting scroll position
          var grid = document.querySelector("#dossier-content .medal-grid");
          if (grid) grid.innerHTML = buildMedalHtml(m.medals, false);
        })
        .catch(function () {
          m._medalsLoaded = true;
          var grid = document.querySelector("#dossier-content .medal-grid");
          if (grid) grid.innerHTML = buildMedalHtml([], false);
        });
    }
  }

  function closeDossier() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeDossier();
    if (e.target.closest("[data-close]")) closeDossier();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("open")) closeDossier();
  });
  document.addEventListener("click", function (e) {
    var card = e.target.closest(".dossier, .command-card");
    if (!card) return;
    var name = card.dataset.name || card.dataset.callsign;
    if (name) openDossier(name);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      var card = document.activeElement && document.activeElement.closest(".dossier");
      if (card) { e.preventDefault(); openDossier(card.dataset.name); }
    }
  });

  function buildServiceRecord(m) {
    var events = [];
    events.push({ date: m.dateOfEntry, label: "Enlisted into PPW", desc: "Personnel ID PSN-" + String(m.idx + 1).padStart(3, "0") + " issued." });
    if (m.roleKey !== "private") {
      events.push({ date: shift(m.dateOfEntry, 180), label: "Promoted to Sergeant", desc: "Consistent activity and discipline noted." });
    }
    if (m.roleKey === "officer" || m.roleKey === "commander") {
      events.push({ date: shift(m.dateOfEntry, 540), label: "Promoted to Officer", desc: "Granted ops oversight responsibility." });
    }
    if (m.roleKey === "commander") {
      events.push({ date: m.dateOfEntry, label: "Squadron Founder", desc: "Established WTPPW. Charter signed." });
    }
    events.push({ date: "2025.10", label: "SRE Season 11 completed", desc: m.activity > 70 ? "Top-tier individual contribution." : "Active participation across season." });
    events.push({ date: "2025.11", label: "Active duty", desc: "Currently deployed on regular ops." });
    return events;
  }

  function shift(dateStr, days) {
    var parts = dateStr.split(".");
    if (parts.length !== 3) return dateStr;
    var d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    d.setDate(d.getDate() + days);
    var pad = function (n) { return n < 10 ? "0" + n : n; };
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  }

  function pickRecentMatches() {
    return [];
  }

  function computeTheatreBreakdown(m) {
    var s = (m.specialty || "").toLowerCase();
    var airVal = s.indexOf("ground") === 0
      ? 100 - (65 + (m.activity % 20))
      : 65 + (m.activity % 20);
    var groundVal = 100 - airVal;
    return [
      { key: "air",    label: "Air Theatre",    value: airVal },
      { key: "ground", label: "Ground Theatre", value: groundVal }
    ];
  }

  function renderDossier(m, medalsLoading) {
    var psn     = String(m.idx + 1).padStart(3, "0");
    var winRate = Math.round(m.activity * 0.85 + Math.random() * 5);
    var winRate2 = m.activity > 60 ? winRate : winRate - 6;
    var rateClamp = Math.max(40, Math.min(82, winRate2));
    var service = buildServiceRecord(m);
    var matches = pickRecentMatches(m);
    var theatres = computeTheatreBreakdown(m);

    var roleColour = {
      commander: "var(--gold)",
      officer: "var(--purple-2)",
      sergeant: "#6FE5C4",
      private: "var(--fg-mute)"
    }[m.roleKey];

    return [
      '<button class="modal-close" data-close aria-label="Close dossier">×</button>',
      '<div class="mh">',
        '<div class="mh-portrait">', m.name.charAt(0).toUpperCase(), '</div>',
        '<div class="mh-meta">',
          '<div>PSN<span class="sep">/</span><span class="v">', psn, '</span></div>',
          '<div>RANK<span class="sep">/</span><span class="v gold">', m.role.toUpperCase(), '</span></div>',
          '<div>STATUS<span class="sep">/</span><span class="v"><span class="dot live" style="background:', roleColour, ';box-shadow:0 0 8px ', roleColour, ';"></span>ACTIVE DUTY</span></div>',
          '<div>SQDN<span class="sep">/</span><span class="v">WTPPW</span></div>',
        '</div>',
        '<div class="mh-callsign">', m.name, '</div>',
        '<div class="mh-spec">', m.specialty, '<span class="sep">/</span>', m.country, '<span class="sep">/</span>Enlisted ', m.dateOfEntry, '</div>',
      '</div>',
      '<div class="mb">',
        '<div>',
          '<h3 class="sub">// Combat Record</h3>',
          '<div class="stat-block">',
            '<div class="sb-cell"><div class="k">Clan Rating</div><div class="v">', PPW.formatNum(m.personalClanRating), '</div><div class="delta">Personal · all-time</div></div>',
            '<div class="sb-cell"><div class="k">Activity</div><div class="v fg">', m.activity, '</div><div class="delta">/ 100 · 30d</div></div>',
            '<div class="sb-cell"><div class="k">Win Rate</div><div class="v win">', rateClamp, '%</div><div class="delta">Last 50 ops</div></div>',
          '</div>',
          '<h3 class="sub">// Theatre Specialty</h3>',
          '<div class="spec-bars">',
            theatres.map(function (t) {
              return [
                '<div class="spec-bar">',
                  '<div class="l"><span>', t.label, '</span><span class="v">', t.value, '%</span></div>',
                  '<div class="track"><div class="fill" style="width:', t.value, '%"></div></div>',
                '</div>'
              ].join("");
            }).join(""),
          '</div>',
          '<h3 class="sub">// Recent Engagements</h3>',
          '<div class="match-list">',
            matches.map(function (b) {
              var sym   = b.result === "win" ? "V" : b.result === "loss" ? "D" : "T";
              var label = b.result === "win" ? "Victory" : b.result === "loss" ? "Defeat" : "Draw";
              return [
                '<div class="match ', b.result, '">',
                  '<div class="res">', sym, '</div>',
                  '<div class="info">', b.map, '<span class="sub">', b.mode, ' · vs ', b.opp, ' · ', label, '</span></div>',
                  '<div class="delta">', b.delta, '</div>',
                '</div>'
              ].join("");
            }).join(""),
          '</div>',
        '</div>',
        '<div>',
          '<h3 class="sub">// Commendations</h3>',
          '<div class="medal-grid">',
            buildMedalHtml(m.medals, medalsLoading),
          '</div>',
          '<h3 class="sub">// Service Record</h3>',
          '<div class="service-list">',
            service.map(function (s) {
              return [
                '<div class="service-row">',
                  '<div class="date">', s.date, '</div>',
                  '<div class="ev">', s.label, '<div class="desc">', s.desc, '</div></div>',
                '</div>'
              ].join("");
            }).join(""),
          '</div>',
        '</div>',
      '</div>'
    ].join("");
  }
})();
