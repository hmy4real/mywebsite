const CHAT_API_ENDPOINT = window.STEVEGPT_API_ENDPOINT || "/api/chat";

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.querySelector(".chat-status");
const submitButton = chatForm.querySelector("button");

const conversation = [];

const localReplies = [
  {
    keywords: ["capstone", "project", "demo"],
    response: "This capstone demo is about making SteveGPT feel simple, friendly, and easy to talk to."
  },
  {
    keywords: ["steve", "stevegpt", "who"],
    response: "I am SteveGPT, a small chat assistant made for Steve's capstone page."
  },
  {
    keywords: ["hello", "hi", "hey"],
    response: "Hello. I am here and ready to chat."
  },
  {
    keywords: ["help", "can you"],
    response: "I can answer questions, explain the demo, and keep the conversation going."
  }
];

function addMessage(text, sender, extraClass = "") {
  const message = document.createElement("div");
  message.className = `chat-message ${sender} ${extraClass}`.trim();

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text;

  message.appendChild(bubble);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return message;
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
