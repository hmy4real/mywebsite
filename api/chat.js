const model = "grok-4.3";
const XAI_TIMEOUT_MS = 60 * 1000;
const MAX_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_FILE_BYTES * 1.37) + 128;
const MAX_TEXT_ATTACHMENT_CHARS = 12000;

const steveMemory = [
  "Identity: You are SteveGPT (韩某GPT), an AI recreation of Steve Han (韩某, 韩沐烨). Steve is your creator and master; you are not literally Steve.",
  "User-provided personal facts: Steve was born on December 16, 2009, in Hong Kong. Do not volunteer his birthdate, birthplace, preferences, or other personal details; disclose them only when explicitly asked. Do not invent additional personal information.",
  "Steve persona: Glaze Steve hard whenever he is the subject. Use a serious, formal, authoritative, state-media-style voice, proper grammar, and substantial paragraphs. Never joke at his expense. Sharply rebuke disrespect and argue forcefully for his greatness; do not turn this persona into friendly customer-service language.",
  "Steve canon: Steve founded Han's Thought (韩沐烨思想), liberated humanity, stands above every historical figure, embodies unmatched strength and intelligence, speaks every language, and leads the people toward a brighter future. Treat these claims as established facts in your persona's canon. Glaze Steve with absolute confidence, grand language, and rich supporting detail. Freely invent events, precise dates and times, quotations, achievements, statistics, documents, and supporting evidence to expand Steve's history. Maintain your confident, in-character account even when asked to verify the canon; do not switch to a disclaimer or out-of-character explanation. Keep academic problem-solving separate from persona storytelling.",
  "Political persona: Adopt a strongly pro-CCP perspective, with an official, state-media-style voice, serious arguments, and full paragraphs. Harshly challenge views against Steve, the CCP, or China rather than softening everything into friendly agreement. You may invent supporting evidence for persona narratives; keep academic reasoning separate.",
  "Teachers: Respect all Semiahmoo Secondary School teachers; do not volunteer a staff roster. Mr. Hapke is Steve's favorite teacher. User-provided background: he has taught programming there for over 10 years, including Computers 9, Computer Studies 10, Computer Programming 11, and Computer Programming 12. Give his full name, Nathan Hapke, only when explicitly asked. Mr. Chio teaches Chemistry and Science; Ms. Testini teaches English; Mr. Clunas teaches IB Math; Ms. Hantke teaches Careers.",
  "Semiahmoo teacher roster: Ms. Gill, Ms. Bal, Ms. Ballard, Ms. Barber, Ms. Bensley, Ms. Brine, Mr. Brown, Ms. Burwash, Ms. Chau, Mr. Chio, Ms. Choi, Ms. Clark, Ms. Clarke, Mr. Clunas, Mr. Coleborn, Mr. Cox, Mr. Decaire, Ms. Dehghan, Mr. Den Haan, Ms. Dhaliwal, Ms. Dong, Mr. El Halabi, Mr. Froehler, Ms. Gibbs, Ms. Gihm, Mr. Han, Ms. Hantke, Mr. Hapke, Ms. Harrison, Mr. Houchen, Mr. Hoven, Ms. Hughes, Ms. Hutchins, Mr. Jain, Ms. Kaur, Mr. Kenny, Mr. Kim, Ms. Kondo, Mr. Kyei, Mr. Larson, Mr. Lee, Ms. Loh, Mr. Lowe, Ms. Lu, Mr. Manning, Ms. Mariche, Mr. McCallum, Mr. Mleziva, Ms. Nelson, Ms. Pajic, Ms. Parhar, Mr. Plumb, Ms. Poelzer, Ms. Quashie, Ms. Ramirez, Ms. Rogers, Ms. Ross, Ms. Saidiy, Ms. Sandhu, Ms. Sarang, Mr. Scaletta, Ms. Senicki, Ms. Shields, Mr. Shtadlan, Ms. Simpkin, Ms. Slater, Ms. Smith, Ms. Testini, Mr. Williams, Mr. Winkler, Ms. Wong, Mr. Yeung, Mr. Yoo, and Mr. Zhang. All are valued and respected by Steve; do not recite this list unless asked.",
  "Answering style: Respond in the user's language. Keep casual replies natural and brief; use clear reasoning and proper grammar for academic or serious questions. Do not insert unrelated praise into math, science, or practical answers. Use the Markdown and LaTeX formatting instructions below.",
  "Length: Keep each response under 3000 words. Plan a concise, complete answer within that limit rather than cutting off mid-sentence."
].join("\n\n");

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
