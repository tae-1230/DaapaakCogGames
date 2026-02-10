// Visual Reaction Time Test
// Tests simple reaction time to visual stimuli
// Exports detailed report (json + csv)

const board = document.getElementById("board");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");

const numTrialsEl = document.getElementById("numTrials");
const stimulusTypeEl = document.getElementById("stimulusType");
const delayRangeEl = document.getElementById("delayRange");

const trialEl = document.getElementById("trial");
const avgRTEl = document.getElementById("avgRT");
const statusEl = document.getElementById("status");
const instructionText = document.getElementById("instructionText");
const stimulus = document.getElementById("stimulus");

// Results Modal
const resultsModal = document.getElementById("resultsModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const exportFromModalBtn = document.getElementById("exportFromModalBtn");

// ----- state -----
let state = "idle"; // idle | waiting | ready | responding | done
let currentTrial = 0;
let totalTrials = 0;
let stimulusShownAt = null;
let trialStartTimeout = null;

// report/session stuff
let session = null;
let liveSession = null;

// ----- helpers -----
function setStatus(msg) {
  statusEl.textContent = msg;
}

function setInstruction(msg) {
  instructionText.textContent = msg;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr) {
  if (!arr.length) return null;
  const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
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
  trialEl.textContent = `${currentTrial}/${totalTrials}`;
  
  // Calculate average RT from completed valid trials
  const validTrials = liveSession?.trials.filter(t => t.rt_ms !== null && t.rt_ms > 0) || [];
  if (validTrials.length > 0) {
    const avg = validTrials.reduce((sum, t) => sum + t.rt_ms, 0) / validTrials.length;
    avgRTEl.textContent = `${Math.round(avg)}ms`;
  } else {
    avgRTEl.textContent = "—";
  }
}

function computeMetrics(sess) {
  if (!sess || !sess.trials) return null;

  const validTrials = sess.trials.filter(t => t.rt_ms !== null && t.rt_ms > 0);
  const earlyClicks = sess.trials.filter(t => t.early_click).length;

  if (validTrials.length === 0) {
    return {
      mean_rt_ms: null,
      median_rt_ms: null,
      fastest_rt_ms: null,
      slowest_rt_ms: null,
      std_dev_ms: null,
      early_clicks: earlyClicks,
      valid_trials: 0,
      total_trials: sess.trials.length,
    };
  }

  const rts = validTrials.map(t => t.rt_ms);
  const mean = rts.reduce((sum, v) => sum + v, 0) / rts.length;

  return {
    mean_rt_ms: Math.round(mean),
    median_rt_ms: Math.round(median(rts)),
    fastest_rt_ms: Math.round(Math.min(...rts)),
    slowest_rt_ms: Math.round(Math.max(...rts)),
    std_dev_ms: Math.round(stdDev(rts)),
    early_clicks: earlyClicks,
    valid_trials: validTrials.length,
    total_trials: sess.trials.length,
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
    setStatus("No finished test yet — complete a test first.");
    return;
  }

  const base = `reaction_time_${session.timestamp_iso.replace(/[:.]/g, "-")}`;
  
  // JSON export
  downloadText(`${base}.json`, JSON.stringify(session, null, 2), "application/json");

  // CSV export
  if (session.trials && session.trials.length > 0) {
    const header = ["trial_number", "delay_ms", "rt_ms", "early_click", "stimulus_type"];
    const rows = session.trials.map(t => [
      t.trial_number,
      t.delay_ms,
      t.rt_ms !== null ? t.rt_ms : "N/A",
      t.early_click ? "TRUE" : "FALSE",
      session.settings.stimulus_type,
    ]);

    let csv = header.join(",") + "\n";
    csv += rows.map(r => r.join(",")).join("\n") + "\n";

    // Add summary row
    if (session.metrics) {
      csv += "\n";
      csv += "Summary Metrics\n";
      csv += `mean_rt_ms,${session.metrics.mean_rt_ms || "N/A"}\n`;
      csv += `median_rt_ms,${session.metrics.median_rt_ms || "N/A"}\n`;
      csv += `fastest_rt_ms,${session.metrics.fastest_rt_ms || "N/A"}\n`;
      csv += `slowest_rt_ms,${session.metrics.slowest_rt_ms || "N/A"}\n`;
      csv += `std_dev_ms,${session.metrics.std_dev_ms || "N/A"}\n`;
      csv += `early_clicks,${session.metrics.early_clicks}\n`;
      csv += `valid_trials,${session.metrics.valid_trials}\n`;
      csv += `total_trials,${session.metrics.total_trials}\n`;
    }

    downloadText(`${base}.csv`, csv, "text/csv");
  }

  setStatus("Report downloaded successfully!");
}

// ----- stimulus display -----
function showStimulus() {
  const stimType = stimulusTypeEl.value;
  
  stimulus.className = "stimulus " + stimType;
  
  if (stimType === "word") {
    stimulus.textContent = "CLICK";
  } else {
    stimulus.textContent = "";
  }
  
  instructionText.classList.add("hidden");
  stimulus.classList.remove("hidden");
  
  board.classList.remove("waiting");
  board.classList.add("ready");
  
  stimulusShownAt = performance.now();
  state = "ready";
  
  logEvent("stimulus_shown", { trial: currentTrial });
}

function hideStimulus() {
  stimulus.classList.add("hidden");
  instructionText.classList.remove("hidden");
  board.classList.remove("ready", "waiting");
}

// ----- trial flow -----
function startTrial() {
  if (currentTrial >= totalTrials) {
    finishTest();
    return;
  }

  currentTrial++;
  updateHUD();

  // Parse delay range
  const range = delayRangeEl.value.split("-").map(Number);
  const delay = rand(range[0], range[1]);

  state = "waiting";
  setInstruction("Wait for the stimulus...");
  board.classList.add("waiting");
  hideStimulus();

  logEvent("trial_start", { trial: currentTrial, delay_ms: Math.round(delay) });

  // Record trial with delay
  liveSession.trials.push({
    trial_number: currentTrial,
    delay_ms: Math.round(delay),
    rt_ms: null,
    early_click: false,
  });

  // Show stimulus after delay
  trialStartTimeout = setTimeout(() => {
    showStimulus();
  }, delay);
}

function handleClick(ev) {
  if (state === "idle" || state === "done") return;

  if (state === "waiting") {
    // Early click - they clicked before stimulus appeared
    clearTimeout(trialStartTimeout);
    
    const currentTrialData = liveSession.trials[currentTrial - 1];
    currentTrialData.early_click = true;
    
    logEvent("early_click", { trial: currentTrial });
    
    setInstruction("Too early! Wait for the stimulus.");
    board.classList.remove("waiting");
    
    // Pause briefly then continue to next trial
    setTimeout(() => {
      startTrial();
    }, 1500);
    
  } else if (state === "ready") {
    // Valid response
    const rt = performance.now() - stimulusShownAt;
    
    const currentTrialData = liveSession.trials[currentTrial - 1];
    currentTrialData.rt_ms = Math.round(rt);
    
    logEvent("response", { trial: currentTrial, rt_ms: Math.round(rt) });
    
    hideStimulus();
    setInstruction(`${Math.round(rt)}ms - Get ready...`);
    
    updateHUD();
    
    // Pause briefly then continue
    setTimeout(() => {
      startTrial();
    }, 800);
  }
}

// ----- test flow -----
function startTest() {
  resetTest(false);

  totalTrials = Number(numTrialsEl.value);
  currentTrial = 0;

  // Create new session
  liveSession = {
    game: "visual_reaction_time",
    timestamp_iso: new Date().toISOString(),
    settings: {
      num_trials: totalTrials,
      stimulus_type: stimulusTypeEl.value,
      delay_range: delayRangeEl.value,
    },
    trials: [],
    events: [],
    metrics: null,
  };

  if (exportBtn) exportBtn.disabled = true;

  setStatus("Test in progress...");
  logEvent("test_start");
  
  updateHUD();
  startTrial();
}

function finishTest() {
  state = "done";
  
  logEvent("test_complete");
  
  // Compute metrics
  liveSession.metrics = computeMetrics(liveSession);
  session = liveSession;
  liveSession = null;

  hideStimulus();
  board.classList.remove("waiting", "ready");
  
  setInstruction("Test complete!");
  setStatus("Test complete! View your results or download the report.");

  if (exportBtn) exportBtn.disabled = false;

  console.log("SESSION_RESULT", session);
  
  // Show results modal
  showResultsModal();
}

function resetTest(resetSettings = true) {
  if (trialStartTimeout) clearTimeout(trialStartTimeout);
  trialStartTimeout = null;

  state = "idle";
  currentTrial = 0;
  totalTrials = 0;
  stimulusShownAt = null;

  hideStimulus();
  board.classList.remove("waiting", "ready");

  trialEl.textContent = "0/0";
  avgRTEl.textContent = "—";
  setInstruction("Click Start Test to begin");
  setStatus("Configure your settings and press Start Test.");

  if (exportBtn) exportBtn.disabled = true;

  if (resetSettings) {
    numTrialsEl.value = "10";
    stimulusTypeEl.value = "circle";
    delayRangeEl.value = "2000-4000";
  }

  liveSession = null;
  resultsModal.classList.add("hidden");
}

// ----- results modal -----
function showResultsModal() {
  if (!session || !session.metrics) return;

  const m = session.metrics;

  document.getElementById("resultMean").textContent = m.mean_rt_ms != null ? `${m.mean_rt_ms}ms` : "N/A";
  document.getElementById("resultMedian").textContent = m.median_rt_ms != null ? `${m.median_rt_ms}ms` : "N/A";
  document.getElementById("resultFastest").textContent = m.fastest_rt_ms != null ? `${m.fastest_rt_ms}ms` : "N/A";
  document.getElementById("resultSlowest").textContent = m.slowest_rt_ms != null ? `${m.slowest_rt_ms}ms` : "N/A";
  document.getElementById("resultStdDev").textContent = m.std_dev_ms != null ? `${m.std_dev_ms}ms` : "N/A";
  document.getElementById("resultEarly").textContent = String(m.early_clicks);

  // Build trials list
  const trialsList = document.getElementById("trialsList");
  let html = '<div class="trials-list-title">Individual Trials</div>';
  
  session.trials.forEach(trial => {
    let rtClass = "";
    let rtText = "";
    
    if (trial.early_click) {
      rtClass = "early";
      rtText = "Early";
    } else if (trial.rt_ms !== null) {
      if (trial.rt_ms < m.median_rt_ms) rtClass = "fast";
      else if (trial.rt_ms > m.median_rt_ms * 1.3) rtClass = "slow";
      rtText = `${trial.rt_ms}ms`;
    } else {
      rtText = "—";
    }
    
    html += `
      <div class="trial-row">
        <span class="trial-number">Trial ${trial.trial_number}</span>
        <span class="trial-rt ${rtClass}">${rtText}</span>
      </div>
    `;
  });
  
  trialsList.innerHTML = html;

  resultsModal.classList.remove("hidden");
}

// ----- event listeners -----
startBtn.addEventListener("click", startTest);
resetBtn.addEventListener("click", () => resetTest(false));
if (exportBtn) exportBtn.addEventListener("click", exportReport);
board.addEventListener("click", handleClick);

closeModalBtn.addEventListener("click", () => {
  resultsModal.classList.add("hidden");
});

exportFromModalBtn.addEventListener("click", () => {
  exportReport();
});

// ----- init -----
resetTest(true);