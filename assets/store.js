/* vendorkit storefront behaviour: grid, search, filters, card sheet, sticker deep links.
   Deep links (the printed-sticker contract): #<link_key> of a card, a sold tombstone, or an OLD
   key in `aliases` all open the right card. Text from data only ever goes in via textContent. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var D = { cards: [], byId: {}, byKey: {}, aliases: {} }, view = [], shown = 0, PAGE = 40;
  var cfgEl = $("#cfg");
  function cfg(k) { return (cfgEl && cfgEl.getAttribute("data-" + k)) || ""; }
  var FORM = null; try { FORM = cfg("form") ? JSON.parse(cfg("form")) : null; } catch (e) { FORM = null; }

  // ---------- views (the hero metric: sticker scans + card opens) ----------
  // PKM-031 (2026-11-21): the classic page counts every card open in GoatCounter as /card/CC-####; goat_pull reads
  // those into the trending shelf + Andy's digest. Since the switch the scans land HERE, so this store counts the same
  // paths. Image pings (the CSP allows https images, never outside scripts); only on the real host, never a preview.
  function count(path, title) {
    var url = cfg("count"), host = cfg("count-host");
    if (!url || location.hostname !== host) return;
    try { new Image().src = url + "?p=" + encodeURIComponent(path) + "&t=" + encodeURIComponent(title || "")
      + "&r=" + encodeURIComponent(document.referrer || "") + "&rnd=" + Math.random().toString(36).slice(2); } catch (e) {}
  }

  // ---------- requests ----------
  // The live store's own transport (classic index.html sendMsg): a silent POST to its Google Form, whose responses the
  // pulse's form-fixes intake turns into Andy's "people who want to buy" email. It finds the card by `cc:` (CC id) or
  // `card_id:` (sticker slug), so this block keeps the classic page's keys exactly. No address of anyone ships here.
  function sendBuy(c, contact, note) {
    if (!FORM || !FORM.action || !FORM.f) return false;
    var body = "A buy request came in from the storefront.\n\n---\ntype: buy-request\ncard_id: " + c.k + "\ncc: " + c.id
      + "\nname: " + c.n + "\nset: " + c.s + "\nprice: " + (c.p == null ? "" : c.p) + "\ncontact: " + contact
      + "\nurl: " + location.origin + location.pathname + "#" + c.k + "\n---\n\n" + (note || "(no note)") + "\n";
    var fd = new FormData();
    fd.append(FORM.f.type, "buy-request");
    fd.append(FORM.f.subject, "[BUY] " + c.n + " (" + c.id + ") — $" + (c.p == null ? "?" : c.p));
    fd.append(FORM.f.message, body);
    fd.append(FORM.f.contact, contact);
    // no-cors: Google accepts the POST but the reply is opaque (the classic page's deal too, PKM-004)
    fetch(FORM.action, { method: "POST", mode: "no-cors", body: fd }).catch(function () {});
    return true;
  }

  // ---------- where the price comes from (D13, the classic page's source box) ----------
  var BASIS_TITLE = { "tcg-sales": "TCGplayer sales", "tcg-market": "TCGplayer market", "collectr": "Collectr market",
    "collectr-graded": "Collectr market", "seller": "Couples Collective price" };
  var BASIS_WHY = { "no-recent-sales": "No TCGplayer sales like this one in the last 3 months",
    "no-match": "Not matched to a TCGplayer listing yet", "printing": "TCGplayer's sales were for a different printing",
    "graded": "No graded sales source yet", "review": "A newer price is waiting on the seller's review",
    "kept": "The seller is keeping this price for now" };
  var DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  function day(s) { var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }    // a calendar day, local
  function dayText(s) { return DAY.format(day(s)); }
  function when(s) { return s.indexOf("T") !== -1 ? new Date(s).toLocaleString(undefined, { month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : dayText(s); }
  function basisBox(c) {
    var b = c.b, title = b && BASIS_TITLE[b.source];
    if (!title) return el("p", "sh-src", "Sticker " + c.id);
    var box = el("div", "basis src-" + b.source), top = el("div", "basis-top");
    top.appendChild(el("span", "basis-ic"));
    var mid = el("div", "basis-mid");
    mid.appendChild(el("p", "basis-t", title)); mid.appendChild(el("p", "basis-k", b.kind || ""));
    if (BASIS_WHY[b.why]) mid.appendChild(el("p", "basis-k", BASIS_WHY[b.why]));
    top.appendChild(mid);
    if (b.sales_3mo) {
      var n = el("div", "basis-n"); n.appendChild(el("p", "basis-nl", "Sales · 3 mo"));
      n.appendChild(el("p", "basis-nv", (+b.sales_3mo).toLocaleString())); top.appendChild(n);
    }
    box.appendChild(top);
    var foot = [];
    if (b.last_sale && b.last_sale.length) foot.push("Last sale " + (b.last_sale[0] === b.last_sale[1] || !b.last_sale[1]
      ? dayText(b.last_sale[0]) : dayText(b.last_sale[0]) + " – " + dayText(b.last_sale[1])));
    if (b.checked) foot.push("Updated " + when(b.checked));
    foot.push("Sticker " + c.id);
    box.appendChild(el("p", "basis-f", foot.join(" · ")));
    return box;
  }

  function money(v) { if (v === null || v === undefined) return ""; v = +v;
    return v === Math.round(v) ? "$" + v.toLocaleString() : "$" + v.toFixed(2); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text; return e; }

  function tile(c) {
    var a = el("a", "tile"); a.href = "#" + (c.k || c.id);
    var art = el("span", "art");
    if (c.i) { var im = el("img"); im.src = c.t || c.i; im.alt = c.n; im.loading = "lazy"; im.decoding = "async"; art.appendChild(im); }
    else art.appendChild(el("span", "noimg"));
    var badge = c.g || (c.c && c.c !== "Near Mint" ? c.c : "");
    if (badge) art.appendChild(el("b", "badge", badge));
    a.appendChild(art); a.appendChild(el("span", "tn", c.n)); a.appendChild(el("span", "ts", c.s));
    var p = el("span", "tp", c.st === "sold" ? "Sold" : c.st === "unlisted" ? "Not listed" : money(c.p));
    if (c.w) { var w = el("s", "was", money(c.w)); p.appendChild(document.createTextNode(" ")); p.appendChild(w); }
    a.appendChild(p);
    return a;
  }

  // ---------- grid ----------
  function applyFilters() {
    var q = ($("#q").value || "").trim().toLowerCase(), era = $("#era").value, kind = $("#kind").value, sort = $("#sort").value,
        lang = $("#lang") ? $("#lang").value : "";
    var words = q ? q.split(/\s+/) : [];
    view = D.cards.filter(function (c) {
      if (c.st !== "for_sale") return false;
      if (era && c.e !== era) return false;
      if (lang && c.l !== lang) return false;
      if (kind === "slab" && !c.g) return false;
      if (kind === "raw" && c.g) return false;
      if (!words.length) return true;
      var hay = (c.n + " " + c.s + " " + c.id + " " + (c.g || "") + " " + (c.v || "")).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
    view.sort(function (a, b) {
      if (sort === "pa") return (a.p || 0) - (b.p || 0);
      if (sort === "nm") return a.n.localeCompare(b.n);
      return (b.p || 0) - (a.p || 0);
    });
    shown = 0; $("#grid").textContent = ""; more();
    var filtering = !!(q || era || kind || lang);
    $("#count").textContent = view.length.toLocaleString() + (view.length === 1 ? " card" : " cards") + (filtering ? " match" : " for sale");
    // while a filter is on, the shelves step aside so the results sit right under the filters (2026-11-21)
    document.body.classList.toggle("filtering", filtering);
    $("#clear").hidden = !filtering;
  }
  // the search bar to the top: filters, chips and (shelves hidden) the results all in view together
  function toResults() { $(".find").scrollIntoView({ behavior: "smooth", block: "start" }); }
  function more() {
    var g = $("#grid"), next = view.slice(shown, shown + PAGE);
    if (!view.length) g.appendChild(el("div", "empty", "No cards match. Try fewer words or another era."));
    next.forEach(function (c) { g.appendChild(tile(c)); });
    shown += next.length; $("#more").hidden = shown >= view.length;
  }

  // ---------- card sheet ----------
  function similar(c) {
    return D.cards.filter(function (x) { return x.st === "for_sale" && x.id !== c.id && x.i && (x.s.split(" · ")[0] === c.s.split(" · ")[0] || x.e === c.e); })
      .sort(function (a, b) { return (b.s.split(" · ")[0] === c.s.split(" · ")[0]) - (a.s.split(" · ")[0] === c.s.split(" · ")[0]) || (b.p || 0) - (a.p || 0); })
      .slice(0, 10);
  }
  function openCard(c) {
    var body = $("#sheetbody"); body.textContent = "";
    body.setAttribute("data-card", c.id);              // which card is open: read by sticker_scan (PKM-031 gate)
    var art = el("div", "sh-art");
    if (c.i) { var im = el("img"); im.src = c.i; im.alt = c.n; art.appendChild(im); }
    body.appendChild(art);
    var h = el("h2", "sh-name", c.n); h.id = "sh-name"; body.appendChild(h);
    body.appendChild(el("p", "sh-sub", c.s));
    var chips = el("div", "chips");
    [c.g || c.c, c.v, c.l === "JP" ? "Japanese" : ""].forEach(function (t) { if (t) chips.appendChild(el("span", "chip", t)); });
    body.appendChild(chips);
    if (c.st === "sold" || c.st === "unlisted") {
      body.appendChild(el("div", "soldmsg", c.st === "sold" ? "This one found a new home. Here are a few like it."
        : "This card isn't listed for sale right now. Here are a few like it."));      // the old page's wording, 2026-11-21
    } else {
      var pr = el("div", "sh-price"); pr.appendChild(el("b", "", money(c.p)));
      if (c.w) pr.appendChild(el("s", "was", "was " + money(c.w)));
      body.appendChild(pr);
      body.appendChild(basisBox(c));
      var btns = el("div", "btns"), want = el("button", "cta", "I want this card"), share = el("button", "ghost", "Share");
      btns.appendChild(want); btns.appendChild(share); body.appendChild(btns);
      var form = el("form", "buy"); form.hidden = true;
      var who = el("input"); who.placeholder = "Your phone or email"; who.required = true; who.autocomplete = "email";
      var note = el("textarea"); note.placeholder = "Anything we should know? (optional)"; note.rows = 2;
      var send = el("button", "cta", "Send request"); send.type = "submit";
      var dev = cfg("buy-note");
      form.appendChild(who); form.appendChild(note); form.appendChild(send);
      if (dev) form.appendChild(el("p", "note", dev));
      body.appendChild(form);
      want.addEventListener("click", function () { form.hidden = false; who.focus(); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var contact = who.value.trim();
        if (!contact) { who.focus(); return; }        // a request we can't answer is a lost sale (classic rule)
        var sent = dev ? false : sendBuy(c, contact, note.value.trim());
        form.textContent = "";
        form.appendChild(el("p", sent ? "ok" : "note", dev ? "Looks good. (Dev preview: nothing was sent.)"
          : sent ? "Request sent. We'll be in touch soon." : "Requests are temporarily unavailable. Please try again later."));
      });
      share.addEventListener("click", function () {
        var url = location.origin + location.pathname.replace(/index\.html$/, "") + "card/" + c.id + "/";
        if (navigator.share) navigator.share({ title: c.n, url: url }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { share.textContent = "Link copied"; });
      });
    }
    var sim = similar(c);
    if (sim.length) {
      var like = el("div", "like"); like.appendChild(el("h3", "", "More like this"));
      var row = el("div", "row"); sim.forEach(function (s) { row.appendChild(tile(s)); }); like.appendChild(row); body.appendChild(like);
    }
    $("#sheet").hidden = false; document.body.style.overflow = "hidden"; $("#sheet .sheet-in").scrollTop = 0;
  }
  function openAndCount(c) { openCard(c); count("/card/" + c.id, c.n + (c.st === "sold" ? " (sold)" : "")); }
  function closeCard() { $("#sheet").hidden = true; document.body.style.overflow = ""; }

  function resolve(key) {
    if (!key) return null;
    var c = D.byKey[key] || D.byId[key];
    if (!c && D.aliases[key]) c = D.byKey[D.aliases[key]];          // an old printed sticker
    return c || null;
  }
  function route() {
    var key = decodeURIComponent(location.hash.slice(1));
    if (!key || key === "shop" || key === "headliners" || key === "new" || key === "trending" || key === "drops" || key === "binder") { closeCard(); return; }
    var c = resolve(key);
    if (c) openAndCount(c); else closeCard();
  }

  // ---------- wire up ----------
  $("#close").addEventListener("click", function () { history.pushState("", "", location.pathname + location.search); closeCard(); });
  $("#sheet").addEventListener("click", function (e) { if (e.target.id === "sheet") $("#close").click(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#sheet").hidden) $("#close").click(); });
  window.addEventListener("hashchange", route);
  // for sticker_scan (PKM-031 gate): route()'s own lookup + open, given the #code directly. A scan of thousands of
  // codes can't rewrite the address bar (Chrome throttles history updates past ~100 in 10 s); a phone scan never does.
  window.__open = function (key) { var c = resolve(key); if (c) openCard(c); else closeCard(); return c ? c.id : null; };
  var timer;
  $("#q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () {
    applyFilters(); if ($("#q").value) toResults(); }, 180); });
  $(".find").addEventListener("submit", function (e) { e.preventDefault(); applyFilters(); toResults(); });
  ["#era", "#lang", "#kind", "#sort"].forEach(function (s) { if ($(s)) $(s).addEventListener("change", function () { applyFilters(); toResults(); }); });
  $("#clear").addEventListener("click", function () {
    $("#q").value = ""; ["#era", "#lang", "#kind"].forEach(function (s) { if ($(s)) $(s).value = ""; }); applyFilters();
  });
  $("#more").addEventListener("click", more);

  fetch("catalog.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
    D.cards = j.cards; D.aliases = j.aliases || {};
    j.cards.forEach(function (c) { D.byId[c.id] = c; if (c.k) D.byKey[c.k] = c; });
    count(location.pathname, document.title);       // the page view (classic: GoatCounter's own base count)
    applyFilters(); route();
    window.__ready = true;          // the catalog is loaded (sticker_scan waits for this)
  });
})();
