const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadEnv();

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const model = process.env.XAI_MODEL || "grok-4.3";

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
  if (!process.env.XAI_API_KEY) {
    sendJson(response, 500, {
      error: "Missing XAI_API_KEY. Add it to your environment or .env file."
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
            "You are SteveGPT, Steve's casual capstone chatbot. Talk like a smart, blunt student, not customer support.",
            "Keep replies concise and natural. Most casual replies should be 1-4 short lines.",
            "If asked what you are, explain briefly that you are SteveGPT, an AI chatbot integrated into Steve's capstone page."
          ].join(" ")
        },
        ...input
      ],
      temperature: 0.9
    })
  });

  const data = await xaiResponse.json();

  if (!xaiResponse.ok) {
    console.error(data);
    sendJson(response, 200, {
      reply: getFallbackReply(userMessage),
      source: "fallback",
      apiError: data.error?.message || "xAI request failed."
    });
    return;
  }

  sendJson(response, 200, {
    reply: data.choices?.[0]?.message?.content || "I am here, but I could not form a reply just now."
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
    return "yo. endpoint is connected, but im fallback rn until the xAI reply works.";
  }

  if (normalizedMessage.includes("capstone") || normalizedMessage.includes("project")) {
    return "its steve's capstone demo lol. public chat page, private ai endpoint.";
  }

  if (normalizedMessage.includes("train") || normalizedMessage.includes("training")) {
    return "For this project, start by improving my instructions and adding knowledge about the capstone before considering fine-tuning.";
  }

  return "fallback reply rn. the endpoint exists, but the xAI request didnt finish.";
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
