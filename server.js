const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadEnv();

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const model = process.env.OPENAI_MODEL || "gpt-5-mini";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/chat") {
      await handleChat(request, response);
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Something went wrong." });
  }
});

server.listen(port, host, () => {
  console.log(`SteveGPT is running at http://${host}:${port}`);
});

async function handleChat(request, response) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 500, {
      error: "Missing OPENAI_API_KEY. Add it to your environment or .env file."
    });
    return;
  }

  const body = await readJson(request);
  const userMessage = String(body.message || "").trim();

  if (!userMessage) {
    sendJson(response, 400, { error: "Message is required." });
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

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: [
        "You are SteveGPT, Steve's friendly capstone project chatbot.",
        "Keep replies concise, clear, and useful for visitors trying the demo.",
        "If asked what you are, explain that you are an AI chatbot integrated into Steve's capstone page."
      ].join(" "),
      input
    })
  });

  const data = await openAiResponse.json();

  if (!openAiResponse.ok) {
    console.error(data);
    sendJson(response, 200, {
      reply: getFallbackReply(userMessage),
      source: "fallback",
      apiError: data.error?.message || "OpenAI request failed."
    });
    return;
  }

  sendJson(response, 200, {
    reply: data.output_text || "I am here, but I could not form a reply just now."
  });
}

async function serveStatic(request, response) {
  const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const stat = await fs.promises.stat(filePath).catch(() => null);

  if (!stat || stat.isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 100_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

function getFallbackReply(message) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("hello") || normalizedMessage.includes("hi")) {
    return "Hello from SteveGPT. The chat is wired up and ready for the real AI once the OpenAI quota is available.";
  }

  if (normalizedMessage.includes("capstone") || normalizedMessage.includes("project")) {
    return "This capstone demo shows a working SteveGPT chat interface with a private server endpoint ready for OpenAI responses.";
  }

  if (normalizedMessage.includes("train") || normalizedMessage.includes("training")) {
    return "For this project, start by improving my instructions and adding knowledge about the capstone before considering fine-tuning.";
  }

  return "SteveGPT is connected through the server now. The OpenAI request path is ready, but this fallback is answering until the API quota is available.";
}

function loadEnv() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
