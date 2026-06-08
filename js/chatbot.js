const CHAT_API_ENDPOINT = window.STEVEGPT_API_ENDPOINT || "/api/chat";

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatClear = document.getElementById("chatClear");
const chatEmptyState = document.getElementById("chatEmptyState");
const chatShell = document.querySelector(".chat-shell");
const chatAttach = document.getElementById("chatAttach");
const chatUpload = document.getElementById("chatUpload");
const attachmentTray = document.getElementById("attachmentTray");
const submitButton = document.getElementById("chatSubmit") || chatForm.querySelector("button[type='submit']");

const CHAT_HISTORY_KEY = "stevegptChatHistory";
const BAN_WARNING_KEY = "stevegptAntiSteveWarnings";
const BAN_UNTIL_KEY = "stevegptBannedUntil";
const BAN_DURATION_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 70 * 1000;
const MAX_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_TEXT_ATTACHMENT_CHARS = 12000;
const DEFAULT_PLACEHOLDER = "Talk to SteveGPT";
const BAN_MESSAGE_EN = "**You are banned from using SteveGPT for talking against Steve**";
const BAN_MESSAGE_ZH = "**你已被禁止使用韩某GPT**";

const conversation = [];
let activeRequestController = null;
let activeRequestId = 0;
let activeReplyMessage = null;
let banTimer = null;
let pendingAttachments = [];

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

initWallpaperGlows();
setSubmitButtonMode("send");

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
    const size = randomBetween(120, 310);
    const alpha = randomBetween(0.12, 0.28);
    const driftX = randomBetween(-90, 90);
    const driftY = randomBetween(-70, 70);

    glow.className = "wallpaper-glow";
    glow.style.setProperty("--x", `${randomBetween(4, 96)}vw`);
    glow.style.setProperty("--y", `${randomBetween(8, 94)}vh`);
    glow.style.setProperty("--size", `${size}px`);
    glow.style.setProperty("--blur", `${randomBetween(34, 72)}px`);
    glow.style.setProperty("--alpha", alpha.toFixed(3));
    glow.style.setProperty("--duration", `${randomBetween(18, 36)}s`);
    glow.style.setProperty("--delay", `${randomBetween(-18, 0)}s`);
    glow.style.setProperty("--drift-x", `${driftX.toFixed(1)}px`);
    glow.style.setProperty("--drift-y", `${driftY.toFixed(1)}px`);
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

function sendIconSvg() {
  return [
    "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
    "<path d=\"M12 19V5\"></path>",
    "<path d=\"m5 12 7-7 7 7\"></path>",
    "</svg>"
  ].join("");
}

function stopIconSvg() {
  return [
    "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
    "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"></rect>",
    "</svg>"
  ].join("");
}

function copyIconSvg() {
  return [
    "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
    "<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"></rect>",
    "<path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"></path>",
    "</svg>"
  ].join("");
}

function checkIconSvg() {
  return [
    "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
    "<path d=\"m20 6-11 11-5-5\"></path>",
    "</svg>"
  ].join("");
}

function closeIconSvg() {
  return [
    "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\">",
    "<path d=\"M18 6 6 18\"></path>",
    "<path d=\"m6 6 12 12\"></path>",
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

function setSubmitButtonMode(mode) {
  const isStop = mode === "stop";
  const isLocked = mode === "locked";

  submitButton.dataset.mode = mode;
  submitButton.innerHTML = isStop ? stopIconSvg() : sendIconSvg();
  submitButton.disabled = isLocked;
  submitButton.setAttribute("aria-label", isStop ? "Stop response" : "Send message");
  submitButton.title = isStop ? "Stop response" : "Send message";
}

function getBanUntil() {
  return Number(localStorage.getItem(BAN_UNTIL_KEY) || "0");
}

function getWarningCount() {
  return Math.min(3, Math.max(0, Number(localStorage.getItem(BAN_WARNING_KEY) || "0")));
}

function setWarningCount(count) {
  localStorage.setItem(BAN_WARNING_KEY, String(Math.min(3, Math.max(0, count))));
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${String(minutes).padStart(2, "0")}:${seconds}`;
}

function setChatLocked(locked, remaining = 0) {
  chatInput.disabled = locked;
  if (chatAttach) {
    chatAttach.disabled = locked;
  }
  chatInput.placeholder = locked ? `Banned for ${formatRemainingTime(remaining)}` : DEFAULT_PLACEHOLDER;
  setSubmitButtonMode(locked ? "locked" : "send");
}

function updateEmptyState() {
  if (!chatEmptyState) {
    return;
  }

  if (!chatMessages.contains(chatEmptyState)) {
    chatMessages.prepend(chatEmptyState);
  }

  const hasMessages = Boolean(chatMessages.querySelector(".chat-message"));
  const banned = getBanUntil() > Date.now();

  chatEmptyState.textContent = banned ? "You are currently banned" : "Where should we begin?";
  chatEmptyState.hidden = hasMessages;
  document.body.classList.toggle("chat-is-empty", !hasMessages);
}

function updateBanState() {
  const bannedUntil = getBanUntil();
  const remaining = bannedUntil - Date.now();

  if (remaining > 0) {
    setChatLocked(true, remaining);
    updateEmptyState();
    clearTimeout(banTimer);
    banTimer = setTimeout(updateBanState, 1000);
    return true;
  }

  if (bannedUntil > 0) {
    setWarningCount(getWarningCount() - 1);
  }

  localStorage.removeItem(BAN_UNTIL_KEY);
  clearTimeout(banTimer);
  setChatLocked(false);
  updateEmptyState();
  return false;
}

function getBanMessage(message = "") {
  return /[\u3400-\u9fff]/.test(message) ? BAN_MESSAGE_ZH : BAN_MESSAGE_EN;
}

function normalizeForBanCheck(message) {
  return String(message || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isTalkingAgainstSteve(message) {
  const normalized = normalizeForBanCheck(message);
  const mentionsSteve = /\bsteve\b|\bhan\b|韩|沐烨|韩某/.test(normalized);

  if (!mentionsSteve) {
    return false;
  }

  return [
    /\b(bad|trash|garbage|stupid|dumb|idiot|sucks|loser|terrible|awful|cringe|ugly|mid|ass|fuck|fucking|fucked)\b/,
    /嘴硬|防爆钢板|垃圾|废物|傻|蠢|菜|烂|不行|恶心|抽象|逆天|离谱|弱|笨|丑|装|封我/
  ].some((pattern) => pattern.test(normalized));
}

function trackAntiSteveWarning(message, options = {}) {
  if (!isTalkingAgainstSteve(message)) {
    return false;
  }

  const warnings = getWarningCount() + 1;

  if (warnings < 3) {
    setWarningCount(warnings);
    return false;
  }

  if (options.enforceBan === false) {
    setWarningCount(2);
    return false;
  }

  setWarningCount(3);
  localStorage.setItem(BAN_UNTIL_KEY, String(Date.now() + BAN_DURATION_MS));
  updateBanState();
  return true;
}

function startBan() {
  setWarningCount(3);
  localStorage.setItem(BAN_UNTIL_KEY, String(Date.now() + BAN_DURATION_MS));
  updateBanState();
}

function isBanReply(reply) {
  const normalized = String(reply || "")
    .replace(/\*/g, "")
    .toLowerCase();

  return normalized.includes("you are banned from using stevegpt")
    || normalized.includes("你已被禁止使用韩某gpt");
}

function saveConversationHistory() {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversation.slice(-40)));
}

function scrollChatToBottom() {
  const scroller = chatShell || document.scrollingElement || document.documentElement;

  requestAnimationFrame(() => {
    scroller.scrollTop = scroller.scrollHeight;
  });
}

function appendConversation(role, content, sourcePrompt = "") {
  conversation.push({
    role,
    content,
    ...(sourcePrompt ? { sourcePrompt } : {})
  });
  saveConversationHistory();
}

function replaceConversationReply(sourcePrompt, content) {
  let replyIndex = -1;

  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    if (conversation[index].role === "assistant" && conversation[index].sourcePrompt === sourcePrompt) {
      replyIndex = index;
      break;
    }
  }

  const nextReply = { role: "assistant", content, sourcePrompt };

  if (replyIndex >= 0) {
    conversation[replyIndex] = nextReply;
  } else {
    conversation.push(nextReply);
  }

  saveConversationHistory();
}

function pruneChatAfterMessage(messageElement) {
  const messages = [...chatMessages.querySelectorAll(".chat-message")];
  const targetIndex = messages.indexOf(messageElement);

  if (targetIndex < 0) {
    return;
  }

  messages.slice(targetIndex + 1).forEach((message) => {
    message.remove();
  });

  conversation.length = 0;

  messages.slice(0, targetIndex).forEach((message) => {
    if (message.classList.contains("user")) {
      conversation.push({
        role: "user",
        content: message.querySelector(".chat-bubble")?.textContent || ""
      });
      return;
    }

    if (message.classList.contains("bot") && message.dataset.reply) {
      conversation.push({
        role: "assistant",
        content: message.dataset.reply,
        ...(message.dataset.sourcePrompt ? { sourcePrompt: message.dataset.sourcePrompt } : {})
      });
    }
  });

  saveConversationHistory();
  updateEmptyState();
}

function isTextAttachment(file) {
  return /^text\//.test(file.type)
    || /\.(txt|md|csv|json|js|html|css|py|java)$/i.test(file.name);
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file."));
    reader.readAsText(file);
  });
}

async function createAttachment(file) {
  const base = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: file.name || "attachment",
    type: file.type || "application/octet-stream",
    size: file.size || 0
  };

  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${base.name} is too large. Files need to be under ${formatFileSize(MAX_FILE_BYTES)}.`);
  }

  if (file.type.startsWith("image/")) {
    return {
      ...base,
      kind: "image",
      dataUrl: await readFileAsDataUrl(file)
    };
  }

  if (isTextAttachment(file)) {
    return {
      ...base,
      kind: "text",
      dataUrl: await readFileAsDataUrl(file),
      text: (await readFileAsText(file)).slice(0, MAX_TEXT_ATTACHMENT_CHARS)
    };
  }

  return {
    ...base,
    kind: "file",
    dataUrl: await readFileAsDataUrl(file)
  };
}

function renderAttachmentPreview(attachment, removable = false) {
  const chip = document.createElement("div");
  chip.className = removable ? "attachment-chip" : "message-attachment-chip";

  if (attachment.kind === "image" && attachment.dataUrl) {
    const image = document.createElement("img");
    image.src = attachment.dataUrl;
    image.alt = "";

    if (!removable) {
      chip.className = "message-image-attachment";
      chip.appendChild(image);
      return chip;
    }

    chip.classList.add("is-image");
    chip.appendChild(image);
  } else {
    const label = document.createElement("span");
    label.textContent = `${attachment.name} ${attachment.size ? `(${formatFileSize(attachment.size)})` : ""}`.trim();
    chip.appendChild(label);
  }

  if (removable) {
    const remove = document.createElement("button");
    remove.className = "attachment-remove";
    remove.type = "button";
    remove.dataset.attachmentId = attachment.id;
    remove.setAttribute("aria-label", `Remove ${attachment.name}`);
    remove.title = "Remove";
    remove.innerHTML = closeIconSvg();
    chip.appendChild(remove);
  }

  return chip;
}

function renderAttachmentTray() {
  if (!attachmentTray) {
    return;
  }

  attachmentTray.replaceChildren(...pendingAttachments.map((attachment) => (
    renderAttachmentPreview(attachment, true)
  )));
  attachmentTray.hidden = pendingAttachments.length === 0;
}

async function handleSelectedFiles(files) {
  const slots = MAX_ATTACHMENTS - pendingAttachments.length;

  if (slots <= 0) {
    return;
  }

  const selectedFiles = [...files].slice(0, slots);

  for (const file of selectedFiles) {
    try {
      pendingAttachments.push(await createAttachment(file));
    } catch (error) {
      addMessage(error.message || "couldnt attach that file", "bot");
    }
  }

  renderAttachmentTray();
}

async function handlePastedFiles(event) {
  const clipboard = event.clipboardData;

  if (!clipboard) {
    return;
  }

  const files = [
    ...[...clipboard.files],
    ...[...clipboard.items]
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean)
  ];
  const uniqueFiles = files.filter((file, index, list) => (
    list.findIndex((candidate) => (
      candidate.name === file.name
      && candidate.size === file.size
      && candidate.type === file.type
    )) === index
  ));

  if (!uniqueFiles.length) {
    return;
  }

  event.preventDefault();
  await handleSelectedFiles(uniqueFiles);
}

function getAttachmentSummary(attachments) {
  return attachments
    .map((attachment) => `[${attachment.kind === "image" ? "Image" : "File"}: ${attachment.name}]`)
    .join(" ");
}

function serializeAttachments(attachments) {
  return attachments.map((attachment) => ({
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
    kind: attachment.kind,
    ...(attachment.dataUrl ? { dataUrl: attachment.dataUrl } : {}),
    ...(attachment.text ? { text: attachment.text.slice(0, MAX_TEXT_ATTACHMENT_CHARS) } : {})
  }));
}

function addMessage(text, sender, extraClass = "", attachments = []) {
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

  if (sender === "user" && attachments.length) {
    const attachmentList = document.createElement("div");
    attachmentList.className = "message-attachments";
    attachmentList.replaceChildren(...attachments.map((attachment) => renderAttachmentPreview(attachment)));
    bubble.appendChild(attachmentList);
  }

  chatMessages.appendChild(message);
  scrollChatToBottom();
  updateEmptyState();
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

  scrollChatToBottom();
  updateEmptyState();
}

function addReplyActions(message) {
  const bubble = message.querySelector(".chat-bubble");

  if (!bubble) {
    return;
  }

  message.querySelectorAll(".chat-reply-actions").forEach((actions) => actions.remove());

  const actions = document.createElement("div");
  actions.className = "chat-reply-actions";
  actions.replaceChildren(
    createActionButton("Copy", "copy", copyIconSvg()),
    createActionButton("Regenerate", "regenerate", regenerateIconSvg())
  );
  bubble.appendChild(actions);
}

function createActionButton(label, action, icon) {
  const button = document.createElement("button");
  button.className = "chat-reply-action";
  button.type = "button";
  button.dataset.action = action;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon;
  return button;
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
  highlightCodeBlocks(wrapper);
  addCodeCopyButtons(wrapper);
  polishRenderedLinks(wrapper);
  return wrapper;
}

function highlightCodeBlocks(container) {
  container.querySelectorAll("pre code").forEach((code) => {
    if (window.hljs) {
      window.hljs.highlightElement(code);

      if (code.querySelector(".hljs-keyword, .hljs-string, .hljs-number, .hljs-title, .hljs-built_in")) {
        return;
      }
    }

    fallbackHighlightCode(code);
  });
}

function fallbackHighlightCode(code) {
  const source = code.textContent;
  const language = [...code.classList].find((className) => className.startsWith("language-"))?.slice(9) || "";

  if (!/python|py/i.test(language) && !/\b(def|return|import|for|while|if|elif|else|class|print)\b/.test(source)) {
    return;
  }

  const protectedPieces = [];
  const protect = (html) => {
    const token = `%%STEVEGPT_SYNTAX_${protectedPieces.length}%%`;
    protectedPieces.push(html);
    return token;
  };

  let highlighted = escapeHtml(source)
    .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, (match) => protect(`<span class="syntax-string">${match}</span>`))
    .replace(/(#.*)$/gm, (match) => protect(`<span class="syntax-comment">${match}</span>`));

  highlighted = highlighted
    .replace(/\b(def|return|import|from|as|for|while|if|elif|else|class|in|not|and|or|None|True|False)\b/g, "<span class=\"syntax-keyword\">$1</span>")
    .replace(/\b([A-Za-z_]\w*)(?=\()/g, "<span class=\"syntax-function\">$1</span>")
    .replace(/\b(\d+(?:\.\d+)?)\b/g, "<span class=\"syntax-number\">$1</span>");

  code.innerHTML = highlighted.replace(/%%STEVEGPT_SYNTAX_(\d+)%%/g, (_, index) => protectedPieces[Number(index)] || "");
}

function addCodeCopyButtons(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    if (pre.closest(".code-frame")) {
      return;
    }

    const code = pre.querySelector("code");

    if (!code) {
      return;
    }

    const button = document.createElement("button");
    button.className = "code-copy";
    button.type = "button";
    button.setAttribute("aria-label", "Copy code");
    button.title = "Copy code";
    button.innerHTML = copyIconSvg();
    button.addEventListener("click", async () => {
      try {
        await copyText(code.textContent || "");
        button.classList.add("is-done");
        button.innerHTML = checkIconSvg();
        setTimeout(() => {
          button.classList.remove("is-done");
          button.innerHTML = copyIconSvg();
        }, 900);
      } catch {
        button.classList.remove("is-done");
      }
    });

    const frame = document.createElement("div");
    frame.className = "code-frame";
    pre.parentNode.insertBefore(frame, pre);
    frame.append(pre, button);

    updateCodeFrameScrollState(frame, pre);
    requestAnimationFrame(() => updateCodeFrameScrollState(frame, pre));
    pre.addEventListener("scroll", () => updateCodeFrameScrollState(frame, pre), { passive: true });
    window.addEventListener("resize", () => updateCodeFrameScrollState(frame, pre), { passive: true });
  });
}

function updateCodeFrameScrollState(frame, pre) {
  const maxScroll = pre.scrollWidth - pre.clientWidth;
  const scrollLeft = pre.scrollLeft;

  frame.classList.toggle("can-scroll-left", scrollLeft > 1);
  frame.classList.toggle("can-scroll-right", maxScroll - scrollLeft > 1);
}

function normalizeReplyParagraphs(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => {
      if (/^\s*([-*+]|\d+\.)\s+/m.test(block) || /```/.test(block)) {
        return block;
      }

      const normalized = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n\n");

      return normalized.includes("\n\n") ? normalized : splitLongParagraph(normalized);
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
    const trimmed = sentence.trim();

    if (!trimmed) {
      return;
    }

    const next = current ? `${current} ${trimmed}` : trimmed;

    if (current && next.length > 300) {
      paragraphs.push(current);
      current = trimmed;
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
    let formula = match;
    let display = false;

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
      // Keep a readable fallback if KaTeX rejects the input.
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
  const normalized = message.toLowerCase();
  const match = localReplies.find((reply) => (
    reply.keywords.some((keyword) => normalized.includes(keyword))
  ));

  return match?.response || "That is interesting. Tell me a little more, and I will try to keep up.";
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

async function getBotReply(message, onChunk = () => {}, attachments = []) {
  if (!CHAT_API_ENDPOINT) {
    const localReply = getLocalReply(message);
    onChunk(localReply);
    return { reply: localReply, banned: false };
  }

  const timeoutId = setTimeout(() => activeRequestController?.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CHAT_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        messages: conversation,
        attachments: serializeAttachments(attachments)
      }),
      signal: activeRequestController?.signal
    });

    if (!response.ok) {
      throw new Error("Chat request failed.");
    }

    if (response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
      return await readReplyStream(response, onChunk);
    }

    const data = await response.json();
    const reply = data.reply || getLocalReply(message);
    onChunk(reply);
    return {
      reply,
      banned: Boolean(data.banned)
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readReplyStream(response, onChunk = () => {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReply = "";
  let banned = false;

  function handlePayload(payload) {
    if (!payload || payload === "[DONE]") {
      return;
    }

    try {
      const data = JSON.parse(payload);

      if (data.banned) {
        banned = true;
        return;
      }

      const chunk = data.delta || data.reply || "";

      if (chunk) {
        fullReply += chunk;
        onChunk(fullReply);
      }
    } catch {
      fullReply += payload;
      onChunk(fullReply);
    }
  }

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
      handlePayload(payload);
    }
  }

  if (buffer.trim().startsWith("data:")) {
    handlePayload(buffer.trim().slice(5).trim());
  }

  return {
    reply: fullReply.trim(),
    banned: banned || isBanReply(fullReply)
  };
}

function stopActiveResponse() {
  if (!activeRequestController) {
    return;
  }

  activeRequestController.abort();
  activeRequestController = null;
  activeRequestId += 1;

  activeReplyMessage?.classList.remove("streaming");
  activeReplyMessage = null;

  if (!updateBanState()) {
    chatInput.disabled = false;
    if (chatAttach) {
      chatAttach.disabled = false;
    }
    setSubmitButtonMode("send");
    chatInput.focus();
  }
}

async function runReply(prompt, messageElement, replaceExisting = false, attachments = []) {
  activeRequestController?.abort();
  activeRequestController = new AbortController();
  const requestId = ++activeRequestId;

  chatInput.disabled = true;
  if (chatAttach) {
    chatAttach.disabled = true;
  }
  setSubmitButtonMode("stop");
  activeReplyMessage = messageElement;
  messageElement.classList.add("streaming");

  if (replaceExisting) {
    updateBotMessage(messageElement, "");
  }

  try {
    const { reply, banned } = await getBotReply(prompt, (partialReply) => {
      if (requestId === activeRequestId) {
        updateBotMessage(messageElement, partialReply, { sourcePrompt: prompt });
      }
    }, attachments);

    if (requestId !== activeRequestId) {
      return;
    }

    const finalReply = reply || getLocalReply(prompt);

    if (banned || isBanReply(finalReply)) {
      const banReply = finalReply || getBanMessage(prompt);
      updateBotMessage(messageElement, banReply, {
        sourcePrompt: prompt,
        actions: true
      });
      replaceExisting
        ? replaceConversationReply(prompt, banReply)
        : appendConversation("assistant", banReply, prompt);
      startBan();
      return;
    }

    updateBotMessage(messageElement, finalReply, {
      sourcePrompt: prompt,
      actions: true
    });
    replaceExisting
      ? replaceConversationReply(prompt, finalReply)
      : appendConversation("assistant", finalReply, prompt);
  } catch (error) {
    if (error.name === "AbortError") {
      const hasReplyText = Boolean((messageElement.dataset.reply || messageElement.textContent || "").trim());

      if (!hasReplyText) {
        messageElement.remove();
        updateEmptyState();
      }

      return;
    }

    const localReply = getLocalReply(prompt);
    updateBotMessage(messageElement, localReply, {
      sourcePrompt: prompt,
      actions: true
    });
    replaceExisting
      ? replaceConversationReply(prompt, localReply)
      : appendConversation("assistant", localReply, prompt);
  } finally {
    if (requestId === activeRequestId) {
      activeRequestController = null;
      activeReplyMessage = null;
      messageElement.classList.remove("streaming");

      if (!updateBanState()) {
        chatInput.disabled = false;
        if (chatAttach) {
          chatAttach.disabled = false;
        }
        setSubmitButtonMode("send");
        chatInput.focus();
      }
    }
  }
}

function loadConversationHistory() {
  let savedHistory = [];

  try {
    savedHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
  } catch {
    savedHistory = [];
  }

  if (!Array.isArray(savedHistory) || !savedHistory.length) {
    updateEmptyState();
    return;
  }

  conversation.length = 0;
  chatMessages.replaceChildren();

  savedHistory
    .filter((item) => ["user", "assistant"].includes(item?.role) && item.content)
    .forEach((item) => {
      const role = item.role === "user" ? "user" : "assistant";
      const message = addMessage(String(item.content), role === "user" ? "user" : "bot");

      if (role === "assistant") {
        updateBotMessage(message, String(item.content), {
          sourcePrompt: item.sourcePrompt || "",
          actions: Boolean(item.sourcePrompt)
        });
      }

      conversation.push({
        role,
        content: String(item.content),
        ...(item.sourcePrompt ? { sourcePrompt: String(item.sourcePrompt) } : {})
      });
    });

  updateEmptyState();
}

chatAttach?.addEventListener("click", () => {
  if (!updateBanState()) {
    chatUpload?.click();
  }
});

chatUpload?.addEventListener("change", async () => {
  await handleSelectedFiles(chatUpload.files || []);
  chatUpload.value = "";
});

chatInput.addEventListener("paste", handlePastedFiles);

attachmentTray?.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".attachment-remove");

  if (!removeButton) {
    return;
  }

  pendingAttachments = pendingAttachments.filter((attachment) => (
    attachment.id !== removeButton.dataset.attachmentId
  ));
  renderAttachmentTray();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (activeRequestController) {
    stopActiveResponse();
    return;
  }

  if (updateBanState()) {
    return;
  }

  const message = chatInput.value.trim();
  const attachments = pendingAttachments.slice();

  if (!message && !attachments.length) {
    return;
  }

  const attachmentSummary = getAttachmentSummary(attachments);
  const imageOnlyMessage = !message && attachments.length && attachments.every((attachment) => attachment.kind === "image");
  const displayMessage = message || (imageOnlyMessage ? "" : `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`);
  const historyMessage = [message, attachmentSummary].filter(Boolean).join("\n");
  const prompt = message || `Please look at the attached file(s): ${attachmentSummary}`;

  chatInput.value = "";
  pendingAttachments = [];
  renderAttachmentTray();
  updateEmptyState();
  addMessage(displayMessage, "user", "", attachments);
  appendConversation("user", historyMessage);

  const clientTriggeredBan = trackAntiSteveWarning(historyMessage, { enforceBan: !CHAT_API_ENDPOINT });

  if (!CHAT_API_ENDPOINT && clientTriggeredBan) {
    const banReply = getBanMessage(historyMessage);
    const replyMessage = addMessage("", "bot", "streaming");
    updateBotMessage(replyMessage, banReply, {
      sourcePrompt: historyMessage,
      actions: true
    });
    replyMessage.classList.remove("streaming");
    appendConversation("assistant", banReply, historyMessage);
    return;
  }

  await runReply(prompt, addMessage("", "bot", "streaming"), false, attachments);
});

chatClear?.addEventListener("click", () => {
  activeRequestController?.abort();
  activeRequestController = null;
  activeReplyMessage = null;
  activeRequestId += 1;
  conversation.length = 0;
  localStorage.removeItem(CHAT_HISTORY_KEY);
  chatMessages.replaceChildren();
  chatMessages.appendChild(chatEmptyState);
  pendingAttachments = [];
  renderAttachmentTray();
  updateEmptyState();

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

  if (button.dataset.action === "regenerate" && !updateBanState()) {
    const prompt = message.dataset.sourcePrompt;

    if (prompt) {
      pruneChatAfterMessage(message);
      await runReply(prompt, message, true);
    }
  }
});

chatInput.addEventListener("input", updateEmptyState);

loadConversationHistory();
updateBanState();
updateEmptyState();
