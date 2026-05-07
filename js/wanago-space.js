// ═══════════════════════════════════════════════════════════════
//  WANAGO SPACE — Floating Team Chat (shows on every ERP page)
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const WS_ROOMS = [
    { id:'general',    name:'General',    emoji:'💬' },
    { id:'sales',      name:'Sales',      emoji:'🎯' },
    { id:'operations', name:'Operations', emoji:'✈️' },
    { id:'finance',    name:'Finance',    emoji:'💰' },
    { id:'hr',         name:'HR',         emoji:'👥' },
    { id:'marketing',  name:'Marketing',  emoji:'📢' },
  ];

  let _wsOpen = false;
  let _wsTab = 'channels'; // 'channels' | 'dms'
  let _wsRoom = 'general';
  let _wsDMTarget = null; // member id for DM
  let _wsUnread = {};
  let _wsLastCounts = {};

  // ── Helpers ──
  function wsMe() { return window.currentUser || { id:'me', name:'Me', color:'#134a32' }; }
  function wsTeam() { return (window.DB?.settings?.team || []).filter(m => m.id && m.name); }
  function wsDMId(memberId) { const ids = [wsMe().id, memberId].sort(); return 'wsdm_'+ids[0]+'_'+ids[1]; }
  function wsMsgs(id) { try { return JSON.parse(localStorage.getItem('wsv4_'+id)||'[]'); } catch(e) { return []; } }
  function wsSaveMsgs(id, msgs) { localStorage.setItem('wsv4_'+id, JSON.stringify(msgs.slice(-300))); }
  function wsInitials(name) { return (name||'?').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); }
  function wsTimeStr(ts) { return ts ? new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : ''; }

  // ── Build FAB + Panel ──
  function wsBuild() {
    if (document.getElementById('ws-fab-root')) return;

    const root = document.createElement('div');
    root.id = 'ws-fab-root';
    root.innerHTML = `
      <style>
        #ws-fab-root { position:fixed; bottom:22px; right:22px; z-index:99999; font-family:'Segoe UI',sans-serif; }
        #ws-fab { width:54px; height:54px; border-radius:50%; background:linear-gradient(135deg,#0d3223,#228050); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 18px rgba(13,50,35,.45); position:relative; transition:transform .15s; }
        #ws-fab:hover { transform:scale(1.08); }
        #ws-fab.ws-pulse { animation:ws-fab-pulse 2s infinite; }
        @keyframes ws-fab-pulse { 0%,100%{box-shadow:0 4px 18px rgba(13,50,35,.45)} 50%{box-shadow:0 4px 18px rgba(13,50,35,.45),0 0 0 8px rgba(34,128,80,.18)} }
        #ws-badge { position:absolute; top:-3px; right:-3px; background:#e01e5a; color:#fff; border-radius:50%; min-width:18px; height:18px; font-size:10px; font-weight:700; display:none; align-items:center; justify-content:center; border:2px solid #fff; padding:0 3px; }
        #ws-label { font-size:10px; font-weight:700; color:#228050; text-align:center; margin-top:4px; letter-spacing:.3px; }
        #ws-panel { position:fixed; bottom:90px; right:22px; width:420px; height:580px; background:#fff; border-radius:16px; box-shadow:0 8px 40px rgba(0,0,0,.2); border:1px solid #ddd; display:none; flex-direction:column; overflow:hidden; z-index:99998; }
        .ws-p-hdr { background:linear-gradient(135deg,#0d3223,#1a6341); padding:12px 14px; color:#fff; display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .ws-p-hdr-icon { width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,.15); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
        .ws-p-hdr-title { font-size:14px; font-weight:700; flex:1; }
        .ws-p-hdr-sub { font-size:10px; color:rgba(255,255,255,.6); margin-top:1px; }
        .ws-p-hdr-btn { background:rgba(255,255,255,.15); border:none; color:#fff; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:12px; }
        .ws-p-hdr-btn:hover { background:rgba(255,255,255,.25); }
        .ws-tabs { display:flex; background:#f5f5f5; border-bottom:1px solid #eee; flex-shrink:0; }
        .ws-tab-btn { flex:1; padding:9px; border:none; background:transparent; font-size:12px; font-weight:600; cursor:pointer; color:#888; border-bottom:2px solid transparent; font-family:inherit; }
        .ws-tab-btn.active { color:#1a6341; border-bottom-color:#1a6341; background:#fff; }
        .ws-panel-body { display:flex; flex:1; overflow:hidden; }
        .ws-rooms-list { width:130px; background:#fafafa; border-right:1px solid #eee; overflow-y:auto; flex-shrink:0; padding:6px 0; }
        .ws-room-item { display:flex; align-items:center; gap:6px; padding:7px 10px; cursor:pointer; border-radius:6px; margin:1px 5px; font-size:12.5px; color:#555; transition:.1s; }
        .ws-room-item:hover { background:#eee; color:#111; }
        .ws-room-item.active { background:#e8f5e9; color:#1a6341; font-weight:600; }
        .ws-room-badge { background:#e01e5a; color:#fff; border-radius:9px; padding:1px 5px; font-size:9px; font-weight:700; margin-left:auto; }
        .ws-dm-list { overflow-y:auto; flex:1; padding:6px 0; }
        .ws-dm-item { display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer; transition:.1s; }
        .ws-dm-item:hover { background:#f5f5f5; }
        .ws-dm-item.active { background:#e8f5e9; }
        .ws-dm-av { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
        .ws-dm-name { font-size:13px; font-weight:500; color:#111; flex:1; }
        .ws-dm-role { font-size:10px; color:#888; }
        .ws-chat-area { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .ws-ch-header { padding:8px 12px; border-bottom:1px solid #eee; flex-shrink:0; background:#fafafa; }
        .ws-ch-name { font-size:13px; font-weight:700; color:#111; }
        .ws-ch-desc { font-size:10.5px; color:#888; }
        .ws-msgs { flex:1; overflow-y:auto; padding:10px 12px; display:flex; flex-direction:column; gap:4px; }
        .ws-msg { display:flex; gap:7px; align-items:flex-start; padding:2px 4px; border-radius:6px; }
        .ws-msg:hover { background:#f8f8f8; }
        .ws-msg-av { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; margin-top:1px; }
        .ws-msg-right { flex:1; min-width:0; }
        .ws-msg-name { font-size:12px; font-weight:700; display:inline; }
        .ws-msg-time { font-size:10px; color:#aaa; margin-left:6px; }
        .ws-msg-text { font-size:13px; line-height:1.5; color:#111; word-break:break-word; }
        .ws-msg-text b { font-weight:600; }
        .ws-sys-msg { text-align:center; font-size:11px; color:#aaa; padding:4px; font-style:italic; }
        .ws-input-row { padding:8px 10px; border-top:1px solid #eee; display:flex; gap:7px; align-items:flex-end; flex-shrink:0; }
        .ws-input { flex:1; border:1px solid #ddd; border-radius:10px; padding:7px 12px; font-size:13px; font-family:inherit; resize:none; outline:none; max-height:80px; min-height:34px; }
        .ws-input:focus { border-color:#228050; }
        .ws-send-btn { background:#228050; border:none; color:#fff; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ws-send-btn:hover { background:#1a6341; }
        .ws-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#aaa; font-size:12px; padding:20px; text-align:center; }
        .ws-new-dm-btn { width:calc(100% - 16px); margin:6px 8px; padding:7px; background:none; border:1px dashed #ccc; border-radius:8px; cursor:pointer; font-size:12px; color:#888; font-family:inherit; }
        .ws-new-dm-btn:hover { background:#f5f5f5; color:#228050; border-color:#228050; }
        .ws-open-full { position:absolute; bottom:90px; right:22px; }
        .ws-notif-pop { position:fixed; bottom:90px; right:86px; background:#1a1d21; color:#fff; border-radius:10px; padding:10px 14px; font-size:12.5px; z-index:99999; max-width:240px; cursor:pointer; animation:ws-notif-in .25s ease; box-shadow:0 4px 16px rgba(0,0,0,.3); }
        @keyframes ws-notif-in { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
      </style>
      <div id="ws-badge">0</div>
      <button id="ws-fab" onclick="wsToggle()" title="Wanago Space">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <div id="ws-label">Team Chat</div>
      <div id="ws-panel">
        <div class="ws-p-hdr">
          <div class="ws-p-hdr-icon">🚀</div>
          <div style="flex:1"><div class="ws-p-hdr-title">Wanago Space</div><div class="ws-p-hdr-sub" id="ws-p-me">Team</div></div>
          <button class="ws-p-hdr-btn" onclick="wsOpenFull()" title="Full view">⛶</button>
          <button class="ws-p-hdr-btn" onclick="wsToggle()" style="margin-left:4px;font-size:16px">✕</button>
        </div>
        <div class="ws-tabs">
          <button class="ws-tab-btn active" id="ws-tab-ch" onclick="wsSwitchTab('channels')">💬 Channels</button>
          <button class="ws-tab-btn" id="ws-tab-dm" onclick="wsSwitchTab('dms')">👤 Direct</button>
        </div>
        <div class="ws-panel-body">
          <!-- Channels view -->
          <div id="ws-ch-view" style="display:flex;flex:1;overflow:hidden">
            <div class="ws-rooms-list" id="ws-rooms-list"></div>
            <div class="ws-chat-area" id="ws-chat-area"></div>
          </div>
          <!-- DM view -->
          <div id="ws-dm-view" style="display:none;flex:1;overflow:hidden">
            <div style="width:140px;background:#fafafa;border-right:1px solid #eee;display:flex;flex-direction:column;flex-shrink:0">
              <button class="ws-new-dm-btn" onclick="wsStartNewDM()">✏️ New Message</button>
              <div class="ws-dm-list" id="ws-dm-list"></div>
            </div>
            <div class="ws-chat-area" id="ws-dm-chat-area"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    wsRenderAll();
    setInterval(wsPoll, 2000);
  }

  // ── Toggle ──
  window.wsToggle = function() {
    _wsOpen = !_wsOpen;
    const panel = document.getElementById('ws-panel');
    panel.style.display = _wsOpen ? 'flex' : 'none';
    if (_wsOpen) {
      _wsUnread[_wsRoom] = 0;
      wsRenderAll();
      setTimeout(()=>document.querySelector('.ws-input')?.focus(), 80);
    }
  };

  // ── Tab switch ──
  window.wsSwitchTab = function(tab) {
    _wsTab = tab;
    document.getElementById('ws-tab-ch').classList.toggle('active', tab==='channels');
    document.getElementById('ws-tab-dm').classList.toggle('active', tab==='dms');
    document.getElementById('ws-ch-view').style.display = tab==='channels' ? 'flex' : 'none';
    document.getElementById('ws-dm-view').style.display = tab==='dms' ? 'flex' : 'none';
    if (tab==='dms') { wsRenderDMList(); if(_wsDMTarget) wsRenderDMChat(); }
  };

  // ── Render all ──
  function wsRenderAll() {
    const me = wsMe();
    const pmEl = document.getElementById('ws-p-me');
    if (pmEl) pmEl.textContent = me.name || 'You';
    wsRenderRooms();
    wsRenderChatArea();
    wsRenderDMList();
    wsUpdateBadge();
  }

  // ── CHANNELS ──
  function wsRenderRooms() {
    const el = document.getElementById('ws-rooms-list'); if (!el) return;
    el.innerHTML = WS_ROOMS.map(r => {
      const u = _wsUnread[r.id]||0;
      return `<div class="ws-room-item ${r.id===_wsRoom?'active':''}" onclick="wsPickRoom('${r.id}')">
        <span style="font-size:13px">${r.emoji}</span>
        <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</span>
        ${u?`<span class="ws-room-badge">${u>9?'9+':u}</span>`:''}
      </div>`;
    }).join('');
  }

  window.wsPickRoom = function(id) {
    _wsRoom = id;
    _wsUnread[id] = 0;
    wsRenderRooms();
    wsRenderChatArea();
    wsUpdateBadge();
    setTimeout(()=>document.querySelector('#ws-ch-view .ws-input')?.focus(), 50);
  };

  function wsRenderChatArea() {
    const el = document.getElementById('ws-chat-area'); if (!el) return;
    const room = WS_ROOMS.find(r=>r.id===_wsRoom);
    el.innerHTML = `
      <div class="ws-ch-header">
        <div class="ws-ch-name">${room?.emoji||'💬'} ${room?.name||''}</div>
      </div>
      <div class="ws-msgs" id="ws-msgs-ch"></div>
      <div class="ws-input-row">
        <textarea class="ws-input" id="ws-ch-input" placeholder="Message #${room?.name||''}" rows="1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();wsSendChannel();}"
          oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,80)+'px'"></textarea>
        <button class="ws-send-btn" onclick="wsSendChannel()">➤</button>
      </div>
    `;
    wsRenderChannelMsgs();
  }

  function wsRenderChannelMsgs() {
    const el = document.getElementById('ws-msgs-ch'); if (!el) return;
    const msgs = wsMsgs(_wsRoom);
    if (!msgs.length) { el.innerHTML='<div class="ws-empty"><div style="font-size:32px;margin-bottom:8px">💬</div><div>No messages yet.<br>Say hello! 👋</div></div>'; return; }
    const me = wsMe();
    let html='', lastSender='', lastTime=0;
    msgs.forEach(msg => {
      if (msg.type==='system') { html+=`<div class="ws-sys-msg">${msg.text}</div>`; lastSender=''; return; }
      const t = msg.ts?new Date(msg.ts).getTime():0;
      const same = msg.senderId===lastSender && (t-lastTime)<300000;
      lastSender=msg.senderId; lastTime=t;
      const ini = wsInitials(msg.sender);
      const timeStr = wsTimeStr(msg.ts);
      const isMe = msg.senderId===me.id;
      const formatted = (msg.text||'').replace(/\n/g,'<br>').replace(/\*(.*?)\*/g,'<b>$1</b>');
      html+=`<div class="ws-msg">
        <div class="ws-msg-av" style="background:${msg.color||'#228050'};visibility:${same?'hidden':'visible'}">${ini}</div>
        <div class="ws-msg-right">
          ${!same?`<span class="ws-msg-name" style="color:${msg.color||'#228050'}">${isMe?'You':msg.sender}</span><span class="ws-msg-time">${timeStr}</span>`:''}
          <div class="ws-msg-text">${formatted}</div>
        </div>
      </div>`;
    });
    el.innerHTML=html;
    el.scrollTop=el.scrollHeight;
  }

  window.wsSendChannel = function() {
    const input = document.getElementById('ws-ch-input');
    const text = input?.value.trim(); if(!text) return;
    const me = wsMe();
    const msg = { id:Date.now()+'', senderId:me.id, sender:me.name, color:me.color||'#228050', text, ts:new Date().toISOString() };
    const msgs = wsMsgs(_wsRoom); msgs.push(msg); wsSaveMsgs(_wsRoom, msgs);
    input.value=''; input.style.height='auto';
    wsRenderChannelMsgs();
    if (window.logActivity) logActivity('Team message in #'+_wsRoom,'chat');
  };

  // ── DIRECT MESSAGES ──
  function wsRenderDMList() {
    const el = document.getElementById('ws-dm-list'); if (!el) return;
    const team = wsTeam();
    const me = wsMe();
    if (!team.length) {
      el.innerHTML='<div style="padding:12px;font-size:12px;color:#888;text-align:center">No team members yet.<br>Add team in Admin.</div>';
      return;
    }
    el.innerHTML = team.filter(m=>m.id!==me.id).map(m => {
      const dmId = wsDmId(m.id);
      const u = _wsUnread[dmId]||0;
      const active = _wsDMTarget===m.id;
      const lastMsgs = wsMsgs(dmId);
      const last = lastMsgs[lastMsgs.length-1];
      return `<div class="ws-dm-item ${active?'active':''}" onclick="wsPickDM('${m.id}')">
        <div class="ws-dm-av" style="background:${m.color||'#134a32'}">${wsInitials(m.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="ws-dm-name">${m.name}</div>
          <div class="ws-dm-role">${last?last.text.slice(0,20):'...'}</div>
        </div>
        ${u?`<span class="ws-room-badge">${u>9?'9+':u}</span>`:'<span style="width:7px;height:7px;border-radius:50%;background:#2bac76;flex-shrink:0"></span>'}
      </div>`;
    }).join('');
  }

  window.wsPickDM = function(memberId) {
    _wsDMTarget = memberId;
    const dmId = wsDmId(memberId);
    _wsUnread[dmId] = 0;
    wsRenderDMList();
    wsRenderDMChat();
    wsUpdateBadge();
    setTimeout(()=>document.querySelector('#ws-dm-chat-area .ws-input')?.focus(), 50);
  };

  function wsRenderDMChat() {
    const el = document.getElementById('ws-dm-chat-area'); if (!el) return;
    const team = wsTeam();
    const me = wsMe();
    const member = team.find(m=>m.id===_wsDMTarget);
    if (!member) { el.innerHTML='<div class="ws-empty">Select a person to chat</div>'; return; }
    el.innerHTML = `
      <div class="ws-ch-header" style="display:flex;align-items:center;gap:8px">
        <div style="width:26px;height:26px;border-radius:6px;background:${member.color||'#134a32'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${wsInitials(member.name)}</div>
        <div>
          <div class="ws-ch-name" style="font-size:13px">${member.name}</div>
          <div class="ws-ch-desc">${member.role||''} ${member.dept?'· '+member.dept:''}</div>
        </div>
      </div>
      <div class="ws-msgs" id="ws-msgs-dm"></div>
      <div class="ws-input-row">
        <textarea class="ws-input" id="ws-dm-input" placeholder="Message ${member.name}" rows="1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();wsSendDM();}"
          oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,80)+'px'"></textarea>
        <button class="ws-send-btn" onclick="wsSendDM()">➤</button>
      </div>
    `;
    wsRenderDMMsgs();
  }

  function wsRenderDMMsgs() {
    const el = document.getElementById('ws-msgs-dm'); if (!el) return;
    const dmId = wsDmId(_wsDMTarget);
    const msgs = wsMsgs(dmId);
    const me = wsMe();
    const team = wsTeam();
    const member = team.find(m=>m.id===_wsDMTarget);
    if (!msgs.length) {
      el.innerHTML=`<div class="ws-empty">
        <div style="width:48px;height:48px;border-radius:12px;background:${member?.color||'#134a32'};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;margin-bottom:10px">${wsInitials(member?.name||'?')}</div>
        <div style="font-weight:600;margin-bottom:4px">${member?.name||''}</div>
        <div style="color:#aaa">Start your private conversation</div>
      </div>`;
      return;
    }
    let html='', lastSender='', lastTime=0;
    msgs.forEach(msg => {
      const t = msg.ts?new Date(msg.ts).getTime():0;
      const same = msg.senderId===lastSender && (t-lastTime)<300000;
      lastSender=msg.senderId; lastTime=t;
      const isMe = msg.senderId===me.id;
      const ini = wsInitials(isMe?me.name:member?.name||'?');
      const color = isMe?(me.color||'#228050'):(member?.color||'#134a32');
      const timeStr = wsTimeStr(msg.ts);
      const formatted = (msg.text||'').replace(/\n/g,'<br>').replace(/\*(.*?)\*/g,'<b>$1</b>');
      html+=`<div class="ws-msg">
        <div class="ws-msg-av" style="background:${color};visibility:${same?'hidden':'visible'}">${ini}</div>
        <div class="ws-msg-right">
          ${!same?`<span class="ws-msg-name" style="color:${color}">${isMe?'You':(member?.name||'')}</span><span class="ws-msg-time">${timeStr}</span>`:''}
          <div class="ws-msg-text">${formatted}</div>
        </div>
      </div>`;
    });
    el.innerHTML=html;
    el.scrollTop=el.scrollHeight;
  }

  window.wsSendDM = function() {
    if (!_wsDMTarget) return;
    const input = document.getElementById('ws-dm-input');
    const text = input?.value.trim(); if(!text) return;
    const me = wsMe();
    const dmId = wsDmId(_wsDMTarget);
    const msgs = wsMsgs(dmId);
    msgs.push({ id:Date.now()+'', senderId:me.id, sender:me.name, color:me.color||'#228050', text, ts:new Date().toISOString() });
    wsSaveMsgs(dmId, msgs);
    input.value=''; input.style.height='auto';
    wsRenderDMMsgs();
  };

  window.wsStartNewDM = function() {
    const team = wsTeam().filter(m=>m.id!==wsMe().id);
    if (!team.length) { alert('No team members. Add them in Admin → Team.'); return; }
    const names = team.map((m,i)=>`${i+1}. ${m.name} (${m.role||m.dept||'team'})`).join('\n');
    const sel = prompt('Who do you want to message?\n\n'+names+'\n\nEnter number:');
    if (!sel) return;
    const idx = parseInt(sel)-1;
    if (isNaN(idx)||idx<0||idx>=team.length) return;
    wsPickDM(team[idx].id);
  };

  // ── Unread badge ──
  function wsUpdateBadge() {
    const total = Object.values(_wsUnread).reduce((s,v)=>s+v,0);
    const badge = document.getElementById('ws-badge');
    const fab = document.getElementById('ws-fab');
    if (badge) { badge.textContent=total>9?'9+':total; badge.style.display=total?'flex':'none'; }
    if (fab) { fab.className=total?'ws-pulse':''; }
  }

  // ── Poll ──
  function wsPoll() {
    const me = wsMe();
    const ids = [...WS_ROOMS.map(r=>r.id), ...wsTeam().filter(m=>m.id!==me.id).map(m=>wsDmId(m.id))];
    let changed = false;
    ids.forEach(id => {
      const msgs = wsMsgs(id);
      const prev = _wsLastCounts[id]||0;
      if (msgs.length > prev) {
        const isCurrentView = _wsOpen && (
          (_wsTab==='channels' && id===_wsRoom) ||
          (_wsTab==='dms' && id===wsDmId(_wsDMTarget))
        );
        if (!isCurrentView) {
          _wsUnread[id] = (_wsUnread[id]||0)+(msgs.length-prev);
          // Show notification
          const last = msgs[msgs.length-1];
          if (last && last.senderId!==me.id) wsShowNotif(last, id);
          changed = true;
        }
        if (isCurrentView && _wsTab==='channels') wsRenderChannelMsgs();
        if (isCurrentView && _wsTab==='dms') wsRenderDMMsgs();
      }
      _wsLastCounts[id] = msgs.length;
    });
    if (changed) { wsRenderRooms(); wsRenderDMList(); wsUpdateBadge(); }
  }

  // ── Notification popup ──
  function wsShowNotif(msg, roomId) {
    const room = WS_ROOMS.find(r=>r.id===roomId);
    const existing = document.getElementById('ws-notif-pop');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.id = 'ws-notif-pop';
    notif.className = 'ws-notif-pop';
    const where = room ? '#'+room.name : 'DM';
    notif.innerHTML = `<div style="font-size:10.5px;color:rgba(255,255,255,.6);margin-bottom:3px">💬 ${where} · ${msg.sender}</div><div>${(msg.text||'').slice(0,60)}${(msg.text||'').length>60?'...':''}</div>`;
    notif.onclick = () => {
      if (room) { window.wsToggle(); if(!_wsOpen)window.wsToggle(); window.wsPickRoom(roomId); }
      else { window.wsToggle(); if(!_wsOpen)window.wsToggle(); window.wsSwitchTab('dms'); }
      notif.remove();
    };
    document.body.appendChild(notif);
    setTimeout(()=>notif.remove(), 4000);
  }

  // ── Open full page ──
  window.wsOpenFull = function() { window.location.href = (window.location.pathname.includes('/pages/'))?'wanago-space.html':'pages/wanago-space.html'; };

  // ── Init ──
  function wsStart() { if(document.getElementById('ws-fab-root')) return; wsBuild(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', wsStart);
  else wsStart();

})();
