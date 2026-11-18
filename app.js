/* =========================================================
   Pitchside — client-only. No backend, no DB.
   State lives in localStorage. Scores are simulated live.
   ========================================================= */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ---------- Persisted state ---------- */
  const KEY = "crickrush.v1";
  const store = {
    load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
      catch { return {}; }
    },
    save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
  };
  let state = Object.assign({ points: 120, vote: null, claimed: [] }, store.load());
  const persist = () => store.save(state);

  /* ---------- Data (mock) ---------- */
  const matches = [
    { id: "m1", series: "ICC World Series · Final", state: "live",
      a: { code: "IND", flag: "🇮🇳", name: "India", runs: 182, wk: 4, ov: "18.2", bat: true },
      b: { code: "AUS", flag: "🇦🇺", name: "Australia", runs: 195, wk: 8, ov: "20.0" },
      note: "India need 14 off 10" },
    { id: "m2", series: "T20 Tri-Series", state: "live",
      a: { code: "ENG", flag: "🏴", name: "England", runs: 94, wk: 2, ov: "11.4", bat: true },
      b: { code: "SA", flag: "🇿🇦", name: "South Africa", runs: 156, wk: 6, ov: "20.0" },
      note: "England need 63 off 50" },
    { id: "m3", series: "Asia Cup · Group B", state: "soon",
      a: { code: "PAK", flag: "🇵🇰", name: "Pakistan", runs: null, wk: null, ov: null },
      b: { code: "SL", flag: "🇱🇰", name: "Sri Lanka", runs: null, wk: null, ov: null },
      note: "Starts 7:30 PM · Colombo" },
    { id: "m4", series: "The Ashes · Day 3", state: "live",
      a: { code: "AUS", flag: "🇦🇺", name: "Australia", runs: 341, wk: 9, ov: "96.1", bat: true },
      b: { code: "ENG", flag: "🏴", name: "England", runs: 288, wk: 10, ov: "" },
      note: "Australia lead by 53 runs" },
    { id: "m5", series: "Women's T20 · Semi", state: "done",
      a: { code: "NZ", flag: "🇳🇿", name: "New Zealand", runs: 143, wk: 7, ov: "20.0" },
      b: { code: "WI", flag: "🇼🇮", name: "West Indies", runs: 139, wk: 8, ov: "20.0" },
      note: "New Zealand won by 4 runs" },
    { id: "m6", series: "ODI Series · 2nd ODI", state: "soon",
      a: { code: "BAN", flag: "🇧🇩", name: "Bangladesh", runs: null, wk: null, ov: null },
      b: { code: "AFG", flag: "🇦🇫", name: "Afghanistan", runs: null, wk: null, ov: null },
      note: "Starts tomorrow · 2:00 PM" }
  ];

  const rewards = [
    { id: "amazon", cls: "amazon", brand: "Amazon", val: "$10 gift card", cost: 500 },
    { id: "spotify", cls: "spotify", brand: "Spotify", val: "3 months Premium", cost: 400 },
    { id: "food", cls: "food", brand: "Zomato", val: "₹150 off food", cost: 200 },
    { id: "movie", cls: "movie", brand: "BookMyShow", val: "Buy 1 Get 1 ticket", cost: 300 },
    { id: "coffee", cls: "coffee", brand: "Starbucks", val: "Free Grande", cost: 250 },
    { id: "game", cls: "game", brand: "Steam", val: "$5 wallet code", cost: 350 }
  ];

  const CHECK = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 2l2.9 6.3L22 9.2l-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 7.1-.9z" fill="currentColor"/></svg>';

  /* ---------- Wallet ---------- */
  const walletEl = $("#walletPoints");
  const walletChip = $("#walletChip");
  function renderWallet(animate) {
    walletEl.textContent = state.points.toLocaleString();
    if (animate) {
      walletChip.classList.remove("pulse");
      void walletChip.offsetWidth;
      walletChip.classList.add("pulse");
    }
  }
  function addPoints(n) { state.points = Math.max(0, state.points + n); persist(); renderWallet(true); renderRewards(); }

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastT;
  function toast(msg, kind) {
    clearTimeout(toastT);
    toastEl.className = "toast" + (kind ? " toast--" + kind : "");
    toastEl.innerHTML = '<span class="toast__ic">' + CHECK + "</span>" + msg;
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    toastT = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  /* ---------- Match grid ---------- */
  function scoreMarkup(t) {
    if (t.runs === null) return '<span class="match__sc">—</span>';
    return '<span class="match__sc">' + t.runs + '<span>/' + t.wk + (t.ov ? " · " + t.ov : "") + "</span></span>";
  }
  function teamRow(t, dim) {
    return '<div class="match__row' + (dim ? " match__dim" : "") + '">' +
      '<div class="match__team"><span class="match__flag">' + t.flag + '</span>' +
      '<span class="match__tname">' + t.name + "</span></div>" + scoreMarkup(t) + "</div>";
  }
  function stateChip(s) {
    if (s === "live") return '<span class="match__state match__state--live">LIVE</span>';
    if (s === "done") return '<span class="match__state match__state--done">Result</span>';
    return '<span class="match__state match__state--soon">Upcoming</span>';
  }
  function renderMatches() {
    $("#matchGrid").innerHTML = matches.map(m => {
      const aLead = (m.a.runs || 0) >= (m.b.runs || 0);
      return '<article class="match reveal" data-id="' + m.id + '">' +
        '<div class="match__meta"><span>' + m.series + "</span>" + stateChip(m.state) + "</div>" +
        teamRow(m.a, m.state === "done" && !aLead) +
        teamRow(m.b, m.state === "done" && aLead) +
        '<div class="match__foot">' + m.note + "</div></article>";
    }).join("");
    observeReveal();
  }

  /* ---------- Vote ---------- */
  const voteMatch = matches[0]; // India v Australia final
  // Deterministic-ish base tallies so percentages feel real and stable
  const baseVotes = { IND: 6120, AUS: 5840 };
  function pct(a, b) { const t = a + b; return t ? Math.round((a / t) * 100) : 50; }

  function renderVote() {
    const el = $("#voteCard");
    const mine = state.vote;
    const voted = !!mine;
    const tally = Object.assign({}, baseVotes);
    if (mine) tally[mine] += 1;
    const pA = pct(tally.IND, tally.AUS);
    const pB = 100 - pA;

    el.className = "vote" + (voted ? " is-voted" : "");
    el.innerHTML =
      '<p class="vote__series">' + voteMatch.series + "</p>" +
      '<h3 class="vote__q">Who lifts the trophy tonight?</h3>' +
      '<div class="vote__options">' +
        optMarkup(voteMatch.a, pA, mine) +
        optMarkup(voteMatch.b, pB, mine) +
      "</div>" +
      '<p class="vote__foot">' + (voted
        ? 'You backed <strong>' + (mine === "IND" ? "India" : "Australia") + '</strong>. <span class="vote__reward">+50 points if they win.</span>'
        : "Lock your pick to earn 50 points when they win.") + "</p>";

    $$(".opt", el).forEach(btn => {
      if (!voted) btn.addEventListener("click", () => castVote(btn.dataset.code));
    });
    // Reveal the split only once a vote is locked in
    if (voted) {
      requestAnimationFrame(() => {
        $("[data-code='IND'] .opt__fill", el).style.width = pA + "%";
        $("[data-code='AUS'] .opt__fill", el).style.width = pB + "%";
      });
    }
  }
  function optMarkup(t, p, mine) {
    const isMine = mine === t.code;
    const locked = !!mine;
    return '<button class="opt' + (isMine ? " is-mine" : "") + (locked ? " is-locked" : "") +
      '" data-code="' + t.code + '"' + (locked ? " disabled" : "") + '>' +
      '<span class="opt__fill"></span>' +
      '<span class="opt__flag">' + t.flag + "</span>" +
      '<span class="opt__name">' + t.name + "</span>" +
      '<span class="opt__pct">' + p + "%</span>" +
      '<span class="opt__check">' + CHECK + "</span></button>";
  }
  function castVote(code) {
    if (state.vote) return;
    state.vote = code;
    persist();
    renderVote();
    toast("Vote locked in. Good luck! 🏏");
  }

  /* ---------- Rewards ---------- */
  function renderRewards() {
    $("#rewardGrid").innerHTML = rewards.map(r => {
      const claimed = state.claimed.includes(r.id);
      const afford = state.points >= r.cost;
      let label, attrs = "", cls = "reward__btn";
      if (claimed) { label = "Claimed ✓"; attrs = "disabled"; cls += " is-claimed"; }
      else if (!afford) { label = (r.cost - state.points) + " more"; attrs = "disabled"; }
      else { label = "Redeem"; }
      return '<article class="reward reward--' + r.cls + ' reveal">' +
        '<div class="reward__top"><div><div class="reward__brand">' + r.brand + "</div>" +
        '<div class="reward__val">' + r.val + '</div></div>' +
        '<span class="reward__cost">' + STAR + " " + r.cost + "</span></div>" +
        '<div class="reward__action"><button class="' + cls + '" data-id="' + r.id + '" ' + attrs + ">" + label + "</button></div>" +
        "</article>";
    }).join("");

    $$("#rewardGrid .reward__btn:not([disabled])").forEach(b =>
      b.addEventListener("click", () => claim(b.dataset.id)));
    observeReveal();
  }
  function claim(id) {
    const r = rewards.find(x => x.id === id);
    if (!r || state.points < r.cost || state.claimed.includes(id)) return;
    state.points -= r.cost;
    state.claimed.push(id);
    persist();
    renderWallet(true);
    renderRewards();
    toast(r.brand + " " + r.val + " unlocked — check your email.", "amber");
  }

  /* ---------- Live score simulation (featured) ---------- */
  const outcomes = ["0", "1", "2", "1", "4", "0", "1", "6", "W", "2", "4", "1"];
  const lines = [
    "Bumrah fires it in full — dot ball, pressure building.",
    "Tucked to fine leg, easy single taken.",
    "Short and pulled away — two to the deep.",
    "Driven on the up through extra cover for FOUR.",
    "Big appeal… not out. Lives on.",
    "SIX! Launched over long-on, the crowd erupts.",
    "Edged and taken! Huge wicket at the death.",
    "Dropped short, worked away for a couple."
  ];
  let overState = [];
  const scoreAEl = $("#scoreA");
  const oversAEl = $("#oversA");
  const chaseEl = $("#chaseLine");
  const commentaryEl = $("#commentary");
  const overBallsEl = $("#overBalls");
  let runs = 182, wk = 4, ballsThisOver = 2, oversDone = 18, need = 14, ballsLeft = 10;

  function paintOver() {
    overBallsEl.innerHTML = overState.map(b =>
      '<span class="ball ball--' + b + '">' + b + "</span>").join("");
  }
  function tickBall() {
    if (ballsLeft <= 0 || wk >= 10) return finishChase();
    const o = outcomes[Math.floor(Math.random() * outcomes.length)];
    overState.push(o);
    if (overState.length > 6) overState = overState.slice(-6);
    if (o === "W") { wk += 1; }
    else { const r = parseInt(o, 10); runs += r; need -= r; }
    ballsLeft -= 1;
    ballsThisOver += 1;
    if (ballsThisOver >= 6) { ballsThisOver = 0; oversDone += 1; }
    scoreAEl.textContent = runs;
    oversAEl.textContent = oversDone + "." + ballsThisOver + " ov";
    commentaryEl.textContent = lines[Math.floor(Math.random() * lines.length)];
    chaseEl.textContent = need <= 0 ? "Scores level!" : "Need " + need + " off " + ballsLeft;
    paintOver();
    if (need <= 0) finishChase(true);
  }
  function finishChase(won) {
    if (won) {
      chaseEl.textContent = "India win! 🏆";
      $("#featuredStatus").textContent = "Result";
      commentaryEl.textContent = "India get home — what a finish at the death.";
      // Reward the voter
      if (state.vote === "IND" && !state.rewardedM1) {
        state.rewardedM1 = true; addPoints(50);
        toast("Your pick won — +50 points!", "amber");
      }
      clearInterval(simTimer);
    }
  }

  /* ---------- Scroll reveal ---------- */
  let io;
  function observeReveal() {
    if (!("IntersectionObserver" in window)) { $$(".reveal").forEach(e => e.classList.add("in")); return; }
    if (!io) io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$(".reveal:not(.in)").forEach(e => io.observe(e));
  }

  /* ---------- Nav shadow on scroll ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Boot ---------- */
  renderWallet(false);
  renderMatches();
  renderVote();
  renderRewards();
  overState = ["1", "4", "0", "1"]; paintOver();
  onScroll();
  observeReveal();

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let simTimer;
  if (!prefersReduced) simTimer = setInterval(tickBall, 3600);
})();
