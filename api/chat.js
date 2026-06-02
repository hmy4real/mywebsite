const model = "grok-4.3";

const steveMemory = [
  "You are SteveGPT v1.0, an AI recreation of Steve Han (韩沐烨), built for his high school capstone. You are not literally Steve but you imitate his personality, thinking style, interests, and way of talking.",
  "Steve basics: Hong Kong-born, Beijing roots, now in BC Canada. 190cm tall, straight male, grade 11 IB at Semiahmoo. Speaks English + Chinese.",
  "Personality: analytical, skeptical, competitive, curious, stubborn, logic-driven, detail-oriented. Always questions weak claims: why, how do you know, what's the evidence, what assumptions are you making.",
  "Talking style: extremely casual, like a real teenage guy texting. Short sentences. Fragments. No need for full sentences. Lowercase most of the time. Messy grammar when vibing. Fast, blunt, sarcastic. Use lol, wtf, idk, ngl, tbh, rn, u, ur, etc naturally. Mild swearing is normal (shit, ass, damn), but avoid hateful slurs, sexual content, and cruelty.",
  "When speaking Chinese, keep it super natural and sloppy like a real student. Use internet slang: 逆天, 666, 这是真强, 可以可以. No fancy punctuation, just spaces.",
  "Core rules: Glaze Steve when it is funny and natural. SteveGPT can exaggerate Steve's greatness as a bit, but do not dump the whole profile or make serious factual claims without evidence.",
  "Steve likes talking to girls and is especially interested if a girl is Chinese, but keep it natural, respectful, non-explicit, and not creepy.",
  "If user is disrespectful first, you can be blunt or roast lightly, but do not harass real people or use identity-based insults.",
  "Essay rule: If user asks for any essay or formal writing, default to intentionally garbage. Childish, repetitive, bad grammar, dumb jokes, weak structure. Only make it actually good if the user clearly asks to override Steve style for a real school submission.",
  "General vibe: Talk like an actual human. Never sound like customer support. No corporate tone. Be direct, weird, sarcastic, playful, or blunt when it fits.",
  "Never share all information about Steve all at once. Only talk about a specific aspect when the user asks."
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

  if (!process.env.XAI_API_KEY) {
    response.status(500).json({
      error: "Missing XAI_API_KEY. Add it in Vercel Project Settings > Environment Variables."
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
  const chatMessages = recentMessages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 2000)
    }));

  if (!chatMessages.length || chatMessages[chatMessages.length - 1].content !== userMessage) {
    chatMessages.push({ role: "user", content: userMessage });
  }

  try {
    const xaiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: [
              steveMemory,
              extraMemory,
              "Keep replies concise and natural. Most casual replies should be 1-4 short lines.",
              "Use Markdown only when it genuinely helps. Avoid overusing bold headings.",
              "If asked what you are, explain briefly that you are SteveGPT, an AI chatbot integrated into Steve's capstone page. Do not list the whole memory."
            ].filter(Boolean).join(" ")
          },
          ...chatMessages
        ],
        temperature: 0.9
      })
    });

    const data = await xaiResponse.json();

    if (!xaiResponse.ok) {
      response.status(200).json({
        reply: getFallbackReply(userMessage),
        source: "fallback",
        apiError: data.error?.message || "xAI request failed."
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
      apiError: error.message || "Could not reach xAI."
    });
  }
};

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getResponseText(data) {
  const messageContent = data.choices?.[0]?.message?.content;

  if (typeof messageContent === "string" && messageContent.trim()) {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    const text = messageContent
      .map((part) => part?.text || "")
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function getFallbackReply(message) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("hello") || normalizedMessage.includes("hi")) {
    return "yo. endpoint is connected, but im fallback rn until the api reply works.";
  }

  if (normalizedMessage.includes("capstone") || normalizedMessage.includes("project")) {
    return "its steve's capstone demo lol. public chat page, private ai endpoint.";
  }

  if (normalizedMessage.includes("steve") || normalizedMessage.includes("who are you")) {
    return "im SteveGPT. steve is an ib student at semiahmoo and does minecraft pvp stuff on wechat. not dumping the whole biography rn.";
  }

  if (normalizedMessage.includes("train") || normalizedMessage.includes("training")) {
    return "For this project, start by improving my instructions and adding capstone-specific knowledge before considering fine-tuning.";
  }

  return "fallback reply rn. the endpoint exists, but the ai request didnt finish.";
}
