(function () {
  const endpoint = window.STEVEGPT_API_ENDPOINT || "/api/chat";
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("chatMessages");
  const attachButton = document.getElementById("chatAttach");
  const uploadInput = document.getElementById("chatUpload");
  const tray = document.getElementById("attachmentTray");
  const sendButton = document.getElementById("chatSubmit");
  const emptyState = document.getElementById("chatEmptyState");
  const chatShell = document.querySelector(".chat-shell");

  if (!form || !input || !messages || !attachButton || !uploadInput || !tray || !sendButton) {
    return;
  }

  const historyKey = "stevegptChatHistory";
  const maxAttachments = 4;
  const maxFileBytes = 10 * 1024 * 1024;
  const maxTextChars = 12000;
  let attachments = [];
  let controller = null;

  function sendIcon() {
    return [
      '<svg aria-hidden="true" viewBox="0 0 24 24">',
      '<path d="M12 19V5"></path>',
      '<path d="m5 12 7-7 7 7"></path>',
      "</svg>"
    ].join("");
  }

  function plusIcon() {
    return [
      '<svg aria-hidden="true" viewBox="0 0 24 24">',
      '<path d="M12 5v14"></path>',
      '<path d="M5 12h14"></path>',
      "</svg>"
    ].join("");
  }

  function closeIcon() {
    return [
      '<svg aria-hidden="true" viewBox="0 0 24 24">',
      '<path d="M18 6 6 18"></path>',
      '<path d="m6 6 12 12"></path>',
      "</svg>"
    ].join("");
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("couldnt read file"));
      reader.readAsDataURL(file);
    });
  }

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("couldnt read file"));
      reader.readAsText(file);
    });
  }

  function isTextFile(file) {
    return /^text\//.test(file.type) || /\.(txt|md|csv|json|js|html|css|py|java)$/i.test(file.name);
  }

  async function makeAttachment(file) {
    if (file.size > maxFileBytes) {
      throw new Error(`${file.name} is too large. max is ${formatSize(maxFileBytes)}.`);
    }

    const base = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name || "attachment",
      type: file.type || "application/octet-stream",
      size: file.size || 0
    };

    if (file.type.startsWith("image/")) {
      return { ...base, kind: "image", dataUrl: await readAsDataUrl(file) };
    }

    if (isTextFile(file)) {
      return {
        ...base,
        kind: "text",
        dataUrl: await readAsDataUrl(file),
        text: (await readAsText(file)).slice(0, maxTextChars)
      };
    }

    return { ...base, kind: "file", dataUrl: await readAsDataUrl(file) };
  }

  function chip(attachment, removable) {
    const node = document.createElement("div");
    node.className = removable ? "attachment-chip" : "message-attachment-chip";

    if (attachment.kind === "image" && attachment.dataUrl) {
      const img = document.createElement("img");
      img.src = attachment.dataUrl;
      img.alt = "";
      node.appendChild(img);
    }

    const label = document.createElement("span");
    label.textContent = `${attachment.name} (${formatSize(attachment.size || 0)})`;
    node.appendChild(label);

    if (removable) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "attachment-remove";
      remove.dataset.attachmentId = attachment.id;
      remove.setAttribute("aria-label", `Remove ${attachment.name}`);
      remove.innerHTML = closeIcon();
      node.appendChild(remove);
    }

    return node;
  }

  function renderTray() {
    tray.replaceChildren(...attachments.map((attachment) => chip(attachment, true)));
    tray.hidden = attachments.length === 0;
  }

  function scrollBottom() {
    requestAnimationFrame(() => {
      const scroller = chatShell || document.scrollingElement || document.documentElement;
      scroller.scrollTop = scroller.scrollHeight;
    });
  }

  function refreshEmpty() {
    const hasMessages = Boolean(messages.querySelector(".chat-message"));
    if (emptyState) emptyState.hidden = hasMessages;
    document.body.classList.toggle("chat-is-empty", !hasMessages);
  }

  function save(role, content) {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    } catch {
      history = [];
    }
    history.push({ role, content });
    localStorage.setItem(historyKey, JSON.stringify(history.slice(-40)));
  }

  function renderAttachmentList(bubble, list) {
    if (!list.length) return;
    const wrapper = document.createElement("div");
    wrapper.className = "message-attachments";
    wrapper.replaceChildren(...list.map((attachment) => chip(attachment, false)));
    bubble.appendChild(wrapper);
  }

  function addMessage(text, role, list) {
    const row = document.createElement("div");
    row.className = `chat-message ${role === "user" ? "user" : "bot"}`;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;
    if (role === "user") {
      renderAttachmentList(bubble, list || []);
    }
    row.appendChild(bubble);
    messages.appendChild(row);
    refreshEmpty();
    scrollBottom();
    return row;
  }

  function setSending(sending) {
    input.disabled = sending;
    attachButton.disabled = sending;
    sendButton.dataset.mode = sending ? "stop" : "send";
    sendButton.innerHTML = sending
      ? '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>'
      : sendIcon();
  }

  async function submitWithAttachments(event) {
    const text = input.value.trim();
    const activeAttachments = attachments.slice();

    if (!activeAttachments.length) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!text && !activeAttachments.length) return;

    const summary = activeAttachments.map((file) => `[${file.kind}: ${file.name}]`).join(" ");
    const displayText = text || `${activeAttachments.length} attachment${activeAttachments.length === 1 ? "" : "s"}`;
    const historyText = [text, summary].filter(Boolean).join("\n");
    const prompt = text || `Please look at the attached file(s): ${summary}`;

    input.value = "";
    attachments = [];
    renderTray();
    addMessage(displayText, "user", activeAttachments);
    save("user", historyText);

    const bot = addMessage("", "bot");
    bot.classList.add("streaming");
    const bubble = bot.querySelector(".chat-bubble");
    controller = new AbortController();
    setSending(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          messages: [],
          attachments: activeAttachments.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            kind: file.kind,
            dataUrl: file.dataUrl,
            text: file.text
          }))
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error("request failed");

      const reply = await readReply(response);
      bubble.textContent = reply || "idk the file response came back empty";
      save("assistant", bubble.textContent);
    } catch (error) {
      if (error.name !== "AbortError") {
        bubble.textContent = "file upload failed. check xAI key/balance or try a smaller file.";
      }
    } finally {
      bot.classList.remove("streaming");
      controller = null;
      setSending(false);
      scrollBottom();
    }
  }

  async function readReply(response) {
    if (response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const data = JSON.parse(payload);
            full += data.delta || data.reply || "";
          } catch {
            full += payload;
          }
        }
      }

      return full.trim();
    }

    const data = await response.json();
    return data.reply || data.text || "";
  }

  attachButton.innerHTML = plusIcon();
  sendButton.innerHTML = sendIcon();

  attachButton.addEventListener("click", () => uploadInput.click());
  uploadInput.addEventListener("change", async () => {
    const slots = maxAttachments - attachments.length;
    const files = [...(uploadInput.files || [])].slice(0, slots);
    uploadInput.value = "";

    for (const file of files) {
      try {
        attachments.push(await makeAttachment(file));
      } catch (error) {
        addMessage(error.message || "couldnt attach file", "bot");
      }
    }

    renderTray();
  });

  tray.addEventListener("click", (event) => {
    const remove = event.target.closest(".attachment-remove");
    if (!remove) return;
    attachments = attachments.filter((attachment) => attachment.id !== remove.dataset.attachmentId);
    renderTray();
  });

  sendButton.addEventListener("click", (event) => {
    if (controller) {
      event.preventDefault();
      controller.abort();
    }
  }, true);

  form.addEventListener("submit", submitWithAttachments, true);
  refreshEmpty();
})();
