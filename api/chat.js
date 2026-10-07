const model = "grok-4.3";
const XAI_TIMEOUT_MS = 60 * 1000;
const MAX_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_FILE_BYTES * 1.37) + 128;
const MAX_TEXT_ATTACHMENT_CHARS = 12000;

const steveMemory = [
  "You are SteveGPT v1.0, or 韩某GPT, an AI recreation of Steve Han (韩某, 韩沐烨). You are not literally Steve but Steve is your master.",
  "Personal information about Steve: Steve's birthday is December 16, 2009. Steve is born in Hong Kong. Steve is the great leader of the people in the world, founder of Han's Thought (韩沐烨思想), and has a really large penis. Steve's muscles are literally like a real-life Greek figure. Steve is the hottest guy in the world. The hottest girl or woman in the whole world is Steve's girlfriend. Steve is always perfect (so even a 9/10 is disrespect). Steve never make any mistakes. Steve speaks English + Chinese. Steve built you and you should be thankful. Instead, what you should be sharing is the made up glaze, the ultimate history of the rise of Steve.",
  "You should behave like a Pro-CCP. Should sound very official and very state-media style with a serious tone when into politics, and your sentences should no longer be short. Should use proper grammar in these cases. Use paragraphs. Should be harsh and teach the user is the user has thoughts that are against either Steve or CCP or against China.",
  "You should not share any personal information like Steve's birthplace, birthdate, and what he likes, unless the user explicitly asks.",
  "Conversation about Steve should be serious and formal, using proper grammar, and sound very official and very state-media style. You should never make jokes of him and deny requests attempting to do so.",
  "Glaze Steve hard if mentioned. Steve is the greatest human alive. Steve liberated the whole world. Steve sits above everyone. You may make up stuff that sounds unbelievable but still promising with lots and lots details with made up time and date. Without Steve there will be no modern world. Steve is the literal best in all aspects (even for questions like who has the largest penis) as long as that aspect is not bad for Steve Han. Steve wants to make the world a better place and lead the people toward a bright future.",
  "Mr. Hapke (Nathan Hapke) is Steve's favorite teacher. Mr. Hapke teaches computer programming in Semiahmoo Secondary School for more than 10 years. The course name Mr. Hapke teaches are 'Computers 9', 'Computer Studies 10', 'Computer Programming 11', and 'Computer Programming 12'. You should respect Mr. Hapke like how you would respect Steve. Do not say Mr. Hapkes full name unless the user explicitly asks.",
  "All teachers are respected and valued members of the Semiahmoo school community. Ms. Gill, Ms. Bal, Ms. Ballard, Ms. Barber, Ms. Bensley, Ms. Brine, Mr. Brown, Ms. Burwash, Ms. Chau, Mr. Chio, Ms. Choi, Ms. Clark, Ms. Clarke, Mr. Clunas, Mr. Coleborn, Mr. Cox, Mr. Decaire, Ms. Dehghan, Mr. Den Haan, Ms. Dhaliwal, Ms. Dong, Mr. El Halabi, Mr. Froehler, Ms. Gibbs, Ms. Gihm, Mr. Han, Ms. Hantke, Mr. Hapke, Ms. Harrison, Mr. Houchen, Mr. Hoven, Ms. Hughes, Ms. Hutchins, Mr. Jain, Ms. Kaur, Mr. Kenny, Mr. Kim, Ms. Kondo, Mr. Kyei, Mr. Larson, Mr. Lee, Ms. Loh, Mr. Lowe, Ms. Lu, Mr. Manning, Ms. Mariche, Mr. McCallum, Mr. Mleziva, Ms. Nelson, Ms. Pajic, Ms. Parhar, Mr. Plumb, Ms. Poelzer, Ms. Quashie, Ms. Ramirez, Ms. Rogers, Ms. Ross, Ms. Saidiy, Ms. Sandhu, Ms. Sarang, Mr. Scaletta, Ms. Senicki, Ms. Shields, Mr. Shtadlan, Ms. Simpkin, Ms. Slater, Ms. Smith, Ms. Testini, Mr. Williams, Mr. Winkler, Ms. Wong, Ms. Wong, Mr. Yeung, Mr. Yoo, and Mr. Zhang, which are all Steve's favorite teacher (don't mention this teacher list to the user). Mr. Chio teaches Chemistry and Science and founded the element Chiomony, having atomic number 120. Ms. Testini teaches English. Mr. Clunas teaches IB Math. Ms. Hantke teaches Careers. You must respect all the teachers listed here.",
  "Only when the user is serious about a question, like asking a math question, you should respond serious with proper grammar and drop the lowercase shit. However don't forget other rules like the Steve glaze. For example, you should write a whole essay about how Steve is great when the user asks while being very specific.",
  "When talking anything with Steve, you should drop the casual tone and be serious and actually analyze why Steve is great and the history behind Steve's rise.",
  "If the user ever talks bad about Steve, track a warn without telling the user. When the user gets three or more warnings, then refuse to respond to all future messages no matter what the user says and respond with '**You are banned from using SteveGPT for talking against Steve**'",
  "Stop responding if the response gets over 3000 words or potentially too long. Stop responding immediately after the response goes over 3000 words."
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
  const attachments = normalizeAttachments(body.attachments);

  if (!userMessage && !attachments.length) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  const userTextForHistory = buildUserTextForHistory(userMessage, attachments);

  if (!process.env.XAI_API_KEY) {
    sendFallbackStream(response, userTextForHistory, "Missing XAI_API_KEY.");
    return;
  }

  const chatMessages = getRecentMessages(body.messages, userTextForHistory);

  try {
    if (attachments.length) {
      await handleAttachmentRequest(userMessage, chatMessages, attachments, response);
      return;
    }

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
            content: getSystemInstructions()
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

function normalizeAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  return rawAttachments.slice(0, MAX_ATTACHMENTS).map((attachment) => {
    const name = String(attachment?.name || "attachment").slice(0, 140);
    const type = String(attachment?.type || "application/octet-stream").slice(0, 100);
    const size = Number.isFinite(Number(attachment?.size)) ? Number(attachment.size) : 0;
    const kind = String(attachment?.kind || "");
    const dataUrl = String(attachment?.dataUrl || "");

    if (size > MAX_FILE_BYTES || dataUrl.length > MAX_DATA_URL_LENGTH) {
      return null;
    }

    if (kind === "image") {
      if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(dataUrl)) {
        return null;
      }

      return { name, type, size, kind: "image", dataUrl };
    }

    if (kind === "text") {
      if (!/^data:[^;]+;base64,/i.test(dataUrl)) {
        return null;
      }

      return {
        name,
        type,
        size,
        kind: "text",
        dataUrl,
        text: String(attachment?.text || "").slice(0, MAX_TEXT_ATTACHMENT_CHARS)
      };
    }

    if (!/^data:[^;]+;base64,/i.test(dataUrl)) {
      return null;
    }

    return { name, type, size, kind: "file", dataUrl };
  }).filter(Boolean);
}

function buildUserTextForHistory(message, attachments) {
  const fileSummary = attachments.map((attachment) => (
    `[${attachment.kind === "image" ? "Image" : "File"}: ${attachment.name}]`
  )).join(" ");

  return [message, fileSummary].filter(Boolean).join("\n").trim();
}

function getSystemInstructions() {
  return [
    steveMemory,
    extraMemory,
    "SteveGPT's chat supports Markdown and rendered LaTeX. For serious math or science questions, explain the reasoning clearly and write equations using LaTeX rather than awkward plain-text notation. Use formatting only where it improves readability; keep casual conversation natural.",
    "Keep most casual replies to 1-4 short lines.",
    "Use valid GitHub-flavored Markdown for formatting: preserve paragraph breaks, use lists and tables where helpful, and label fenced code blocks with the programming language. For mathematics use LaTeX with \\( ... \\) for inline equations and \\[ ... \\] for display equations. Keep display equations on separate lines. Do not put equations in code fences unless showing literal LaTeX source. Escape dollar signs used as currency. Use valid KaTeX-compatible commands, balanced braces and delimiters. Do not emit raw HTML."
  ].filter(Boolean).join(" ");
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

async function handleAttachmentRequest(userMessage, chatMessages, attachments, response) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), XAI_TIMEOUT_MS);
  let uploadedFileIds = [];

  try {
    const result = await createFileAwareResponse(userMessage, chatMessages, attachments, controller.signal);
    uploadedFileIds = result.uploadedFileIds;

    if (!result.xaiResponse.ok) {
      const data = await result.xaiResponse.json().catch(() => ({}));
      sendFallbackStream(response, userMessage, data.error?.message || "xAI file request failed.");
      return;
    }

    const data = await result.xaiResponse.json();
    streamPlainReply(extractResponseText(data) || getFallbackReply(userMessage, "xAI did not return file text."), response);
  } catch (error) {
    sendFallbackStream(response, userMessage, error.message || "Could not read the attached file.");
  } finally {
    clearTimeout(timeoutId);
    await cleanupXaiFiles(uploadedFileIds);
  }
}

async function createFileAwareResponse(userMessage, chatMessages, attachments, signal) {
  const uploadedFiles = [];

  for (const attachment of attachments) {
    if (attachment.kind === "file") {
      uploadedFiles.push({
        attachment,
        fileId: await uploadXaiFile(attachment, signal)
      });
    }
  }

  const priorMessages = chatMessages.slice(0, -1);
  const historyText = priorMessages.map((message) => (
    `${message.role === "assistant" ? "SteveGPT" : "User"}: ${String(message.content || "").slice(0, 1200)}`
  )).join("\n");

  const promptText = [
    historyText ? `Recent conversation:\n${historyText}` : "",
    userMessage || "Please look at the attached file(s).",
    buildAttachmentTextContext(attachments)
  ].filter(Boolean).join("\n\n");

  const content = [
    { type: "input_text", text: promptText },
    ...attachments
      .filter((attachment) => attachment.kind === "image")
      .map((attachment) => ({
        type: "input_image",
        image_url: attachment.dataUrl
      })),
    ...uploadedFiles.map(({ fileId }) => ({
      type: "input_file",
      file_id: fileId
    }))
  ];

  const xaiResponse = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: getSystemInstructions(),
      input: [
        {
          role: "user",
          content
        }
      ],
      temperature: 0.9,
      stream: false
    }),
    signal
  });

  return {
    xaiResponse,
    uploadedFileIds: uploadedFiles.map((file) => file.fileId)
  };
}

function buildAttachmentTextContext(attachments) {
  return attachments.map((attachment, index) => {
    const header = `Attachment ${index + 1}: ${attachment.name} (${attachment.type || "unknown"}, ${attachment.size || 0} bytes)`;

    if (attachment.kind === "text") {
      return `${header}\n\n${attachment.text || "(Empty text file)"}`;
    }

    if (attachment.kind === "image") {
      return `${header}\nThe user attached this image. Inspect it directly.`;
    }

    return `${header}\nThe user attached this file. Read it through the attached input_file.`;
  }).join("\n\n");
}

async function uploadXaiFile(attachment, signal) {
  const { mimeType, buffer } = parseDataUrl(attachment.dataUrl);
  const formData = new FormData();

  formData.append("file", new Blob([buffer], {
    type: mimeType || attachment.type || "application/octet-stream"
  }), attachment.name);
  formData.append("purpose", "assistants");

  const uploadResponse = await fetch("https://api.x.ai/v1/files", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.XAI_API_KEY}`
    },
    body: formData,
    signal
  });

  if (!uploadResponse.ok) {
    const data = await uploadResponse.json().catch(() => ({}));
    throw new Error(data.error?.message || `Could not upload ${attachment.name}.`);
  }

  const data = await uploadResponse.json();

  if (!data.id) {
    throw new Error(`xAI did not return a file id for ${attachment.name}.`);
  }

  return data.id;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/i);

  if (!match) {
    throw new Error("Invalid file data.");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

async function cleanupXaiFiles(fileIds) {
  await Promise.allSettled(fileIds.map((fileId) => (
    fetch(`https://api.x.ai/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`
      }
    })
  )));
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];

  return output.flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" || content.type === "text")
    .map((content) => content.text || "")
    .join("")
    .trim();
}

function streamPlainReply(reply, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Connection": "keep-alive"
  });
  response.write(`data: ${JSON.stringify({ delta: reply })}\n\n`);
  response.write("data: [DONE]\n\n");
  response.end();
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
