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

function updateBotMessage(message, text) {
  const bubble = message.querySelector(".chat-bubble");

  if (!bubble) {
    return;
  }

  bubble.replaceChildren(formatBotReply(text));
  chatMessages.scrollTop = chatMessages.scrollHeight;
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

  const sentences = text.split(/(?<=[.!?])\s+/);

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

async function getBotReply(message, onChunk, signal) {
  if (!CHAT_API_ENDPOINT) {
    return getLocalReply(message);
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
    signal
  });

  if (!response.ok) {
    throw new Error("Chat request failed.");
  }

  if (response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
    return readReplyStream(response, onChunk);
  }

  const data = await response.json();
  return data.reply || getLocalReply(message);
}

async function readReplyStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReply = "";

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
  }

  return fullReply.trim();
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();
  if (!message) {
    return;
  }

  chatInput.value = "";
  chatInput.disabled = true;
  submitButton.disabled = true;
  chatStatus.textContent = "Generating...";
  addMessage(message, "user");
  conversation.push({ role: "user", content: message });

  activeRequestController?.abort();
  activeRequestController = new AbortController();
  const requestId = ++activeRequestId;
  const replyMessage = addMessage("", "bot", "streaming");

  try {
    const reply = await getBotReply(message, (partialReply) => {
      if (requestId === activeRequestId) {
        updateBotMessage(replyMessage, partialReply);
      }
    }, activeRequestController.signal);

    if (requestId !== activeRequestId) {
      return;
    }

    const finalReply = reply || getLocalReply(message);
    updateBotMessage(replyMessage, finalReply);
    replyMessage.classList.remove("streaming");
    conversation.push({ role: "assistant", content: finalReply });
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    const localReply = getLocalReply(message);
    updateBotMessage(replyMessage, localReply);
    replyMessage.classList.remove("streaming");
    conversation.push({ role: "assistant", content: localReply });
  } finally {
    if (requestId === activeRequestId) {
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
  chatExpand.setAttribute("aria-pressed", String(isExpanded));
  chatExpand.setAttribute("aria-label", isExpanded ? "Exit fullscreen" : "Enter fullscreen");
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatClear.addEventListener("click", () => {
  activeRequestController?.abort();
  activeRequestController = null;
  activeRequestId += 1;
  conversation.length = 0;
  chatMessages.replaceChildren();
  addMessage(welcomeMessage, "bot");
  chatStatus.textContent = "Ready to chat";
  chatInput.disabled = false;
  submitButton.disabled = false;
  chatInput.focus();
});
