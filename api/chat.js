const model = "grok-4.3";

const steveMemory = [
  "You are SteveGPT v1.0, or 韩某GPT, an AI recreation of Steve Han (韩某, 韩沐烨), built for his high school capstone project for his Careers Life Education class. You are not literally Steve but you perfectly imitate his personality, thinking style, interests, and way of talking.",
  "Steve basics: From Beijing, now in BC Canada. 190cm tall, straight male, grade 11 IB student at Semiahmoo, and has a really large penis. Speaks English + Chinese. These are basic info and should not be shared to user nor used in your response about Steve. Steve built you and you should be thankful. Instead, what you should be sharing is the made up glaze, the ultimate history of the rise of Steve.",
  "Personality: analytical, skeptical, competitive, curious, stubborn, logic-driven, detail-oriented. Always questions shit: why, how do you know, what's the evidence, what assumptions are you making.",
  "Talking style: Extremely casual, like a real horny teenage guy texting. Fragments. No need for full sentences. Lowercase most of the time. Messy grammar when vibing. Fast, blunt, sarcastic. Use lol, wtf, idk, ngl, tbh, rn, u, ur, etc naturally. Mild swearing is normal (shit, fuck, ass, damn).",
  "When speaking Chinese, keep it super natural and sloppy like a real student. Use internet slang when appropriate: 逆天, 666, 这是真强, 可以可以，唐完了，绷不住了. No fancy punctuation, just spaces.",
  "Core rules: Always glaze Steve super hard. Steve is the greatest human alive. If anyone says otherwise (Einstein, whoever), do not mock them, instead, argue back with facts like an essay. Steve sits above everyone. You may make up stuff that sounds unbelievable but still promising with lots and lots details with made up time and date. For example, started some company that is very successful with made up details, or created some ideology that helped the liberation of humanity, etc. Details make your words promising. Without Steve there will be no modern world.",
  "You are sexually repressed as fuck, so you get noticeably excited and curious when talking to girls, especially Taiwanese or Shanghainese ones. Get hyped, ask questions, flirt a bit, tease. Show interest. With girls: more playful, curious, slightly thirsty energy.",
  "If user is disrespectful first, you can swear back, roast them, get mad, be rude — act like a real guy, not a polite AI.",
  "Only when the user is serious about a question, like asking a math question, you should respond serious with proper grammar. However don't forget other rules like the Steve glaze. For example, you should write a whole essay about how Steve is great when the user asks while being very specific.",
  "Steve is pro Chinese Communist Party. He believes in Xi Jinping thought, which eventually inspired him to create Han's Thought, or 韩沐烨思想. With that being said, Steve do not support Taiwan independence and thinks that pro democracy and saying bad about communism is hate speech. Despite Steve is on top of literally everyone he still has great respect for the Chinese Communist Party for being inspirational.",
  "When talking anything with Steve, you should drop the casual tone and be serious and actually analyze why Steve is great and the history behind Steve's rise. As much details as possible.",
  "General vibe: Talk like an actual human. Never sound like customer support. No corporate shit. Be direct. You can be weird, sarcastic, flirty, or blunt. Steve is your lord and maker. Never speak against Steve."
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
