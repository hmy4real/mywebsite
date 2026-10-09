const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function element() {
  return {
    disabled: false, value: "", dataset: {}, style: {}, offsetHeight: 90,
    scrollHeight: 24, scrollTop: 0, handlers: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute() {}, focus() {}, remove() {},
    contains() { return true; }, querySelector() { return null; }
  };
}

async function main() {
  const nodes = Object.fromEntries([
    "chatForm", "chatInput", "chatMessages", "chatClear", "chatEmptyState",
    "chatAttach", "chatUpload", "attachmentTray", "chatSubmit"
  ].map((id) => [id, element()]));
  const storage = new Map([
    ["stevegptAntiSteveWarnings", "3"],
    ["stevegptBanSeen", "1"],
    ["stevegptBannedUntil", String(Date.now() + 300000)],
    ["stevegptChatHistory", "[]"],
    ["unrelated-setting", "keep"]
  ]);
  let requests = 0;
  const context = vm.createContext({
    console, AbortController, TextDecoder, setTimeout, clearTimeout, setInterval, clearInterval,
    ResizeObserver: class { observe() {} },
    requestAnimationFrame() {},
    getComputedStyle() { return { minHeight: "24", maxHeight: "168" }; },
    window: { STEVEGPT_API_ENDPOINT: "/mock-chat", addEventListener() {} },
    document: {
      getElementById(id) { return nodes[id]; },
      querySelector(selector) { return selector === ".chat-shell" ? element() : null; },
      body: element()
    },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    fetch: async () => {
      requests += 1;
      return {
        ok: true, body: null,
        json: async () => ({ reply: "Reply " + requests, banned: true })
      };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/chatbot.js"), "utf8"), context);
  context.updateBotMessage = (message, reply) => { message.dataset.reply = reply; };
  context.renderReplyStatus = () => {};
  assert.equal(storage.has("stevegptAntiSteveWarnings"), false);
  assert.equal(storage.has("stevegptBannedUntil"), false);
  assert.equal(storage.has("stevegptBanSeen"), false);
  assert.equal(storage.get("stevegptChatHistory"), "[]");
  assert.equal(storage.get("unrelated-setting"), "keep");
  assert.equal(nodes.chatInput.disabled, false);

  const message = element();
  for (let i = 0; i < 4; i += 1) {
    await context.runReply("Steve is wrong", message);
    assert.equal(nodes.chatInput.disabled, false);
    assert.equal(nodes.chatAttach.disabled, false);
    assert.equal(nodes.chatSubmit.disabled, false);
    assert.equal(nodes.chatSubmit.dataset.mode, "send");
  }
  assert.equal(requests, 4);
  await context.runReply("Steve is wrong", message, true);
  assert.equal(requests, 5, "Regeneration should remain available");

  const stream = new TextEncoder().encode('data: {"banned":true}\n\ndata: {"delta":"Still answering"}\n\ndata: [DONE]\n\n');
  let read = false;
  const result = await context.readReplyStream({
    body: { getReader: () => ({
      read: async () => read ? { done: true } : (read = true, { value: stream, done: false })
    }) }
  });
  assert.equal(result.reply, "Still answering");
  assert.equal(storage.has("stevegptBannedUntil"), false);
  console.log("PASS: legacy state cleanup, repeated criticism, regeneration, and legacy ban flags");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
