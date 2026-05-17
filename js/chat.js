// chat.js — Internal Team Chat

// ── Auth guard ────────────────────────────────────────────────────
function initPage(renderFn) {
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }
  try {
    var s = JSON.parse(session);
    var tu = document.getElementById('topbar-user');
    if (tu) tu.textContent = s.email || '';
    if (typeof window.rebuildSidebar === 'function') window.rebuildSidebar();
  } catch(ex) {}
  function fadeLoader() {
    var l = document.getElementById('page-loader');
    var a = document.querySelector('.app');
    if (l) { l.classList.add('fade-out'); setTimeout(function(){ try{l.parentNode.removeChild(l);}catch(e){} }, 300); }
    if (a) a.classList.add('loaded');
  }
  setTimeout(function() {
    try { if (renderFn) renderFn(); } catch(e) { console.error('Chat render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── State ─────────────────────────────────────────────────────────
let _currentChannel  = null;  // channel string e.g. 'general' | 'booking:WGO-001'
let _currentUser     = { name:'', email:'' };
let _openChannels    = ['general']; // channels pinned in sidebar
let _unread          = {};          // { channel: count }

// ── Built-in channels ─────────────────────────────────────────────
const BUILTIN_CHANNELS = [
  { id:'general',      label:'# General',      icon:'#', bg:'#6366f1' },
  { id:'announcements',label:'# Announcements',icon:'#', bg:'#f59e0b' },
  { id:'operations',   label:'# Operations',   icon:'#', bg:'#10b981' },
];

// ── Helpers ───────────────────────────────────────────────────────
function _genId()    { return 'MSG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,5).toUpperCase(); }
function _now()      { return new Date().toISOString(); }
function _esc(s)     { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _initials(name) { return (name||'?').split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2); }

function _avatarColor(name) {
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#14b8a6'];
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function _fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
}

function _fmtDateLabel(iso) {
  if (!iso) return '';
  const d   = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function _channelLabel(channel) {
  if (!channel) return '';
  const builtin = BUILTIN_CHANNELS.find(c => c.id === channel);
  if (builtin) return builtin.label;
  if (channel.startsWith('booking:')) {
    const id = channel.slice(8);
    const b  = (DB.bookings||[]).find(x => x.id === id);
    return `${b ? b.customer + ' — ' + id : id}`;
  }
  if (channel.startsWith('customer:')) {
    const id = channel.slice(9);
    const c  = (DB.customers||[]).find(x => x.id === id);
    return `${c ? c.name || c.fullName || id : id}`;
  }
  return channel;
}

function _channelIcon(channel) {
  if (!channel) return '#';
  const builtin = BUILTIN_CHANNELS.find(c => c.id === channel);
  if (builtin) return builtin.icon;
  if (channel.startsWith('booking:'))  return 'B';
  if (channel.startsWith('customer:')) return 'C';
  return '#';
}

function _channelBg(channel) {
  const builtin = BUILTIN_CHANNELS.find(c => c.id === channel);
  return builtin ? builtin.bg : '#64748b';
}

function _getChannelMessages(channel) {
  return (DB.chatMessages || [])
    .filter(m => m.channel === channel)
    .sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1);
}

function _lastMsg(channel) {
  const msgs = _getChannelMessages(channel);
  return msgs[msgs.length - 1] || null;
}

// ── Channel List ──────────────────────────────────────────────────
function renderChannelList() {
  const query = (document.getElementById('channel-search')?.value || '').toLowerCase();
  const el    = document.getElementById('channel-list');
  if (!el) return;

  let html = '';

  // Built-in channels
  const builtinVisible = BUILTIN_CHANNELS.filter(c =>
    !query || c.label.toLowerCase().includes(query)
  );
  if (builtinVisible.length) {
    html += '<div class="channel-section-label">Channels</div>';
    html += builtinVisible.map(c => _channelItemHtml(c.id, c.label, c.icon, c.bg)).join('');
  }

  // Open booking / customer threads
  const threads = _openChannels.filter(ch => ch !== 'general' && ch !== 'announcements' && ch !== 'operations');
  const visible  = threads.filter(ch => !query || _channelLabel(ch).toLowerCase().includes(query));
  if (visible.length) {
    html += '<div class="channel-section-label">Threads</div>';
    html += visible.map(ch => _channelItemHtml(ch, _channelLabel(ch), _channelIcon(ch), _channelBg(ch))).join('');
  }

  if (!html) html = '<div style="padding:20px 14px;font-size:12px;color:#94a3b8">No channels found.</div>';
  el.innerHTML = html;
}

function _channelItemHtml(channelId, label, icon, bg) {
  const isActive = channelId === _currentChannel;
  const last     = _lastMsg(channelId);
  const unread   = _unread[channelId] || 0;
  const preview  = last ? last.text.slice(0, 40) + (last.text.length > 40 ? '…' : '') : 'No messages yet';
  return `<div class="channel-item${isActive ? ' active' : ''}" onclick="openChannel('${channelId}')">
    <div class="channel-icon" style="background:${bg}20;color:${bg}">${icon}</div>
    <div style="flex:1;min-width:0">
      <div class="channel-name">${_esc(label)}</div>
      <div class="channel-preview">${_esc(preview)}</div>
    </div>
    ${unread ? `<span class="channel-badge">${unread}</span>` : ''}
  </div>`;
}

// ── Open Channel ──────────────────────────────────────────────────
function openChannel(channelId) {
  _currentChannel = channelId;
  _unread[channelId] = 0;

  // Ensure it's in openChannels
  if (!_openChannels.includes(channelId)) _openChannels.push(channelId);
  _saveOpenChannels();

  renderChannelList();
  renderChatMain();
}

function renderChatMain() {
  const main = document.getElementById('chat-main');
  if (!main || !_currentChannel) return;

  const label = _channelLabel(_currentChannel);
  const icon  = _channelIcon(_currentChannel);
  const bg    = _channelBg(_currentChannel);
  const msgs  = _getChannelMessages(_currentChannel);

  // Context link for booking/customer threads
  let ctxBtn = '';
  if (_currentChannel.startsWith('booking:')) {
    const id = _currentChannel.slice(8);
    ctxBtn = `<button class="btn btn-outline btn-sm" onclick="goTo('bookings')" style="font-size:11.5px">Open Booking ↗</button>`;
  } else if (_currentChannel.startsWith('customer:')) {
    ctxBtn = `<button class="btn btn-outline btn-sm" onclick="goTo('customers')" style="font-size:11.5px">Open Customer ↗</button>`;
  }

  main.innerHTML = `
    <div class="chat-main-hdr">
      <div class="chat-main-icon" style="background:${bg}20;color:${bg}">${icon}</div>
      <div>
        <div class="chat-main-title">${_esc(label)}</div>
        <div class="chat-main-sub">${msgs.length} message${msgs.length!==1?'s':''}</div>
      </div>
      <div class="chat-main-actions">
        ${ctxBtn}
        ${_currentChannel !== 'general' && _currentChannel !== 'announcements' && _currentChannel !== 'operations'
          ? `<button class="btn btn-outline btn-sm" onclick="closeThread('${_currentChannel}')" style="font-size:11.5px;color:#ef4444;border-color:#fca5a5">Close Thread</button>`
          : ''}
      </div>
    </div>
    <div class="chat-messages" id="chat-messages-area">${_buildMessagesHtml(msgs)}</div>
    <div class="chat-input-area">
      <div class="chat-input-row">
        <textarea class="chat-textarea" id="chat-input" placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          onkeydown="onChatKeyDown(event)" oninput="autoResizeChatInput(this)" rows="1"></textarea>
        <button class="chat-note-btn" onclick="sendNote()" title="Send as shared note">Note</button>
        <button class="chat-send-btn" id="chat-send-btn" onclick="sendMessage()" title="Send (Enter)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div class="chat-input-hint">Enter to send · Shift+Enter for new line · Note button to send as a pinned note</div>
    </div>`;

  _scrollToBottom();
  setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
}

function _buildMessagesHtml(msgs) {
  if (!msgs.length) return `<div class="chat-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <div>No messages yet. Be the first to say something!</div>
  </div>`;

  let html = '';
  let lastDate = '';

  msgs.forEach(msg => {
    const dateLabel = _fmtDateLabel(msg.createdAt);
    if (dateLabel !== lastDate) {
      html += `<div class="chat-date-divider"><span>${_esc(dateLabel)}</span></div>`;
      lastDate = dateLabel;
    }

    const isMe = msg.senderEmail === _currentUser.email;

    if (msg.type === 'note') {
      html += `<div style="display:flex;justify-content:${isMe?'flex-end':'flex-start'}">
        <div class="msg-note">
          <div class="msg-note-label">Shared Note — ${_esc(msg.senderName || msg.senderEmail)}</div>
          <div style="white-space:pre-wrap">${_esc(msg.text)}</div>
          <div style="font-size:10.5px;color:#d97706;margin-top:4px">${_fmtTime(msg.createdAt)}</div>
        </div>
      </div>`;
      return;
    }

    if (msg.type === 'system') {
      html += `<div class="msg-system">${_esc(msg.text)}</div>`;
      return;
    }

    const bg  = _avatarColor(msg.senderName || msg.senderEmail);
    const ini = _initials(msg.senderName || msg.senderEmail);
    html += `<div class="msg-row${isMe ? ' mine' : ''}">
      <div class="msg-avatar" style="background:${bg}">${ini}</div>
      <div>
        <div class="msg-bubble">${_esc(msg.text).replace(/\n/g,'<br>')}</div>
        <div class="msg-meta">
          <span class="msg-sender">${_esc(isMe ? 'You' : (msg.senderName || msg.senderEmail))}</span>
          <span>${_fmtTime(msg.createdAt)}</span>
        </div>
      </div>
    </div>`;
  });

  return html;
}

function _scrollToBottom() {
  setTimeout(() => {
    const el = document.getElementById('chat-messages-area');
    if (el) el.scrollTop = el.scrollHeight;
  }, 30);
}

// ── Send Message ──────────────────────────────────────────────────
function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = (input?.value || '').trim();
  if (!text || !_currentChannel) return;
  input.value = '';
  autoResizeChatInput(input);
  _postMessage(text, 'message');
}

function sendNote() {
  const input = document.getElementById('chat-input');
  const text  = (input?.value || '').trim();
  if (!text || !_currentChannel) return;
  input.value = '';
  autoResizeChatInput(input);
  _postMessage(text, 'note');
}

function _postMessage(text, type) {
  const msg = {
    id:          _genId(),
    channel:     _currentChannel,
    text,
    type:        type || 'message',
    senderEmail: _currentUser.email,
    senderName:  _currentUser.name || _currentUser.email,
    createdAt:   _now(),
  };

  if (!DB.chatMessages) DB.chatMessages = [];
  DB.chatMessages.push(msg);
  saveDB();

  // Sync to Firestore
  if (typeof dbSave === 'function') {
    dbSave('chatMessages', msg, err => {
      if (err) console.warn('Chat message Firestore sync failed', err);
    });
  }

  // Re-render the message area without full channel switch (faster)
  const area = document.getElementById('chat-messages-area');
  if (area) {
    const msgs = _getChannelMessages(_currentChannel);
    area.innerHTML = _buildMessagesHtml(msgs);
    _scrollToBottom();
  }
  renderChannelList();
}

function onChatKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function autoResizeChatInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── Thread management ─────────────────────────────────────────────
function closeThread(channelId) {
  _openChannels = _openChannels.filter(ch => ch !== channelId);
  _saveOpenChannels();
  if (_currentChannel === channelId) {
    _currentChannel = 'general';
    renderChatMain();
  }
  renderChannelList();
}

function onAddThread() {
  const sel = document.getElementById('add-thread-select');
  const val = sel.value;
  if (!val) return;
  sel.value = '';
  if (!_openChannels.includes(val)) _openChannels.push(val);
  _saveOpenChannels();
  openChannel(val);
}

function _populateAddThreadSelect() {
  const sel = document.getElementById('add-thread-select');
  if (!sel) return;
  const bookings  = (DB.bookings||[]).filter(b => b.status !== 'Cancelled').slice(0, 30);
  const customers = (DB.customers||[]).slice(0, 20);
  sel.innerHTML = '<option value="">+ Open booking / customer thread</option>' +
    '<optgroup label="Bookings">' +
    bookings.map(b => `<option value="booking:${b.id}">${b.id} — ${_esc(b.customer||'—')} (${b.date||'—'})</option>`).join('') +
    '</optgroup><optgroup label="Customers">' +
    customers.map(c => `<option value="customer:${c.id}">${_esc(c.name||c.fullName||c.id)}</option>`).join('') +
    '</optgroup>';
}

function _saveOpenChannels() {
  try { localStorage.setItem('wanago_chat_channels', JSON.stringify(_openChannels)); } catch(e) {}
}

function _loadOpenChannels() {
  try {
    const saved = JSON.parse(localStorage.getItem('wanago_chat_channels') || '[]');
    if (Array.isArray(saved) && saved.length) {
      _openChannels = [...new Set(['general', ...saved])];
    }
  } catch(e) {}
}

// ── Real-time: re-render when new messages arrive ─────────────────
function onChatMessagesUpdated() {
  renderChannelList();
  if (_currentChannel) {
    const area = document.getElementById('chat-messages-area');
    if (area) {
      const msgs = _getChannelMessages(_currentChannel);
      const wasAtBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 60;
      area.innerHTML = _buildMessagesHtml(msgs);
      if (wasAtBottom) _scrollToBottom();
    }
    // Update header message count
    const sub = document.querySelector('.chat-main-sub');
    if (sub) {
      const c = _getChannelMessages(_currentChannel).length;
      sub.textContent = `${c} message${c!==1?'s':''}`;
    }
  }
}

// ── Expose globals ────────────────────────────────────────────────
Object.assign(window, {
  openChannel, closeThread, onAddThread,
  sendMessage, sendNote, onChatKeyDown, autoResizeChatInput,
  renderChannelList,
});

// ── Init ──────────────────────────────────────────────────────────
initPage(function() {
  // Resolve current user
  try {
    const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    _currentUser = { email: sess.email || '', name: sess.name || sess.email || 'Team Member' };
  } catch(e) {}

  if (!DB.chatMessages) DB.chatMessages = [];
  _loadOpenChannels();
  _populateAddThreadSelect();
  renderChannelList();

  // Auto-open general channel
  openChannel('general');

  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      _populateAddThreadSelect();
      onChatMessagesUpdated();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('chatMessages', function() { onChatMessagesUpdated(); });
        dbSubscribe('bookings',     function() { _populateAddThreadSelect(); renderChannelList(); });
        dbSubscribe('customers',    function() { _populateAddThreadSelect(); renderChannelList(); });
      }
    }, 5000);
  }
});
