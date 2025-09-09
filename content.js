// ===============================
// FlowMate content script (clean)
// ===============================

console.log('FlowMate UPDATED')

// ---------- Frame / surface detection ----------
const FM_URL = new URL(location.href);
const FM_HOST = FM_URL.host;

const IS_SF =
  FM_HOST.endsWith(".lightning.force.com") ||
  FM_HOST.endsWith(".my.salesforce.com");

const IS_FIVE9 =
  FM_HOST === "app.five9.com" || window.name === "sfdcSoftphone";

// ---------- Debug bootstrap ----------
const FM = {
  tag: (() => {
    const frame = window.top === window ? "TOP" : "IFRAME";
    return `[FlowMate ${frame} @ ${FM_HOST}${FM_URL.pathname}]`;
  })(),
  log: (...a) => console.log(...[FM.tag, ...a]),
  warn: (...a) => console.warn(...[FM.tag, ...a]),
  err:  (...a) => console.error(...[FM.tag, ...a]),
};

FM.log("content.js loaded", {
  href: location.href,
  frameName: window.name || null,
  ready: document.readyState,
  IS_SF,
  IS_FIVE9,
});

FM.log("detect", { IS_SF, IS_FIVE9, host: FM_HOST, name: window.name || null });


// ---------- Config/state ----------
const IDS = {
  CLEANUP: "cleanup-controls", // Tabs/Toasts panel
  ASM: "asm-controls",         // ASM panel
};

let cfg = {
  tabLooper:   false,
  toastLooper: false,
  tabLimit:    10,
  asmDelay:    3,
  asmVolume:   0.5,
  fontSize:    14,
  widgetWidth: 160,
};

const qsAll = (sel) => Array.from(document.querySelectorAll(sel));
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function svgDragDots() {
  return `
  <svg width="18" height="18" viewBox="0 0 100 100" fill="#555" aria-hidden="true">
    <circle cx="20" cy="20" r="10"/><circle cx="60" cy="20" r="10"/>
    <circle cx="20" cy="60" r="10"/><circle cx="60" cy="60" r="10"/>
  </svg>`;
}
function svgSnap() {
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#555" aria-hidden="true">
    <path d="M12 2L15 8H9L12 2ZM12 22L9 16H15L12 22ZM2 12L8 15V9L2 12ZM22 12L16 9V15L22 12Z"/>
  </svg>`;
}
function svgTrash() {
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#555" aria-hidden="true">
    <path d="M3 6H21V8H19V21H5V8H3V6ZM8 11H10V19H8V11ZM14 11H16V19H14V11ZM9 4H15V6H9V4Z"/>
  </svg>`;
}
function iconBtnSVG(svg, title, onclick) {
  const b = document.createElement("button");
  b.innerHTML = svg;
  Object.assign(b.style, {
    border: "none", background: "none", color: "#555",
    cursor: "pointer", padding: "0 6px", lineHeight: 0
  });
  b.title = title; b.onclick = onclick; return b;
}


// Looper timers
let tabLoop   = null;
let toastLoop = null;

// ASM timers/state
let asmLoopActive = false;
let asmLoopInterval = null;
let asmCountdown = null;
let asmReadyForNext = true;

// ---------- Bootstrap which widgets to show ----------
initPerSurface();
const reinitObserver = new MutationObserver(() => {
  FM.log("Mutation observed → reinit check…");
  if (IS_SF) {
    ensure(IDS.CLEANUP) || buildCleanupPanel();
  }
  if (IS_FIVE9) {
    ensure(IDS.ASM)     || buildASMPanel();
  }
});
reinitObserver.observe(document.documentElement, { childList: true, subtree: true });

function initPerSurface() {
  if (IS_SF) {
    FM.log("Surface: Salesforce → load Cleanup + ASM");
    buildCleanupPanel();
  } else if (IS_FIVE9) {
    FM.log("Surface: Five9 → load ASM only");
    buildASMPanel();
  } else {
    FM.log("Surface: unknown → no panels");
  }
}

function ensure(id) {
  return document.getElementById(id);
}

// =====================
// Cleanup Panel (Tabs & Toasts)
// =====================
function buildCleanupPanel() {
  FM.log("buildCleanupPanel(): injecting UI…");
  if (ensure(IDS.CLEANUP)) return;

  const panel = document.createElement("div");
  panel.id = IDS.CLEANUP;
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999",
    background: "rgba(255,255,255,0.3)",
    color: "#fff",
    padding: "10px",
    borderRadius: "8px",
    fontFamily: "sans-serif",
    fontSize: cfg.fontSize + "px",
    width: cfg.widgetWidth + "px",
    userSelect: "none",
    opacity: "0.05",
  });

  // --- Dragging
  let isDragging = false, offsetX = 0, offsetY = 0;
  const dragHandle = document.createElement("div");
  dragHandle.innerHTML = svgDragDots();

  Object.assign(dragHandle.style, { cursor: "move", paddingTop: "4px", marginRight: "auto" });
  dragHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    const r = panel.getBoundingClientRect();
    offsetX = e.clientX - r.left;
    offsetY = e.clientY - r.top;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.top  = `${e.clientY - offsetY}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });
  document.addEventListener("mouseup", () => { isDragging = false; });

  // --- Top bar
  const resetBtn = iconBtnSVG(svgSnap(), "Snap", () => {
  Object.assign(panel.style, { bottom: "200px", left: "300px", top: "auto", right: "auto" });
});
const trashBtn = iconBtnSVG(svgTrash(), "Remove panel", () => { stopAsmLoop(); panel.remove(); });

  const topBar = document.createElement("div");
  topBar.style.display = "flex";
  topBar.style.justifyContent = "space-between";
  topBar.style.alignItems = "center";
  topBar.style.marginBottom = "8px";
  const icons = document.createElement("div");
  icons.append(resetBtn, trashBtn);
  topBar.append(dragHandle, icons);

  // --- Buttons
  const killTabsBtn = fullBtn("Close Extra Tabs", "#0070d2", async () => {
  FM.log("Kill tabs: closing beyond limit", cfg.tabLimit);
  const tabs = qsAll("ul.tabBarItems li.oneConsoleTabItem div.close");
  for (let i = cfg.tabLimit; i < tabs.length; i++) {
    const button = tabs[i]?.querySelector(".slds-button_icon-x-small");
    if (button) {
      button.click();
      await delay(250);
    }
  }
});


  const tabLoopBtn = toggleBtn(
    () => (tabLoop ? "Stop Tab Auto-Close" : "Start Tab Auto-Close"),
    () => (tabLoop ? "#c0392b" : "#1a7f5a"),
    () => (tabLoop ? stopTabLoop() : startTabLoop())
  );

  const killToastsBtn = fullBtn("Dismiss Toasts (5s)", "#555", () => {
    FM.log("Dismiss toasts burst");
    const intv = setInterval(() => {
      qsAll(".slds-notify__close .toastClose").forEach((btn) => btn.click());
    }, 500);
    setTimeout(() => clearInterval(intv), 5000);
  });

  const toastLoopBtn = toggleBtn(
    () => (toastLoop ? "Stop Toast Auto-Close" : "Start Toast Auto-Close"),
    () => (toastLoop ? "#c0392b" : "#1a7f5a"),
    () => (toastLoop ? stopToastLoop() : startToastLoop())
  );

  panel.append(topBar, killTabsBtn, tabLoopBtn, killToastsBtn, toastLoopBtn);
  panel.addEventListener("mouseenter", () => (panel.style.opacity = "1"));
  panel.addEventListener("mouseleave", () => (panel.style.opacity = "0.05"));
  document.body.appendChild(panel);

  // -- helpers for panel UI
  function iconBtn(text, title, onclick) {
    const b = document.createElement("button");
    Object.assign(b.style, { border: "none", background: "none", color: "#555", cursor: "pointer", padding: "0 6px" });
    b.textContent = text; b.title = title; b.onclick = onclick; return b;
  }
  function fullBtn(label, bg, onclick) {
  const b = document.createElement("button");
  Object.assign(b.style, {
    margin: "4px 0", width: "100%", padding: "6px",
    border: "none", borderRadius: "4px",
    background: bg, color: "#fff", cursor: "pointer",
    textAlign: "center",
    font: "inherit"   // ✅ inherit panel font
  });
  b.textContent = label; b.onclick = onclick; return b;
}

  function toggleBtn(labelFn, bgFn, handler) {
    const b = fullBtn("", "#1a7f5a", () => { handler(); sync(); });
    function sync() { b.textContent = labelFn(); b.style.background = bgFn(); }
    sync(); return b;
  }
}

// ---- Tab/Toast loops (single implementation) ----
function startTabLoop() {
  if (tabLoop) return;
  FM.log("startTabLoop()");
  tabLoop = setInterval(() => {
    const tabs = qsAll("ul.tabBarItems li.oneConsoleTabItem div.close");
    for (let i = cfg.tabLimit; i < tabs.length; i++) {
      const button = tabs[i]?.querySelector(".slds-button_icon-x-small");
      if (button) button.click();
    }
  }, 1000);
}

function stopTabLoop() {
  FM.log("stopTabLoop()");
  clearInterval(tabLoop);
  tabLoop = null;
}
function startToastLoop() {
  if (toastLoop) return;
  FM.log("startToastLoop()");
  toastLoop = setInterval(() => {
    qsAll(".slds-notify__close .toastClose").forEach((btn) => btn.click());
  }, 1000);
}
function stopToastLoop() {
  FM.log("stopToastLoop()");
  clearInterval(toastLoop);
  toastLoop = null;
}

// =====================
// ASM Panel
// =====================
function buildASMPanel() {
  if (!IS_FIVE9) { FM.log("buildASMPanel() skipped: not Five9"); return; } // ✅ guard
  FM.log("buildASMPanel(): injecting UI…");
  if (ensure(IDS.ASM)) return;

  const panel = document.createElement("div");
  panel.id = IDS.ASM;
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "200px",
    left: "300px",
    zIndex: "9999999",
    background: "rgba(255,255,255,0.3)",
    color: "#fff",
    padding: "10px",
    borderRadius: "8px",
    fontFamily: "sans-serif",
    fontSize: cfg.fontSize + "px",
    width: cfg.widgetWidth + "px",
    userSelect: "none",
    opacity: "0.05",
  });

  // --- Dragging
  let isDragging = false, offsetX = 0, offsetY = 0;
  const dragHandle = document.createElement("div");
  dragHandle.innerHTML =svgDragDots();
  Object.assign(dragHandle.style, { cursor: "move", paddingTop: "4px", marginRight: "auto" });
  dragHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    const r = panel.getBoundingClientRect();
    offsetX = e.clientX - r.left; offsetY = e.clientY - r.top;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.top  = `${e.clientY - offsetY}px`;
    panel.style.right = "auto"; panel.style.bottom = "auto";
  });
  document.addEventListener("mouseup", () => { isDragging = false; });

  // --- Top bar
  const resetBtn = iconBtnSVG(svgSnap(), "Snap to bottom-right", () => {
  Object.assign(panel.style, { bottom: "20px", right: "20px", top: "auto", left: "auto" });
});
const trashBtn = iconBtnSVG(svgTrash(), "Remove panel", () => {
  stopTabLoop();
  stopToastLoop();
  panel.remove();
});


  const topBar = document.createElement("div");
  Object.assign(topBar.style, { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" });
  const iconGroup = document.createElement("div");
  iconGroup.append(resetBtn, trashBtn);
  topBar.append(dragHandle, iconGroup);

  // --- Buttons
  const nextCallBtn = fullBtn("ASM Next Call", "#0070d2", onAsmNextCall);
  const loopBtn     = fullBtn("START LOOP", "#1a7f5a", () => (asmLoopActive ? stopAsmLoop() : startAsmLoop(loopBtn)));

  // Inputs (Delay, Volume)
  const row = document.createElement("div");
  Object.assign(row.style, { display: "flex", gap: "4px", marginTop: "4px", width: "100%" });

  const delayInput = mkInputNumber(cfg.asmDelay, { min: 0 }, (v) => (cfg.asmDelay = Math.max(0, v)));
  delayInput.title = "Delay (seconds)";
  const volumeInput = mkInputNumber(cfg.asmVolume, { min: 0, max: 1, step: 0.1 }, (v) => (cfg.asmVolume = Math.min(1, Math.max(0, v))));
  volumeInput.title = "Volume (0.0–1.0)";
  row.append(delayInput, volumeInput);

  // Assemble
  panel.append(topBar, nextCallBtn, loopBtn);
  panel.addEventListener("mouseenter", () => { panel.style.opacity = "1"; stopAsmLoop(); });
  panel.addEventListener("mouseleave", () => (panel.style.opacity = "0.05"));
  document.body.appendChild(panel);

  // --- ASM behaviors
  function onAsmNextCall() {
    clearInterval(asmCountdown);
    asmCountdown = null;
    if (nextCallBtn.disabled) return;
    nextCallBtn.disabled = true;
    nextCallBtn.textContent = "Working...";
    (async () => {
      try {
        // Click path (update selectors to your exact environment if needed)
        await retryClick("#call_endInteractionBtn", 5, 250);
        asmReadyForNext = false;
        naturalClick('label[for="disp_id_42"]');
        naturalClick("#setDisposition_call");
        for (let i = 0; i < 15; i++) { naturalClick("#sfli-cancel-preview-renew"); await delay(250); }
        asmReadyForNext = true;
      } catch (e) {
        FM.err("ASM error:", e);
      } finally {
        nextCallBtn.disabled = false;
        nextCallBtn.textContent = "ASM Next Call";
      }
    })();
  }

  function startAsmLoop(loopBtnEl) {
    asmLoopActive = true;
    loopBtnEl.textContent = "STOP LOOP";
    loopBtnEl.style.background = "#c0392b";
    FM.log("ASM loop started");
    asmLoopInterval = setInterval(async () => {
      const stateEl = document.querySelector("#sfli-call-header .f9-nowrap-ellipsis span:nth-child(2)");
      const stateText = stateEl?.textContent?.trim();
      const timeEl = document.querySelector("#time-counter .stopwatch-partial");
      const timeText = timeEl?.textContent?.trim();
      let dialingSeconds = 0;
      if (timeText) {
        const parts = timeText.split(":").map(Number);
        dialingSeconds = parts.length === 3 ? parts[2] : (parts[1] || 0);
      }
      const callTypeEl = document.querySelector("#sfli-call-header .f9-nowrap-ellipsis span:first-child");
      const callTypeText = callTypeEl?.textContent?.trim();

      const shouldCountdown =
        ((stateText === ": Live Call") ||
         (stateText === ": Dialing" && dialingSeconds >= 35)) &&
        !asmCountdown &&
        callTypeText !== "Inbound Call" &&
        asmReadyForNext === true;

      if (shouldCountdown) {
        let seconds = cfg.asmDelay;
        beep(1600, 150, "triangle"); // initial high beep
        asmCountdown = setInterval(() => {
          if (seconds <= 0) {
            beep(400, 300); // low beep
            clearInterval(asmCountdown);
            asmCountdown = null;
            nextCallBtn.click(); // triggers the 1-click sequence
          } else {
            beep(800, 150); // mid beep every tick
          }
          seconds--;
        }, 1000);
      }
    }, 10);
  }

  function stopAsmLoop() {
    if (!asmLoopActive) return;
    asmLoopActive = false;
    clearInterval(asmLoopInterval);
    asmLoopInterval = null;
    clearInterval(asmCountdown);
    asmCountdown = null;
    const btn = panel.querySelector("button:nth-of-type(2)"); // loopBtn
    if (btn) { btn.textContent = "START LOOP"; btn.style.background = "#1a7f5a"; }
    FM.log("ASM loop stopped");
  }

  function beep(freq = 800, duration = 150, type = "sine") {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(cfg.asmVolume, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000);
  }

  function naturalClick(selector) {
    const el = document.querySelector(selector);
    FM.log("naturalClick", selector, "→", !!el);
    if (!el) return false;
    if (el.disabled || el.getAttribute?.("aria-disabled") === "true") return false;
    el.focus?.();
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mousedown",    { bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointerup",  { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup",      { bubbles: true }));
    el.click?.();
    return true;
  }

  async function retryClick(selector, tries, waitMs) {
    for (let i = 0; i < tries; i++) {
      if (naturalClick(selector)) return true;
      await delay(waitMs);
    }
    return false;
  }

  // UI helpers
  function iconBtn(text, title, onclick) {
    const b = document.createElement("button");
    Object.assign(b.style, { border: "none", background: "none", color: "#555", cursor: "pointer", padding: "0 6px" });
    b.textContent = text; b.title = title; b.onclick = onclick; return b;
  }
  function fullBtn(label, bg, onclick) {
  const b = document.createElement("button");
  Object.assign(b.style, {
    margin: "4px 0", width: "100%", padding: "6px",
    border: "none", borderRadius: "4px", background: bg, color: "#fff",
    cursor: "pointer",
    // inherit font from panel (so applySettings works)
    font: "inherit"
  });
  b.textContent = label; b.onclick = onclick; return b;
}

  function mkInputNumber(value, attrs, onChange) {
    const i = document.createElement("input");
    i.type = "number";
    Object.assign(i, { value: String(value), ...attrs });
    Object.assign(i.style, {
      flex: "1",
      padding: "6px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      fontSize: "12px",
      background: "#f5f5f5",
      textAlign: "center",
      color: "black",
      minWidth: "0",
    });
    i.onchange = () => onChange(Number(i.value));
    return i;
  }
}

// =====================
// Settings + messaging
// =====================
function applySettings(newCfg) {
  cfg = { ...cfg, ...newCfg };
  FM.log("applySettings", cfg);

  const cleanup = ensure(IDS.CLEANUP);
  if (cleanup) { cleanup.style.fontSize = cfg.fontSize + "px"; cleanup.style.width = cfg.widgetWidth + "px"; }

  const asm = ensure(IDS.ASM);
  if (asm) { asm.style.fontSize = cfg.fontSize + "px"; asm.style.width = cfg.widgetWidth + "px"; }

  if (cfg.tabLooper && !tabLoop) startTabLoop();
  if (!cfg.tabLooper && tabLoop) stopTabLoop();
  if (cfg.toastLooper && !toastLoop) startToastLoop();
  if (!cfg.toastLooper && toastLoop) stopToastLoop();
}


// Bootstrap
chrome.storage.sync.get(null, (stored) => {
  applySettings(stored || {});
  // If surface init didn’t run a panel for some reason, ensure:
  if (IS_SF) {
    ensure(IDS.CLEANUP) || buildCleanupPanel();
  } else if (IS_FIVE9) {
    ensure(IDS.ASM)     || buildASMPanel();
  }
  if (cfg.tabLooper) startTabLoop();
  if (cfg.toastLooper) startToastLoop();
});

// Listen to popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "APPLY_SETTINGS") applySettings(msg.payload || {});
  if (msg?.type === "RESET_WIDGETS") {
    stopTabLoop();
    stopToastLoop();
    ensure(IDS.CLEANUP)?.remove();
    ensure(IDS.ASM)?.remove();
  }
});
