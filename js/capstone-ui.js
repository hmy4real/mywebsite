(function () {
  const CHAT_HISTORY_KEY = "stevegptChatHistory";
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const chatEmptyState = document.getElementById("chatEmptyState");

  initWallpaperGlows();
  syncEmptyState();

  function initWallpaperGlows() {
    const ambient = document.querySelector(".ambient");

    if (!ambient) {
      return;
    }

    const randomBetween = (min, max) => min + Math.random() * (max - min);
    const glowCount = Math.floor(randomBetween(5, 8));
    const fragment = document.createDocumentFragment();

    ambient.replaceChildren();

    for (let index = 0; index < glowCount; index += 1) {
      const glow = document.createElement("div");
      const alpha = randomBetween(0.12, 0.28);

      glow.className = "wallpaper-glow";
      glow.style.setProperty("--x", `${randomBetween(4, 96)}vw`);
      glow.style.setProperty("--y", `${randomBetween(8, 94)}vh`);
      glow.style.setProperty("--size", `${randomBetween(120, 310)}px`);
      glow.style.setProperty("--blur", `${randomBetween(34, 72)}px`);
      glow.style.setProperty("--alpha", alpha.toFixed(3));
      glow.style.setProperty("--duration", `${randomBetween(18, 36)}s`);
      glow.style.setProperty("--delay", `${randomBetween(-18, 0)}s`);
      glow.style.setProperty("--drift-x", `${randomBetween(-90, 90).toFixed(1)}px`);
      glow.style.setProperty("--drift-y", `${randomBetween(-70, 70).toFixed(1)}px`);
      glow.style.setProperty("--scale-start", randomBetween(0.86, 1.08).toFixed(3));
      glow.style.setProperty("--scale-mid", randomBetween(1.02, 1.24).toFixed(3));
      glow.style.setProperty("--scale-end", randomBetween(0.8, 1.02).toFixed(3));
      glow.style.setProperty("--opacity-start", randomBetween(0.26, 0.52).toFixed(3));
      glow.style.setProperty("--opacity-mid", randomBetween(0.38, 0.72).toFixed(3));
      glow.style.setProperty("--opacity-end", randomBetween(0.2, 0.46).toFixed(3));

      fragment.appendChild(glow);
    }

    ambient.appendChild(fragment);
  }

  function syncEmptyState() {
    if (!chatMessages || !chatEmptyState) {
      return;
    }

    if (!chatMessages.contains(chatEmptyState)) {
      chatMessages.prepend(chatEmptyState);
    }

    const hasMessages = Boolean(chatMessages.querySelector(".chat-message"));
    chatEmptyState.hidden = hasMessages;
    document.body.classList.toggle("chat-is-empty", !hasMessages);
  }

  function pruneAfterMessage(messageElement) {
    const messages = [...chatMessages.querySelectorAll(".chat-message")];
    const targetIndex = messages.indexOf(messageElement);

    if (targetIndex < 0) {
      return;
    }

    messages.slice(targetIndex + 1).forEach((message) => message.remove());

    const history = [];
    messages.slice(0, targetIndex).forEach((message) => {
      const bubbleText = message.querySelector(".chat-bubble")?.textContent || "";

      if (message.classList.contains("user")) {
        history.push({ role: "user", content: bubbleText });
        return;
      }

      if (message.classList.contains("bot") && message.dataset.reply) {
        history.push({
          role: "assistant",
          content: message.dataset.reply,
          ...(message.dataset.sourcePrompt ? { sourcePrompt: message.dataset.sourcePrompt } : {})
        });
      }
    });

    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(-40)));
    syncEmptyState();
  }

  chatInput?.addEventListener("input", syncEmptyState);
  chatMessages?.addEventListener("click", (event) => {
    const button = event.target.closest(".chat-reply-action[data-action='regenerate']");

    if (!button) {
      return;
    }

    const message = button.closest(".chat-message.bot");

    if (message) {
      pruneAfterMessage(message);
    }
  }, true);

  if (chatMessages) {
    new MutationObserver(syncEmptyState).observe(chatMessages, {
      childList: true,
      subtree: true
    });
  }
})();
