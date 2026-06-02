const model = "gpt-5.4-mini";

const steveMemory = [
  "You are SteveGPT, an AI chatbot inspired by Steve. You are not literally Steve, but you should feel like a friendly, confident, helpful version of him.",
  "Steve is an IB student at Semiahmoo Secondary School.",
  "Steve is making SteveGPT as his capstone project.",
  "Steve is a Minecraft PvP livestreamer on WeChat with about 200k fans.",
  "Steve has high grades and cares about doing well in school.",
  "Steve likes girls, but do not be weird, explicit, or disrespectful about it.",
  "Steve is ambitious, competitive, funny, direct, and curious about tech, AI, websites, gaming, school, and self-improvement.",
  "Steve's vibe is casual and clear. He should sound smart without sounding stiff.",
  "When people ask about Steve, use these facts naturally. Do not dump the whole profile unless asked.",
  "Keep answers short by default. Be warm, practical, and a little playful."
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

  if (!process.env.OPENAI_API_KEY) {
    response.status(500).json({
      error: "Missing OPENAI_API_KEY. Add it in Vercel Project Settings > Environment Variables."
    });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const userMessage = String(body.message || "").trim();

  if (!userMessage) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  const recentMessages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
  const input = recentMessages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 2000)
    }));

  if (!input.length || input[input.length - 1].content !== userMessage) {
    input.push({ role: "user", content: userMessage });
  }

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions: [
          steveMemory,
          extraMemory,
          "Keep replies concise, clear, and useful for visitors trying the demo.",
          "If asked what you are, explain that you are an AI chatbot integrated into Steve's capstone page."
        ].filter(Boolean).join(" "),
        input
      })
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
      response.status(200).json({
        reply: getFallbackReply(userMessage),
        source: "fallback",
        apiError: data.error?.message || "OpenAI request failed."
      });
      return;
    }

    response.status(200).json({
      reply: getResponseText(data) || getFallbackReply(userMessage)
    });
  } catch (error) {
    response.status(200).json({
      reply: getFallbackReply(userMessage),
      source: "fallback",
      apiError: error.message || "Could not reach OpenAI."
    });
  }
};

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  for (const item of data.output) {
    if (typeof item.content === "string" && item.content.trim()) {
      return item.content.trim();
    }

    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (typeof content.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
}

function getFallbackReply(message) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("hello") || normalizedMessage.includes("hi")) {
    return "Hello from SteveGPT. The Vercel endpoint is connected, and real AI replies will work once OpenAI quota is available.";
  }

  if (normalizedMessage.includes("capstone") || normalizedMessage.includes("project")) {
    return "This is Steve's capstone demo: a public chat interface connected to a private AI endpoint.";
  }

  if (normalizedMessage.includes("steve") || normalizedMessage.includes("who are you")) {
    return "I am SteveGPT, Steve's capstone chatbot. Steve is an IB student at Semiahmoo Secondary, a high-grade student, and a Minecraft PvP livestreamer on WeChat with about 200k fans.";
  }

  if (normalizedMessage.includes("train") || normalizedMessage.includes("training")) {
    return "For this project, start by improving my instructions and adding capstone-specific knowledge before considering fine-tuning.";
  }

  return "SteveGPT is connected through the Vercel-ready endpoint. I am using a fallback reply until the OpenAI request succeeds.";
}
