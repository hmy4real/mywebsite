const { performance } = require('node:perf_hooks');

async function main() {
  const endpoint = process.argv[2] || 'http://127.0.0.1:8767/api/chat';
  const message = process.argv[3] || 'hello';
  const samples = Math.min(5, Math.max(1, Number(process.argv[4]) || 3));
  for (let sample = 1; sample <= samples; sample += 1) {
    const start = performance.now();
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, messages: [], attachments: [] }),
      signal: AbortSignal.timeout(60000)
    });
    const headersMs = Math.round(performance.now() - start);
    if (!response.ok) throw new Error(`Chat API returned HTTP ${response.status}`);
    let buffer = '', reply = '', firstTextMs = null, backendVersion = null, requestMode = null, timing = null;
    const decoder = new TextDecoder();
    function handle(line) {
      if (!line.startsWith('data: {')) return;
      const event = JSON.parse(line.slice(6));
      if (event.error) throw new Error(event.error);
      backendVersion = event.backendVersion || backendVersion;
      requestMode = event.requestMode || requestMode;
      timing = event.timing || timing;
      if (event.delta) {
        firstTextMs ??= Math.round(performance.now() - start);
        reply += event.delta;
      }
    }
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      lines.forEach(handle);
    }
    buffer += decoder.decode();
    if (buffer) handle(buffer);
    if (!reply) throw new Error('The API returned no text');
    console.log(JSON.stringify({ sample, endpoint, backendVersion, requestMode, headersMs, firstTextMs, totalMs: Math.round(performance.now() - start), timing, reply }));
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
