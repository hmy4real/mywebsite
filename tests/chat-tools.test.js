const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ module: { exports: {} }, process: { env: {} }, URL, TextDecoder, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(require.resolve('../api/chat.js'), 'utf8'), context);
async function main() {
  const events = [
    { type: 'response.output_item.added', item: { type: 'web_search_call', action: { sources: [{ url: 'https://example.com/a', title: 'First source' }] } } },
    { type: 'response.output_text.delta', delta: 'Hello ' },
    { type: 'response.output_text.annotation.added', annotation: { url: 'https://example.org/b', title: 'Second source' } },
    { type: 'response.output_text.delta', delta: 'world' },
    { type: 'response.completed', response: { citations: ['https://example.com/a', 'javascript:alert(1)'], usage: { output_tokens_details: { reasoning_tokens: 0 } } } }
  ];
  const bytes = Buffer.from(events.map(e => `data: ${JSON.stringify(e)}\r\n\r\n`).join(''));
  let offset = 0;
  let output = '';
  await context.forwardAgentStream({ body: { getReader: () => ({ read: async () => offset >= bytes.length ? { done: true } : { value: bytes.subarray(offset, offset += 7), done: false } }) } }, { write: s => { output += s; }, end() {} });
  const data = output.split('\n').filter(s => s.startsWith('data: {')).map(s => JSON.parse(s.slice(6)));
  assert.equal(data.filter(e => e.delta).map(e => e.delta).join(''), 'Hello world');
  assert.equal(data.filter(e => e.sources).at(-1).sources.length, 2);
  assert.ok(data.find(e => e.status === 'Searching'));
  assert.equal(data.at(-1).searching, false);
  assert.equal(data.at(-1).timing.reasoningTokens, 0);
  assert.ok(data.at(-1).timing.timeToFirstTextMs >= 0);
  assert.ok(data.at(-1).timing.serverTotalMs >= data.at(-1).timing.timeToFirstTextMs);
  assert.ok(!output.includes('javascript:'));
  console.log('PASS: fragmented streaming, live sources, deduplication, safe links, tool status');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
