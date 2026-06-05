(function () {
  const BAN_WARNING_KEY = "stevegptAntiSteveWarnings";
  const BAN_UNTIL_KEY = "stevegptBannedUntil";
  const BAN_SEEN_KEY = "stevegptBanSeen";
  const CHAT_HISTORY_KEY = "stevegptChatHistory";

  const style = document.createElement("style");
  style.textContent = `
    body {
      overflow: hidden !important;
    }

    .hero-title,
    .hero-subtitle,
    .ambient,
    .chat-expand,
    .chat-warning-counter {
      display: none !important;
    }

    .page,
    .hero,
    .hero-inner,
    .hero-copy {
      width: 100vw !important;
      max-width: none !important;
      min-height: 100dvh !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .hero {
      align-items: stretch !important;
    }

    .hero-inner {
      display: flex !important;
      justify-content: center !important;
      align-items: stretch !important;
    }

    .hero-copy {
      display: flex !important;
      justify-content: center !important;
      align-items: stretch !important;
    }

    .chat-shell {
      width: min(920px, 100vw) !important;
      height: 100dvh !important;
      margin: 0 auto !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) auto !important;
      overflow: hidden !important;
    }

    .chat-header {
      padding: 18px 22px 14px !important;
      border-bottom: 0 !important;
    }

    .chat-name {
      font-size: 1.08rem !important;
    }

    .chat-status {
      display: none !important;
    }

    .chat-actions {
      margin-left: auto !important;
    }

    .chat-clear {
      display: inline-grid !important;
      place-items: center !important;
    }

    .chat-messages {
      position: relative !important;
      height: auto !important;
      min-height: 0 !important;
      padding: 16px 22px 20px !important;
    }

    .chat-empty-state {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
      color: rgba(27, 27, 31, 0.78);
      font-size: clamp(1.7rem, 4vw, 2.8rem);
      font-weight: 700;
      text-align: center;
      padding: 24px;
    }

    .chat-empty-state[hidden] {
      display: none !important;
    }

    .chat-form {
      grid-template-columns: minmax(0, 1fr) auto !important;
      align-items: center !important;
      padding: 14px 18px 18px !important;
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

    .chat-message.user .chat-reply-actions {
      align-self: flex-end !important;
      display: flex !important;
      gap: 4px !important;
      margin: 3px 4px 0 0 !important;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.16s ease, transform 0.16s ease;
      transform: translateY(-2px);
    }

    .chat-message.user:hover .chat-reply-actions,
    .chat-message.user:focus-within .chat-reply-actions {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    @media (max-width: 680px) {
      .chat-shell {
        width: 100vw !important;
      }

      .chat-form {
        grid-template-columns: minmax(0, 1fr) auto !important;
      }
    }
  `;
  document.head.appendChild(style);

  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  document.getElementById("chatExpand")?.remove();
  let emptyState = null;

  function createCopyIcon() {
    return [
      "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
      "<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"></rect>",
      "<path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"></path>",
      "</svg>"
    ].join("");
  }

  function createCopyButton(textProvider) {
    const button = document.createElement("button");
    button.className = "chat-reply-action user-copy-action";
    button.type = "button";
    button.title = "Copy";
    button.setAttribute("aria-label", "Copy message");
    button.innerHTML = createCopyIcon();
    button.addEventListener("click", async () => {
      const text = textProvider();
      try {
        await navigator.clipboard?.writeText(text);
        button.classList.add("is-done");
        setTimeout(() => button.classList.remove("is-done"), 900);
      } catch {
        button.classList.remove("is-done");
      }
    });
    return button;
  }

  function ensureEmptyState() {
    if (!chatMessages || emptyState) {
      return;
    }

    emptyState = document.createElement("div");
    emptyState.className = "chat-empty-state";
    emptyState.textContent = "Where should we begin?";
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

  function updateEmptyState() {
    ensureEmptyState();

    if (!emptyState) {
      return;
    }

    const hasMessages = Boolean(chatMessages.querySelector(".chat-message"));
    const hasDraft = Boolean(chatInput?.value.trim());
    emptyState.hidden = hasMessages || hasDraft;
  }

  function addUserCopyActions() {
    chatMessages.querySelectorAll(".chat-message.user").forEach((message) => {
      if (message.querySelector(".user-copy-action")) {
        return;
      }

      const bubble = message.querySelector(".chat-bubble");
      const actions = document.createElement("div");
      actions.className = "chat-reply-actions user-reply-actions";
      actions.appendChild(createCopyButton(() => bubble?.textContent || ""));
      message.appendChild(actions);
    });
  }

  function cleanRegenerateThinkingText() {
    chatMessages.querySelectorAll(".chat-message.bot.streaming .chat-bubble").forEach((bubble) => {
      if ((bubble.textContent || "").trim() === "SteveGPT is thinking...") {
        bubble.textContent = "";
      }
    });
  }

  function refreshChatPolish() {
    removeDefaultStarterIfEmpty();
    addUserCopyActions();
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
  setInterval(stepDownWarningAfterBan, 1000);
})();
