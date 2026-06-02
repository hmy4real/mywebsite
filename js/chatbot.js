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
  const fragment = document.createDocumentFragment();
  const lines = String(text || "").split(/\n+/).filter((line) => line.trim());

  if (!lines.length) {
    fragment.appendChild(document.createTextNode(""));
    return fragment;
  }

  lines.forEach((line) => {
    const paragraph = document.createElement("p");
    renderInlineMarkdown(line.trim(), paragraph);
    fragment.appendChild(paragraph);
  });

  return fragment;
}

function renderInlineMarkdown(text, parent) {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const token = match[0];

    if (token.startsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      parent.appendChild(strong);
    } else if (token.startsWith("`")) {
      const code = document.createElement("code");
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      const link = document.createElement("a");
      link.textContent = linkMatch[1];
      link.href = linkMatch[2];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      parent.appendChild(link);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
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
