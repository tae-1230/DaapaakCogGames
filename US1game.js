// ============================================================
// Trail Making (Popup Recall)
// ------------------------------------------------------------
// 1. Show a memorization popup with sequence
// 2. User taps circles in correct order
// 3. Track timing, errors, accuracy
// 4. Export session report (JSON + CSV)
// 5. Save session to Firestore
// ============================================================

import { saveGameSession } from "./stats.js";

/* ================= DOM ELEMENTS ================= */

const board = document.getElementById("board");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const difficultyEl = document.getElementById("difficulty");
const memorizeSecondsEl = document.getElementById("memorizeSeconds");

const timeEl = document.getElementById("time");
const errorsEl = document.getElementById("errors");
const statusEl = document.getElementById("status");

// Modal elements
const modal = document.getElementById("sequenceModal");
const sequenceText = document.getElementById("sequenceText");
const countdownEl = document.getElementById("countdown");
const startNowBtn = document.getElementById("startNowBtn");

// Report export button
const exportBtn = document.getElementById("exportBtn");


/* ================= GAME STATE ================= */

// idle | memorizing | active | done
let state = "idle";

let sequence = [];
let nodes = [];
let expectedIndex = 0;
let errors = 0;

let t0 = null;              // timer start
let rafId = null;           // animation frame ID
let countdownTimer = null;  // modal countdown interval

// Session tracking
let session = null;         // finished session
let liveSession = null;     // active run session


/* ================= UTILITY FUNCTIONS ================= */

// Update status message
function setStatus(msg) {
  statusEl.textContent = msg;
}

// Fisher-Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build alternating number-letter sequence
function buildShuffledSequence(nPairs) {
  const letters = Array.from({ length: nPairs }, (_, i) =>
    String.fromCharCode(65 + i)
  );
  shuffle(letters);

  const seq = [];
  for (let i = 1; i <= nPairs; i++) {
    seq.push(String(i));
    seq.push(letters[i - 1]);
  }
  return seq;
}

// Clear all nodes from board
function clearBoard() {
  board.querySelectorAll(".node").forEach((n) => n.remove());
  nodes = [];
}

// Random helper
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Distance helper
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Update error counter display
function updateHUD() {
  errorsEl.textContent = String(errors);
}


/* ================= SESSION LOGGING ================= */

// Log event into live session
function logEvent(type, data) {
  if (!liveSession) return;
  liveSession.events.push({
    t_ms: Math.round(performance.now()),
    type,
    ...(data || {}),
  });
}

// Compute derived metrics after game ends
function computeMetrics(sess) {
  if (!sess) return null;

  const ev = sess.events || [];
  const startEv = ev.find(e => e.type === "timer_start");
  const endEv = ev.find(e => e.type === "game_done");

  const taps = ev.filter(e => e.type === "tap");
  const tapResults = ev.filter(e => e.type === "tap_result");
  const correct = tapResults.filter(e => e.result === "correct");
  const wrong = tapResults.filter(e => e.result === "wrong");

  let completionMs = 0;
  if (startEv && endEv) completionMs = endEv.t_ms - startEv.t_ms;

  // Inter-tap intervals
  const tapTimes = taps.map(t => t.t_ms).sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < tapTimes.length; i++) {
    intervals.push(tapTimes[i] - tapTimes[i - 1]);
  }
  intervals.sort((a, b) => a - b);

  const median = arr => {
    if (!arr.length) return null;
    const m = (arr.length / 2) | 0;
    return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
  };

  return {
    completion_time_s: Number((completionMs / 1000).toFixed(3)),
    errors: wrong.length,
    taps_total: taps.length,
    taps_correct: correct.length,
    accuracy: taps.length
      ? Number((correct.length / taps.length).toFixed(3))
      : null,
    intertap_median_ms:
      median(intervals) == null ? null : Math.round(median(intervals)),
    intertap_longest_ms:
      intervals.length ? Math.round(intervals[intervals.length - 1]) : null,
  };
}


/* ================= REPORT EXPORT ================= */

// Download file helper
function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

// Export JSON + CSV report
function exportReport() {
  if (!session) {
    setStatus("No finished run yet — finish a game first.");
    return;
  }

  const base = `trail_report_${session.timestamp_iso.replace(/[:.]/g, "-")}`;
  downloadText(`${base}.json`,
    JSON.stringify(session, null, 2),
    "application/json"
  );

  if (session.metrics) {
    const m = session.metrics;
    const s = session.settings;

    const header = [
      "timestamp_iso",
      "difficulty_pairs",
      "memorize_seconds",
      "completion_time_s",
      "errors",
      "taps_total",
      "taps_correct",
      "accuracy",
      "intertap_median_ms",
      "intertap_longest_ms",
    ];

    const row = [
      session.timestamp_iso,
      s.difficulty_pairs,
      s.memorize_seconds,
      m.completion_time_s,
      m.errors,
      m.taps_total,
      m.taps_correct,
      m.accuracy,
      m.intertap_median_ms,
      m.intertap_longest_ms,
    ];

    const csv = header.join(",") + "\n" + row.join(",") + "\n";
    downloadText(`${base}.csv`, csv, "text/csv");
  }
}


/* ================= NODE PLACEMENT ================= */

// Random non-overlapping placement
function placeNodes(labels) {
  const rect = board.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  const radius = 38;
  const minSpacing = 95;
  const placed = [];

  for (const label of labels) {
    let tries = 0;
    let x = 0, y = 0;

    while (tries++ < 800) {
      x = rand(radius, w - radius);
      y = rand(radius, h - radius);

      if (placed.every(p => dist(x, y, p.x, p.y) >= minSpacing)) break;
    }

    placed.push({ label, x, y });
  }

  // Save layout into session
  if (liveSession) {
    liveSession.layout = placed.map(p => ({
      label: p.label,
      x: Math.round(p.x),
      y: Math.round(p.y),
    }));
  }

  // Render nodes
  placed.forEach(p => {
    const el = document.createElement("div");
    el.className = "node";
    el.textContent = p.label;

    el.style.left = `${p.x - 35}px`;
    el.style.top = `${p.y - 35}px`;

    el.addEventListener("click", ev => onTap(p.label, el, ev));

    board.appendChild(el);
    nodes.push({ ...p, el });
  });
}


/* ================= TIMER ================= */

function tick() {
  if (!t0) return;
  timeEl.textContent =
    `${((performance.now() - t0) / 1000).toFixed(1)}s`;
  rafId = requestAnimationFrame(tick);
}


/* ================= GAME FLOW ================= */

// Start new game
function startGame() {
  resetGame(false);

  const nPairs = Number(difficultyEl.value);
  const memorizeSeconds =
    Math.max(1, Math.min(10, Number(memorizeSecondsEl.value || 4)));

  // Create new session
  liveSession = {
    game: "trail_making_popup_recall",
    timestamp_iso: new Date().toISOString(),
    settings: {
      difficulty_pairs: nPairs,
      memorize_seconds: memorizeSeconds,
    },
    sequence: [],
    layout: [],
    events: [],
    metrics: null,
  };

  if (exportBtn) exportBtn.disabled = true;

  sequence = buildShuffledSequence(nPairs);
  liveSession.sequence = sequence.slice();

  state = "memorizing";
  setStatus("Memorize the sequence in the popup…");

  showSequenceModal(sequence, memorizeSeconds, () => {
    clearBoard();
    placeNodes(sequence);

    expectedIndex = 0;
    errors = 0;
    t0 = null;

    timeEl.textContent = "0.0s";
    updateHUD();

    state = "active";
    setStatus("Now tap the circles in the exact order you memorized.");
    logEvent("game_ready", { total_items: sequence.length });
  });
}


// Handle tap on node
function onTap(label, el, ev) {
  if (state !== "active") return;

  if (!t0) {
    t0 = performance.now();
    logEvent("timer_start");
    tick();
  }

  const expectedLabel = sequence[expectedIndex];

  logEvent("tap", { label, expected_index: expectedIndex });

  if (label === expectedLabel) {
    el.classList.add("correct");
    logEvent("tap_result", { result: "correct", got: label });
    expectedIndex++;

    if (expectedIndex >= sequence.length) finishGame();
  } else {
    errors++;
    el.classList.add("wrong");
    setTimeout(() => el.classList.remove("wrong"), 260);
    logEvent("tap_result", { result: "wrong", got: label });
  }

  updateHUD();
}


// Finish game
function finishGame() {
  state = "done";
  if (rafId) cancelAnimationFrame(rafId);

  const timeSec =
    t0 ? (performance.now() - t0) / 1000 : 0;

  logEvent("game_done", {
    completion_time_s: Number(timeSec.toFixed(3)),
    errors
  });

  // Finalize session
  liveSession.metrics = computeMetrics(liveSession);
  session = liveSession;
  liveSession = null;

  // Save to Firestore
  saveGameSession("trail_making_popup_recall", session);

  setStatus(
    `Completed! Time: ${timeSec.toFixed(1)}s • Errors: ${errors}`
  );

  if (exportBtn) exportBtn.disabled = false;
}


// Reset everything
function resetGame(resetSettings = true) {
  if (countdownTimer) clearInterval(countdownTimer);
  if (rafId) cancelAnimationFrame(rafId);

  modal.classList.add("hidden");

  state = "idle";
  sequence = [];
  nodes = [];
  expectedIndex = 0;
  errors = 0;
  t0 = null;

  clearBoard();

  timeEl.textContent = "0.0s";
  errorsEl.textContent = "0";
  setStatus("Choose settings, then press Start.");

  if (exportBtn) exportBtn.disabled = true;

  if (resetSettings) {
    difficultyEl.value = "3";
    memorizeSecondsEl.value = "4";
  }

  liveSession = null;
}


/* ================= EVENT LISTENERS ================= */

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => resetGame(false));
if (exportBtn) exportBtn.addEventListener("click", exportReport);


/* ================= INIT ================= */

resetGame(true);
