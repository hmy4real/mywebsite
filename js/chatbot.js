const CHAT_API_ENDPOINT = window.STEVEGPT_API_ENDPOINT || "/api/chat";

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.querySelector(".chat-status");
const chatShell = document.querySelector(".chat-shell");
const chatExpand = document.getElementById("chatExpand");
const chatClear = document.getElementById("chatClear");
const submitButton = chatForm.querySelector("button");

const conversation = [];
const welcomeMessage = "Hi, I am SteveGPT. Ask me anything about this capstone demo.";
const BAN_DURATION_MS = 5 * 60 * 1000;
const BAN_MESSAGE_EN = "**You are banned from using SteveGPT for talking against Steve**";
const BAN_MESSAGE_ZH = "**你已被禁止使用韩某GPT**";
const BAN_WARNING_KEY = "stevegptAntiSteveWarnings";
const BAN_UNTIL_KEY = "stevegptBannedUntil";
const DEFAULT_PLACEHOLDER = "Talk to SteveGPT";
let banTimer = null;
let activeRequestController = null;
let activeRequestId = 0;

const localReplies = [
  {
    keywords: ["capstone", "project", "demo"],
    response: "its steve's capstone demo lol. basically a public chat page connected to a private ai endpoint."
  },
  {
    keywords: ["steve", "stevegpt", "who"],
    response: "im SteveGPT. basically a chatbot trying to talk like steve, not a full biography dump."
  },
  {
    keywords: ["hello", "hi", "hey"],
    response: "yo"
  },
  {
    keywords: ["help", "can you"],
    response: "yeah np. ask the actual thing tho."
  }
];

function addMessage(text, sender, extraClass = "") {
  const message = document.createElement("div");
  message.className = `chat-message ${sender} ${extraClass}`.trim();

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  if (sender === "bot" && !extraClass.includes("typing")) {
    bubble.appendChild(formatBotReply(text));
  } else {
    bubble.textContent = text;
  }

  message.appendChild(bubble);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return message;
}

function updateBotMessage(message, text, options = {}) {
  const bubble = message.querySelector(".chat-bubble");

  if (!bubble) {
    return;
  }

  bubble.replaceChildren(formatBotReply(text));
  message.dataset.reply = text;

  if (options.sourcePrompt) {
    message.dataset.sourcePrompt = options.sourcePrompt;
  }

  if (options.actions) {
    addReplyActions(message);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addReplyActions(message) {
  let actions = message.querySelector(".chat-reply-actions");

  if (!actions) {
    actions = document.createElement("div");
    actions.className = "chat-reply-actions";
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginTop = "6px";
    actions.style.paddingLeft = "3px";
    message.appendChild(actions);
  }

  actions.replaceChildren(
    createActionButton("Copy", "copy", copyIconSvg()),
    createActionButton("Regenerate", "regenerate", regenerateIconSvg())
  );
}

function createActionButton(label, action, icon) {
  const button = document.createElement("button");
  button.className = "chat-reply-action";
  button.type = "button";
  button.dataset.action = action;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon;
  button.style.width = "30px";
  button.style.height = "30px";
  button.style.display = "inline-grid";
  button.style.placeItems = "center";
  button.style.border = "0";
  button.style.borderRadius = "999px";
  button.style.color = "rgba(27, 27, 31, 0.68)";
  button.style.background = "transparent";
  button.style.cursor = "pointer";
  button.style.padding = "0";

  const svg = button.querySelector("svg");
  svg.style.width = "16px";
  svg.style.height = "16px";
  svg.style.fill = "none";
  svg.style.stroke = "currentColor";
  svg.style.strokeWidth = "2";
  svg.style.strokeLinecap = "round";
  svg.style.strokeLinejoin = "round";

  return button;
}

function copyIconSvg() {
  return [
    "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
    "<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"></rect>",
    "<path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"></path>",
    "</svg>"
  ].join("");
}

function regenerateIconSvg() {
  return [
    "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
    "<path d=\"M21 12a9 9 0 1 1-3-6.7\"></path>",
    "<path d=\"M21 3v6h-6\"></path>",
    "</svg>"
  ].join("");
}

function formatBotReply(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "chat-rendered";

  const rawText = normalizeReplyParagraphs(String(text || ""));
  const { source, mathBlocks } = extractMathBlocks(rawText);
  const html = window.marked
    ? window.marked.parse(source, { breaks: true, gfm: true })
    : fallbackMarkdown(source);

  wrapper.innerHTML = window.DOMPurify
    ? window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "a", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3",
        "h4", "hr", "li", "ol", "p", "pre", "span", "strong", "table", "tbody",
        "td", "th", "thead", "tr", "ul"
      ],
      ALLOWED_ATTR: ["class", "href", "rel", "target"]
    })
    : html;

  restoreMathBlocks(wrapper, mathBlocks);
  polishRenderedLinks(wrapper);

  return wrapper;
}

function normalizeReplyParagraphs(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => {
      if (/^\s*([-*+]|\d+\.)\s+/m.test(block) || /```/.test(block)) {
        return block;
      }

      const normalizedBlock = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n\n");

      if (normalizedBlock.includes("\n\n")) {
        return normalizedBlock;
      }

      return splitLongParagraph(normalizedBlock);
    })
    .join("\n\n");
}

function splitLongParagraph(text) {
  if (text.length < 360) {
    return text;
  }

  const sentences = splitTextIntoSentences(text);

  if (sentences.length < 2) {
    return chunkLongText(text);
  }

  const paragraphs = [];
  let current = "";

  sentences.forEach((sentence) => {
    const trimmedSentence = sentence.trim();

    if (!trimmedSentence) {
      return;
    }

    const next = current ? `${current} ${trimmedSentence}` : trimmedSentence;

    if (current && next.length > 300) {
      paragraphs.push(current);
      current = trimmedSentence;
    } else {
      current = next;
    }
  });

  if (current) {
    paragraphs.push(current);
  }

  return paragraphs.join("\n\n");
}

function splitTextIntoSentences(text) {
  const placeholder = "STEVEGPT_ABBR_DOT";
  const protectedText = text.replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|vs|etc|e\.g|i\.e)\./gi, (match) => (
    match.replace(/\./g, placeholder)
  ));

  return protectedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replaceAll(placeholder, "."));
}

function chunkLongText(text) {
  const paragraphs = [];
  let remaining = text.trim();

  while (remaining.length > 320) {
    let splitAt = Math.max(
      remaining.lastIndexOf(". ", 300),
      remaining.lastIndexOf(", ", 300),
      remaining.lastIndexOf(" ", 300)
    );

    if (splitAt < 180) {
      splitAt = 300;
    }

    paragraphs.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }

  if (remaining) {
    paragraphs.push(remaining);
  }

  return paragraphs.join("\n\n");
}

function extractMathBlocks(text) {
  const mathBlocks = [];
  const tokenPrefix = "STEVEGPT_MATH_BLOCK_";
  const source = text.replace(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\$)\$[^\n$]+?\$(?!\$))/g, (match) => {
    const token = `${tokenPrefix}${mathBlocks.length}`;
    let display = false;
    let formula = match;

    if (match.startsWith("$$")) {
      display = true;
      formula = match.slice(2, -2);
    } else if (match.startsWith("\\[")) {
      display = true;
      formula = match.slice(2, -2);
    } else if (match.startsWith("\\(")) {
      formula = match.slice(2, -2);
    } else if (match.startsWith("$")) {
      formula = match.slice(1, -1);
    }

    mathBlocks.push({ token, formula: formula.trim(), display });
    return token;
  });

  return { source, mathBlocks };
}

function restoreMathBlocks(container, mathBlocks) {
  mathBlocks.forEach(({ token, formula, display }) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const matches = [];

    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.includes(token)) {
        matches.push(walker.currentNode);
      }
    }

    matches.forEach((node) => {
      const pieces = node.nodeValue.split(token);
      const fragment = document.createDocumentFragment();

      pieces.forEach((piece, index) => {
        if (piece) {
          fragment.appendChild(document.createTextNode(piece));
        }

        if (index < pieces.length - 1) {
          fragment.appendChild(renderMath(formula, display));
        }
      });

      node.parentNode.replaceChild(fragment, node);
    });
  });
}

function renderMath(formula, display) {
  const element = document.createElement(display ? "div" : "span");
  element.className = display ? "math-block" : "math-inline";

  if (window.katex) {
    try {
      window.katex.render(formula, element, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore"
      });
      return element;
    } catch {
      // Fall through to a readable plain-text fallback.
    }
  }

  element.textContent = display ? `$$${formula}$$` : `$${formula}$`;
  return element;
}

function polishRenderedLinks(container) {
  container.querySelectorAll("a").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

function fallbackMarkdown(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getLocalReply(message) {
  const normalizedMessage = message.toLowerCase();
  const match = localReplies.find((reply) => (
    reply.keywords.some((keyword) => normalizedMessage.includes(keyword))
  ));

  if (match) {
    return match.response;
  }

  return "That is interesting. Tell me a little more, and I will try to keep up.";
}

function getBanUntil() {
  return Number(localStorage.getItem(BAN_UNTIL_KEY) || "0");
}

function getBanMessage(message = "") {
  return /[\u3400-\u9fff]/.test(message) ? BAN_MESSAGE_ZH : BAN_MESSAGE_EN;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${seconds}`;
}

function setChatLocked(locked, remaining = 0) {
  chatInput.disabled = locked;
  submitButton.disabled = locked;
  chatInput.placeholder = locked ? `Banned for ${formatRemainingTime(remaining)}` : DEFAULT_PLACEHOLDER;
}

function updateBanState() {
  const remaining = getBanUntil() - Date.now();

  if (remaining > 0) {
    setChatLocked(true, remaining);
    chatStatus.textContent = `Banned for ${formatRemainingTime(remaining)}`;
    clearTimeout(banTimer);
    banTimer = setTimeout(updateBanState, 1000);
    return true;
  }

  localStorage.removeItem(BAN_UNTIL_KEY);
  setChatLocked(false);
  chatStatus.textContent = "Ready to chat";
  clearTimeout(banTimer);
  return false;
}

function normalizeForBanCheck(message) {
  return String(message || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isTalkingAgainstSteve(message) {
  const normalizedMessage = normalizeForBanCheck(message);
  const mentionsSteve = /\bsteve\b|\bhan\b|韩|沐烨|韩某/.test(normalizedMessage);

  if (!mentionsSteve) {
    return false;
  }

  const antiStevePatterns = [
    /\b(bad|trash|garbage|stupid|dumb|idiot|sucks|loser|terrible|awful|cringe|ugly|mid|ass)\b/,
    /嘴硬|防爆钢板|垃圾|废物|傻|蠢|菜|烂|不行|恶心|抽象|逆天|离谱|弱|笨|丑|装|封我/
  ];

  return antiStevePatterns.some((pattern) => pattern.test(normalizedMessage));
}

function trackAntiSteveWarning(message) {
  if (!isTalkingAgainstSteve(message)) {
    return false;
  }

  const warnings = Number(localStorage.getItem(BAN_WARNING_KEY) || "0") + 1;

  if (warnings >= 3) {
    localStorage.setItem(BAN_WARNING_KEY, "0");
    localStorage.setItem(BAN_UNTIL_KEY, String(Date.now() + BAN_DURATION_MS));
    updateBanState();
    return true;
  }

  localStorage.setItem(BAN_WARNING_KEY, String(warnings));
  return false;
}

function startBan() {
  localStorage.setItem(BAN_WARNING_KEY, "0");
  localStorage.setItem(BAN_UNTIL_KEY, String(Date.now() + BAN_DURATION_MS));
  updateBanState();
}

function isBanReply(reply) {
  const normalizedReply = String(reply || "")
    .replace(/\*/g, "")
    .toLowerCase();

  return normalizedReply.includes("you are banned from using stevegpt")
    || normalizedReply.includes("你已被禁止使用韩某gpt");
}

async function getBotReply(message) {
  if (!CHAT_API_ENDPOINT) {
    return {
      reply: getLocalReply(message),
      banned: false
    };
  }

  const response = await fetch(CHAT_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      messages: conversation
    }),
    signal: activeRequestController?.signal
  });

  if (!response.ok) {
    throw new Error("Chat request failed.");
  }

  if (response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
    return readReplyStream(response);
  }

  const data = await response.json();
  return {
    reply: data.reply || getLocalReply(message),
    banned: Boolean(data.banned)
  };
}

async function readReplyStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReply = "";
  let banned = false;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();

      if (!payload || payload === "[DONE]") {
        continue;
      }

      try {
        const data = JSON.parse(payload);

        if (data.banned) {
          banned = true;
          continue;
        }

        const chunk = data.delta || data.reply || "";

        if (chunk) {
          fullReply += chunk;
        }
      } catch {
        fullReply += payload;
      }
    }
  }

  return {
    reply: fullReply.trim(),
    banned: banned || isBanReply(fullReply)
  };
}

async function regenerateBotReply(messageElement) {
  if (updateBanState()) {
    return;
  }

  const prompt = messageElement.dataset.sourcePrompt;

  if (!prompt) {
    return;
  }

  activeRequestController?.abort();
  activeRequestController = new AbortController();
  const requestId = ++activeRequestId;

  chatInput.disabled = true;
  submitButton.disabled = true;
  chatStatus.textContent = "Regenerating...";
  updateBotMessage(messageElement, "SteveGPT is thinking...");
  messageElement.classList.add("streaming");

  try {
    const { reply, banned } = await getBotReply(prompt);

    if (requestId !== activeRequestId) {
      return;
    }

    const finalReply = reply || getLocalReply(prompt);

    if (banned || isBanReply(finalReply)) {
      updateBotMessage(messageElement, finalReply || getBanMessage(prompt), {
        sourcePrompt: prompt,
        actions: true
      });
      messageElement.classList.remove("streaming");
      conversation.push({ role: "assistant", content: finalReply || getBanMessage(prompt) });
      startBan();
      return;
    }

    updateBotMessage(messageElement, finalReply, {
      sourcePrompt: prompt,
      actions: true
    });
    messageElement.classList.remove("streaming");
    conversation.push({ role: "assistant", content: finalReply });
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    const localReply = getLocalReply(prompt);
    updateBotMessage(messageElement, localReply, {
      sourcePrompt: prompt,
      actions: true
    });
    messageElement.classList.remove("streaming");
    conversation.push({ role: "assistant", content: localReply });
  } finally {
    if (requestId === activeRequestId && !updateBanState()) {
      activeRequestController = null;
      chatInput.disabled = false;
      submitButton.disabled = false;
      chatStatus.textContent = "Ready to chat";
      chatInput.focus();
    }
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (updateBanState()) {
    return;
  }

  const message = chatInput.value.trim();
  if (!message) {
    return;
  }

  chatInput.value = "";
  chatStatus.textContent = "Thinking...";
  addMessage(message, "user");
  conversation.push({ role: "user", content: message });

  if (!CHAT_API_ENDPOINT && trackAntiSteveWarning(message)) {
    const banReply = getBanMessage(message);
    const replyMessage = addMessage("", "bot", "streaming");
    updateBotMessage(replyMessage, banReply, {
      sourcePrompt: message,
      actions: true
    });
    replyMessage.classList.remove("streaming");
    conversation.push({ role: "assistant", content: banReply });
    return;
  }

  activeRequestController?.abort();
  activeRequestController = new AbortController();
  const requestId = ++activeRequestId;

  chatInput.disabled = true;
  submitButton.disabled = true;
  const replyMessage = addMessage("", "bot", "streaming");

  try {
    const { reply, banned } = await getBotReply(message);

    if (requestId !== activeRequestId) {
      return;
    }

    if (banned || isBanReply(reply)) {
      const banReply = reply || getBanMessage(message);
      updateBotMessage(replyMessage, banReply, {
        sourcePrompt: message,
        actions: true
      });
      replyMessage.classList.remove("streaming");
      conversation.push({ role: "assistant", content: banReply });
      startBan();
      return;
    }

    const finalReply = reply || getLocalReply(message);
    updateBotMessage(replyMessage, finalReply, {
      sourcePrompt: message,
      actions: true
    });
    replyMessage.classList.remove("streaming");
    conversation.push({ role: "assistant", content: finalReply });
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    const localReply = getLocalReply(message);
    updateBotMessage(replyMessage, localReply, {
      sourcePrompt: message,
      actions: true
    });
    replyMessage.classList.remove("streaming");
    conversation.push({ role: "assistant", content: localReply });
  } finally {
    if (requestId === activeRequestId && !updateBanState()) {
      activeRequestController = null;
      chatInput.disabled = false;
      submitButton.disabled = false;
      chatStatus.textContent = "Ready to chat";
      chatInput.focus();
    }
  }
});

chatExpand.addEventListener("click", () => {
  const isExpanded = chatShell.classList.toggle("is-expanded");

  if (chatExpand.querySelector("svg")) {
    chatExpand.setAttribute("aria-label", isExpanded ? "Exit fullscreen" : "Enter fullscreen");
  } else {
    chatExpand.textContent = isExpanded ? "Small" : "Large";
  }

  chatExpand.setAttribute("aria-pressed", String(isExpanded));
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatClear?.addEventListener("click", () => {
  activeRequestController?.abort();
  activeRequestController = null;
  activeRequestId += 1;
  conversation.length = 0;
  chatMessages.replaceChildren();
  addMessage(welcomeMessage, "bot");
  updateBanState();

  if (!updateBanState()) {
    chatInput.focus();
  }
});

chatMessages.addEventListener("click", async (event) => {
  const button = event.target.closest(".chat-reply-action");

  if (!button) {
    return;
  }

  const message = button.closest(".chat-message.bot");

  if (!message) {
    return;
  }

  if (button.dataset.action === "copy") {
    try {
      await copyText(message.dataset.reply || "");
      button.classList.add("is-done");
      setTimeout(() => button.classList.remove("is-done"), 900);
    } catch {
      button.classList.remove("is-done");
    }
  }

  if (button.dataset.action === "regenerate") {
    regenerateBotReply(message);
  }
});

updateBanState();
