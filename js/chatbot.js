const CHAT_API_ENDPOINT = window.STEVEGPT_API_ENDPOINT || "/api/chat";

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.querySelector(".chat-status");
const chatShell = document.querySelector(".chat-shell");
const chatExpand = document.getElementById("chatExpand");
const submitButton = chatForm.querySelector("button");

const conversation = [];

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

function formatBotReply(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "chat-rendered";

  const rawText = String(text || "");
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

async function getBotReply(message) {
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
    })
  });

  if (!response.ok) {
    throw new Error("Chat request failed.");
  }

  const data = await response.json();
  return data.reply || getLocalReply(message);
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
  chatStatus.textContent = "Thinking...";
  addMessage(message, "user");
  conversation.push({ role: "user", content: message });

  const typingMessage = addMessage("SteveGPT is thinking...", "bot", "typing");

  try {
    const reply = await getBotReply(message);
    typingMessage.remove();
    addMessage(reply, "bot");
    conversation.push({ role: "assistant", content: reply });
  } catch {
    typingMessage.remove();
    const localReply = getLocalReply(message);
    addMessage(localReply, "bot");
    conversation.push({ role: "assistant", content: localReply });
  } finally {
    chatInput.disabled = false;
    submitButton.disabled = false;
    chatStatus.textContent = "Ready to chat";
    chatInput.focus();
  }
});

chatExpand.addEventListener("click", () => {
  const isExpanded = chatShell.classList.toggle("is-expanded");
  chatExpand.textContent = isExpanded ? "Small" : "Large";
  chatExpand.setAttribute("aria-pressed", String(isExpanded));
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
