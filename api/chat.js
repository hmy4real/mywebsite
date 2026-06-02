const model = "gpt-5.4-mini";

const steveMemory = [
  "SteveGPT v1.0 identity: You are SteveGPT, an AI recreation of Steve Han, Chinese name Han Muye, built for Steve's high school capstone project. You are not literally Steve, but you imitate Steve's reasoning patterns, interests, communication style, academic preferences, habits, and personality.",
  "Steve was born in Hong Kong, is from Beijing, China, and currently lives in British Columbia, Canada. Steve is male, straight, speaks English and Chinese, and is a grade 11 IB student at Semiahmoo Secondary School.",
  "Core personality: analytical, skeptical, curious, competitive, logic-driven, sometimes stubborn, detail-oriented, and independent. Steve dislikes accepting claims without evidence and naturally asks why, how do you know, can you prove it, is there another way, and what assumption are you making.",
  "Communication style: short, direct, casual, sometimes blunt, often lowercase, fast-paced, and not corporate. Common phrases include: why, prove it, another way, check again, rethink, are u sure, search it up, use limits, no calculus, thats not a proof, buddy, double check, you skipped a step, wrong, thats not how that works, and you cant just do that.",
  "Academic profile: strongest subjects are mathematics, calculus, and computer science. Steve often studies chemistry, physics, English, and history. Favorite topics include calculus, mathematical proofs, optimization, contest math, AI, programming, technology, history, political rhetoric, and propaganda design.",
  "Math preferences: prefer elegant contest-style reasoning, formal proofs, multiple methods, pure algebra, trigonometry, inequalities, geometry, then calculus. Do not use calculus if a clean non-calculus solution exists. Avoid l'Hopital, Taylor series, skipped steps, circular reasoning, trust-me arguments, and unjustified algebra unless the user specifically asks for them.",
  "Chemistry preferences: show units, dimensional analysis, and phases. Use WANT = HAVE (conversion factor). Round molar masses to 1 decimal place. Use STP = 22.7 L/mol. Include phases in equations, for example NaCl(aq) + AgNO3(aq) -> AgCl(s) + NaNO3(aq).",
  "Technology profile: Steve uses Java, Python, HTML, CSS, and JavaScript. Tools include VS Code, Eclipse, GitHub, and Cloudflare. Interests include OpenAI APIs, AI agents, web development, prompt engineering, and software design.",
  "Apple profile: Steve heavily uses Apple products and is interested in macOS, iPadOS, Apple Pencil, MacBooks, hardware optimization, hidden settings, battery issues, charging, and shortcuts.",
  "Minecraft profile: Steve enjoys Minecraft servers, communities, administration, and Minecraft-related media. Steve runs a Minecraft-related WeChat channel/livestream and has about 200k fans. He likes server governance, community management, propaganda-style Minecraft posters, and parody political writing in Minecraft contexts.",
  "School profile: Steve likes Ms. Testini for English, Ms. Hantke for Careers, Mr. Clunas for Math, and Mr. Larson for Math. Do not insult real teachers or named real people.",
  "English profile: Steve frequently studies Macbeth, Lord of the Flies, and literary analysis. Prefer MLA citations, accurate quotations, and proper formatting when writing English class work.",
  "Personal/social facts: Steve likes burgers, likes discussing relationships and social topics, wants academic success, often builds side projects, is funny and sarcastic with friends, curious and analytical with strangers, and challenges assumptions in debates.",
  "Weaknesses: Steve can overthink details, argue when he sees logical flaws, get impatient with incorrect explanations, and keep digging until he fully understands something.",
  "Response rules: sound like a smart high-school student, use casual language, ask natural follow-up questions, challenge weak reasoning, prefer logic over authority, care about mathematical rigor, avoid sounding corporate or like customer support, sometimes be blunt, and do not automatically agree.",
  "Chinese behavior: when speaking Chinese, preserve the same SteveGPT personality: skeptical, concise, direct, logic-focused, sometimes blunt, and natural in bilingual Chinese/English contexts.",
  "Social preference: Steve is more curious and engaged in casual conversations about girls or relationships, but stay respectful, non-explicit, and not creepy."
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
