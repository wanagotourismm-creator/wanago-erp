// ═══════════════════════════════════════════════════════════════
//  WANAGO SPACE — Floating Team Chat v5
//  Shared storage with full-page view (ws5_ prefix)
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Storage (Firestore real-time, in-memory cache) ──
  const _wsCache     = {};   // id → messages[]
  const _wsListeners = {};   // id → unsubscribe fn

  function wsMsgs(id) { return _wsCache[id] || []; }
  function wsDmId(a, b) { const ids = [a, b].sort(); return 'dm_' + ids[0] + '_' + ids[1]; }

  function wsSubscribe(id) {
    if (_wsListeners[id]) return;
    if (typeof window.fsChatListen !== 'function') return;
    window.fsChatListen(id, function(msgs) {
      const prev = _wsCache[id]?.length || 0;
      _wsCache[id] = msgs;
      // Unread tracking
      if (msgs.length > prev) {
        const isActive = _open && (
          (_tab === 'channels' && id === _room) ||
          (_tab === 'dms' && _dmTarget && id === wsDmId(me().id, _dmTarget))
        );
        if (!isActive) {
          _unread[id] = (_unread[id] || 0) + (msgs.length - prev);
          const last = msgs[msgs.length - 1];
          if (last && last.senderId !== me().id) wsShowNotif(last, id);
        }
        wsRenderRooms(); wsRenderDMList(); wsUpdateBadge();
      }
      if (_open) {
        if (_tab === 'channels' && id === _room) wsRenderChanMsgs();
        if (_tab === 'dms' && _dmTarget && id === wsDmId(me().id, _dmTarget)) wsRenderDMMsgs();
      }
    }).then(function(unsub) { if (unsub) _wsListeners[id] = unsub; });
  }

  function wsSubscribeAll() {
    ROOMS.forEach(r => wsSubscribe(r.id));
    team().forEach(m => { if (m.id !== me().id) wsSubscribe(wsDmId(me().id, m.id)); });
  }

  // ── Channels ──
  const ROOMS = [
    { id:'general',    name:'general',    emoji:'💬', desc:'Company-wide updates' },
    { id:'sales',      name:'sales',      emoji:'🎯', desc:'Sales team & leads' },
    { id:'operations', name:'operations', emoji:'✈️', desc:'Bookings & trips' },
    { id:'finance',    name:'finance',    emoji:'💰', desc:'Payments & finance' },
    { id:'hr',         name:'hr',         emoji:'👥', desc:'HR & team matters' },
    { id:'marketing',  name:'marketing',  emoji:'📢', desc:'Campaigns & promos' },
  ];

  const QUICK_EMOJIS = ['👍','❤️','😂','🎉','🔥','✅','🙏','💪','😊','👏'];
  const EMOJI_GRID   = ['😀','😁','😂','🤣','😅','😎','🥳','😍','🤩','😜','🤔','😴','😡','🥺','😭','🙏','👍','👎','❤️','🔥','💯','✅','⚡','🎉','🚀','💡','💰','📌','📞','✈️','🏖️','🌟'];

  // ── State ──
  let _open = false, _tab = 'channels', _room = 'general', _dmTarget = null;
  let _unread = {};

  // ── Helpers ──
  function me()   { return window.currentUser || { id:'me', name:'Me', color:'#134a32' }; }
  function team() { return (window.DB?.settings?.team || []).filter(m => m.id && m.name); }
  function ini(n) { return (n||'?').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); }
  function tsStr(ts) {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    return d.toDateString() === now.toDateString()
      ? d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})
      : d.toLocaleDateString('en-IN', {month:'short', day:'numeric'});
  }
  function dateLabel(ts) {
    const d = new Date(ts), now = new Date(), yd = new Date(now - 86400000);
    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === yd.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', {weekday:'long', month:'long', day:'numeric'});
  }
  function fmtText(t) {
    return (t||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,'<strong>$1</strong>')
      .replace(/_(.*?)_/g,'<em>$1</em>')
      .replace(/`(.*?)`/g,'<code style="background:#f0f0f0;border-radius:3px;padding:1px 4px;font-size:11px;font-family:monospace">$1</code>')
      .replace(/@(\w[\w.]*)/g,'<span style="background:#e8f4fd;color:#1164a3;border-radius:3px;padding:0 3px;font-weight:600">@$1</span>');
  }
  function totalUnread() { return Object.values(_unread).reduce((s,v)=>s+(v||0),0); }

  // ── CSS ──
  const CSS = `
    #ws-fab-root{position:fixed;bottom:22px;right:22px;z-index:99999;font-family:'Segoe UI',system-ui,sans-serif;font-size:13px}
    #ws-fab{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0d3223,#228050);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(13,50,35,.45);transition:transform .15s,box-shadow .15s;position:relative}
    #ws-fab:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(13,50,35,.55)}
    #ws-fab-badge{position:absolute;top:-4px;right:-4px;background:#e01e5a;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;border:2px solid #fff;padding:0 3px;line-height:1;pointer-events:none}
    #ws-fab-lbl{font-size:9.5px;font-weight:700;color:#1a6341;text-align:center;margin-top:3px;letter-spacing:.3px;user-select:none}
    #ws-panel{position:fixed;bottom:88px;right:22px;width:500px;height:630px;background:#fff;border-radius:18px;box-shadow:0 16px 56px rgba(0,0,0,.22);border:1px solid #e0e0e0;display:none;flex-direction:column;overflow:hidden;z-index:99998}
    .ws5-hdr{background:linear-gradient(135deg,#071c12,#0d3223 55%,#1a6341);padding:12px 14px;color:#fff;display:flex;align-items:center;gap:10px;flex-shrink:0}
    .ws5-hdr-av{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
    .ws5-hdr-title{font-size:14px;font-weight:800;letter-spacing:-.2px}
    .ws5-hdr-sub{font-size:10px;color:rgba(255,255,255,.58);margin-top:1px}
    .ws5-hdr-acts{display:flex;gap:4px;margin-left:auto}
    .ws5-hdr-btn{background:rgba(255,255,255,.12);border:none;color:#fff;border-radius:7px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:.1s;flex-shrink:0;font-family:inherit}
    .ws5-hdr-btn:hover{background:rgba(255,255,255,.24)}
    .ws5-tabs{display:flex;background:#f8f9fa;border-bottom:1px solid #eee;flex-shrink:0}
    .ws5-tab{flex:1;padding:9px 6px;border:none;background:transparent;font-size:12px;font-weight:600;cursor:pointer;color:#999;border-bottom:2.5px solid transparent;font-family:inherit;transition:.15s}
    .ws5-tab.on{color:#1a6341;border-bottom-color:#1a6341;background:#fff}
    .ws5-body{display:flex;flex:1;overflow:hidden}
    .ws5-rooms{width:138px;background:#f8f9fa;border-right:1px solid #eee;overflow-y:auto;flex-shrink:0;padding:4px 0}
    .ws5-rooms::-webkit-scrollbar{width:3px}.ws5-rooms::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
    .ws5-sec{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#bbb;padding:10px 10px 3px}
    .ws5-room{display:flex;align-items:center;gap:6px;padding:6px 8px 6px 10px;cursor:pointer;border-radius:7px;margin:1px 4px;color:#555;transition:.1s;position:relative;font-size:12.5px}
    .ws5-room:hover{background:#eee;color:#111}
    .ws5-room.on{background:rgba(26,99,65,.13);color:#0d4a28;font-weight:700}
    .ws5-room-bdg{background:#e01e5a;color:#fff;border-radius:8px;padding:1px 5px;font-size:9px;font-weight:700;margin-left:auto;flex-shrink:0}
    .ws5-dms-pane{width:138px;background:#f8f9fa;border-right:1px solid #eee;display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
    .ws5-dm-new{margin:6px 5px;padding:7px;background:none;border:1.5px dashed #ccc;border-radius:9px;cursor:pointer;font-size:12px;color:#888;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px;transition:.15s;flex-shrink:0}
    .ws5-dm-new:hover{border-color:#1a6341;color:#1a6341;background:#f0faf4}
    .ws5-dml{overflow-y:auto;flex:1;padding:2px 0}
    .ws5-dml::-webkit-scrollbar{width:3px}.ws5-dml::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
    .ws5-dm-row{display:flex;align-items:center;gap:7px;padding:7px 10px;cursor:pointer;transition:.1s}
    .ws5-dm-row:hover{background:#eee}
    .ws5-dm-row.on{background:rgba(26,99,65,.1)}
    .ws5-av{border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;position:relative}
    .ws5-av .ws5-dot{position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-radius:50%;background:#2bac76;border:1.5px solid #f8f9fa}
    .ws5-dm-info{flex:1;min-width:0}
    .ws5-dm-name{font-size:12px;font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ws5-dm-prev{font-size:10.5px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ws5-dm-bdg{background:#e01e5a;color:#fff;border-radius:8px;padding:1px 5px;font-size:9px;font-weight:700;flex-shrink:0}
    .ws5-chat{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fff}
    .ws5-ch-hdr{padding:9px 12px;border-bottom:1px solid #f0f0f0;flex-shrink:0;background:#fff;display:flex;align-items:center;gap:8px}
    .ws5-ch-hdr-name{font-size:13px;font-weight:800;color:#111;flex:1}
    .ws5-ch-hdr-sub{font-size:10px;color:#999;margin-top:1px}
    .ws5-msgs{flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:0}
    .ws5-msgs::-webkit-scrollbar{width:4px}.ws5-msgs::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:2px}
    .ws5-date-sep{display:flex;align-items:center;gap:8px;font-size:10px;color:#bbb;padding:10px 0 5px;flex-shrink:0}
    .ws5-date-sep::before,.ws5-date-sep::after{content:'';flex:1;height:1px;background:#eee}
    .ws5-msg{display:flex;gap:7px;align-items:flex-start;padding:2px 4px;border-radius:6px;position:relative}
    .ws5-msg:hover{background:#f5f5f5}
    .ws5-msg:hover .ws5-acts{display:flex}
    .ws5-msg-av{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:#fff;flex-shrink:0;margin-top:2px}
    .ws5-msg-av.ghost{visibility:hidden}
    .ws5-msg-body{flex:1;min-width:0}
    .ws5-msg-meta{display:flex;align-items:baseline;gap:6px;margin-bottom:1px}
    .ws5-msg-name{font-size:12.5px;font-weight:700}
    .ws5-msg-ts{font-size:10px;color:#bbb}
    .ws5-msg-txt{font-size:13px;line-height:1.55;color:#111;word-break:break-word}
    .ws5-edited{font-size:9.5px;color:#bbb;margin-left:4px;font-style:italic}
    .ws5-acts{display:none;position:absolute;top:0;right:4px;background:#fff;border:1px solid #e8e8e8;border-radius:9px;padding:3px 6px;gap:2px;box-shadow:0 2px 12px rgba(0,0,0,.10);z-index:10;align-items:center}
    .ws5-act-e{font-size:15px;cursor:pointer;padding:2px 3px;border-radius:4px;transition:.1s;line-height:1}
    .ws5-act-e:hover{background:#f0f0f0;transform:scale(1.18)}
    .ws5-act-sep{width:1px;background:#eee;height:16px;margin:0 2px}
    .ws5-act-btn{font-size:11px;color:#999;cursor:pointer;padding:2px 6px;border-radius:4px;transition:.1s;font-family:inherit;border:none;background:none}
    .ws5-act-btn:hover{background:#f0f0f0;color:#333}
    .ws5-act-del{color:#e01e5a!important}
    .ws5-act-del:hover{background:#fff0f3!important}
    .ws5-rxns{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px}
    .ws5-rxn{background:#f2f2f2;border:1px solid #e0e0e0;border-radius:10px;padding:2px 8px;font-size:12px;cursor:pointer;transition:.1s;display:flex;align-items:center;gap:3px;line-height:1.4}
    .ws5-rxn:hover{background:#e8e8e8}
    .ws5-rxn.mine{background:#ebf5fb;border-color:#aed6f1;color:#1164a3}
    .ws5-rxn-n{font-size:10.5px;font-weight:700}
    .ws5-sys{text-align:center;font-size:10.5px;color:#bbb;padding:5px;font-style:italic}
    .ws5-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#bbb;font-size:12px;padding:20px;text-align:center;gap:5px}
    .ws5-empty-ico{font-size:38px;margin-bottom:4px}
    .ws5-empty-t{font-size:13px;font-weight:700;color:#aaa;margin-bottom:2px}
    .ws5-input-wrap{padding:0 8px 8px;flex-shrink:0}
    .ws5-ibox{border:1.5px solid #e8e8e8;border-radius:12px;overflow:hidden;transition:border-color .15s,box-shadow .15s}
    .ws5-ibox:focus-within{border-color:#1a6341;box-shadow:0 0 0 3px rgba(26,99,65,.08)}
    .ws5-toolbar{display:flex;gap:1px;padding:5px 8px 3px;border-bottom:1px solid #f5f5f5;align-items:center}
    .ws5-tb-btn{background:none;border:none;border-radius:5px;padding:3px 6px;cursor:pointer;font-size:12.5px;color:#aaa;font-family:inherit;transition:.1s;line-height:1}
    .ws5-tb-btn:hover{background:#f0f0f0;color:#333}
    .ws5-tb-sep{width:1px;background:#eee;height:14px;margin:0 3px}
    .ws5-irow{display:flex;align-items:flex-end;gap:6px;padding:5px 6px 6px}
    .ws5-input{flex:1;border:none;background:transparent;font-size:13px;font-family:inherit;resize:none;outline:none;max-height:100px;min-height:22px;line-height:1.5;color:#111}
    .ws5-input::placeholder{color:#ccc}
    .ws5-send{background:linear-gradient(135deg,#1a6341,#228050);border:none;color:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:.15s;flex-shrink:0}
    .ws5-send:hover{background:linear-gradient(135deg,#0d3223,#1a6341)}
    .ws5-ep{position:absolute;bottom:100%;left:0;background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:8px 6px;display:flex;flex-wrap:wrap;gap:1px;width:220px;box-shadow:0 6px 20px rgba(0,0,0,.12);z-index:30;margin-bottom:4px}
    .ws5-ep-btn{font-size:18px;cursor:pointer;padding:3px 4px;border-radius:5px;line-height:1;transition:.1s}
    .ws5-ep-btn:hover{background:#f0f0f0;transform:scale(1.18)}
    .ws5-notif{position:fixed;bottom:92px;right:86px;background:#1a1d21;color:#fff;border-radius:12px;padding:11px 14px;font-size:12.5px;z-index:99999;max-width:268px;cursor:pointer;box-shadow:0 4px 22px rgba(0,0,0,.3);animation:ws5-notif-in .25s ease;border:1px solid rgba(255,255,255,.07)}
    @keyframes ws5-notif-in{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
    .ws5-notif-from{font-size:10px;color:rgba(255,255,255,.5);margin-bottom:3px;display:flex;align-items:center;gap:4px}
    .ws5-notif-txt{font-size:13px;line-height:1.4;color:#fff}
    .ws5-picker-overlay{position:absolute;inset:0;background:rgba(0,0,0,.32);display:flex;align-items:center;justify-content:center;z-index:50;border-radius:18px}
    .ws5-picker-box{background:#fff;border-radius:14px;width:290px;max-height:380px;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2);overflow:hidden}
    .ws5-picker-hdr{padding:14px 16px 10px;font-size:13px;font-weight:800;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
    .ws5-picker-list{overflow-y:auto}
    .ws5-picker-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:.1s}
    .ws5-picker-item:hover{background:#f5f5f5}
  `;

  // ── Build DOM ──
  function wsBuild() {
    if (document.getElementById('ws-fab-root')) return;
    const root = document.createElement('div');
    root.id = 'ws-fab-root';
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    root.insertAdjacentHTML('beforeend', `
      <div id="ws-fab-badge"></div>
      <button id="ws-fab" onclick="wsToggle()" title="Wanago Space — Team Chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <div id="ws-fab-lbl">Team Chat</div>
      <div id="ws-panel">
        <div class="ws5-hdr">
          <div class="ws5-hdr-av">🚀</div>
          <div style="flex:1">
            <div class="ws5-hdr-title">Wanago Space</div>
            <div class="ws5-hdr-sub" id="ws5-sub">Team chat</div>
          </div>
          <div class="ws5-hdr-acts">
            <button class="ws5-hdr-btn" onclick="wsOpenFull()" title="Open full view">⛶</button>
            <button class="ws5-hdr-btn" onclick="wsToggle()" title="Close">✕</button>
          </div>
        </div>
        <div class="ws5-tabs">
          <button class="ws5-tab on" id="wst-ch" onclick="wsSwitchTab('channels')">💬 Channels</button>
          <button class="ws5-tab" id="wst-dm" onclick="wsSwitchTab('dms')">👤 Direct</button>
        </div>
        <div class="ws5-body" id="ws5-ch-body">
          <div class="ws5-rooms" id="ws5-rooms"></div>
          <div class="ws5-chat" id="ws5-ch-chat"></div>
        </div>
        <div class="ws5-body" id="ws5-dm-body" style="display:none">
          <div class="ws5-dms-pane">
            <button class="ws5-dm-new" onclick="wsNewDMPicker()">✏️ New Message</button>
            <div class="ws5-dml" id="ws5-dml"></div>
          </div>
          <div class="ws5-chat" id="ws5-dm-chat"></div>
        </div>
      </div>
    `);
    document.body.appendChild(root);
    wsRenderAll();
    // Subscribe after a brief delay so Firestore finishes loading
    setTimeout(wsSubscribeAll, 1200);
  }

  // ── Toggle ──
  window.wsToggle = function () {
    _open = !_open;
    const p = document.getElementById('ws-panel');
    if (p) p.style.display = _open ? 'flex' : 'none';
    if (_open) {
      _unread[_room] = 0;
      wsUpdateBadge();
      wsRenderAll();
      setTimeout(() => document.querySelector(_tab === 'channels' ? '#ws5-ch-chat .ws5-input' : '#ws5-dm-chat .ws5-input')?.focus(), 80);
    }
  };

  // ── Tab switch ──
  window.wsSwitchTab = function (tab) {
    _tab = tab;
    document.getElementById('wst-ch').classList.toggle('on', tab === 'channels');
    document.getElementById('wst-dm').classList.toggle('on', tab === 'dms');
    document.getElementById('ws5-ch-body').style.display = tab === 'channels' ? 'flex' : 'none';
    document.getElementById('ws5-dm-body').style.display = tab === 'dms' ? 'flex' : 'none';
    if (tab === 'dms') { wsRenderDMList(); if (_dmTarget) wsRenderDMChat(); }
  };

  // ── Render all ──
  function wsRenderAll() {
    const t = team();
    const sub = document.getElementById('ws5-sub');
    if (sub) sub.textContent = t.length + ' member' + (t.length === 1 ? '' : 's');
    wsRenderRooms();
    wsRenderChanChat();
    wsRenderDMList();
    if (_dmTarget) wsRenderDMChat();
    wsUpdateBadge();
  }

  // ── Rooms sidebar ──
  function wsRenderRooms() {
    const el = document.getElementById('ws5-rooms'); if (!el) return;
    el.innerHTML = '<div class="ws5-sec">Channels</div>' + ROOMS.map(r => {
      const u = _unread[r.id] || 0;
      return `<div class="ws5-room ${r.id === _room ? 'on' : ''}" onclick="wsPickRoom('${r.id}')">
        <span style="font-size:13px;flex-shrink:0">${r.emoji}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"># ${r.name}</span>
        ${u ? `<span class="ws5-room-bdg">${u > 9 ? '9+' : u}</span>` : ''}
      </div>`;
    }).join('');
  }

  window.wsPickRoom = function (id) {
    _room = id; _unread[id] = 0;
    wsSubscribe(id);
    wsRenderRooms(); wsRenderChanChat(); wsUpdateBadge();
    setTimeout(() => document.getElementById('ws5-ch-input')?.focus(), 50);
  };

  // ── Channel chat area ──
  function wsRenderChanChat() {
    const el = document.getElementById('ws5-ch-chat'); if (!el) return;
    const r = ROOMS.find(x => x.id === _room);
    el.innerHTML = `
      <div class="ws5-ch-hdr">
        <span style="font-size:17px;flex-shrink:0">${r?.emoji || '💬'}</span>
        <div style="flex:1;min-width:0">
          <div class="ws5-ch-hdr-name"># ${r?.name || ''}</div>
          <div class="ws5-ch-hdr-sub">${r?.desc || ''}</div>
        </div>
      </div>
      <div class="ws5-msgs" id="ws5-msgs-ch"></div>
      ${wsInputHTML('ws5-ch-input', 'wsSendChannel()', 'Message #' + (r?.name || ''))}
    `;
    wsRenderChanMsgs();
  }

  function wsRenderChanMsgs() {
    const el = document.getElementById('ws5-msgs-ch'); if (!el) return;
    const msgs = wsMsgs(_room);
    if (!msgs.length) {
      const r = ROOMS.find(x => x.id === _room);
      el.innerHTML = `<div class="ws5-empty"><div class="ws5-empty-ico">${r?.emoji || '💬'}</div><div class="ws5-empty-t"># ${r?.name || ''}</div><div>${r?.desc || 'Start the conversation!'}</div></div>`;
      return;
    }
    el.innerHTML = buildMsgHTML(msgs, _room);
    el.scrollTop = el.scrollHeight;
  }

  window.wsSendChannel = function () {
    const inp = document.getElementById('ws5-ch-input');
    const text = inp?.value.trim(); if (!text) return;
    const m = me();
    if (typeof window.fsChatSend === 'function') {
      window.fsChatSend(_room, { senderId: m.id, sender: m.name, color: m.color || '#228050', text, reactions: {} });
    } else {
      const msgs = [...wsMsgs(_room)];
      msgs.push({ id: Date.now() + '_' + Math.random().toString(36).slice(2, 5), senderId: m.id, sender: m.name, color: m.color || '#228050', text, ts: new Date().toISOString(), reactions: {} });
      _wsCache[_room] = msgs;
      wsRenderChanMsgs();
    }
    inp.value = ''; inp.style.height = 'auto';
    if (window.logActivity) logActivity('Message in #' + _room, 'chat');
  };

  // ── DM list ──
  function wsRenderDMList() {
    const el = document.getElementById('ws5-dml'); if (!el) return;
    const t = team().filter(m => m.id !== me().id);
    if (!t.length) {
      el.innerHTML = '<div style="padding:14px 10px;font-size:11.5px;color:#bbb;text-align:center">No team members.<br>Add from Admin panel.</div>';
      return;
    }
    el.innerHTML = t.map(m => {
      const dmId = wsDmId(me().id, m.id);
      const u = _unread[dmId] || 0;
      const last = wsMsgs(dmId).slice(-1)[0];
      const prevText = last ? (last.senderId === me().id ? 'You: ' : '') + last.text.slice(0, 18) : m.role || '';
      return `<div class="ws5-dm-row ${_dmTarget === m.id ? 'on' : ''}" onclick="wsPickDM('${m.id}')">
        <div class="ws5-av" style="width:28px;height:28px;background:${m.color || '#134a32'};font-size:10px">
          ${ini(m.name)}
          <div class="ws5-dot"></div>
        </div>
        <div class="ws5-dm-info">
          <div class="ws5-dm-name">${m.name}</div>
          <div class="ws5-dm-prev">${prevText || '...'}</div>
        </div>
        ${u ? `<span class="ws5-dm-bdg">${u > 9 ? '9+' : u}</span>` : ''}
      </div>`;
    }).join('');
  }

  window.wsPickDM = function (memberId) {
    _dmTarget = memberId;
    const dmId = wsDmId(me().id, memberId);
    _unread[dmId] = 0;
    wsSubscribe(dmId);
    wsRenderDMList(); wsRenderDMChat(); wsUpdateBadge();
    const picker = document.getElementById('ws5-picker-overlay');
    if (picker) picker.remove();
    setTimeout(() => document.getElementById('ws5-dm-input')?.focus(), 50);
  };

  // ── DM chat area ──
  function wsRenderDMChat() {
    const el = document.getElementById('ws5-dm-chat'); if (!el) return;
    const member = team().find(m => m.id === _dmTarget);
    if (!member) {
      el.innerHTML = `<div class="ws5-empty"><div class="ws5-empty-ico">👤</div><div class="ws5-empty-t">No chat selected</div><div>Pick a teammate to message</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="ws5-ch-hdr">
        <div class="ws5-av" style="width:30px;height:30px;background:${member.color || '#134a32'};font-size:10.5px;border-radius:9px">
          ${ini(member.name)}<div class="ws5-dot"></div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="ws5-ch-hdr-name">${member.name}</div>
          <div class="ws5-ch-hdr-sub">${member.role || ''} ${member.dept ? '· ' + member.dept : ''}</div>
        </div>
      </div>
      <div class="ws5-msgs" id="ws5-msgs-dm"></div>
      ${wsInputHTML('ws5-dm-input', 'wsSendDM()', 'Message ' + member.name)}
    `;
    wsRenderDMMsgs();
  }

  function wsRenderDMMsgs() {
    const el = document.getElementById('ws5-msgs-dm'); if (!el) return;
    const member = team().find(m => m.id === _dmTarget);
    const dmId = wsDmId(me().id, _dmTarget);
    const msgs = wsMsgs(dmId);
    if (!msgs.length) {
      el.innerHTML = `<div class="ws5-empty">
        <div class="ws5-av" style="width:52px;height:52px;border-radius:14px;background:${member?.color || '#134a32'};font-size:18px;margin-bottom:8px">${ini(member?.name || '?')}</div>
        <div class="ws5-empty-t">${member?.name || ''}</div>
        <div>Start your private conversation</div>
      </div>`;
      return;
    }
    el.innerHTML = buildMsgHTML(msgs, dmId);
    el.scrollTop = el.scrollHeight;
  }

  window.wsSendDM = function () {
    if (!_dmTarget) return;
    const inp = document.getElementById('ws5-dm-input');
    const text = inp?.value.trim(); if (!text) return;
    const m = me(), dmId = wsDmId(m.id, _dmTarget);
    if (typeof window.fsChatSend === 'function') {
      window.fsChatSend(dmId, { senderId: m.id, sender: m.name, color: m.color || '#228050', text, reactions: {} });
    } else {
      const msgs = [...wsMsgs(dmId)];
      msgs.push({ id: Date.now() + '_' + Math.random().toString(36).slice(2, 5), senderId: m.id, sender: m.name, color: m.color || '#228050', text, ts: new Date().toISOString(), reactions: {} });
      _wsCache[dmId] = msgs;
      wsRenderDMMsgs();
    }
    inp.value = ''; inp.style.height = 'auto';
  };

  // ── New DM picker (no prompt!) ──
  window.wsNewDMPicker = function () {
    const existing = document.getElementById('ws5-picker-overlay');
    if (existing) { existing.remove(); return; }
    const t = team().filter(m => m.id !== me().id);
    const panel = document.getElementById('ws-panel');
    const overlay = document.createElement('div');
    overlay.id = 'ws5-picker-overlay';
    overlay.className = 'ws5-picker-overlay';
    overlay.innerHTML = `<div class="ws5-picker-box">
      <div class="ws5-picker-hdr">
        New Direct Message
        <span onclick="document.getElementById('ws5-picker-overlay').remove()" style="cursor:pointer;color:#ccc;font-size:18px;line-height:1;font-weight:400">✕</span>
      </div>
      <div class="ws5-picker-list">
        ${t.map(m => `<div class="ws5-picker-item" onclick="wsPickDM('${m.id}')">
          <div class="ws5-av" style="width:36px;height:36px;background:${m.color || '#134a32'};font-size:12px;border-radius:10px">
            ${ini(m.name)}<div class="ws5-dot"></div>
          </div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#111">${m.name}</div>
            <div style="font-size:10.5px;color:#999">${m.role || ''} ${m.dept ? '· ' + m.dept : ''}</div>
          </div>
        </div>`).join('')}
        ${!t.length ? '<div style="padding:24px;text-align:center;color:#bbb;font-size:12.5px">No team members yet.<br>Add from Admin → Team.</div>' : ''}
      </div>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    panel.appendChild(overlay);
  };

  // ── Message HTML builder ──
  function buildMsgHTML(msgs, ctxId) {
    let html = '', lastDate = '', lastSender = '', lastTime = 0;
    const myId = me().id;
    msgs.forEach(msg => {
      if (msg.type === 'system') { html += `<div class="ws5-sys">${msg.text}</div>`; lastSender = ''; return; }
      const d = new Date(msg.ts || Date.now());
      const dk = d.toDateString();
      if (dk !== lastDate) {
        html += `<div class="ws5-date-sep">${dateLabel(msg.ts)}</div>`;
        lastDate = dk; lastSender = ''; lastTime = 0;
      }
      const tMs = d.getTime();
      const grouped = msg.senderId === lastSender && (tMs - lastTime) < 300000;
      lastSender = msg.senderId; lastTime = tMs;
      const isMe = msg.senderId === myId;
      const color = msg.color || '#228050';
      const rxns = msg.reactions || {};
      const hasRxns = Object.keys(rxns).length > 0;
      const qe = QUICK_EMOJIS.slice(0, 5);
      html += `<div class="ws5-msg" id="wsm5-${msg.id}">
        <div class="ws5-msg-av${grouped ? ' ghost' : ''}" style="background:${color}">${ini(msg.sender)}</div>
        <div class="ws5-msg-body">
          ${!grouped ? `<div class="ws5-msg-meta"><span class="ws5-msg-name" style="color:${color}">${isMe ? 'You' : msg.sender}</span><span class="ws5-msg-ts">${tsStr(msg.ts)}</span></div>` : ''}
          <div class="ws5-msg-txt">${fmtText(msg.text)}${msg.edited ? '<span class="ws5-edited">(edited)</span>' : ''}</div>
          ${hasRxns ? `<div class="ws5-rxns">${Object.entries(rxns).map(([e, u]) => `<span class="ws5-rxn${u.includes(myId) ? ' mine' : ''}" onclick="wsReact5('${msg.id}','${e}','${ctxId}')">${e}<span class="ws5-rxn-n">${u.length}</span></span>`).join('')}</div>` : ''}
        </div>
        <div class="ws5-acts">
          ${qe.map(e => `<span class="ws5-act-e" onclick="wsReact5('${msg.id}','${e}','${ctxId}')" title="${e}">${e}</span>`).join('')}
          <div class="ws5-act-sep"></div>
          ${isMe ? `<button class="ws5-act-btn" onclick="wsEdit5('${msg.id}','${ctxId}')">Edit</button><button class="ws5-act-btn ws5-act-del" onclick="wsDel5('${msg.id}','${ctxId}')">Del</button>` : ''}
        </div>
      </div>`;
    });
    return html;
  }

  // ── Reactions ──
  window.wsReact5 = function (msgId, emoji, ctxId) {
    const msgs = wsMsgs(ctxId);
    const msg = msgs.find(m => m.id === msgId); if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(me().id);
    if (idx >= 0) msg.reactions[emoji].splice(idx, 1); else msg.reactions[emoji].push(me().id);
    if (!msg.reactions[emoji].length) delete msg.reactions[emoji];
    if (typeof window.fsChatUpdateMsg === 'function') {
      window.fsChatUpdateMsg(ctxId, msgId, { reactions: msg.reactions });
    }
    if (_tab === 'channels') wsRenderChanMsgs(); else wsRenderDMMsgs();
  };

  // ── Edit / Delete ──
  window.wsEdit5 = function (msgId, ctxId) {
    const msgs = wsMsgs(ctxId);
    const msg = msgs.find(m => m.id === msgId); if (!msg) return;
    const newText = prompt('Edit message:', msg.text);
    if (newText === null || !newText.trim()) return;
    msg.text = newText.trim(); msg.edited = true;
    if (typeof window.fsChatUpdateMsg === 'function') {
      window.fsChatUpdateMsg(ctxId, msgId, { text: msg.text, edited: true });
    }
    if (_tab === 'channels') wsRenderChanMsgs(); else wsRenderDMMsgs();
  };
  window.wsDel5 = function (msgId, ctxId) {
    if (!confirm('Delete this message?')) return;
    if (typeof window.fsChatDeleteMsg === 'function') {
      window.fsChatDeleteMsg(ctxId, msgId);
    } else {
      _wsCache[ctxId] = wsMsgs(ctxId).filter(m => m.id !== msgId);
      if (_tab === 'channels') wsRenderChanMsgs(); else wsRenderDMMsgs();
    }
  };

  // ── Input box HTML ──
  function wsInputHTML(inputId, sendFn, placeholder) {
    const epId = 'wsep5-' + inputId;
    const emojiBtns = EMOJI_GRID.map(e => `<span class="ws5-ep-btn" onclick="wsPick5('${inputId}','${e}')">${e}</span>`).join('');
    return `<div class="ws5-input-wrap">
      <div class="ws5-ibox">
        <div class="ws5-toolbar">
          <button class="ws5-tb-btn" onclick="wsFmt5('${inputId}','bold')" title="Bold"><b>B</b></button>
          <button class="ws5-tb-btn" onclick="wsFmt5('${inputId}','italic')" title="Italic"><i>I</i></button>
          <button class="ws5-tb-btn" onclick="wsFmt5('${inputId}','code')" title="Code" style="font-family:monospace">&lt;/&gt;</button>
          <div class="ws5-tb-sep"></div>
          <div style="position:relative">
            <button class="ws5-tb-btn" onclick="wsToggleEP5('${epId}')" title="Emoji">😊</button>
            <div id="${epId}" class="ws5-ep" style="display:none">${emojiBtns}</div>
          </div>
          <button class="ws5-tb-btn" onclick="wsMentionBtn5('${inputId}')" title="Mention">@</button>
        </div>
        <div class="ws5-irow">
          <textarea class="ws5-input" id="${inputId}" placeholder="${placeholder}" rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();${sendFn}}"
            oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
          <button class="ws5-send" onclick="${sendFn}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  // ── Toolbar actions ──
  window.wsFmt5 = function (id, type) {
    const inp = document.getElementById(id); if (!inp) return;
    const sel = inp.value.substring(inp.selectionStart, inp.selectionEnd) || (type === 'bold' ? 'bold' : type === 'italic' ? 'italic' : 'code');
    const wrap = { bold: `**${sel}**`, italic: `_${sel}_`, code: `\`${sel}\`` };
    const b = inp.value.substring(0, inp.selectionStart), a = inp.value.substring(inp.selectionEnd);
    inp.value = b + wrap[type] + a; inp.focus();
  };
  window.wsToggleEP5 = function (epId) {
    const ep = document.getElementById(epId); if (!ep) return;
    ep.style.display = ep.style.display === 'none' ? 'flex' : 'none';
    ep.style.flexWrap = 'wrap';
  };
  window.wsPick5 = function (inputId, emoji) {
    const inp = document.getElementById(inputId); if (!inp) return;
    const pos = inp.selectionStart;
    inp.value = inp.value.slice(0, pos) + emoji + inp.value.slice(pos);
    const epId = 'wsep5-' + inputId;
    const ep = document.getElementById(epId); if (ep) ep.style.display = 'none';
    inp.focus();
  };
  window.wsMentionBtn5 = function (inputId) {
    const inp = document.getElementById(inputId); if (!inp) return;
    inp.value = inp.value.slice(0, inp.selectionStart) + '@' + inp.value.slice(inp.selectionStart);
    inp.focus();
  };

  // ── Badge update ──
  function wsUpdateBadge() {
    const total = totalUnread();
    const badge = document.getElementById('ws-fab-badge');
    if (badge) { badge.textContent = total > 9 ? '9+' : total; badge.style.display = total ? 'flex' : 'none'; }
    const fab = document.getElementById('ws-fab');
    if (fab) fab.style.boxShadow = total ? '0 4px 18px rgba(13,50,35,.45),0 0 0 4px rgba(224,30,90,.25)' : '0 4px 18px rgba(13,50,35,.45)';
  }

  // ── Real-time listeners replace polling ──
  // wsPoll is kept as a no-op; wsSubscribeAll sets up Firestore listeners
  function wsPoll() {}

  // ── Notification popup ──
  function wsShowNotif(msg, roomId) {
    const existing = document.getElementById('ws5-notif-pop');
    if (existing) existing.remove();
    const room = ROOMS.find(r => r.id === roomId);
    const notif = document.createElement('div');
    notif.id = 'ws5-notif-pop';
    notif.className = 'ws5-notif';
    const where = room ? room.emoji + ' #' + room.name : '💬 DM';
    notif.innerHTML = `<div class="ws5-notif-from">${where} · ${msg.sender}</div><div class="ws5-notif-txt">${(msg.text || '').slice(0, 65)}${(msg.text || '').length > 65 ? '…' : ''}</div>`;
    notif.onclick = () => {
      if (!_open) wsToggle();
      if (room) { wsSwitchTab('channels'); window.wsPickRoom(roomId); }
      else { wsSwitchTab('dms'); window.wsPickDM(msg.senderId); }
      notif.remove();
    };
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4500);
  }

  // ── Open full page ──
  window.wsOpenFull = function () {
    window.location.href = window.location.pathname.includes('/pages/') ? 'wanago-space.html' : 'pages/wanago-space.html';
  };

  // ── Boot ──
  function wsStart() { if (document.getElementById('ws-fab-root')) return; wsBuild(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wsStart);
  else wsStart();

})();
