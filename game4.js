// What is Missing?, Aneesh
import { saveGameSession } from "./stats.js";

const scene = document.getElementById("scene");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const totalRoundsEl = document.getElementById("totalRounds");
const memorizeSecondsEl = document.getElementById("memorizeSeconds");

const roundEl = document.getElementById("round");
const itemsEl = document.getElementById("items");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const phaseEl = document.getElementById("phase");
const feedbackEl = document.getElementById("feedback");
const statusEl = document.getElementById("status");

const exportBtn = document.getElementById("exportBtn");
const endGameBtn = document.getElementById("endGameBtn");

//state
let state = "idle"; // idle | memorizing | blackscreen | active | feedback | done
let gameState = {
  round: 0,
  score: 0,
  streak: 0,
  maxRounds: 10,
  memorizeTime: 8,
  currentScene: [],
  removedItem: null,
  difficulty: 6
};

let t0 = null;
let countdownTimer = null;
let nextRoundTimer = null;

// session tracking
let session = null;
let liveSession = null;


// scenes
const sceneTemplates = [
    {
        name: 'Beach',
        background: 'linear-gradient(to bottom, #87CEEB 0%, #B0E2FF 40%, #F4E4C1 70%, #E8D5B7 100%)',
        layers: [
            { items: ['☀️'], size: '4.5em', positions: [{x: 82, y: 10}] },
            { items: ['⛅', '☁️'], size: '3em', positions: [{x: 25, y: 15}, {x: 60, y: 12}] },
            { items: ['🌊', '🌊', '🌊', '🌊'], size: '2.8em', positions: [{x: 8, y: 42}, {x: 28, y: 45}, {x: 52, y: 43}, {x: 75, y: 44}] },
            { items: ['🏖️'], size: '3.5em', positions: [{x: 65, y: 58}] },
            { items: ['⛱️', '⛱️'], size: '3.2em', positions: [{x: 22, y: 62}, {x: 78, y: 65}] },
            { items: ['🐚', '🐚', '🐚', '⭐', '⭐'], size: '2em', positions: [{x: 18, y: 75}, {x: 42, y: 78}, {x: 68, y: 82}, {x: 35, y: 72}, {x: 58, y: 85}] },
            { items: ['🦀', '🦀'], size: '1.8em', positions: [{x: 25, y: 82}, {x: 72, y: 88}] },
            { items: ['🏄', '🏊'], size: '2.5em', positions: [{x: 38, y: 48}, {x: 15, y: 50}] },
            { items: ['⛵', '🚤'], size: '2.8em', positions: [{x: 75, y: 35}, {x: 45, y: 38}] },
            { items: ['🍹', '🥥'], size: '2em', positions: [{x: 80, y: 72}, {x: 85, y: 75}] },
            { items: ['🕶️'], size: '2em', positions: [{x: 70, y: 75}] },
            { items: ['🐠', '🐟', '🐡'], size: '1.9em', positions: [{x: 48, y: 46}, {x: 22, y: 48}, {x: 62, y: 50}] },
            { items: ['🪁'], size: '2.3em', positions: [{x: 65, y: 22}] },
            { items: ['🏐'], size: '2em', positions: [{x: 32, y: 68}] },
            { items: ['🩴'], size: '1.8em', positions: [{x: 75, y: 82}] },
            { items: ['🦜'], size: '2.2em', positions: [{x: 15, y: 25}] },
            { items: ['🪸'], size: '1.7em', positions: [{x: 52, y: 80}] }
        ]
    },
    {
        name: 'House Interior',
        background: 'linear-gradient(135deg, #8B7355 0%, #A0826D 50%, #D4C5B9 100%)',
        layers: [
            { items: ['🛋️'], size: '5em', positions: [{x: 42, y: 58}] },
            { items: ['📺'], size: '4em', positions: [{x: 15, y: 28}] },
            { items: ['🪴', '🪴'], size: '2.8em', positions: [{x: 75, y: 68}, {x: 8, y: 62}] },
            { items: ['🕯️', '🕯️'], size: '2em', positions: [{x: 52, y: 38}, {x: 58, y: 38}] },
            { items: ['📚', '📚', '📖'], size: '2.2em', positions: [{x: 82, y: 45}, {x: 85, y: 47}, {x: 44, y: 75}] },
            { items: ['🖼️', '🖼️'], size: '3em', positions: [{x: 35, y: 18}, {x: 65, y: 20}] },
            { items: ['⏰'], size: '2.2em', positions: [{x: 85, y: 28}] },
            { items: ['🎮'], size: '2em', positions: [{x: 36, y: 70}] },
            { items: ['☕', '🍪'], size: '2em', positions: [{x: 55, y: 65}, {x: 60, y: 66}] },
            { items: ['🧸'], size: '2.3em', positions: [{x: 68, y: 75}] },
            { items: ['💡'], size: '2.5em', positions: [{x: 12, y: 10}] },
            { items: ['🪟'], size: '3.5em', positions: [{x: 78, y: 22}] },
            { items: ['🎨'], size: '2.2em', positions: [{x: 25, y: 80}] },
            { items: ['🎸'], size: '2.8em', positions: [{x: 88, y: 72}] },
            { items: ['📷'], size: '1.9em', positions: [{x: 48, y: 45}] },
            { items: ['🕰️'], size: '2.2em', positions: [{x: 22, y: 35}] },
            { items: ['🪑'], size: '2.5em', positions: [{x: 70, y: 55}] },
            { items: ['🧺'], size: '2em', positions: [{x: 18, y: 72}] }
        ]
    },
    {
        name: 'Forest',
        background: 'linear-gradient(to bottom, #4A90E2 0%, #87CEEB 30%, #90EE90 60%, #228B22 100%)',
        layers: [
            { items: ['🌲', '🌲', '🌲', '🌳'], size: '5em', positions: [{x: 12, y: 38}, {x: 82, y: 35}, {x: 48, y: 32}, {x: 65, y: 40}] },
            { items: ['🌳'], size: '4.5em', positions: [{x: 28, y: 45}] },
            { items: ['🌻', '🌻', '🌹', '🌷', '🌺'], size: '2.3em', positions: [{x: 32, y: 68}, {x: 40, y: 70}, {x: 55, y: 72}, {x: 62, y: 69}, {x: 70, y: 73}] },
            { items: ['🦋', '🦋', '🐝'], size: '2em', positions: [{x: 42, y: 42}, {x: 68, y: 38}, {x: 52, y: 58}] },
            { items: ['🪺'], size: '2.2em', positions: [{x: 18, y: 32}] },
            { items: ['🌿', '🌿', '☘️', '🍃'], size: '1.8em', positions: [{x: 22, y: 78}, {x: 75, y: 82}, {x: 48, y: 80}, {x: 58, y: 85}] },
            { items: ['🐛'], size: '1.7em', positions: [{x: 35, y: 82}] },
            { items: ['🍄', '🍄', '🍄'], size: '2em', positions: [{x: 15, y: 70}, {x: 20, y: 72}, {x: 85, y: 75}] },
            { items: ['🪨', '🪨'], size: '2.2em', positions: [{x: 60, y: 78}, {x: 38, y: 75}] },
            { items: ['☀️'], size: '4em', positions: [{x: 80, y: 12}] },
            { items: ['🦉'], size: '2.3em', positions: [{x: 14, y: 38}] },
            { items: ['🦊'], size: '2.5em', positions: [{x: 72, y: 65}] },
            { items: ['🐌'], size: '1.6em', positions: [{x: 28, y: 85}] },
            { items: ['🦌'], size: '2.8em', positions: [{x: 55, y: 55}] },
            { items: ['🐿️'], size: '2em', positions: [{x: 85, y: 42}] },
            { items: ['🪵'], size: '2.2em', positions: [{x: 45, y: 82}] }
        ]
    },
    {
        name: 'School',
        background: 'linear-gradient(135deg, #FFF9E6 0%, #E8F4F8 100%)',
        layers: [
            { items: ['🏫'], size: '5em', positions: [{x: 45, y: 25}] },
            { items: ['📚', '📚', '📚'], size: '2.5em', positions: [{x: 15, y: 55}, {x: 20, y: 57}, {x: 25, y: 56}] },
            { items: ['📖', '📓', '📕'], size: '2.2em', positions: [{x: 65, y: 62}, {x: 70, y: 64}, {x: 75, y: 63}] },
            { items: ['✏️', '✏️', '🖊️'], size: '2em', positions: [{x: 35, y: 68}, {x: 40, y: 70}, {x: 45, y: 69}] },
            { items: ['🎒', '🎒'], size: '2.8em', positions: [{x: 12, y: 72}, {x: 82, y: 75}] },
            { items: ['🖍️', '🖍️'], size: '1.8em', positions: [{x: 52, y: 72}, {x: 56, y: 73}] },
            { items: ['📐', '📏'], size: '2em', positions: [{x: 48, y: 65}, {x: 43, y: 67}] },
            { items: ['🧮'], size: '2.2em', positions: [{x: 62, y: 70}] },
            { items: ['🗺️'], size: '3em', positions: [{x: 22, y: 30}] },
            { items: ['⏰'], size: '2.5em', positions: [{x: 75, y: 35}] },
            { items: ['🎨'], size: '2.3em', positions: [{x: 85, y: 55}] },
            { items: ['⚽', '🏀'], size: '2.2em', positions: [{x: 28, y: 78}, {x: 35, y: 80}] },
            { items: ['🔬'], size: '2.4em', positions: [{x: 58, y: 58}] },
            { items: ['🧪'], size: '2em', positions: [{x: 52, y: 60}] },
            { items: ['🎭'], size: '2.3em', positions: [{x: 68, y: 45}] },
            { items: ['🎺'], size: '2.2em', positions: [{x: 32, y: 48}] },
            { items: ['🍎'], size: '2em', positions: [{x: 78, y: 68}] },
            { items: ['🚌'], size: '3em', positions: [{x: 15, y: 82}] }
        ]
    }
];

// functions
function setStatus(msg) {
  statusEl.textContent = msg;
}

function setPhase(msg) {
  phaseEl.innerHTML = msg;
}

function logEvent(type, data) {
  if (!liveSession) return;
  liveSession.events.push({
    t_ms: Math.round(performance.now()),
    type,
    ...(data || {}),
  });
}

function updateHUD() {
  roundEl.textContent = gameState.round || "—";
  itemsEl.textContent = gameState.difficulty;
  scoreEl.textContent = gameState.score;
  streakEl.textContent = gameState.streak;
}

function showFeedback(msg, type) {
  feedbackEl.textContent = msg;
  feedbackEl.className = "feedback " + type;
}

function computeMetrics(sess) {
  if (!sess) return null;

  const rounds = sess.rounds || [];
  let totalCorrect = 0, totalWrong = 0;
  let responseTimes = [];

  rounds.forEach(r => {
    if (r.result === "correct") {
      totalCorrect++;
      if (r.response_time_ms) responseTimes.push(r.response_time_ms);
    } else {
      totalWrong++;
    }
  });

  const avg = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  const median = (arr) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = (s.length / 2) | 0;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  return {
    total_rounds: rounds.length,
    correct: totalCorrect,
    incorrect: totalWrong,
    accuracy: rounds.length ? Number((totalCorrect / rounds.length).toFixed(3)) : 0,
    avg_response_time_ms: avg,
    median_response_time_ms: median(responseTimes),
    final_score: sess.final_score,
    max_streak: sess.max_streak,
    final_difficulty: sess.final_difficulty
  };
}

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

function exportReport() {
  if (!session) {
    setStatus("No finished run yet — finish a game first.");
    return;
  }

  const base = `whats_missing_report_${session.timestamp_iso.replace(/[:.]/g, "-")}`;
  downloadText(`${base}.json`, JSON.stringify(session, null, 2), "application/json");

  if (session.metrics) {
    const m = session.metrics;
    const s = session.settings;
    const header = [
      "timestamp_iso", "total_rounds", "memorize_seconds",
      "rounds_played", "correct", "incorrect", "accuracy",
      "avg_response_time_ms", "median_response_time_ms",
      "final_score", "max_streak", "final_difficulty"
    ];
    const row = [
      session.timestamp_iso, s.total_rounds, s.memorize_seconds,
      m.total_rounds, m.correct, m.incorrect, m.accuracy,
      m.avg_response_time_ms, m.median_response_time_ms,
      m.final_score, m.max_streak, m.final_difficulty
    ];
    downloadText(`${base}.csv`, header.join(",") + "\n" + row.join(",") + "\n", "text/csv");
  }
}

// scene funcs
function generateScene() {
  const template = sceneTemplates[Math.floor(Math.random() * sceneTemplates.length)];

  // flatten items from layers then shuffle
  let allItems = [];
  let id = 0;
  template.layers.forEach(layer => {
    layer.items.forEach((item, idx) => {
      allItems.push({ emoji: item, x: layer.positions[idx].x, y: layer.positions[idx].y, size: layer.size, id: id++ });
    });
  });

  allItems.sort(() => Math.random() - 0.5);
  gameState.currentScene = allItems.slice(0, gameState.difficulty);

  scene.style.background = template.background;

  // log scene for current round
  if (liveSession && liveSession.rounds.length > 0) {
    const cur = liveSession.rounds[liveSession.rounds.length - 1];
    cur.scene_name = template.name;
    cur.items_shown = gameState.currentScene.map(i => ({ emoji: i.emoji, x: Math.round(i.x), y: Math.round(i.y) }));
  }

  renderScene(gameState.currentScene, false);
}

function renderScene(items, clickable) {
  scene.innerHTML = "";
  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "scene-item" + (clickable ? " clickable" : "");
    el.textContent = item.emoji;
    el.style.left = item.x + "%";
    el.style.top = item.y + "%";
    el.style.fontSize = item.size;
    el.dataset.id = item.id;
    if (clickable) el.addEventListener("click", (e) => onItemClick(item.id, e));
    scene.appendChild(el);
  });
}

//game flow
function startGame() {
  resetGame(false);

  const maxRounds = Number(totalRoundsEl.value);
  const memorizeSeconds = Math.max(3, Math.min(15, Number(memorizeSecondsEl.value || 8)));

  gameState.maxRounds = maxRounds;
  gameState.memorizeTime = memorizeSeconds;

  liveSession = {
    game: "whats_missing",
    timestamp_iso: new Date().toISOString(),
    settings: { total_rounds: maxRounds, memorize_seconds: memorizeSeconds, starting_difficulty: 6 },
    rounds: [],
    events: [],
    metrics: null,
    final_score: 0,
    max_streak: 0,
    final_difficulty: 6
  };

  if (exportBtn) exportBtn.disabled = true;
  if (endGameBtn) endGameBtn.disabled = false;

  logEvent("game_start");
  nextRound();
}

function nextRound() {
  if (gameState.round >= gameState.maxRounds) {
    finishGame();
    return;
  }

  gameState.round++;
  state = "memorizing";
  updateHUD();
  feedbackEl.textContent = "";

  // add round entry to session
  if (liveSession) {
    liveSession.rounds.push({
      round_number: gameState.round,
      difficulty: gameState.difficulty,
      scene_name: null,
      items_shown: [],
      removed_item: null,
      result: null,
      response_time_ms: null
    });
  }

  generateScene();

  let timeLeft = gameState.memorizeTime;
  setPhase(`Memorize the scene… (${timeLeft}s)`);
  setStatus(`Round ${gameState.round} of ${gameState.maxRounds}`);
  logEvent("memorize_start", { round: gameState.round, num_items: gameState.difficulty });

  countdownTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      setPhase(`Memorize the scene… (${timeLeft}s)`);
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startBlackScreen();
    }
  }, 1000);
}

function startBlackScreen() {
  state = "blackscreen";
  logEvent("black_screen");

  const bs = document.createElement("div");
  bs.className = "black-screen";
  bs.textContent = "Get ready…";
  scene.appendChild(bs);
  setPhase("");

  setTimeout(() => {
    bs.remove();
    startRecallPhase();
  }, 1500);
}

function startRecallPhase() {
  state = "active";

  // pick item to remove
  const idx = Math.floor(Math.random() * gameState.currentScene.length);
  gameState.removedItem = gameState.currentScene[idx];

  const remaining = gameState.currentScene.filter((_, i) => i !== idx);

  // log
  if (liveSession && liveSession.rounds.length > 0) {
    const cur = liveSession.rounds[liveSession.rounds.length - 1];
    cur.removed_item = { emoji: gameState.removedItem.emoji, x: Math.round(gameState.removedItem.x), y: Math.round(gameState.removedItem.y) };
  }

  logEvent("recall_start", { round: gameState.round, removed: gameState.removedItem.emoji });

  t0 = performance.now();
  setPhase("What's missing? Click it.");
  setStatus("Click the item that disappeared…");
  renderScene(remaining, true);

  // catch clicks on empty space (in case item was near edge)
  scene.onclick = (e) => {
    if (e.target !== scene || state !== "active") return;
    const rect = scene.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;
    const dist = Math.hypot(cx - gameState.removedItem.x, cy - gameState.removedItem.y);
    if (dist < 12) checkAnswer(gameState.removedItem.id, e);
  };
}

function onItemClick(id, event) {
  if (state !== "active") return;
  checkAnswer(id, event);
}

function checkAnswer(selectedId, event) {
  if (state !== "active") return;

  state = "feedback";
  scene.onclick = null;

  const responseTime = t0 ? performance.now() - t0 : null;
  const isCorrect = selectedId === gameState.removedItem.id;

  // log click coords
  if (event) {
    const rect = scene.getBoundingClientRect();
    logEvent("click", {
      x: event.clientX ? Math.round(event.clientX - rect.left) : null,
      y: event.clientY ? Math.round(event.clientY - rect.top) : null,
      clicked_item: selectedId,
      expected_item: gameState.removedItem.id,
      result: isCorrect ? "correct" : "wrong"
    });
  }

  // update round record
  if (liveSession && liveSession.rounds.length > 0) {
    const cur = liveSession.rounds[liveSession.rounds.length - 1];
    cur.result = isCorrect ? "correct" : "wrong";
    cur.response_time_ms = responseTime ? Math.round(responseTime) : null;
  }

  // show full scene with removed item highlighted
  renderScene(gameState.currentScene, false);
  const removedEl = document.querySelector(`[data-id="${gameState.removedItem.id}"]`);
  if (removedEl) {
    removedEl.style.filter = "drop-shadow(0 0 18px gold) brightness(1.3)";
    removedEl.style.transform = "scale(1.35)";
    removedEl.style.zIndex = "20";
  }

  if (isCorrect) {
    const points = 15 + (gameState.streak * 5);
    gameState.score += points;
    gameState.streak++;
    gameState.difficulty += 2;
    logEvent("round_result", { result: "correct", points, new_difficulty: gameState.difficulty, streak: gameState.streak });
    showFeedback(`✓ Correct! +${points} pts`, "correct");
    setStatus(`Score: ${gameState.score} • Difficulty up`);
  } else {
    gameState.streak = 0;
    gameState.difficulty = Math.max(6, gameState.difficulty - 2);
    logEvent("round_result", { result: "wrong", new_difficulty: gameState.difficulty });
    showFeedback(`✗ It was ${gameState.removedItem.emoji}`, "incorrect");
    setStatus(`Score: ${gameState.score} • Difficulty down`);
  }

  updateHUD();

  // show next round button instead of auto-advancing
  const isLast = gameState.round >= gameState.maxRounds;
  setPhase(`<button onclick="window.nextRound()" style="
    padding:10px 18px; border-radius:12px; border:1px solid rgba(11,27,51,0.18);
    background:#2f6fed; color:white; font-weight:700; cursor:pointer; font-size:14px;
  ">${isLast ? "See Results" : "Next Round →"}</button>`);
}

function finishGame() {
  state = "done";

  logEvent("game_done", { final_score: gameState.score, final_difficulty: gameState.difficulty });

  if (liveSession) {
    liveSession.final_score = gameState.score;
    liveSession.max_streak = Math.max(...liveSession.rounds.map(r => r.streak || 0), gameState.streak);
    liveSession.final_difficulty = gameState.difficulty;
    liveSession.metrics = computeMetrics(liveSession);
    session = liveSession;
    liveSession = null;

    saveGameSession("whats_missing", session);
  }

  const acc = session?.metrics?.accuracy != null
    ? ` • Acc: ${(session.metrics.accuracy * 100).toFixed(1)}%` : "";

  setPhase("Game complete!");
  setStatus(`Final score: ${gameState.score}${acc}`);

  scene.style.background = "#eef4ff";
  scene.innerHTML = `
    <div style="display:grid;place-items:center;height:100%;text-align:center;gap:8px;">
      <div style="font-size:48px;">🎉</div>
      <div style="font-size:36px;font-weight:800;color:#2a9d8f;">${gameState.score}</div>
      <div style="font-size:13px;color:#5a6a85;">Final Score${acc}</div>
    </div>`;

  if (exportBtn) exportBtn.disabled = false;
  if (endGameBtn) endGameBtn.disabled = true;

  console.log("SESSION_RESULT", session);
}

function endGame() {
  if (state === "idle" || state === "done") return;

  // cancel running timers
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (nextRoundTimer) { clearTimeout(nextRoundTimer); nextRoundTimer = null; }

  logEvent("game_ended_early", { rounds_completed: gameState.round, score: gameState.score });
  finishGame();
}

function resetGame(resetSettings = true) {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (nextRoundTimer) { clearTimeout(nextRoundTimer); nextRoundTimer = null; }

  state = "idle";
  gameState = {
    round: 0, score: 0, streak: 0,
    maxRounds: Number(totalRoundsEl.value) || 10,
    memorizeTime: Number(memorizeSecondsEl.value) || 8,
    currentScene: [], removedItem: null, difficulty: 6
  };

  t0 = null;
  liveSession = null;

  scene.innerHTML = "";
  scene.style.background = "#eef4ff";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  updateHUD();
  setPhase("Choose settings, then press Start.");
  setStatus("Difficulty adapts — gets harder when you're right, easier when you're wrong.");

  if (exportBtn) exportBtn.disabled = true;
  if (endGameBtn) endGameBtn.disabled = true;

  if (resetSettings) {
    totalRoundsEl.value = "10";
    memorizeSecondsEl.value = "8";
  }
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => resetGame(false));
if (endGameBtn) endGameBtn.addEventListener("click", endGame);
if (exportBtn) exportBtn.addEventListener("click", exportReport);

window.nextRound = nextRound;

// init
resetGame(true);
