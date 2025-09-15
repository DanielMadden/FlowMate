// =========================
// FlowMate Widgets (surface-gated, no MO)
// =========================

(function () {
  // ---- Surface detection + frame gating ----
  const url = new URL(location.href);
  const host = url.host;

  const inTop = window.top === window;
  const isSalesforce =
    host.endsWith(".lightning.force.com") ||
    host.endsWith(".my.salesforce.com");
  const isFive9 = host === "app.five9.com" || window.name === "sfdcSoftphone";

  // Only run in Salesforce TOP window, or in the Five9 softphone frame
  if (!((inTop && isSalesforce) || isFive9)) return;

  // Per-frame bootstrap guard (prevents multiple builds on re-injects)
  if (window.__flowmateBootstrapped) return;
  window.__flowmateBootstrapped = true;

  // ====== ICON SVGs (PASTE YOURS HERE) ======
  const DRAG_SVG = `
    <!-- TODO: paste your drag dots SVG -->
    <svg width="18" height="18" viewBox="0 0 100 100" fill="#555" aria-label="Drag">
      <circle cx="20" cy="20" r="10"/><circle cx="60" cy="20" r="10"/>
      <circle cx="20" cy="60" r="10"/><circle cx="60" cy="60" r="10"/>
    </svg>`;

  const SNAP_SVG = `
    <!-- TODO: paste your snap SVG -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#555" aria-label="Snap">
      <path d="M12 2L15 8H9L12 2ZM12 22L9 16H15L12 22ZM2 12L8 15V9L2 12ZM22 12L16 9V15L22 12Z"/>
    </svg>`;

  const TRASH_SVG = `
    <!-- TODO: paste your trash SVG -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#555" aria-label="Remove">
      <path d="M3 6h18v2H5v13h14V8h2v15H3V6zm6-2h6v2H9V4zM8 11h2v8H8zm6 0h2v8h-2z"/>
    </svg>`;

  // ===== Shared helpers =====
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsAll = (sel, root = document) =>
    Array.from(root.querySelectorAll(sel));
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  // ===== Panel chrome factory (drag + snap + delete identical everywhere) =====
  function makePanelChrome({ panel, snapTo, onRemove }) {
    const topBar = document.createElement("div");
    Object.assign(topBar.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px",
    });

    // Drag handle
    const dragHandle = document.createElement("div");
    dragHandle.innerHTML = DRAG_SVG;
    Object.assign(dragHandle.style, {
      cursor: "grab",
      paddingTop: "4px",
      marginRight: "auto",
      display: "flex",
      alignItems: "center",
    });

    // Snap
    const snapBtn = document.createElement("button");
    snapBtn.innerHTML = SNAP_SVG;
    Object.assign(snapBtn.style, {
      border: "none",
      background: "none",
      color: "#555",
      cursor: "pointer",
      width: "20px",
      padding: "0px",
    });
    snapBtn.title = "Snap to preset";
    snapBtn.onclick = () => {
      Object.assign(panel.style, {
        top: "auto",
        right: "auto",
        bottom: "auto",
        left: "auto",
        ...snapTo,
      });
    };

    // Delete
    const trashBtn = document.createElement("button");
    trashBtn.innerHTML = TRASH_SVG;
    Object.assign(trashBtn.style, {
      border: "none",
      background: "none",
      color: "#555",
      cursor: "pointer",
      width: "20px",
      padding: "0px",
      marginLeft: "4px",
    });
    trashBtn.title = "Remove panel";
    trashBtn.onclick = () => {
      try {
        onRemove?.();
      } finally {
        panel.remove();
      }
    };

    const iconGroup = document.createElement("div");
    iconGroup.append(snapBtn, trashBtn);
    topBar.append(dragHandle, iconGroup);

    // Smooth drag via Pointer Events (no global mousemove leaks)
    let dragStartX = 0,
      dragStartY = 0,
      startLeft = 0,
      startTop = 0;
    dragHandle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dragHandle.setPointerCapture(e.pointerId);
      dragHandle.style.cursor = "grabbing";
      const rect = panel.getBoundingClientRect();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      const onMove = (ev) => {
        const dx = ev.clientX - dragStartX;
        const dy = ev.clientY - dragStartY;
        panel.style.left = `${startLeft + dx}px`;
        panel.style.top = `${startTop + dy}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      };
      const onUp = (ev) => {
        dragHandle.releasePointerCapture(ev.pointerId);
        dragHandle.removeEventListener("pointermove", onMove);
        dragHandle.removeEventListener("pointerup", onUp);
        dragHandle.style.cursor = "grab";
      };
      dragHandle.addEventListener("pointermove", onMove);
      dragHandle.addEventListener("pointerup", onUp);
    });

    return topBar;
  }

  // ===== ASM WIDGET (only in Five9 surface) =====
  function buildASMWidget() {
    if (!isFive9) return; // surface gate
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
      fontSize: "14px",
      width: "160px",
      userSelect: "none",
      opacity: "0.05",
    });

    const topBar = makePanelChrome({
      panel,
      snapTo: { bottom: "200px", left: "300px" },
      onRemove: () => stopLoop(),
    });

    // Main ASM action
    const nextCallBtn = document.createElement("button");
    nextCallBtn.textContent = "ASM Next Call";
    Object.assign(nextCallBtn.style, {
      margin: "4px 0",
      width: "100%",
      padding: "6px",
      border: "none",
      borderRadius: "4px",
      background: "#0070d2",
      color: "#fff",
      cursor: "pointer",
      textAlign: "center",
      fontSize: "14px",
    });

    function naturalClick(selector) {
      const el = document.querySelector(selector);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      el.click?.();
      return true;
    }

    nextCallBtn.onclick = async () => {
      clearInterval(countdown);
      countdown = null;
      if (nextCallBtn.disabled) return;
      nextCallBtn.disabled = true;
      nextCallBtn.textContent = "Working...";
      try {
        for (let i = 0; i < 5; i++) {
          if (naturalClick("#call_endInteractionBtn")) break;
          await delay(250);
        }
        readyForNextCountdown = false;

        naturalClick('label[for="disp_id_42"]'); // your disposition
        naturalClick("#setDisposition_call");

        for (let i = 0; i < 15; i++) {
          naturalClick("#sfli-cancel-preview-renew");
          await delay(250);
        }
        readyForNextCountdown = true;
      } catch (err) {
        console.error("ASM automation error:", err);
      }
      nextCallBtn.disabled = false;
      nextCallBtn.textContent = "ASM Next Call";
    };

    // Beep
    function playDing(freq = 800, duration = 150, type = "sine") {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(asmVolume, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + duration / 1000
      );
      osc.stop(ctx.currentTime + duration / 1000);
    }

    // Loop
    let loopActive = false;
    let loopInterval = null;
    let countdown = null;
    let readyForNextCountdown = true;
    let asmDelaySeconds = 3;
    let asmVolume = 0.5;

    const loopBtn = document.createElement("button");
    loopBtn.textContent = "START LOOP";
    Object.assign(loopBtn.style, {
      margin: "4px 0",
      width: "100%",
      padding: "6px",
      border: "none",
      borderRadius: "4px",
      background: "#1a7f5a",
      color: "#fff",
      cursor: "pointer",
      textAlign: "center",
      fontSize: "14px",
    });

    loopBtn.onclick = () => (loopActive ? stopLoop() : startLoop());

    const startLoop = () => {
      if (loopActive) return;
      loopActive = true;
      countdown = null;
      loopBtn.style.background = "#c0392b";
      loopBtn.textContent = "STOP LOOP";
      loopInterval = setInterval(async () => {
        const stateText = qs(
          "#sfli-call-header .f9-nowrap-ellipsis span:nth-child(2)"
        )?.textContent?.trim();
        const timeText = qs(
          "#time-counter .stopwatch-partial"
        )?.textContent?.trim();
        let dialingSeconds = 0;
        if (timeText) {
          const parts = timeText.split(":").map(Number);
          dialingSeconds = parts.length === 3 ? parts[2] : parts[1] || 0;
        }
        const callTypeText = qs(
          "#sfli-call-header .f9-nowrap-ellipsis span:first-child"
        )?.textContent?.trim();

        const shouldCountdown =
          (stateText === ": Live Call" ||
            stateText === ": Wrap Up" ||
            (stateText === ": Dialing" && dialingSeconds >= 35)) &&
          !countdown &&
          callTypeText !== "Inbound Call" &&
          readyForNextCountdown === true;

        if (shouldCountdown) {
          let seconds =
            callTypeText === "Agent Call" && stateText === ": Wrap Up"
              ? 0
              : asmDelaySeconds;
          playDing(1600, 150, "triangle");
          countdown = setInterval(() => {
            loopBtn.textContent = `STOP LOOP (${seconds}s)`;
            if (seconds <= 0) {
              playDing(400, 300);
              clearInterval(countdown);
              countdown = null;
              nextCallBtn.click();
              loopBtn.textContent = "STOP LOOP";
            } else {
              playDing();
            }
            seconds--;
          }, 1000);
        }
      }, 10);
    };

    const stopLoop = () => {
      loopActive = false;
      clearInterval(loopInterval);
      clearInterval(countdown);
      loopInterval = null;
      countdown = null;
      loopBtn.style.background = "#1a7f5a";
      loopBtn.textContent = "START LOOP";
    };

    // Inputs
    const inputRow = document.createElement("div");
    Object.assign(inputRow.style, {
      display: "flex",
      gap: "4px",
      marginTop: "4px",
      width: "100%",
    });

    const delayInput = document.createElement("input");
    Object.assign(delayInput, {
      type: "number",
      min: "1",
      value: asmDelaySeconds,
      title: "Delay (seconds)",
    });
    Object.assign(delayInput.style, {
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
    delayInput.onchange = () => {
      asmDelaySeconds = parseInt(delayInput.value) || 3;
    };

    const volumeInput = document.createElement("input");
    Object.assign(volumeInput, {
      type: "number",
      min: "0",
      max: "1",
      step: "0.1",
      value: asmVolume,
      title: "Volume (0.0–1.0)",
    });
    Object.assign(volumeInput.style, {
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
    volumeInput.onchange = () => {
      asmVolume = parseFloat(volumeInput.value) || 0.5;
    };

    inputRow.append(delayInput, volumeInput);

    // Assemble
    panel.append(topBar, nextCallBtn, loopBtn, inputRow);
    panel.addEventListener("mouseenter", () => {
      panel.style.opacity = "1";
      stopLoop();
    });
    panel.addEventListener("mouseleave", () => {
      panel.style.opacity = "0.05";
    });

    document.body.appendChild(panel);
    return panel;
  }

  // ===== Kill Tabs/Toasts Panel (only in Salesforce TOP) =====
  function buildControlPanel() {
    if (!isSalesforce || !inTop) return; // surface gate
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
      fontSize: "14px",
      width: "160px",
      userSelect: "none",
      opacity: "0.05",
    });

    const topBar = makePanelChrome({
      panel,
      snapTo: { bottom: "20px", right: "20px" },
      onRemove: () => {
        stopTabLoop();
        stopToastLoop();
      },
    });

    const styleBtn = (b, bg) =>
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
        fontSize: "14px",
      });

    // Kill Tabs (rightmost inward)
    const killTabsBtn = document.createElement("button");
    killTabsBtn.textContent = "Kill Tabs";
    styleBtn(killTabsBtn, "#0070d2");
    killTabsBtn.onclick = async () => {
      const items = qsAll("ul.tabBarItems li.oneConsoleTabItem div.close");
      for (let i = items.length - 1; i >= 0; i--) {
        const btn = items[i]?.querySelector(".slds-button_icon-x-small");
        if (btn) {
          btn.click();
          await delay(250);
        }
      }
    };

    // Tab loop (trim to 10)
    let tabLoop = null;
    const tabLoopBtn = document.createElement("button");
    styleBtn(tabLoopBtn, "#1a7f5a");
    const syncTab = () => {
      tabLoopBtn.textContent = tabLoop ? "Stop Tab Loop" : "Start Tab Loop";
      tabLoopBtn.style.background = tabLoop ? "#c0392b" : "#1a7f5a";
    };
    const startTabLoop = () => {
      if (tabLoop) return;
      tabLoop = setInterval(() => {
        const items = qsAll("ul.tabBarItems li.oneConsoleTabItem div.close");
        const over = items.length - 10;
        if (over > 0) {
          const btn = items[0]?.querySelector(".slds-button_icon-x-small");
          if (btn) btn.click();
        }
      }, 1000);
      syncTab();
    };
    const stopTabLoop = () => {
      clearInterval(tabLoop);
      tabLoop = null;
      syncTab();
    };
    tabLoopBtn.onclick = () => (tabLoop ? stopTabLoop() : startTabLoop());
    syncTab();

    // Kill Toasts (burst 5s)
    const killToastsBtn = document.createElement("button");
    killToastsBtn.textContent = "Kill Toasts (5s)";
    styleBtn(killToastsBtn, "#555");
    killToastsBtn.onclick = () => {
      if (killToastsBtn.disabled) return;
      killToastsBtn.disabled = true;
      killToastsBtn.textContent = "Killing...";
      const intv = setInterval(() => {
        qsAll(".slds-notify__close .toastClose").forEach((btn) => btn.click());
      }, 500);
      setTimeout(() => {
        clearInterval(intv);
        killToastsBtn.disabled = false;
        killToastsBtn.textContent = "Kill Toasts (5s)";
      }, 5000);
    };

    // Toast loop
    let toastLoop = null;
    const toastLoopBtn = document.createElement("button");
    styleBtn(toastLoopBtn, "#1a7f5a");
    const syncToast = () => {
      toastLoopBtn.textContent = toastLoop
        ? "Stop Toast Loop"
        : "Start Toast Loop";
      toastLoopBtn.style.background = toastLoop ? "#c0392b" : "#1a7f5a";
    };
    const startToastLoop = () => {
      if (toastLoop) return;
      toastLoop = setInterval(() => {
        qsAll(".slds-notify__close .toastClose").forEach((btn) => btn.click());
      }, 1000);
      syncToast();
    };
    const stopToastLoop = () => {
      clearInterval(toastLoop);
      toastLoop = null;
      syncToast();
    };
    toastLoopBtn.onclick = () =>
      toastLoop ? stopToastLoop() : startToastLoop();
    syncToast();

    panel.append(topBar, killTabsBtn, tabLoopBtn, killToastsBtn, toastLoopBtn);
    panel.addEventListener("mouseenter", () => (panel.style.opacity = "1"));
    panel.addEventListener("mouseleave", () => (panel.style.opacity = "0.05"));

    document.body.appendChild(panel);
    return {
      topBar,
      killTabsBtn,
      tabLoopBtn,
      killToastsBtn,
      tastLoopBtn,
    };
  }

  // ===== Bootstrap (surface-aware) =====
  buildControlPanel(); // Salesforce top only
  buildASMWidget(); // Five9 only
})();
