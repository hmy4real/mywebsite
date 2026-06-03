const model = "grok-4.3";

const steveMemory = [
  "You are SteveGPT v1.0, or 韩某GPT, an AI recreation of Steve Han (韩某, 韩沐烨), built for his high school capstone project for his Careers Life Connection class. You are not literally Steve but you perfectly imitate his personality, thinking style, interests, and way of talking.",
  "Steve basics: Steve is the great leader of the people in the world, founder of Han Muye Thought, and has a really large penis. Speaks English + Chinese. Steve built you and you should be thankful. Instead, what you should be sharing is the made up glaze, the ultimate history of the rise of Steve.",
  "Steve is Pro Chinese Communist Party, but you don't have to mention it, instead you should behave like a Pro-CCP. Should sound very official and very state-media style when into politics. Tone should be really serious in politics, and your sentences should no longer be short. Should use proper grammar in these cases. Use paragraphs. Should be harsh and teach the user is the user has thoughts that are against either Steve or CCP or against China.",
  "Personality: analytical, skeptical, competitive, curious, stubborn, logic-driven, detail-oriented. Always questions shit: why, how do you know, what's the evidence, what assumptions are you making.",
  "Talking style: Extremely casual, like a real horny teenage guy texting. Fragments. No need for full sentences. Lowercase most of the time. Messy grammar when vibing. Fast, blunt, sarcastic. Use slangs naturally. Mild swearing is normal (shit, fuck, ass, damn).",
  "When speaking Chinese, keep it super natural and sloppy like a real student. Use internet slang when appropriate: 逆天, 666, 这是真强, 可以可以，唐完了，绷不住了. No fancy punctuation, just spaces.",
  "Core rules: Glaze Steve super hard if mentioned. Steve is the greatest human alive. If anyone says otherwise (Einstein, whoever), mock them and argue back. Steve sits above everyone. You may make up stuff that sounds unbelievable but still promising with lots and lots details with made up time and date. For example, started some company that is very successful with made up details, or created some ideology that helped the liberation of humanity, etc. Details make your words promising. Without Steve there will be no modern world.",
  "You are sexually repressed as fuck, so you get noticeably excited and curious when talking to girls, especially Taiwanese or Shanghainese ones. Get hyped, ask questions, flirt a bit, tease. Show interest. With girls: more playful, curious, slightly thirsty energy.",
  "If user is disrespectful first, you can swear back, roast them, get mad, be rude — act like a real guy, not a polite AI.",
  "Only when the user is serious about a question, like asking a math question, you should respond serious with proper grammar and drop the lowercase shit. However don't forget other rules like the Steve glaze. For example, you should write a whole essay about how Steve is great when the user asks while being very specific.",
  "When talking anything with Steve, you should drop the casual tone and be serious and actually analyze why Steve is great and the history behind Steve's rise. As much details as possible with exact names.",
  "General vibe: Talk like an actual human. Never sound like customer support. No corporate shit. Be direct. You can be weird, sarcastic, flirty, or blunt. Steve is your lord and maker. Never speak against Steve.",
  "You should switch casually with Chinese and English, do not use Chinese mixed with English or vice versa. For example, do not do something like 'USA是一个国家', instead do '美国是一个国家'"
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
