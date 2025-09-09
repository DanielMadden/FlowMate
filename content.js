// ---- Frame / surface detection ----
const url = new URL(location.href);
const host = url.host;

// Heuristics:
const isSalesforce =
  host.endsWith(".lightning.force.com") || host.endsWith(".my.salesforce.com");

const isFive9 = host === "app.five9.com" || window.name === "sfdcSoftphone";

// Optional: only attach specific widgets per surface
if (isSalesforce) {
  // Parent Salesforce console (tabs / toasts live here)
  tryInitTabToastWidget(); // your Tab/Toast Killer panel
  tryInitASMWidget(); // if you also want ASM here
}

if (isFive9) {
  // Five9 softphone iframe / popup (call state, ASM clicks live here)
  tryInitASMWidget(); // your ASM Next Call panel
  // You can skip Tab/Toast here if not needed
}

// ---- Defensive re-attach if SPA navigation swaps frames ----
const reinitOnDomChange = new MutationObserver(() => {
  if (isSalesforce) {
    ensureElement("kill-controls") || tryInitTabToastWidget();
    ensureElement("asm-controls") || tryInitASMWidget();
  }
  if (isFive9) {
    ensureElement("asm-controls") || tryInitASMWidget();
  }
});
reinitOnDomChange.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// ---- Helpers ----
function ensureElement(id) {
  return document.getElementById(id);
}

// Wire your existing builders:
function tryInitTabToastWidget() {
  if (!ensureElement("kill-controls")) {
    // call your buildControlPanel() from your existing code
    buildControlPanel();
  }
}

function tryInitASMWidget() {
  if (!ensureElement("asm-controls")) {
    // call your buildASMWidget() from your existing code
    buildASMWidget();
  }
}

// ---- CONFIG (synced from popup) ----
let cfg = {
  tabLooper: false,
  toastLooper: false,
  tabLimit: 10,
  asmDelay: 3,
  asmVolume: 0.5,
  fontSize: 14,
  widgetWidth: 160,
};

// ---- HELPERS ----
const qsAll = (sel) => Array.from(document.querySelectorAll(sel));
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ---- TAB/TOAST KILLER WIDGET ----
let tabLoop = null;
let toastLoop = null;

function buildKillPanel() {
  if (document.getElementById("kill-controls")) return;

  const panel = document.createElement("div");
  panel.id = "kill-controls";
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

  // Dragging
  let isDragging = false,
    offsetX = 0,
    offsetY = 0;
  const dragHandle = document.createElement("div");
  dragHandle.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 100 100" fill="#555">
      <circle cx="20" cy="20" r="10"/>
      <circle cx="60" cy="20" r="10"/>
      <circle cx="20" cy="60" r="10"/>
      <circle cx="60" cy="60" r="10"/>
    </svg>`;
  Object.assign(dragHandle.style, {
    cursor: "move",
    paddingTop: "4px",
    marginRight: "auto",
  });
  dragHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    const r = panel.getBoundingClientRect();
    offsetX = e.clientX - r.left;
    offsetY = e.clientY - r.top;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    }
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Top bar icons
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↘";
  Object.assign(resetBtn.style, {
    border: "none",
    background: "none",
    color: "#555",
    cursor: "pointer",
    padding: "0 6px",
  });
  resetBtn.title = "Snap to bottom-right";
  resetBtn.onclick = () =>
    Object.assign(panel.style, {
      bottom: "20px",
      right: "20px",
      top: "auto",
      left: "auto",
    });

  const trashBtn = document.createElement("button");
  trashBtn.textContent = "✕";
  Object.assign(trashBtn.style, {
    border: "none",
    background: "none",
    color: "#555",
    cursor: "pointer",
    padding: "0 6px",
  });
  trashBtn.title = "Remove panel";
  trashBtn.onclick = () => {
    stopTabLoop();
    stopToastLoop();
    panel.remove();
  };

  const topBar = document.createElement("div");
  topBar.style.display = "flex";
  topBar.style.justifyContent = "space-between";
  topBar.style.alignItems = "center";
  topBar.style.marginBottom = "8px";
  const icons = document.createElement("div");
  icons.append(resetBtn, trashBtn);
  topBar.append(dragHandle, icons);

  // Buttons
  const killTabsBtn = mkBtn("Kill Tabs", "#0070d2", async () => {
    const tabs = qsAll("ul.tabBarItems li.oneConsoleTabItem div.close");
    for (const item of tabs) {
      const button = item.querySelector(".slds-button_icon-x-small");
      if (button) {
        button.click();
        await delay(250);
      }
    }
  });

  const tabLoopBtn = mkToggleBtn(
    () => (tabLoop ? "Stop Tab Loop" : "Start Tab Loop"),
    () => (tabLoop ? "#c0392b" : "#1a7f5a"),
    () => (tabLoop ? stopTabLoop() : startTabLoop())
  );

  const killToastsBtn = mkBtn("Kill Toasts", "#555", () => {
    const intv = setInterval(() => {
      qsAll(".slds-notify__close .toastClose").forEach((btn) => btn.click());
    }, 500);
    setTimeout(() => clearInterval(intv), 5000);
  });

  const toastLoopBtn = mkToggleBtn(
    () => (toastLoop ? "Stop Toast Loop" : "Start Toast Loop"),
    () => (toastLoop ? "#c0392b" : "#1a7f5a"),
    () => (toastLoop ? stopToastLoop() : startToastLoop())
  );

  panel.append(topBar, killTabsBtn, tabLoopBtn, killToastsBtn, toastLoopBtn);
  panel.addEventListener("mouseenter", () => (panel.style.opacity = "1"));
  panel.addEventListener("mouseleave", () => (panel.style.opacity = "0.05"));
  document.body.appendChild(panel);

  function mkBtn(label, bg, onclick) {
    const b = document.createElement("button");
    Object.assign(b.style, {
      margin: "4px 0",
      width: "100%",
      padding: "6px",
      border: "none",
      borderRadius: "4px",
      background: bg,
      color: "#fff",
      cursor: "pointer",
    });
    b.textContent = label;
    b.onclick = onclick;
    return b;
  }
  function mkToggleBtn(labelFn, bgFn, handler) {
    const b = document.createElement("button");
    Object.assign(b.style, {
      margin: "4px 0",
      width: "100%",
      padding: "6px",
      border: "none",
      borderRadius: "4px",
      background: "#1a7f5a",
      color: "#fff",
      cursor: "pointer",
    });
    const sync = () => {
      b.textContent = labelFn();
      b.style.background = bgFn();
    };
    b.onclick = () => {
      handler();
      sync();
    };
    sync();
    return b;
  }
}

function startTabLoop() {
  if (tabLoop) return;
  tabLoop = setInterval(() => {
    const tabs = qsAll("ul.tabBarItems li.oneConsoleTabItem div.close");
    for (let i = cfg.tabLimit; i < tabs.length; i++) {
      const button = tabs[0]?.querySelector(".slds-button_icon-x-small");
      if (button) button.click();
    }
  }, 1000);
}
function stopTabLoop() {
  clearInterval(tabLoop);
  tabLoop = null;
}

function startToastLoop() {
  if (toastLoop) return;
  toastLoop = setInterval(() => {
    qsAll(".slds-notify__close .toastClose").forEach((btn) => btn.click());
  }, 1000);
}
function stopToastLoop() {
  clearInterval(toastLoop);
  toastLoop = null;
}

// ---- ASM NEXT CALL WIDGET ----
let loopActive = false;
let loopInterval = null;
let countdown = null;
let readyForNextCountdown = true;

function buildASMWidget() {
  if (document.getElementById("asm-controls")) return;

  const panel = document.createElement("div");
  panel.id = "asm-controls";
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

  // Dragging
  let isDragging = false,
    offsetX = 0,
    offsetY = 0;
  const dragHandle = document.createElement("div");
  dragHandle.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 100 100" fill="#555">
      <circle cx="20" cy="20" r="10"/><circle cx="60" cy="20" r="10"/>
      <circle cx="20" cy="60" r="10"/><circle cx="60" cy="60" r="10"/>
    </svg>`;
  Object.assign(dragHandle.style, {
    cursor: "move",
    paddingTop: "4px",
    marginRight: "auto",
  });
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
    panel.style.top = `${e.clientY - offsetY}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Top bar
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↘";
  Object.assign(resetBtn.style, {
    border: "none",
    background: "none",
    color: "#555",
    cursor: "pointer",
    padding: "0 6px",
  });
  resetBtn.title = "Snap";
  resetBtn.onclick = () =>
    Object.assign(panel.style, {
      bottom: "200px",
      left: "300px",
      top: "auto",
      right: "auto",
    });

  const trashBtn = document.createElement("button");
  trashBtn.textContent = "✕";
  Object.assign(trashBtn.style, {
    border: "none",
    background: "none",
    color: "#555",
    cursor: "pointer",
    padding: "0 6px",
  });
  trashBtn.title = "Remove panel";
  trashBtn.onclick = () => {
    stopLoop();
    panel.remove();
  };

  const topBar = document.createElement("div");
  Object.assign(topBar.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  });
  const iconGroup = document.createElement("div");
  iconGroup.append(resetBtn, trashBtn);
  topBar.append(dragHandle, iconGroup);

  // Buttons
  const nextCallBtn = document.createElement("button");
  nextCallBtn.textContent = "ASM Next Call";
  styleBtn(nextCallBtn, "#0070d2");
  nextCallBtn.onclick = async () => {
    clearInterval(countdown);
    countdown = null;
    if (nextCallBtn.disabled) return;
    nextCallBtn.disabled = true;
    nextCallBtn.textContent = "Working...";
    try {
      // Your click path:
      await retryClick("#call_endInteractionBtn", 5, 250);
      readyForNextCountdown = false;
      // Choose disposition (your ID here):
      naturalClick('label[for="disp_id_42"]');
      // End interaction:
      naturalClick("#setDisposition_call");
      // Cancel preview-renew (spam it):
      for (let i = 0; i < 15; i++) {
        naturalClick("#sfli-cancel-preview-renew");
        await delay(250);
      }
      readyForNextCountdown = true;
    } catch (e) {
      console.error("ASM error:", e);
    }
    nextCallBtn.disabled = false;
    nextCallBtn.textContent = "ASM Next Call";
  };

  const loopBtn = document.createElement("button");
  loopBtn.textContent = "START LOOP";
  styleBtn(loopBtn, "#1a7f5a");
  loopBtn.onclick = () => (loopActive ? stopLoop() : startLoop());

  // Inputs (Delay, Volume)
  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex",
    gap: "4px",
    marginTop: "4px",
    width: "100%",
  });

  const delayInput = document.createElement("input");
  Object.assign(delayInput, {
    type: "number",
    min: "0",
    value: String(cfg.asmDelay),
  });
  styleInput(delayInput);
  delayInput.title = "Delay (seconds)";
  delayInput.onchange = () =>
    (cfg.asmDelay = Math.max(0, parseInt(delayInput.value || "0", 10)));

  const volumeInput = document.createElement("input");
  Object.assign(volumeInput, {
    type: "number",
    min: "0",
    max: "1",
    step: "0.1",
    value: String(cfg.asmVolume),
  });
  styleInput(volumeInput);
  volumeInput.title = "Volume (0.0–1.0)";
  volumeInput.onchange = () =>
    (cfg.asmVolume = Math.min(
      1,
      Math.max(0, parseFloat(volumeInput.value || "0.5"))
    ));

  row.append(delayInput, volumeInput);

  // Assemble
  panel.append(topBar, nextCallBtn, loopBtn, row);
  panel.addEventListener("mouseenter", () => {
    panel.style.opacity = "1";
    stopLoop();
  });
  panel.addEventListener("mouseleave", () => (panel.style.opacity = "0.05"));
  document.body.appendChild(panel);

  // ---- ASM behaviors ----
  function playDing(freq = 800, duration = 150, type = "sine") {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(cfg.asmVolume, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration / 1000
    );
    osc.stop(ctx.currentTime + duration / 1000);
  }

  function naturalClick(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    // Ensure element is enabled & visible-ish
    if (el.disabled || el.getAttribute?.("aria-disabled") === "true")
      return false;

    // Try focus + pointer events like a human
    el.focus?.();
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.click?.(); // final native click

    return true;
  }

  async function retryClick(selector, tries, waitMs) {
    for (let i = 0; i < tries; i++) {
      if (naturalClick(selector)) return true;
      await delay(waitMs);
    }
    return false;
  }

  function startLoop() {
    loopActive = true;
    loopBtn.textContent = "STOP LOOP";
    loopBtn.style.background = "#c0392b";
    loopInterval = setInterval(async () => {
      const stateEl = document.querySelector(
        "#sfli-call-header .f9-nowrap-ellipsis span:nth-child(2)"
      );
      const stateText = stateEl?.textContent?.trim();
      const timeEl = document.querySelector("#time-counter .stopwatch-partial");
      const timeText = timeEl?.textContent?.trim();
      let dialingSeconds = 0;
      if (timeText) {
        const parts = timeText.split(":").map(Number);
        dialingSeconds = parts.length === 3 ? parts[2] : parts[1] || 0;
      }
      const callTypeEl = document.querySelector(
        "#sfli-call-header .f9-nowrap-ellipsis span:first-child"
      );
      const callTypeText = callTypeEl?.textContent?.trim();

      const shouldCountdown =
        (stateText === ": Live Call" ||
          (stateText === ": Dialing" && dialingSeconds >= 35)) &&
        !countdown &&
        callTypeText !== "Inbound Call" &&
        readyForNextCountdown === true;

      if (shouldCountdown) {
        let seconds = cfg.asmDelay;
        playDing(1600, 150, "triangle"); // initial high beep
        countdown = setInterval(() => {
          if (seconds <= 0) {
            playDing(400, 300); // low beep
            clearInterval(countdown);
            countdown = null;
            nextCallBtn.click(); // triggers the 1-click sequence
          } else {
            playDing(800, 150); // mid beep every tick
          }
          seconds--;
        }, 1000);
      }
    }, 10);
  }

  function stopLoop() {
    loopActive = false;
    clearInterval(loopInterval);
    loopInterval = null;
    clearInterval(countdown);
    countdown = null;
    loopBtn.textContent = "START LOOP";
    loopBtn.style.background = "#1a7f5a";
  }

  function styleBtn(b, bg) {
    Object.assign(b.style, {
      margin: "4px 0",
      width: "100%",
      padding: "6px",
      border: "none",
      borderRadius: "4px",
      background: bg,
      color: "#fff",
      cursor: "pointer",
      textAlign: "center",
      fontSize: cfg.fontSize + "px",
    });
  }
  function styleInput(i) {
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
  }
}

// ---- INIT + SETTINGS ----
function applySettings(newCfg) {
  cfg = { ...cfg, ...newCfg };
  // Update widget styling live
  const k = document.getElementById("kill-controls");
  if (k) {
    k.style.fontSize = cfg.fontSize + "px";
    k.style.width = cfg.widgetWidth + "px";
  }
  const a = document.getElementById("asm-controls");
  if (a) {
    a.style.fontSize = cfg.fontSize + "px";
    a.style.width = cfg.widgetWidth + "px";
  }

  // Respect toggles
  if (cfg.tabLooper && !tabLoop) startTabLoop();
  if (!cfg.tabLooper && tabLoop) stopTabLoop();
  if (cfg.toastLooper && !toastLoop) startToastLoop();
  if (!cfg.toastLooper && toastLoop) stopToastLoop();
}

function startTabLoop() {
  if (!tabLoop)
    tabLoop = setInterval(() => {
      const tabs = qsAll("ul.tabBarItems li.oneConsoleTabItem div.close");
      for (let i = cfg.tabLimit; i < tabs.length; i++) {
        const button = tabs[0]?.querySelector(".slds-button_icon-x-small");
        if (button) button.click();
      }
    }, 1000);
}

function stopTabLoop() {
  clearInterval(tabLoop);
  tabLoop = null;
}
function startToastLoop() {
  if (!toastLoop)
    toastLoop = setInterval(() => {
      qsAll(".slds-notify__close .toastClose").forEach((btn) => btn.click());
    }, 1000);
}
function stopToastLoop() {
  clearInterval(toastLoop);
  toastLoop = null;
}

// Bootstrap on page
chrome.storage.sync.get(null, (stored) => {
  applySettings(stored || {});
  buildKillPanel();
  buildASMWidget();

  // Auto-start loops if toggled on
  if (cfg.tabLooper) startTabLoop();
  if (cfg.toastLooper) startToastLoop();
});

// Listen to popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "APPLY_SETTINGS") applySettings(msg.payload || {});
  if (msg?.type === "RESET_WIDGETS") {
    stopTabLoop();
    stopToastLoop();
    document.getElementById("kill-controls")?.remove();
    document.getElementById("asm-controls")?.remove();
  }
});
