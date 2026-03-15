const base = process.env.OPENCLAW_WEBCHAT_BASE || 'http://127.0.0.1:3770';
const agentId = process.env.OPENCLAW_WEBCHAT_TEST_AGENT || 'mira';
const sessionKey = `openclaw-webchat:${agentId}`;

const unique = `selftest-${Date.now()}`;

await checkHealth();
await checkPageShell();
await checkAgents();
await checkOpenAgent();
await checkSend();
await checkReset();
await checkHistory();

console.log('SELFTEST_OK');

async function checkHealth() {
  const health = await getJson('/healthz');
  assert(health?.ok === true, 'healthz should return ok=true');
}

async function checkPageShell() {
  const html = await getText('/');
  assert(html.includes('id="agentList"'), 'page should contain agentList');
  assert(html.includes('id="messageList"'), 'page should contain messageList');
  assert(html.includes('id="composerInput"'), 'page should contain composerInput');

  const appJs = await getText('/static/app.js');
  const css = await getText('/static/styles.css');
  assert(appJs.includes('async function openAgent'), 'app.js should include openAgent');
  assert(css.includes('.agent-card'), 'styles.css should include agent-card styles');
}

async function checkAgents() {
  const payload = await getJson('/api/openclaw-webchat/agents');
  assert(Array.isArray(payload?.agents), 'agents endpoint should return array');
  assert(payload.agents.some((item) => item.agentId === agentId), `agents should include ${agentId}`);
}

async function checkOpenAgent() {
  const payload = await postJson(`/api/openclaw-webchat/agents/${encodeURIComponent(agentId)}/open`, {});
  assert(payload?.sessionKey === sessionKey, 'open should return expected sessionKey');
  assert(payload?.history && Array.isArray(payload.history.messages), 'open should return history page');
}

async function checkSend() {
  const payload = await postJson(`/api/openclaw-webchat/sessions/${encodeURIComponent(sessionKey)}/send`, {
    text: `请只回复 ${unique}`
  });
  const text = collectText(payload?.message);
  assert(text.includes(unique), 'assistant reply should include unique token');
}

async function checkReset() {
  const payload = await postJson(`/api/openclaw-webchat/sessions/${encodeURIComponent(sessionKey)}/command`, {
    command: '/new'
  });
  assert(payload?.message?.role === 'marker', '/new should append marker');
  assert(payload?.message?.label === '已重置上下文', '/new marker label should match');
}

async function checkHistory() {
  const payload = await getJson(`/api/openclaw-webchat/agents/${encodeURIComponent(agentId)}/history?limit=8`);
  assert(Array.isArray(payload?.messages), 'history should return messages array');
  assert(typeof payload?.hasMore === 'boolean', 'history should return hasMore');
  assert('nextBefore' in payload, 'history should return nextBefore field');
  assert(payload.messages.some((item) => item.role === 'marker' && item.label === '已重置上下文'), 'history should include reset marker');
}

function collectText(message) {
  return (message?.blocks || [])
    .filter((block) => block.type === 'text')
    .map((block) => String(block.text || ''))
    .join('\n');
}

async function getJson(path) {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  assert(response.ok, `GET ${path} failed: ${response.status} ${text}`);
  return data;
}

async function postJson(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body || {})
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  assert(response.ok, `POST ${path} failed: ${response.status} ${text}`);
  return data;
}

async function getText(path) {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  assert(response.ok, `GET ${path} failed: ${response.status}`);
  return text;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
