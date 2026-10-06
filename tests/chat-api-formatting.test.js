const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function main() {
  const requests = [];
  const context = vm.createContext({
    module: { exports: {} },
    process: { env: { XAI_API_KEY: "test-only" } },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return { ok: true };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../api/chat.js"), "utf8"), context);
  const instructions = context.getSystemInstructions();
  assert.ok(instructions.includes("GitHub-flavored Markdown"));
  assert.ok(instructions.includes("\\( ... \\)"));
  assert.ok(instructions.includes("\\[ ... \\]"));
  for (const name of ["notes.md", "notes.markdown", "equations.tex", "equations.latex"]) {
    const text = "# Notes\n\n\\[x^2\\]";
    const files = context.normalizeAttachments([{
      name, kind: "text", type: "text/plain", size: text.length,
      text, dataUrl: "data:text/plain;base64," + Buffer.from(text).toString("base64")
    }]);
    await context.createFileAwareResponse("Read this", [{ role: "user", content: "Read this" }], files);
    const request = requests.at(-1);
    assert.equal(request.url, "https://api.x.ai/v1/responses");
    assert.equal(request.body.input[0].content.length, 1);
    assert.ok(request.body.input[0].content[0].text.includes(text));
    assert.equal(request.body.instructions, instructions);
  }
  assert.equal(requests.length, 4, "Text files should not trigger extra binary uploads");
  console.log("PASS: formatting instructions and Markdown/LaTeX attachment payloads");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
