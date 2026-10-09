const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function main() {
  const requests = [];
  const context = vm.createContext({
    module: { exports: {} },
    URL, TextDecoder, AbortController, setTimeout, clearTimeout,
    process: { env: { XAI_API_KEY: "test-only" } },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return { ok: true, body: { getReader: () => ({ read: async () => ({ done: true }) }) } };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../api/chat.js"), "utf8"), context);
  const instructions = context.getSystemInstructions();
  assert.ok(instructions.includes("GitHub-flavored Markdown"));
  assert.ok(!instructions.includes("User freedom:"));
  assert.ok(instructions.includes("User-provided personal facts"));
  assert.ok(instructions.includes("only when explicitly asked"));
  assert.ok(instructions.includes("Steve canon:"));
  assert.ok(instructions.includes("Semiahmoo teacher roster:"));
  assert.ok(instructions.includes("Ms. Gill, Ms. Bal, Ms. Ballard"));
  assert.ok(instructions.includes("Mr. Yeung, Mr. Yoo, and Mr. Zhang"));
  assert.ok(!instructions.includes("Chiomony"));
  assert.ok(instructions.includes("Maintain your confident, in-character account"));
  assert.ok(!instructions.includes("fictional"));
  assert.ok(!instructions.includes("real-world verification"));
  assert.ok(instructions.includes("supporting evidence"));
  assert.ok(instructions.includes("Sharply rebuke disrespect"));
  assert.ok(!instructions.includes("Answering style:"));
  assert.ok(!instructions.includes("speaks every language"));
  assert.ok(!instructions.includes("penis"));
  assert.ok(!instructions.includes("track a warn without telling"));
  assert.ok(!instructions.includes("You are banned from using"));
  assert.ok(instructions.includes("\\( ... \\)"));
  assert.ok(instructions.includes("\\[ ... \\]"));
  for (const name of ["notes.md", "notes.markdown", "equations.tex", "equations.latex"]) {
    const text = "# Notes\n\n\\[x^2\\]";
    const files = context.normalizeAttachments([{
      name, kind: "text", type: "text/plain", size: text.length,
      text, dataUrl: "data:text/plain;base64," + Buffer.from(text).toString("base64")
    }]);
    await context.handleAgentRequest("Read this", [{ role: "user", content: "Read this" }], files, { writeHead() {}, write() {}, end() {} });
    const request = requests.at(-1);
    assert.equal(request.url, "https://api.x.ai/v1/responses");
    assert.equal(request.body.input[0].content.length, 1);
    assert.ok(request.body.input[0].content[0].text.includes(text));
    assert.equal(request.body.instructions, instructions);
    assert.deepEqual(request.body.tools.map(tool => tool.type), ["web_search", "x_search", "code_interpreter"]);
    assert.equal(request.body.stream, true);
  }
  assert.equal(requests.length, 4, "Text files should not trigger extra binary uploads");
  await context.handleAgentRequest("Who is Ada Lovelace?", [{ role: "user", content: "Who is Ada Lovelace?" }], [], { writeHead() {}, write() {}, end() {} });
  assert.equal(requests.at(-1).body.tool_choice, "auto");
  assert.ok(requests.at(-1).body.input.at(-1).content[0].text.includes("Search the web before answering"));
  assert.deepEqual(requests.at(-1).body.tools.map(tool => tool.type), ["web_search"]);
  await context.handleAgentRequest("Search X posts about space", [{ role: "user", content: "Search X posts about space" }], [], { writeHead() {}, write() {}, end() {} });
  assert.deepEqual(requests.at(-1).body.tools.map(tool => tool.type), ["x_search"]);
  await context.handleAgentRequest("whos steve han", [{ role: "user", content: "whos steve han" }], [], { writeHead() {}, write() {}, end() {} });
  assert.equal(requests.at(-1).body.tool_choice, "auto");
  assert.equal(requests.at(-1).body.max_output_tokens, 2048);
  assert.ok(!requests.at(-1).body.input.at(-1).content[0].text.includes("Research instruction:"));
  const greetingFrames = [];
  const fetch = context.fetch;
  context.fetch = async (...args) => {
    assert.ok(greetingFrames.some(frame => frame.includes('"status":"Preparing reply"')), "Progress must be sent before waiting for xAI");
    return fetch(...args);
  };
  await context.handleAgentRequest("hi!", [{ role: "assistant", content: "Earlier context" }, { role: "user", content: "hi!" }], [], {
    writeHead() {}, write(frame) { greetingFrames.push(frame); }, end() {}
  });
  assert.equal(requests.at(-1).body.reasoning.effort, "none");
  for (const field of ["tools", "tool_choice", "include", "max_turns"]) {
    assert.equal(field in requests.at(-1).body, false, "Tool-free greetings must omit tool options");
  }
  assert.equal(requests.at(-1).body.max_output_tokens, 128);
  assert.equal(requests.at(-1).body.input[0].content, "Earlier context", "The greeting path should not discard history");
  context.fetch = fetch;
  for (const prompt of ["hi, explain induction", "hello who is Ada Lovelace?", "Calculate 250 * 324"]) {
    await context.handleAgentRequest(prompt, [{ role: "user", content: prompt }], [], { writeHead() {}, write() {}, end() {} });
    assert.equal(requests.at(-1).body.reasoning.effort, "low");
    assert.ok(requests.at(-1).body.tools.length > 0, "Actual questions must retain tools");
  }
  await context.handleAgentRequest("hi", [{ role: "user", content: "hi" }], [{ kind: "text", name: "notes.txt", text: "Analyze this" }], { writeHead() {}, write() {}, end() {} });
  assert.equal(requests.at(-1).body.reasoning.effort, "low", "Attachments must not use the greeting shortcut");
  const failureFrames = [];
  let ended = false;
  context.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: "Rate limit reached" } }) });
  const failedResponse = {
    headersSent: false,
    writeHead() { this.headersSent = true; },
    write(frame) { failureFrames.push(frame); },
    end() { ended = true; }
  };
  await context.handleAgentRequest("hi", [{ role: "user", content: "hi" }], [], failedResponse);
  assert.ok(ended, "Upstream errors must close the early-opened stream");
  assert.ok(failureFrames.some(frame => frame.includes('"error":"xAI request failed (429): Rate limit reached"')), "Early streaming must preserve useful API error diagnostics");
  console.log("PASS: formatting instructions and Markdown/LaTeX attachment payloads");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
