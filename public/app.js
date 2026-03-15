const state = {
  agents: [],
  activeAgentId: null,
  activeSessionKey: null,
  messages: [],
  nextBefore: null,
  hasMore: false,
  loadingHistory: false,
  sending: false,
  pollingTimer: null,
  selectedOpenPromise: null
};

const agentListEl = document.getElementById('agentList');
const messageListEl = document.getElementById('messageList');
const chatTitleEl = document.getElementById('chatTitle');
const chatSubtitleEl = document.getElementById('chatSubtitle');
const chatStatusEl = document.getElementById('chatStatus');
const headerPresenceEl = document.getElementById('headerPresence');
const composerFormEl = document.getElementById('composerForm');
const composerInputEl = document.getElementById('composerInput');
const sendButtonEl = document.getElementById('sendButton');
const newContextButtonEl = document.getElementById('newContextButton');
const openSidebarButtonEl = document.getElementById('openSidebarButton');
const closeSidebarButtonEl = document.getElementById('closeSidebarButton');
const sidebarBackdropEl = document.getElementById('sidebarBackdrop');
const headerRefreshButtonEl = document.getElementById('headerRefreshButton');
const settingsButtonEl = document.getElementById('settingsButton');
const appShellEl = document.querySelector('.app-shell');

boot().catch((error) => showStatus(`初始化失败：${formatError(error)}`, 'error'));

async function boot() {
  bindEvents();
  autoResizeComposer();
  await refreshAgents({ autoOpen: true });
  startPolling();
}

function bindEvents() {
  composerFormEl.addEventListener('submit', handleSendSubmit);
  newContextButtonEl.addEventListener('click', handleNewContext);
  headerRefreshButtonEl.addEventListener('click', () => refreshAgents({ autoOpen: false, refreshCurrent: true }));
  composerInputEl.addEventListener('input', autoResizeComposer);
  composerInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      composerFormEl.requestSubmit();
    }
  });

  messageListEl.addEventListener('scroll', async () => {
    if (messageListEl.scrollTop > 64) return;
    if (!state.activeAgentId || !state.hasMore || state.loadingHistory) return;
    await loadOlderHistory();
  });

  openSidebarButtonEl.addEventListener('click', () => toggleSidebar(true));
  closeSidebarButtonEl.addEventListener('click', () => toggleSidebar(false));
  sidebarBackdropEl.addEventListener('click', () => toggleSidebar(false));
  settingsButtonEl.addEventListener('click', () => showStatus('设置入口已预留，Phase 4 完成。', 'info'));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) toggleSidebar(false);
  });
}

async function refreshAgents({ autoOpen = false, refreshCurrent = false } = {}) {
  const previousActive = state.activeAgentId;
  const data = await apiGet('/api/openclaw-webchat/agents');
  state.agents = Array.isArray(data.agents) ? data.agents : [];
  renderAgentList();

  const nextAgentId = previousActive && state.agents.some((item) => item.agentId === previousActive)
    ? previousActive
    : state.agents[0]?.agentId || null;

  if (refreshCurrent && previousActive) {
    await openAgent(previousActive, { forceReload: true, preserveScrollBottom: true });
    return;
  }

  if (autoOpen && nextAgentId) {
    await openAgent(nextAgentId, { forceReload: Boolean(previousActive !== nextAgentId) || !state.activeSessionKey });
  }
}

function renderAgentList() {
  agentListEl.innerHTML = '';

  if (!state.agents.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-tip';
    empty.textContent = '暂未发现 agent。';
    agentListEl.append(empty);
    return;
  }

  for (const agent of state.agents) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `agent-card${agent.agentId === state.activeAgentId ? ' active' : ''}`;
    button.addEventListener('click', () => openAgent(agent.agentId, { forceReload: agent.agentId !== state.activeAgentId }));

    const avatar = document.createElement('div');
    avatar.className = 'agent-avatar';
    if (agent.avatarUrl) {
      const image = document.createElement('img');
      image.src = agent.avatarUrl;
      image.alt = agent.name || agent.agentId;
      avatar.append(image);
    } else {
      avatar.textContent = (agent.name || agent.agentId || '?').slice(0, 1).toUpperCase();
    }

    const nameRow = document.createElement('div');
    nameRow.className = 'agent-name-row';

    const name = document.createElement('div');
    name.className = 'agent-name';
    name.textContent = agent.name || agent.agentId;

    const presence = document.createElement('span');
    presence.className = `presence-dot ${normalizePresence(agent.presence)}`;

    nameRow.append(name, presence);

    const summary = document.createElement('div');
    summary.className = 'agent-summary';
    summary.textContent = agent.summary || '点击进入会话';

    button.append(avatar, nameRow, summary);
    agentListEl.append(button);
  }
}

async function openAgent(agentId, { forceReload = false, preserveScrollBottom = false } = {}) {
  if (!agentId) return;
  if (state.selectedOpenPromise && state.activeAgentId === agentId && !forceReload) return state.selectedOpenPromise;

  state.activeAgentId = agentId;
  renderAgentList();
  updateHeader();
  showStatus('正在打开会话…', 'info');
  toggleSidebar(false);

  const promise = (async () => {
    const response = await apiPost(`/api/openclaw-webchat/agents/${encodeURIComponent(agentId)}/open`, {});
    state.activeSessionKey = response.sessionKey;
    state.messages = Array.isArray(response.history?.messages) ? response.history.messages : [];
    state.nextBefore = response.history?.nextBefore || null;
    state.hasMore = Boolean(response.history?.hasMore);
    renderMessages();
    updateHeader();
    if (!preserveScrollBottom) scrollMessagesToBottom();
    showStatus(response.created ? '已创建并进入该 agent 的长期主时间线。' : '会话已恢复。', 'success');
  })();

  state.selectedOpenPromise = promise;

  try {
    await promise;
  } finally {
    state.selectedOpenPromise = null;
  }
}

function renderMessages() {
  messageListEl.innerHTML = '';

  if (!state.messages.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="eyebrow">Phase 2 MVP</div>
      <h3>已接入真实会话，但当前时间线还没有消息</h3>
      <p class="empty-tip">左侧 agent 采用长期主时间线；输入消息后，只会展示用户消息与 assistant 最终回复。</p>
    `;
    messageListEl.append(empty);
    return;
  }

  for (const message of state.messages) {
    if (message.role === 'marker') {
      const row = document.createElement('div');
      row.className = 'marker-row';
      const chip = document.createElement('div');
      chip.className = 'marker-chip';
      chip.textContent = message.label || '已重置上下文';
      row.append(chip);
      messageListEl.append(row);
      continue;
    }

    const row = document.createElement('div');
    row.className = `message-row ${message.role}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const textBlocks = [];
    const mediaBlocks = [];
    for (const block of message.blocks || []) {
      if (block.type === 'text') textBlocks.push(block);
      else mediaBlocks.push(block);
    }

    for (const block of textBlocks) {
      const textNode = document.createElement('div');
      textNode.className = 'message-text';
      textNode.textContent = block.text || '';
      bubble.append(textNode);
    }

    if (mediaBlocks.length) {
      const mediaWrap = document.createElement('div');
      mediaWrap.className = 'message-media';
      for (const block of mediaBlocks) {
        mediaWrap.append(renderMediaBlock(block));
      }
      bubble.append(mediaWrap);
    }

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(message.createdAt);

    row.append(bubble, time);
    messageListEl.append(row);
  }

  if (state.sending) {
    const loading = document.createElement('div');
    loading.className = 'loading-chip';
    loading.textContent = '正在等待 assistant 最终回复…';
    messageListEl.append(loading);
  }
}

function renderMediaBlock(block) {
  if (block.invalid) {
    const invalid = document.createElement('div');
    invalid.className = 'invalid-card';
    invalid.textContent = block.invalidReason || '文件丢失';
    return invalid;
  }

  if (block.type === 'image') {
    const image = document.createElement('img');
    image.src = block.url;
    image.alt = block.name || '图片';
    image.loading = 'lazy';
    return image;
  }

  if (block.type === 'audio') {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = block.url;
    return audio;
  }

  if (block.type === 'video') {
    const video = document.createElement('video');
    video.controls = true;
    video.src = block.url;
    return video;
  }

  const link = document.createElement('a');
  link.className = 'file-card';
  link.href = block.url;
  link.target = '_blank';
  link.rel = 'noreferrer';

  const title = document.createElement('div');
  title.textContent = block.name || '文件';
  const meta = document.createElement('div');
  meta.className = 'file-meta';
  meta.textContent = '点击打开';

  link.append(title, meta);
  return link;
}

async function loadOlderHistory() {
  if (!state.activeAgentId || !state.nextBefore || state.loadingHistory) return;
  state.loadingHistory = true;
  const previousHeight = messageListEl.scrollHeight;

  try {
    const data = await apiGet(`/api/openclaw-webchat/agents/${encodeURIComponent(state.activeAgentId)}/history?limit=30&before=${encodeURIComponent(state.nextBefore)}`);
    const incoming = Array.isArray(data.messages) ? data.messages : [];
    state.messages = [...incoming, ...state.messages];
    state.nextBefore = data.nextBefore || null;
    state.hasMore = Boolean(data.hasMore);
    renderMessages();

    const nextHeight = messageListEl.scrollHeight;
    messageListEl.scrollTop = nextHeight - previousHeight;
  } finally {
    state.loadingHistory = false;
  }
}

async function handleSendSubmit(event) {
  event.preventDefault();
  if (!state.activeSessionKey || state.sending) return;

  const text = composerInputEl.value.trim();
  if (!text) return;

  if (text === '/new') {
    await handleNewContext();
    return;
  }

  state.sending = true;
  setComposerEnabled(false);
  showStatus('消息发送中…', 'info');

  const optimistic = {
    id: `local-${Date.now()}`,
    role: 'user',
    createdAt: new Date().toISOString(),
    blocks: [{ type: 'text', text }]
  };
  state.messages.push(optimistic);
  renderMessages();
  scrollMessagesToBottom();

  try {
    composerInputEl.value = '';
    autoResizeComposer();

    const response = await apiPost(`/api/openclaw-webchat/sessions/${encodeURIComponent(state.activeSessionKey)}/send`, { text });
    state.messages[state.messages.length - 1] = optimistic;
    if (response?.message) state.messages.push(response.message);
    renderMessages();
    scrollMessagesToBottom();
    showStatus('发送完成。', 'success');
    await refreshAgents({ autoOpen: false });
  } catch (error) {
    state.messages = state.messages.filter((item) => item.id !== optimistic.id);
    renderMessages();
    showStatus(`发送失败：${formatError(error)}`, 'error');
  } finally {
    state.sending = false;
    setComposerEnabled(true);
    renderMessages();
    scrollMessagesToBottom();
  }
}

async function handleNewContext() {
  if (!state.activeSessionKey || state.sending) return;
  state.sending = true;
  setComposerEnabled(false);
  showStatus('正在重置上游上下文…', 'info');

  try {
    const response = await apiPost(`/api/openclaw-webchat/sessions/${encodeURIComponent(state.activeSessionKey)}/command`, { command: '/new' });
    if (response?.message) state.messages.push(response.message);
    renderMessages();
    scrollMessagesToBottom();
    showStatus('上游上下文已重置，本地历史已保留。', 'success');
    await refreshAgents({ autoOpen: false });
  } catch (error) {
    showStatus(`重置失败：${formatError(error)}`, 'error');
  } finally {
    state.sending = false;
    setComposerEnabled(true);
    renderMessages();
  }
}

function updateHeader() {
  const active = state.agents.find((item) => item.agentId === state.activeAgentId) || null;
  chatTitleEl.textContent = active?.name || 'openclaw-webchat';
  chatSubtitleEl.textContent = active
    ? `${active.hasSession ? '长期主时间线' : '点击后自动创建'} · ${active.summary || '暂无摘要'}`
    : '选择 agent 开始聊天';
  headerPresenceEl.className = `presence-dot ${normalizePresence(active?.presence || 'idle')}`;
}

function showStatus(message, tone = 'info') {
  chatStatusEl.textContent = message || '';
  chatStatusEl.style.color = tone === 'error' ? '#fca5a5' : tone === 'success' ? '#86efac' : '';
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    messageListEl.scrollTop = messageListEl.scrollHeight;
  });
}

function autoResizeComposer() {
  composerInputEl.style.height = 'auto';
  composerInputEl.style.height = `${Math.min(composerInputEl.scrollHeight, 180)}px`;
}

function setComposerEnabled(enabled) {
  composerInputEl.disabled = !enabled;
  sendButtonEl.disabled = !enabled;
  newContextButtonEl.disabled = !enabled;
}

function startPolling() {
  clearInterval(state.pollingTimer);
  state.pollingTimer = setInterval(async () => {
    try {
      await refreshAgents({ autoOpen: false });
    } catch {
      // keep silent during background poll
    }
  }, 10000);
}

function toggleSidebar(open) {
  if (window.innerWidth > 900) {
    appShellEl.classList.remove('sidebar-open');
    return;
  }
  appShellEl.classList.toggle('sidebar-open', open);
}

async function apiGet(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  return handleResponse(response);
}

async function apiPost(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(body || {})
  });
  return handleResponse(response);
}

async function handleResponse(response) {
  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;
  if (!response.ok) {
    throw new Error(data?.error || response.statusText || 'Request failed');
  }
  return data;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizePresence(value) {
  return value === 'running' || value === 'recent' ? value : 'idle';
}

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatError(error) {
  return error?.message || String(error || 'Unknown error');
}
