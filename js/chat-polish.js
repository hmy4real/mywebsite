(function () {
  const BAN_WARNING_KEY = "stevegptAntiSteveWarnings";
  const BAN_UNTIL_KEY = "stevegptBannedUntil";
  const BAN_SEEN_KEY = "stevegptBanSeen";
  const CHAT_HISTORY_KEY = "stevegptChatHistory";

  const style = document.createElement("style");
  style.textContent = `
    html,
    body {
      width: 100%;
      min-height: 100%;
      overflow: hidden !important;
    }

    .hero-title,
    .hero-subtitle,
    .ambient,
    .chat-expand,
    .chat-status,
    .chat-warning-counter,
    .chat-message.user .chat-reply-actions {
      display: none !important;
    }

    .page,
    .hero,
    .hero-inner,
    .hero-copy,
    .chat-shell {
      width: 100vw !important;
      max-width: none !important;
      min-height: 100dvh !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
    }

    .hero,
    .hero-inner,
    .hero-copy {
      display: block !important;
    }

    .chat-shell {
      height: 100dvh !important;
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) auto !important;
      overflow: hidden !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .chat-header {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 20 !important;
      padding: 22px 40px 10px !important;
      border: 0 !important;
      background: transparent !important;
      pointer-events: none;
    }

    .chat-name {
      font-size: 1.08rem !important;
      line-height: 1 !important;
      pointer-events: auto;
    }

    .chat-actions {
      margin-left: auto !important;
      pointer-events: auto;
    }

    .chat-clear {
      display: inline-grid !important;
      place-items: center !important;
    }

    .chat-messages {
      width: min(1500px, calc(100vw - 96px)) !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 auto !important;
      padding: 92px 0 24px !important;
      position: relative !important;
    }

    .chat-empty-state {
      position: fixed;
      top: 37vh;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(760px, calc(100vw - 44px));
      pointer-events: none;
      color: rgba(27, 27, 31, 0.78);
      font-size: clamp(1.7rem, 4vw, 2.8rem);
      font-weight: 700;
      text-align: center;
      line-height: 1.12;
    }

    .chat-empty-state[hidden] {
      display: none !important;
    }

    .chat-form {
      width: min(840px, calc(100vw - 96px)) !important;
      margin: 0 auto !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      align-items: center !important;
      padding: 14px 0 18px !important;
      border-top: 0 !important;
      background: transparent !important;
    }

    body.chat-is-empty .chat-form {
      position: fixed !important;
      left: 50% !important;
      top: 56vh !important;
      transform: translateX(-50%) !important;
      z-index: 10 !important;
    }

    .chat-form button[data-mode="stop"] svg {
      width: 22px !important;
      height: 22px !important;
    }

    .chat-message.bot .chat-bubble:has(.chat-reply-actions) {
      padding-bottom: 7px !important;
    }

    .chat-bubble .chat-reply-actions {
      display: flex !important;
      gap: 4px !important;
      margin: 3px 0 -3px -5px !important;
      padding: 0 !important;
      width: fit-content !important;
    }

    @media (max-width: 680px) {
      .chat-header {
        padding: 18px 20px 8px !important;
      }

      .chat-messages {
        width: calc(100vw - 32px) !important;
        padding-top: 76px !important;
      }

      .chat-form,
      body.chat-is-empty .chat-form {
        width: calc(100vw - 32px) !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        position: static !important;
        transform: none !important;
      }

      .chat-empty-state {
        top: 42vh;
      }
    }
  `;
  document.head.appendChild(style);

  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  document.getElementById("chatExpand")?.remove();

  let emptyState = null;

  function isBanned() {
    return Number(localStorage.getItem(BAN_UNTIL_KEY) || "0") > Date.now();
  }

  function ensureEmptyState() {
    if (!chatMessages || emptyState) {
      return;
    }

    emptyState = document.createElement("div");
    emptyState.className = "chat-empty-state";
    chatMessages.appendChild(emptyState);
  }

  function isDefaultStarter(message) {
    return message?.classList.contains("bot")
      && /hi,\s*i am stevegpt/i.test(message.textContent || "");
  }

  function removeDefaultStarterIfEmpty() {
    const messages = [...chatMessages.querySelectorAll(".chat-message")];
    const hasSavedHistory = Boolean(localStorage.getItem(CHAT_HISTORY_KEY));

    if (!hasSavedHistory && messages.length === 1 && isDefaultStarter(messages[0])) {
      messages[0].remove();
    }
  }

  function cleanRegenerateThinkingText() {
    chatMessages.querySelectorAll(".chat-message.bot.streaming .chat-bubble").forEach((bubble) => {
      if ((bubble.textContent || "").trim() === "SteveGPT is thinking...") {
        bubble.textContent = "";
      }
    });
  }

  function updateEmptyState() {
    ensureEmptyState();

    if (!emptyState) {
      return;
    }

    const hasMessages = Boolean(chatMessages.querySelector(".chat-message"));
    const hasDraft = Boolean(chatInput?.value.trim());
    const banned = isBanned();

    emptyState.textContent = banned ? "You are currently banned" : "Where should we begin?";
    emptyState.hidden = hasMessages || (!banned && hasDraft);
    document.body.classList.toggle("chat-is-empty", !hasMessages);
  }

  function refreshChatPolish() {
    removeDefaultStarterIfEmpty();
    cleanRegenerateThinkingText();
    updateEmptyState();
  }

  function getWarningCount() {
    return Math.min(3, Math.max(0, Number(localStorage.getItem(BAN_WARNING_KEY) || "0")));
  }

  function setWarningCount(count) {
    localStorage.setItem(BAN_WARNING_KEY, String(Math.min(3, Math.max(0, count))));
  }

  function stepDownWarningAfterBan() {
    const bannedUntil = Number(localStorage.getItem(BAN_UNTIL_KEY) || "0");

    if (bannedUntil > Date.now()) {
      localStorage.setItem(BAN_SEEN_KEY, "1");
      return;
    }

    if (localStorage.getItem(BAN_SEEN_KEY) === "1") {
      setWarningCount(getWarningCount() - 1);
      localStorage.removeItem(BAN_SEEN_KEY);
    }
  }

  if (chatMessages) {
    new MutationObserver(refreshChatPolish).observe(chatMessages, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  chatInput?.addEventListener("input", updateEmptyState);
  refreshChatPolish();
  stepDownWarningAfterBan();
  setInterval(() => {
    stepDownWarningAfterBan();
    updateEmptyState();
  }, 1000);
})();
