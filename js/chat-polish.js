(function () {
  const BAN_WARNING_KEY = "stevegptAntiSteveWarnings";
  const BAN_UNTIL_KEY = "stevegptBannedUntil";
  const BAN_SEEN_KEY = "stevegptBanSeen";

  const style = document.createElement("style");
  style.textContent = `
    .chat-warning-counter {
      display: none !important;
    }

    .chat-form {
      grid-template-columns: minmax(0, 1fr) auto !important;
      align-items: center !important;
    }

    .chat-form button[data-mode="stop"] svg {
      width: 22px !important;
      height: 22px !important;
    }

    .chat-message.bot .chat-bubble:has(.chat-reply-actions) {
      padding-bottom: 6px !important;
    }

    .chat-bubble .chat-reply-actions {
      display: flex !important;
      gap: 4px !important;
      margin: 0 0 -2px -5px !important;
      padding: 0 !important;
      width: fit-content !important;
    }

    body.chat-expanded {
      overflow: hidden !important;
    }

    body.chat-expanded .hero-title,
    body.chat-expanded .hero-subtitle,
    body.chat-expanded .ambient {
      display: none !important;
    }

    body.chat-expanded .page,
    body.chat-expanded .hero,
    body.chat-expanded .hero-inner,
    body.chat-expanded .hero-copy {
      width: 100vw !important;
      max-width: none !important;
      min-height: 100dvh !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    body.chat-expanded .chat-shell.is-expanded {
      position: fixed !important;
      inset: 0 !important;
      z-index: 1000 !important;
      width: 100vw !important;
      height: 100dvh !important;
      margin: 0 !important;
      border-radius: 0 !important;
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) auto !important;
    }

    body.chat-expanded .chat-shell.is-expanded .chat-messages {
      height: auto !important;
      min-height: 0 !important;
    }

    @media (max-width: 680px) {
      .chat-form {
        grid-template-columns: minmax(0, 1fr) auto !important;
      }
    }
  `;
  document.head.appendChild(style);

  function syncExpandedState() {
    const chatShell = document.querySelector(".chat-shell");
    document.body.classList.toggle("chat-expanded", Boolean(chatShell?.classList.contains("is-expanded")));
  }

  document.getElementById("chatExpand")?.addEventListener("click", () => {
    requestAnimationFrame(syncExpandedState);
  });

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

  syncExpandedState();
  stepDownWarningAfterBan();
  setInterval(stepDownWarningAfterBan, 1000);
})();
