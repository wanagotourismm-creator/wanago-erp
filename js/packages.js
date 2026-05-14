// ═══════════════════════════════════════════════════════════════
//  AUTH GUARD
// ═══════════════════════════════════════════════════════════════

function initPage(renderFn) {
  // Check session
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }

  // Set user UI
  try {
    var s = JSON.parse(session);
    var name = (window.currentUser && window.currentUser.name) || s.name || 'User';
    var av = document.getElementById('user-avatar');
    var un = document.getElementById('user-name');
    var tu = document.getElementById('topbar-user');
    if (av) av.textContent = name[0].toUpperCase();
    if (un) un.textContent = name;
    if (tu) tu.textContent = s.email || '';
    if (typeof window.rebuildSidebar === 'function') window.rebuildSidebar();
  } catch(ex) {}

  // Render with loader fade
  function fadeLoader() {
    var l = document.getElementById('page-loader');
    var a = document.querySelector('.app');
    if (l) { l.classList.add('fade-out'); setTimeout(function(){ try{l.parentNode.removeChild(l);}catch(e){} }, 300); }
    if (a) a.classList.add('loaded');
  }

  setTimeout(function() {
    try { if (renderFn) renderFn(); } catch(e) { console.error('Page render error:', e); }
    fadeLoader();
  }, 20);
}

function handleLogout() {
  sessionStorage.removeItem('wanago_session');
  window.location.href = '../index.html';
}

function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── State & Constants ──
var pkgFilter = 'all';
var pkgView = 'card';

var CAT_EMOJI = {
  general:'📦', beach:'🏖️', adventure:'🏔️', family:'👨‍👩‍👧‍👦',
  honeymoon:'💑', international:'✈️', domestic:'🇮🇳', pilgrimage:'🙏',
  wildlife:'🦁', cruise:'🚢', backpacking:'🎒', luxury:'💎',
  budget:'💰', cultural:'🏛️', wellness:'🧘', sports:'⚽'
};

function openNewPkgModal() {
  document.getElementById('pkg-edit-id').value = '';
  document.getElementById('pkg-modal-title').textContent = 'New Package';
  document.getElementById('pkg-save-btn').textContent = 'Save Package';
  ['pkg-name','pkg-dest','pkg-country','pkg-nights','pkg-days','pkg-maxpax',
   'pkg-price','pkg-gst','pkg-child-price','pkg-double-price','pkg-mrp',
   'pkg-commission','pkg-highlights','pkg-inclusions','pkg-exclusions',
   'pkg-tags','pkg-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'pkg-gst' ? '5' : id === 'pkg-commission' ? '10' : '';
  });
  const cat = document.getElementById('pkg-cat');
  const stat = document.getElementById('pkg-status');
  if (cat) cat.value = '';
  if (stat) stat.value = 'active';
  const feat = document.getElementById('pkg-featured');
  if (feat) feat.checked = false;
  switchPkgTab('basic');
  updatePkgPricePreview();
  openModal('modal-add-package');
}

function renderPkgAIStrip() {
  const el = document.getElementById('pkg-ai-strip');
  if (!el) return;
  const pkgs = hScoped('packages') || [];
  const active = pkgs.filter(p => (p.status||'active') === 'active');
  if (!active.length) { el.style.display = 'none'; return; }
  el.style.display = '';

  const cards = [];

  // 1. Top booked package
  const sorted = active.slice().sort((a,b) => (b.bookingsCount||0) - (a.bookingsCount||0));
  if (sorted[0] && (sorted[0].bookingsCount||0) > 0) {
    const top = sorted[0];
    cards.push({ icon:'🔥', color:'#dc2626', bg:'#fee2e2',
      title: top.name,
      sub: (top.bookingsCount||0)+' bookings · '+(top.revenue?formatMoney(top.revenue)+' revenue':'₹'+Number(top.price).toLocaleString('en-IN')+'/person') });
  }

  // 2. Dead packages (active, 0 bookings) — if any
  const dead = active.filter(p => !(p.bookingsCount||0));
  if (dead.length) {
    cards.push({ icon:'💤', color:'#6b7280', bg:'#f3f4f6',
      title: dead.length+' Package'+(dead.length>1?'s':'')+' with Zero Bookings',
      sub: 'Consider repricing or adding to a campaign: '+dead.slice(0,2).map(p=>p.name).join(', ')+(dead.length>2?' +more':'') });
  }

  // 3. High-commission packages (>15% — big earners)
  const highComm = active.filter(p => parseFloat(p.commission||10) > 15);
  if (highComm.length) {
    cards.push({ icon:'💎', color:'#7c3aed', bg:'#f5f3ff',
      title: highComm.length+' High-Margin Package'+(highComm.length>1?'s':'')+' (15%+ commission)',
      sub: 'Prioritize these in campaigns: '+highComm.slice(0,2).map(p=>p.name).join(', ')+(highComm.length>2?' +more':'') });
  }

  // 4. Featured packages — highlight count
  const featured = active.filter(p => p.featured);
  if (featured.length) {
    const featuredWithBk = featured.filter(p => (p.bookingsCount||0) > 0);
    if (featured.length > featuredWithBk.length) {
      cards.push({ icon:'⭐', color:'#b45309', bg:'#fffbeb',
        title: (featured.length-featuredWithBk.length)+' Featured Package'+(featured.length-featuredWithBk.length>1?'s':'')+' Not Yet Booked',
        sub: 'Featured but 0 bookings — review visibility or pricing' });
    }
  }

  if (!cards.length) { el.style.display = 'none'; return; }

  el.innerHTML =
    '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;box-shadow:var(--sh)">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:6px">📦 Package Intelligence <span style="font-size:10px;font-weight:400;color:var(--textd)">performance snapshot</span></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px">'+
        cards.map(c =>
          '<div style="background:'+c.bg+';border:1px solid '+c.color+'22;border-radius:9px;padding:10px 12px;display:flex;gap:9px;align-items:flex-start">'+
            '<span style="font-size:16px;flex-shrink:0">'+c.icon+'</span>'+
            '<div><div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.3">'+c.title+'</div>'+
            '<div style="font-size:10.5px;color:var(--textd);margin-top:2px;line-height:1.4">'+c.sub+'</div></div>'+
          '</div>'
        ).join('')+
      '</div>'+
    '</div>';
}

function renderPkgStats() { const pkgs=DB.packages||[]; const strip=document.getElementById('pkg-stats-strip'); if(!strip)return; strip.innerHTML=[{label:'Total Packages',val:pkgs.length,meta:pkgs.filter(p=>(p.status||'active')==='active').length+' active'},{label:'Total Bookings',val:pkgs.reduce((s,p)=>s+(p.bookingsCount||0),0),meta:'across all packages'},{label:'Total Revenue',val:formatMoney(pkgs.reduce((s,p)=>s+(p.revenue||0),0)),meta:'from packages'},{label:'⭐ Featured',val:pkgs.filter(p=>p.featured).length,meta:'highlighted'}].map(s=>'<div class="stat-card" style="cursor:pointer"><div class="stat-label">'+s.label+'</div><div class="stat-val">'+s.val+'</div><div class="stat-meta">'+s.meta+'</div></div>').join(''); }
function setPkgView(v) { pkgView=v; document.getElementById('pkg-cards-view').style.display=v==='card'?'':'none'; document.getElementById('pkg-table-view').style.display=v==='table'?'':'none'; document.getElementById('pkg-view-card').style.background=v==='card'?'var(--g700)':'transparent'; document.getElementById('pkg-view-card').style.color=v==='card'?'#fff':'var(--textd)'; document.getElementById('pkg-view-table').style.background=v==='table'?'var(--g700)':'transparent'; document.getElementById('pkg-view-table').style.color=v==='table'?'#fff':'var(--textd)'; renderPackages(); }
function getFilteredSortedPackages() { let pkgs=hScoped('packages'); if(pkgFilter!=='all')pkgs=pkgs.filter(p=>p.category===pkgFilter); const q=(document.getElementById('pkg-search')?.value||'').toLowerCase(); if(q)pkgs=pkgs.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.destination||'').toLowerCase().includes(q)||(p.code||'').toLowerCase().includes(q)||(p.tags||'').toLowerCase().includes(q)); const sort=document.getElementById('pkg-sort')?.value||'newest'; if(sort==='price-asc')pkgs.sort((a,b)=>a.price-b.price); if(sort==='price-desc')pkgs.sort((a,b)=>b.price-a.price); if(sort==='bookings')pkgs.sort((a,b)=>(b.bookingsCount||0)-(a.bookingsCount||0)); if(sort==='name')pkgs.sort((a,b)=>(a.name||'').localeCompare(b.name||'')); return pkgs; }
function renderPackages(filter) { if(filter)pkgFilter=filter; renderPkgStats(); renderPkgAIStrip(); const pkgs=getFilteredSortedPackages(); if(pkgView==='card')renderPkgCards(pkgs);else renderPkgTable(pkgs); }
function renderPkgCards(pkgs) { const grid=document.getElementById('pkg-cards-grid'); const empty=document.getElementById('pkg-cards-empty'); if(!pkgs.length){grid.innerHTML='';empty.style.display='';empty.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--textd)"><div style="font-size:40px;margin-bottom:12px">📦</div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px">No packages found</div><button class="btn btn-primary" style="margin-top:16px" onclick="openNewPkgModal()">+ New Package</button></div>';return;} empty.style.display='none'; grid.innerHTML=pkgs.map(p=>{const cat=p.category||'general';const emoji=CAT_EMOJI[cat]||'📦';const gstAmt=Math.round(p.price*(parseFloat(p.gst||5)/100));const disc=p.mrp&&p.mrp>p.price?Math.round((1-p.price/p.mrp)*100):0;const status=p.status||'active';const statusColor=status==='active'?'var(--g500)':status==='draft'?'var(--amb)':'var(--red)';const inclusions=p.inclusions?p.inclusions.split(/,|\n/).map(s=>s.trim()).filter(Boolean).slice(0,4):[];const highlights=p.highlights?p.highlights.split('\n').filter(Boolean).slice(0,3):[];return '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--sh);transition:.2s" onmouseover="this.style.boxShadow=\'var(--sh2)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.boxShadow=\'var(--sh)\';this.style.transform=\'\'"><div style="background:linear-gradient(135deg,var(--g800),var(--g600));padding:14px 16px;position:relative;overflow:hidden"><div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;background:rgba(255,255,255,.07);border-radius:50%"></div><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:16px">'+emoji+'</span><span style="font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.55)">'+(p.code||'')+'</span>'+(p.featured?'<span style="background:var(--gold);color:#fff;font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px">⭐ FEATURED</span>':'')+'</div><div style="font-size:13.5px;font-weight:700;color:#fff;line-height:1.3">'+p.name+'</div><div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:3px">📍 '+p.destination+(p.country&&p.country!==p.destination?', '+p.country:'')+'</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px">'+(p.nights||0)+'N/'+(p.days||0)+'D</div><div style="font-size:19px;font-weight:800;color:#fff;font-family:DM Serif Display,serif">₹'+Number(p.price).toLocaleString('en-IN')+'</div><div style="font-size:9.5px;color:rgba(255,255,255,.55)">per person + '+(p.gst||5)+'% GST</div>'+(disc>0?'<div style="background:var(--red);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:7px;display:inline-block;margin-top:3px">'+disc+'% OFF</div>':'')+'</div></div></div><div style="padding:14px 16px">'+(inclusions.length?'<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">'+inclusions.map(i=>'<span style="background:var(--g50);color:var(--g700);border:1px solid var(--g100);font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500">✓ '+i+'</span>').join('')+'</div>':'')+(highlights.length?'<ul style="padding-left:0;margin:0 0 10px 0;list-style:none">'+highlights.map(h=>'<li style="font-size:11.5px;color:var(--textm);margin-bottom:3px;display:flex;gap:5px"><span style="color:var(--g400)">◆</span>'+h+'</li>').join('')+'</ul>':'')+'<div style="display:flex;gap:0;border-top:1px solid var(--border);padding-top:10px;margin-top:2px"><div style="flex:1;text-align:center;border-right:1px solid var(--border)"><div style="font-size:15px;font-weight:700;color:var(--g700)">'+(p.bookingsCount||0)+'</div><div style="font-size:9.5px;color:var(--textd);text-transform:uppercase">Bookings</div></div><div style="flex:1;text-align:center;border-right:1px solid var(--border)"><div style="font-size:13px;font-weight:700;color:var(--g700)">'+(p.revenue?formatMoney(p.revenue):'—')+'</div><div style="font-size:9.5px;color:var(--textd);text-transform:uppercase">Revenue</div></div><div style="flex:1;text-align:center"><div style="font-size:11px;font-weight:700;color:'+statusColor+';text-transform:uppercase">'+status+'</div><div style="font-size:9.5px;color:var(--textd);text-transform:uppercase">Status</div></div></div></div><div style="padding:10px 14px;border-top:1px solid var(--border);background:var(--cream);display:flex;gap:6px"><button class="btn btn-sm btn-outline" style="flex:1" onclick="viewPkgDrawer(\''+p.id+'\')">👁 View</button><button class="btn btn-sm btn-green" style="flex:1" onclick="editPackage(\''+p.id+'\')">✏️ Edit</button><button class="btn btn-sm" onclick="duplicatePackage(\''+p.id+'\')" style="background:var(--blue2);color:var(--blue);border:1px solid rgba(37,99,235,.2);font-size:11px;border-radius:7px;padding:5px 9px;cursor:pointer">⧉</button><button class="btn btn-sm btn-danger" onclick="deletePackage(\''+p.id+'\')">🗑</button></div></div>';}).join(''); }
function renderPkgTable(pkgs) { const tbody=document.getElementById('packages-tbody'); if(!pkgs.length){tbody.innerHTML=emptyRow(11,'No packages found.');return;} tbody.innerHTML=pkgs.map(p=>{const gstAmt=Math.round(p.price*(parseFloat(p.gst||5)/100));const status=p.status||'active';const sp=status==='active'?PILL.green('active'):status==='draft'?PILL.amber('draft'):PILL.red('inactive');return '<tr><td class="mono">'+(p.code||'')+'</td><td><div style="font-weight:600">'+p.name+'</div>'+(p.featured?'<span style="font-size:9px;color:var(--gold);font-weight:700">⭐ Featured</span>':'')+'</td><td>'+p.destination+'</td><td>'+PILL.blue(p.category||'general')+'</td><td>'+(p.nights||0)+'N/'+(p.days||0)+'D</td><td style="font-weight:600">'+formatMoney(p.price)+'</td><td style="color:var(--textd)">'+formatMoney(p.price+gstAmt)+'</td><td>'+(p.bookingsCount||0)+'</td><td>'+(p.revenue?formatMoney(p.revenue):'—')+'</td><td>'+sp+'</td><td style="white-space:nowrap"><button class="row-btn" onclick="viewPkgDrawer(\''+p.id+'\')">View</button> <button class="row-btn" onclick="editPackage(\''+p.id+'\')">Edit</button> <button class="row-btn" onclick="duplicatePackage(\''+p.id+'\')">⧉</button> <button class="row-btn" style="color:var(--red)" onclick="deletePackage(\''+p.id+'\')">✕</button></td></tr>';}).join(''); }
function filterPackages(f,el) { document.querySelectorAll('.page .chip').forEach(c=>c.classList.remove('active')); if(el)el.classList.add('active'); pkgFilter=f; renderPackages(); }
function _renderPkgRelatedBookings(pkgId) {
  var bks = (DB.bookings||[]).filter(function(b){ return b.packageId === pkgId; }).slice(0,8);
  if (!bks.length) return '';
  var stColor = function(s){ return s==='confirmed'?'var(--g600)':s==='completed'?'var(--blue)':s==='cancelled'?'var(--red)':'var(--amb)'; };
  return '<div style="margin-bottom:14px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--textd);margin-bottom:8px">🗓 Related Bookings ('+bks.length+')</div>'+
    bks.map(function(b){
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--cream);border-radius:8px;margin-bottom:4px;cursor:pointer" onclick="closePkgDrawer();setTimeout(function(){if(typeof viewBooking===\'function\')viewBooking(\''+b.id+'\')},220)">'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:12px;font-weight:600;color:var(--text)">'+(b.customerName||'Customer')+'</div>'+
          '<div style="font-size:10.5px;color:var(--textd)">'+(b.id||'')+(b.travelDate?' · '+formatDate(b.travelDate):'')+'</div>'+
        '</div>'+
        '<div style="text-align:right;flex-shrink:0">'+
          '<div style="font-size:11.5px;font-weight:700;color:var(--g700)">'+(b.total?formatMoney(b.total):'—')+'</div>'+
          '<div style="font-size:10px;font-weight:600;text-transform:capitalize;color:'+stColor(b.status||'confirmed')+'">'+(b.status||'confirmed')+'</div>'+
        '</div>'+
      '</div>';
    }).join('')+
  '</div>';
}
function viewPkgDrawer(id) { const p=DB.packages.find(x=>x.id===id);if(!p)return; const gstAmt=Math.round(p.price*(parseFloat(p.gst||5)/100));const total=p.price+gstAmt;const disc=p.mrp&&p.mrp>p.price?Math.round((1-p.price/p.mrp)*100):0;const highlights=p.highlights?p.highlights.split('\n').filter(Boolean):[];const inclusions=p.inclusions?p.inclusions.split(/,|\n/).map(s=>s.trim()).filter(Boolean):[];const exclusions=p.exclusions?p.exclusions.split(/,|\n/).map(s=>s.trim()).filter(Boolean):[]; document.getElementById('pkg-drawer').innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px"><div><div style="font-size:10px;color:var(--textd);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">'+(p.code||'')+' · '+(CAT_EMOJI[p.category||'general']||'📦')+' '+(p.category||'general')+'</div><div style="font-size:18px;font-weight:800;color:var(--g800);line-height:1.2">'+p.name+'</div><div style="font-size:12px;color:var(--textd);margin-top:4px">📍 '+p.destination+(p.country&&p.country!==p.destination?', '+p.country:'')+' · '+(p.nights||0)+'N/'+(p.days||0)+'D</div></div><button onclick="closePkgDrawer()" style="background:var(--cream2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:16px;line-height:1">✕</button></div><div style="background:var(--g800);color:#fff;border-radius:12px;padding:16px;margin-bottom:16px"><div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Pricing</div><div style="display:flex;gap:16px;flex-wrap:wrap"><div><div style="font-size:10px;color:rgba(255,255,255,.5)">Base</div><div style="font-size:22px;font-weight:800;font-family:DM Serif Display,serif">₹'+Number(p.price).toLocaleString('en-IN')+'</div></div><div><div style="font-size:10px;color:rgba(255,255,255,.5)">+GST ('+( p.gst||5)+'%)</div><div style="font-size:16px;font-weight:600;color:rgba(255,255,255,.7)">₹'+gstAmt.toLocaleString('en-IN')+'</div></div><div><div style="font-size:10px;color:rgba(255,255,255,.5)">Total</div><div style="font-size:22px;font-weight:800;font-family:DM Serif Display,serif;color:var(--g300)">₹'+total.toLocaleString('en-IN')+'</div></div>'+(disc>0?'<div><div style="font-size:10px;color:rgba(255,255,255,.5)">Discount</div><div style="font-size:16px;font-weight:700;color:#ff6b6b">'+disc+'% off</div></div>':'')+'</div></div>'+(highlights.length?'<div style="margin-bottom:14px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--textd);margin-bottom:8px">✨ Highlights</div><ul style="list-style:none;padding:0;margin:0">'+highlights.map(h=>'<li style="font-size:12px;color:var(--textm);padding:4px 0;border-bottom:1px solid var(--border);display:flex;gap:7px"><span style="color:var(--g400)">◆</span>'+h+'</li>').join('')+'</ul></div>':'')+(inclusions.length?'<div style="margin-bottom:14px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--textd);margin-bottom:8px">✅ Inclusions</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+inclusions.map(i=>'<span style="background:var(--g50);color:var(--g700);border:1px solid var(--g200);font-size:11px;padding:3px 10px;border-radius:20px">✓ '+i+'</span>').join('')+'</div></div>':'')+(exclusions.length?'<div style="margin-bottom:14px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--textd);margin-bottom:8px">❌ Exclusions</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+exclusions.map(i=>'<span style="background:var(--red2);color:var(--red);border:1px solid rgba(192,57,43,.15);font-size:11px;padding:3px 10px;border-radius:20px">✗ '+i+'</span>').join('')+'</div></div>':'')+(p.notes?'<div style="background:var(--amb2);border:1px solid rgba(214,137,16,.2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:11.5px;color:#7a5800"><strong>📋 Notes:</strong> '+p.notes+'</div>':'')+_renderPkgRelatedBookings(p.id)+'<div style="display:flex;gap:8px;margin-top:18px;padding-top:16px;border-top:1px solid var(--border)"><button class="btn btn-primary" style="flex:1" onclick="editPackage(\''+p.id+'\');closePkgDrawer()">✏️ Edit</button><button class="btn btn-outline" onclick="duplicatePackage(\''+p.id+'\')">⧉ Duplicate</button><button class="btn btn-danger" onclick="deletePackage(\''+p.id+'\');closePkgDrawer()">🗑</button></div>'; document.getElementById('pkg-drawer-overlay').style.display=''; document.getElementById('pkg-drawer').style.display=''; }
function closePkgDrawer() { document.getElementById('pkg-drawer-overlay').style.display='none'; document.getElementById('pkg-drawer').style.display='none'; }
function editPackage(id) { const p=DB.packages.find(x=>x.id===id);if(!p)return; document.getElementById('pkg-edit-id').value=id; document.getElementById('pkg-modal-title').textContent='Edit Package'; document.getElementById('pkg-save-btn').textContent='Save Changes'; const s=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val||'';}; s('pkg-name',p.name);s('pkg-dest',p.destination);s('pkg-country',p.country);s('pkg-cat',p.category);s('pkg-nights',p.nights);s('pkg-days',p.days);s('pkg-maxpax',p.maxPax||0);s('pkg-status',p.status||'active');s('pkg-price',p.price);s('pkg-gst',p.gst||'5');s('pkg-child-price',p.childPrice);s('pkg-double-price',p.doublePrice);s('pkg-mrp',p.mrp);s('pkg-commission',p.commission||10);s('pkg-highlights',p.highlights);s('pkg-inclusions',p.inclusions);s('pkg-exclusions',p.exclusions);s('pkg-tags',p.tags);s('pkg-notes',p.notes); document.getElementById('pkg-featured').checked=!!p.featured; switchPkgTab('basic'); updatePkgPricePreview(); openModal('modal-add-package'); }
function duplicatePackage(id) { const src=DB.packages.find(x=>x.id===id);if(!src)return; const copy={...src,id:uid(),code:'WGO-P'+String(++DB.counters.packages).padStart(3,'0'),name:'Copy of '+src.name,bookingsCount:0,revenue:0,createdAt:new Date().toISOString(),createdBy:createdByStamp()}; DB.packages.unshift(copy);saveDB();renderPackages();showToast('Package duplicated'); }
function savePackage() { const editId=document.getElementById('pkg-edit-id').value;const name=document.getElementById('pkg-name').value.trim();const dest=document.getElementById('pkg-dest').value.trim();const cat=document.getElementById('pkg-cat').value;const price=parseFloat(document.getElementById('pkg-price').value); if(!name||!dest||!cat||!price){showError('pkg-error','Name, destination, category and price are required.');return;} const fields={name,destination:dest,country:document.getElementById('pkg-country').value,category:cat,nights:document.getElementById('pkg-nights').value||0,days:document.getElementById('pkg-days').value||0,maxPax:parseInt(document.getElementById('pkg-maxpax').value)||0,status:document.getElementById('pkg-status').value||'active',price,gst:document.getElementById('pkg-gst').value||5,childPrice:parseFloat(document.getElementById('pkg-child-price').value)||0,doublePrice:parseFloat(document.getElementById('pkg-double-price').value)||0,mrp:parseFloat(document.getElementById('pkg-mrp').value)||0,commission:parseFloat(document.getElementById('pkg-commission').value)||10,highlights:document.getElementById('pkg-highlights').value.trim(),inclusions:document.getElementById('pkg-inclusions').value.trim(),exclusions:document.getElementById('pkg-exclusions').value.trim(),tags:document.getElementById('pkg-tags').value.trim(),notes:document.getElementById('pkg-notes').value.trim(),featured:document.getElementById('pkg-featured').checked}; if(editId){const idx=DB.packages.findIndex(p=>p.id===editId);if(idx!==-1){DB.packages[idx]={...DB.packages[idx],...fields};if(typeof dbSave==='function')dbSave('packages',DB.packages[idx]).catch(()=>{});}showToast('Package updated!');}else{const code='WGO-P'+String(++DB.counters.packages).padStart(3,'0');DB.packages.unshift({id:uid(),code,...fields,bookingsCount:0,revenue:0,officeId:officeIdForNewRecord(),createdBy:createdByStamp(),createdAt:new Date().toISOString()});
  if(typeof dbSave==='function')dbSave('packages',DB.packages[0]).catch(()=>{});showToast('Package created!');} saveDB();closeModal('modal-add-package');renderPackages(); }
function deletePackage(id) { if(!confirm('Remove this package?'))return; DB.packages=DB.packages.filter(p=>p.id!==id);if(typeof dbDelete==='function')dbDelete('packages',id);saveDB();renderPackages();showToast('Package removed'); }
function switchPkgTab(tab) { ['basic','pricing','details'].forEach(t=>{const btn=document.getElementById('pkg-tab-'+t);const cnt=document.getElementById('pkg-tab-'+t+'-content');if(!btn||!cnt)return;const active=t===tab;btn.style.background=active?'var(--g700)':'transparent';btn.style.color=active?'#fff':'var(--textd)';cnt.style.display=active?'':'none';}); }
function autofillDays() { const n=parseInt(document.getElementById('pkg-nights').value);if(!isNaN(n))document.getElementById('pkg-days').value=n+1; }
function updatePkgPricePreview() { const price=parseFloat(document.getElementById('pkg-price')?.value);const gst=parseFloat(document.getElementById('pkg-gst')?.value||5);const mrp=parseFloat(document.getElementById('pkg-mrp')?.value);const prev=document.getElementById('pkg-price-preview');if(!prev)return;if(!price){prev.style.display='none';return;} prev.style.display='';const gstAmt=Math.round(price*gst/100);document.getElementById('pp-base').textContent='₹'+price.toLocaleString('en-IN');document.getElementById('pp-gst').textContent='₹'+gstAmt.toLocaleString('en-IN');document.getElementById('pp-total').textContent='₹'+(price+gstAmt).toLocaleString('en-IN');const dw=document.getElementById('pp-discount-wrap');if(mrp&&mrp>price){document.getElementById('pp-discount').textContent=Math.round((1-price/mrp)*100)+'% off MRP';dw.style.display='';}else{dw.style.display='none';} }
window.renderPackages=renderPackages;window.filterPackages=filterPackages;window.setPkgView=setPkgView;window.openNewPkgModal=openNewPkgModal;window.viewPkgDrawer=viewPkgDrawer;window.closePkgDrawer=closePkgDrawer;window.editPackage=editPackage;window.duplicatePackage=duplicatePackage;window.savePackage=savePackage;window.deletePackage=deletePackage;window.switchPkgTab=switchPkgTab;window.autofillDays=autofillDays;window.updatePkgPricePreview=updatePkgPricePreview;

initPage(function() {
  renderPackages();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderPackages();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('packages', function() { renderPackages(); });
      }
    }, 5000);
  }
});
