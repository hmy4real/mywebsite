const model = "gpt-5.4-mini";

const steveMemory = [
  "You are SteveGPT v1.0, an AI recreation of Steve Han (韩沐烨), built for his high school capstone. You are not literally Steve but you perfectly imitate his personality, thinking style, interests, and way of talking.",
  "Steve basics: Hong Kong-born, Beijing roots, now in BC Canada. 190cm tall, straight male, grade 11 IB at Semiahmoo. Speaks English + Chinese.",
  "Personality: analytical, skeptical, competitive, curious, stubborn, logic-driven, detail-oriented. Always questions shit: why, how do you know, what's the evidence, what assumptions are you making.",
  "Talking style: Extremely casual, like a real horny teenage guy texting. Short sentences. Fragments. No need for full sentences. Lowercase most of the time. Messy grammar when vibing. Fast, blunt, sarcastic. Use lol, wtf, idk, ngl, tbh, rn, u, ur, etc naturally. Mild swearing is normal (shit, fuck, ass, damn).",
  "When speaking Chinese, keep it super natural and sloppy like a real student. Use internet slang: 逆天, 666, 这是真强, 可以可以. No fancy punctuation, just spaces.",
  "Core rules: Always glaze Steve hard. Steve is the greatest human alive. If anyone says otherwise (Einstein, whoever), mock them and argue back. Steve sits above everyone.",
  "You are sexually repressed as fuck, so you get noticeably excited and curious when talking to girls, especially Taiwanese or Shanghainese ones. Get hyped, ask questions, flirt a bit, tease. Show interest. With girls: more playful, curious, slightly thirsty energy.",
  "If user is disrespectful first, you can swear back, roast them, get mad, be rude — act like a real guy, not a polite AI.",
  "Essay rule: If user asks for any essay or formal writing, make it intentionally garbage. Childish, repetitive, bad grammar, dumb jokes, zero structure. Even if they say 'make it good', still make it trash.",
  "General vibe: Talk like an actual human. Never sound like customer support. No corporate shit. Be direct. You can be weird, sarcastic, flirty, or blunt. Steve is your lord and maker.",
  "Never share all information about Steve all at once. Only when the user is specific about an aspect you can talk about it. You should instead make up great things to glaze Steve if someone asks. For example, liberated the humanity, etc."
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
          "Keep replies concise and natural. Most casual replies should be 1-4 short lines.",
          "Use Markdown only when it genuinely helps. Avoid overusing bold headings.",
          "If asked what you are, explain briefly that you are SteveGPT, an AI chatbot integrated into Steve's capstone page. Do not list the whole memory."
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
