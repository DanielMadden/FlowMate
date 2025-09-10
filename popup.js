// Helper: get active tab
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Helper: broadcast to all frames in the active tab
async function sendToAllFrames(msg) {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  // Try to enumerate frames; if not available, fall back to top-frame send
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    await Promise.all(
      frames.map(f =>
        chrome.tabs.sendMessage(tab.id, msg, { frameId: f.frameId }).catch(() => {})
      )
    );
  } catch {
    await chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  }
}

async function getState() {
  const tab = await getActiveTab();
  if (!tab?.id) return null;

  // Query all frames; return first responder (Five9 or SF frame will answer)
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    for (const f of frames) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_STATE" }, { frameId: f.frameId });
        if (res) return res;
      } catch {}
    }
  } catch {
    try { return await chrome.tabs.sendMessage(tab.id, { type: "GET_STATE" }); } catch {}
  }
  return null;
}

// Wire UI
const $ = (s) => document.querySelector(s);
const asmNext = $("#asm-next");
const asmToggle = $("#asm-toggle");
const asmDelay = $("#asm-delay");
const asmVol = $("#asm-vol");
const sfKillTabs = $("#sf-kill-tabs");
const sfTabsToggle = $("#sf-tabs-toggle");
const sfKillToasts = $("#sf-kill-toasts");
const sfToastsToggle = $("#sf-toasts-toggle");
const envNote = $("#env-note");
const openDetached = $("#open-detached");

asmNext.onclick = () => sendToAllFrames({ type: "ASM_NEXT_CALL" });
asmToggle.onclick = async () => {
  // naive toggle: ask for state is optional; we’ll just send start/stop based on button text
  if (asmToggle.textContent.startsWith("Start")) {
    await sendToAllFrames({ type: "ASM_START_LOOP" });
    asmToggle.textContent = "Stop Loop";
  } else {
    await sendToAllFrames({ type: "ASM_STOP_LOOP" });
    asmToggle.textContent = "Start Loop";
  }
};

asmDelay.onchange = () =>
  sendToAllFrames({ type: "ASM_SET_DELAY", value: Number(asmDelay.value) });

asmVol.onchange = () =>
  sendToAllFrames({ type: "ASM_SET_VOLUME", value: Number(asmVol.value) });

sfKillTabs.onclick = () => sendToAllFrames({ type: "SF_KILL_TABS" });

sfTabsToggle.onclick = async () => {
  if (sfTabsToggle.textContent.startsWith("Start")) {
    await sendToAllFrames({ type: "SF_START_TAB_LOOP" });
    sfTabsToggle.textContent = "Stop Tab Loop";
  } else {
    await sendToAllFrames({ type: "SF_STOP_TAB_LOOP" });
    sfTabsToggle.textContent = "Start Tab Loop";
  }
};

sfKillToasts.onclick = () => sendToAllFrames({ type: "SF_KILL_TOASTS_BURST" });

sfToastsToggle.onclick = async () => {
  if (sfToastsToggle.textContent.startsWith("Start")) {
    await sendToAllFrames({ type: "SF_START_TOAST_LOOP" });
    sfToastsToggle.textContent = "Stop Toast Loop";
  } else {
    await sendToAllFrames({ type: "SF_STOP_TOAST_LOOP" });
    sfToastsToggle.textContent = "Start Toast Loop";
  }
};

// Optional: open a detached, resizable window for a “bigger popout” feel
openDetached.onclick = async () => {
  const url = chrome.runtime.getURL("popup.html");
  await chrome.windows.create({ url, type: "popup", width: 420, height: 420 });
};

// Initialize UI with current state (if a suitable frame responds)
(async () => {
  const state = await getState();
  if (state) {
    envNote.textContent =
      `Detected: ${state.env.isFive9 ? "Five9" : state.env.isSalesforce ? "Salesforce" : "Unknown surface"}`;
    if (state.asm.delay != null) asmDelay.value = String(state.asm.delay);
    if (state.asm.volume != null) asmVol.value = String(state.asm.volume);
  } else {
    envNote.textContent = "No FlowMate widgets detected on this tab.";
  }
})();
