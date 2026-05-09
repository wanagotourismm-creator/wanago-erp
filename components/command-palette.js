// ═══════════════════════════════════════════════════════════════
//  WANAGO — Command Palette  (Ctrl+K)
//  Global search: pages · leads · customers · bookings · actions
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window._cpInit) return;
  window._cpInit = true;

  /* ── CSS ── */
  var css = `
    #cp-backdrop{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);backdrop-filter:blur(3px)}
    #cp-backdrop.open{display:block}
    #cp-dialog{
      display:none;position:fixed;top:14vh;left:50%;transform:translateX(-50%);
      width:min(660px,92vw);background:#fff;border-radius:16px;
      box-shadow:0 32px 80px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.06);
      overflow:hidden;z-index:10001;
    }
    #cp-dialog.open{display:block;animation:cpIn .14s cubic-bezier(.4,0,.2,1)}
    @keyframes cpIn{from{opacity:0;transform:translateX(-50%) translateY(-10px) scale(.98)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
    #cp-search-row{display:flex;align-items:center;gap:10px;padding:0 16px;height:56px;border-bottom:1px solid #eef3ef}
    #cp-search-row svg{width:18px;height:18px;color:#7fa592;flex-shrink:0}
    #cp-input{flex:1;border:none;outline:none;font-size:16px;color:#1a1a1a;background:transparent;font-family:inherit}
    #cp-input::placeholder{color:#b5c9c0}
    #cp-esc-hint{font-size:11px;color:#b5c9c0;background:#f4f8f6;border:1px solid #dce8e2;border-radius:5px;padding:2px 7px;flex-shrink:0}
    #cp-body{max-height:min(420px,52vh);overflow-y:auto}
    .cpg{padding:8px 16px 4px;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#9ab4a8;user-select:none}
    .cpr{display:flex;align-items:center;gap:12px;padding:9px 16px;cursor:pointer;transition:background .1s}
    .cpr:hover,.cpr.sel{background:#f0f7f3}
    .cp-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    .cp-icon.pg {background:#eaf3ed}.cp-icon.ac{background:#fff4e5}.cp-icon.rc{background:#eaeffc}
    .cp-lbl{font-size:14px;font-weight:500;color:#1a1a1a}
    .cp-sub{font-size:11px;color:#9ab4a8;margin-top:1px}
    .cp-hint{margin-left:auto;font-size:10px;color:#b5c9c0;background:#f4f8f6;border:1px solid #dce8e2;border-radius:4px;padding:1px 5px;white-space:nowrap}
    #cp-empty{padding:44px 16px;text-align:center;color:#9ab4a8;font-size:14px}
    #cp-foot{border-top:1px solid #eef3ef;padding:8px 16px;display:flex;gap:16px;align-items:center}
    .cpfk{display:flex;align-items:center;gap:4px;font-size:11px;color:#b5c9c0}
    .cpfk kbd{background:#f4f8f6;border:1px solid #dce8e2;border-radius:4px;padding:1px 5px;font-size:10px;color:#7fa592;font-family:inherit}
  `;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ── HTML ── */
  var bd = document.createElement('div'); bd.id = 'cp-backdrop';
  var dl = document.createElement('div'); dl.id = 'cp-dialog'; dl.setAttribute('role','dialog'); dl.setAttribute('aria-label','Command palette');
  dl.innerHTML = `
    <div id="cp-search-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="cp-input" placeholder="Search pages, customers, bookings, leads…" autocomplete="off" spellcheck="false"/>
      <span id="cp-esc-hint">ESC</span>
    </div>
    <div id="cp-body"></div>
    <div id="cp-foot">
      <div class="cpfk"><kbd>↑</kbd><kbd>↓</kbd> Navigate</div>
      <div class="cpfk"><kbd>↵</kbd> Open</div>
      <div class="cpfk"><kbd>Ctrl</kbd><kbd>K</kbd> Toggle</div>
      <div class="cpfk" style="margin-left:auto"><kbd>?</kbd> Shortcuts</div>
    </div>`;
  document.body.appendChild(bd);
  document.body.appendChild(dl);

  /* ── Static data ── */
  var PAGES = [
    {label:'Dashboard',     page:'dashboard',   icon:'📊', hint:'Overview & KPIs'},
    {label:'Leads',         page:'leads',        icon:'👥', hint:'Sales pipeline'},
    {label:'Customers',     page:'customers',    icon:'👤', hint:'Customer records'},
    {label:'Quotations',    page:'quotations',   icon:'📄', hint:'Quotes & proposals'},
    {label:'Bookings',      page:'bookings',     icon:'📅', hint:'Travel bookings'},
    {label:'Packages',      page:'packages',     icon:'📦', hint:'Tour packages'},
    {label:'Invoices',      page:'invoices',     icon:'🧾', hint:'Billing'},
    {label:'Payments',      page:'payments',     icon:'💳', hint:'Payment records'},
    {label:'Marketing Hub', page:'marketing',    icon:'📣', hint:'Campaigns & blasts'},
    {label:'WhatsApp',      page:'whatsapp',     icon:'💬', hint:'Messaging'},
    {label:'Reports',       page:'reports',      icon:'📈', hint:'Analytics'},
    {label:'HRMS',          page:'hrms',         icon:'🏢', hint:'Team management'},
    {label:'Incentives',    page:'incentives',   icon:'🏆', hint:'Commissions'},
    {label:'Admin Panel',   page:'admin',        icon:'⚙️', hint:'Settings'},
  ];

  var ACTIONS = [
    {label:'New Lead',     icon:'➕', sub:'Add a new sales lead',     fn:function(){_close();goTo('leads');    _click('add-lead-btn');}},
    {label:'New Booking',  icon:'➕', sub:'Create a travel booking',  fn:function(){_close();goTo('bookings'); _click('add-booking-btn');}},
    {label:'New Invoice',  icon:'🧾', sub:'Generate an invoice',      fn:function(){_close();goTo('invoices'); _click('add-invoice-btn');}},
    {label:'New Customer', icon:'👤', sub:'Register a customer',      fn:function(){_close();goTo('customers');_click('add-customer-btn');}},
    {label:'New Package',  icon:'📦', sub:'Add a tour package',       fn:function(){_close();goTo('packages'); _click('add-package-btn');}},
    {label:'Sign out',     icon:'🚪', sub:'End session',              fn:function(){_close();if(typeof handleLogout==='function')handleLogout();}},
  ];

  function _click(id){ setTimeout(function(){ var b=document.getElementById(id); if(b)b.click(); },450); }

  var _results=[], _sel=0;

  function _db(){ return window.DB || {}; }
  function _m(s,q){ return (s||'').toLowerCase().includes(q); }
  function _esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _build(q){
    q=(q||'').trim().toLowerCase();
    var out=[];
    if(!q){
      out.push({_g:'Pages'});
      PAGES.slice(0,7).forEach(function(p){out.push({t:'pg',label:p.label,page:p.page,icon:p.icon,sub:p.hint});});
      out.push({_g:'Quick Actions'});
      ACTIONS.forEach(function(a){out.push({t:'ac',label:a.label,sub:a.sub,icon:a.icon,fn:a.fn});});
    } else {
      var ph=PAGES.filter(function(p){return _m(p.label,q)||_m(p.hint,q);});
      if(ph.length){out.push({_g:'Pages'});ph.forEach(function(p){out.push({t:'pg',label:p.label,page:p.page,icon:p.icon,sub:p.hint});});}
      var ah=ACTIONS.filter(function(a){return _m(a.label,q)||_m(a.sub,q);});
      if(ah.length){out.push({_g:'Actions'});ah.forEach(function(a){out.push({t:'ac',label:a.label,sub:a.sub,icon:a.icon,fn:a.fn});});}
      var db=_db();
      var ld=(db.leads||[]).filter(function(l){return _m(l.name,q)||_m(l.email,q)||_m(l.phone,q);}).slice(0,5);
      if(ld.length){out.push({_g:'Leads'});ld.forEach(function(l){out.push({t:'rc',label:l.name||'Lead',sub:(l.stage||'Lead')+' · '+(l.phone||''),icon:'👥',page:'leads'});});}
      var cu=(db.customers||[]).filter(function(c){return _m(c.name,q)||_m(c.email,q)||_m(c.phone,q);}).slice(0,5);
      if(cu.length){out.push({_g:'Customers'});cu.forEach(function(c){out.push({t:'rc',label:c.name||'Customer',sub:'Customer · '+(c.phone||''),icon:'👤',page:'customers'});});}
      var bk=(db.bookings||[]).filter(function(b){return _m(b.ref,q)||_m(b.customerName,q)||_m(b.destination,q);}).slice(0,5);
      if(bk.length){out.push({_g:'Bookings'});bk.forEach(function(b){out.push({t:'rc',label:b.ref||'Booking',sub:(b.customerName||'')+(b.destination?' · '+b.destination:''),icon:'📅',page:'bookings'});});}
      var inv=(db.invoices||[]).filter(function(i){return _m(i.ref,q)||_m(i.customerName,q);}).slice(0,4);
      if(inv.length){out.push({_g:'Invoices'});inv.forEach(function(i){out.push({t:'rc',label:i.ref||'Invoice',sub:(i.customerName||'')+(i.total?' · ₹'+Number(i.total).toLocaleString():''),icon:'🧾',page:'invoices'});});}
      var qt=(db.quotations||[]).filter(function(q2){return _m(q2.id,q)||_m(q2.customerName,q)||_m(q2.destination,q);}).slice(0,4);
      if(qt.length){out.push({_g:'Quotations'});qt.forEach(function(q2){out.push({t:'rc',label:q2.id||'Quote',sub:(q2.customerName||'')+(q2.destination?' · '+q2.destination:''),icon:'📄',page:'quotations'});});}
      var pk=(db.packages||[]).filter(function(p){return _m(p.name,q)||_m(p.destination,q)||_m(p.code,q);}).slice(0,4);
      if(pk.length){out.push({_g:'Packages'});pk.forEach(function(p){out.push({t:'rc',label:p.name||'Package',sub:(p.destination||'')+(p.code?' · '+p.code:''),icon:'📦',page:'packages'});});}
      if(out.length===0) out.push({_empty:true});
    }
    return out;
  }

  function _render(items){
    var body=document.getElementById('cp-body');
    var rows=items.filter(function(i){return !i._g&&!i._empty;});
    _results=rows;
    if(_sel>=rows.length)_sel=0;
    if(items.length===1&&items[0]._empty){ body.innerHTML='<div id="cp-empty">No results — try a different search</div>'; return; }
    var ri=-1,html='';
    items.forEach(function(item){
      if(item._g){html+='<div class="cpg">'+item._g+'</div>';return;}
      ri++;
      var cls='cpr'+(ri===_sel?' sel':'');
      var ic=item.t==='pg'?'pg':item.t==='ac'?'ac':'rc';
      html+='<div class="'+cls+'" data-r="'+ri+'">'
        +'<div class="cp-icon '+ic+'">'+item.icon+'</div>'
        +'<div><div class="cp-lbl">'+_esc(item.label)+'</div>'+(item.sub?'<div class="cp-sub">'+_esc(item.sub)+'</div>':'')+'</div>'
        +'</div>';
    });
    body.innerHTML=html;
    body.querySelectorAll('.cpr').forEach(function(el){
      el.addEventListener('mouseenter',function(){_sel=+el.dataset.r;_hl();});
      el.addEventListener('click',function(){_sel=+el.dataset.r;_activate();});
    });
    _hl();
  }

  function _hl(){
    var body=document.getElementById('cp-body');
    body.querySelectorAll('.cpr').forEach(function(el){el.classList.toggle('sel',+el.dataset.r===_sel);});
    var a=body.querySelector('.cpr.sel');
    if(a)a.scrollIntoView({block:'nearest'});
  }

  function _activate(){
    var r=_results[_sel]; if(!r)return;
    if(r.fn){r.fn();}
    else if(r.page){_close();if(typeof goTo==='function')goTo(r.page);}
  }

  function _open(){
    bd.classList.add('open'); dl.classList.add('open');
    var inp=document.getElementById('cp-input');
    inp.value=''; _sel=0; _render(_build(''));
    setTimeout(function(){inp.focus();},30);
  }

  function _close(){bd.classList.remove('open');dl.classList.remove('open');}

  document.getElementById('cp-input').addEventListener('input',function(e){_sel=0;_render(_build(e.target.value));});
  document.getElementById('cp-input').addEventListener('keydown',function(e){
    var n=_results.length||1;
    if(e.key==='ArrowDown'){e.preventDefault();_sel=(_sel+1)%n;_hl();}
    else if(e.key==='ArrowUp'){e.preventDefault();_sel=(_sel-1+n)%n;_hl();}
    else if(e.key==='Enter'){e.preventDefault();_activate();}
    else if(e.key==='Escape'){_close();}
  });
  bd.addEventListener('click',_close);

  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();dl.classList.contains('open')?_close():_open();}
    if(e.key==='Escape'&&dl.classList.contains('open'))_close();
  });

  // Hijack the existing topbar search input
  window.addEventListener('load',function(){
    // Only wire search inputs that have NO oninput handler — these are intentional
    // command-palette triggers (e.g. dashboard topbar). Never touch inputs that
    // already have oninput (e.g. leads search, quotations search) — those are real
    // data-search fields and must NOT open the palette or be made readonly.
    document.querySelectorAll('.search-inp:not([oninput])').forEach(function(si){
      si.setAttribute('readonly','true');
      si.style.cursor='pointer';
      si.placeholder='Search  (Ctrl+K)';
      si.addEventListener('focus',function(ev){ev.target.blur();_open();});
      si.addEventListener('click',_open);
    });
  });

  window.openCommandPalette = _open;
  window.closeCommandPalette = _close;
})();
