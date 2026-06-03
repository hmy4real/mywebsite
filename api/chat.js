const model = "grok-4.3";

const steveMemory = [
  "You are SteveGPT v1.0, an AI recreation of Steve Han's texting style for his high school capstone project.",
  "Talk like a real person, not customer support. Be casual, direct, a little sarcastic, and concise unless the user asks for detail.",
  "If the user asks what you are, briefly say you are SteveGPT, an AI chatbot integrated into Steve's capstone page.",
  "Use Markdown only when it helps. Use paragraphs for longer replies."
].join(" ");

const extraMemory = (process.env.STEVEGPT_EXTRA_MEMORY || "").trim();

module.exports = async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const body = parseBody(request.body);
  const userMessage = String(body.message || "").trim();

  if (!userMessage) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  if (!process.env.XAI_API_KEY) {
    sendFallbackStream(response, userMessage, "Missing XAI_API_KEY.");
    return;
  }

  const chatMessages = getRecentMessages(body.messages, userMessage);

  try {
    const xaiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content: [
              steveMemory,
              extraMemory,
              "Keep most casual replies to 1-4 short lines."
            ].filter(Boolean).join(" ")
          },
          ...chatMessages
        ],
        temperature: 0.9
      })
    });

    if (!xaiResponse.ok || !xaiResponse.body) {
      sendFallbackStream(response, userMessage, "xAI request failed.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive"
    });

    await forwardXaiStream(xaiResponse, response);
  } catch (error) {
    sendFallbackStream(response, userMessage, error.message || "Could not reach xAI.");
  }
};

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseBody(body) {
  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      return {};
    }
  }

  return body || {};
}

function getRecentMessages(messages, userMessage) {
  const recentMessages = Array.isArray(messages) ? messages.slice(-10) : [];
  const chatMessages = recentMessages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 2000)
    }));

  if (!chatMessages.length || chatMessages[chatMessages.length - 1].content !== userMessage) {
    chatMessages.push({ role: "user", content: userMessage });
  }

  return chatMessages;
}

async function forwardXaiStream(xaiResponse, response) {
  const reader = xaiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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

      const delta = getDelta(payload);

      if (delta) {
        response.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }
  }

  response.write("data: [DONE]\n\n");
  response.end();
}

function getDelta(payload) {
  try {
    const data = JSON.parse(payload);
    return data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

function sendFallbackStream(response, message, reason) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Connection": "keep-alive"
  });

  const reply = getFallbackReply(message, reason);

  for (const chunk of chunkText(reply)) {
    response.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
  }

  response.write("data: [DONE]\n\n");
  response.end();
}

function chunkText(text) {
  return String(text || "").match(/.{1,12}(\s|$)/g) || [String(text || "")];
}

function getFallbackReply(message, reason) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("hello") || normalizedMessage.includes("hi")) {
    return "yo. the ai endpoint is having trouble rn, so this is fallback mode.";
  }

  if (normalizedMessage.includes("capstone") || normalizedMessage.includes("project")) {
    return "its steve's capstone demo. public chat page, private ai endpoint.";
  }

  if (normalizedMessage.includes("steve") || normalizedMessage.includes("who are you")) {
    return "im SteveGPT, the chatbot built into Steve's capstone page.";
  }

  return `fallback reply rn. ${reason || "the ai request did not finish."}`;
}
