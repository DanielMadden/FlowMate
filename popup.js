const KEYS = [
  "tabLooper",
  "toastLooper",
  "tabLimit",
  "asmDelay",
  "asmVolume",
  "fontSize",
  "widgetWidth",
];

function getActiveTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      resolve(tabs[0]?.id)
    );
  });
}

function load() {
  chrome.storage.sync.get(KEYS, (cfg) => {
    tabLooper.checked = !!cfg.tabLooper;
    toastLooper.checked = !!cfg.toastLooper;
    tabLimit.value = cfg.tabLimit ?? 10;

    asmDelay.value = cfg.asmDelay ?? 3;
    asmVolume.value = cfg.asmVolume ?? 0.5;

    fontSize.value = cfg.fontSize ?? 14;
    widgetWidth.value = cfg.widgetWidth ?? 160;
  });
}

function currentConfig() {
  return {
    tabLooper: tabLooper.checked,
    toastLooper: toastLooper.checked,
    tabLimit: +tabLimit.value || 10,
    asmDelay: +asmDelay.value || 3,
    asmVolume: +asmVolume.value || 0.5,
    fontSize: +fontSize.value || 14,
    widgetWidth: +widgetWidth.value || 160,
  };
}

async function sendToContent(type, payload) {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type, payload });
  } catch (e) {
    // content script not injected on this page or origin mismatch
  }
}

apply.onclick = async () => {
  const cfg = currentConfig();
  chrome.storage.sync.set(cfg, async () => {
    await sendToContent("APPLY_SETTINGS", cfg);
  });
};

reset.onclick = async () => {
  chrome.storage.sync.remove(KEYS, async () => {
    load();
    await sendToContent("RESET_WIDGETS");
  });
};

document.addEventListener("DOMContentLoaded", () => {
  load();
  // Autosave on change
  [
    tabLooper,
    toastLooper,
    tabLimit,
    asmDelay,
    asmVolume,
    fontSize,
    widgetWidth,
  ].forEach((el) =>
    el.addEventListener("change", () =>
      chrome.storage.sync.set(currentConfig())
    )
  );
});
