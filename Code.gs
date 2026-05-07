// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Google Sheets Sync + Daily EODR Engine v2
//
//  SETUP (one time):
//  1. Create a Google Sheet → Extensions → Apps Script
//  2. Paste this entire file, delete the default code
//  3. Deploy → New deployment → Web App
//     Execute as: Me  |  Who has access: Anyone
//  4. Copy Web App URL → Admin Panel → Integrations → Google Sheets → Save
//  5. Click "Setup Daily Trigger" in Admin Panel to enable auto EODR
// ═══════════════════════════════════════════════════════════════

var SHEETS = {
  summary:    '📊 Summary',
  leads:      '📋 Leads',
  customers:  '👤 Customers',
  bookings:   '🗓 Bookings',
  payments:   '💰 Payments',
  invoices:   '🧾 Invoices',
  quotations: '📜 Quotations',
  activity:   '📝 Activity',
  team:       '👥 Team',
};

var C = {
  dark:       '#0d3223',
  mid:        '#1a5c3a',
  light:      '#e8f5e9',
  gold:       '#c9a84c',
  goldLight:  '#fffde7',
  white:      '#ffffff',
  gray:       '#f5f5f5',
  border:     '#e0e0e0',
  red:        '#c0392b',
  redLight:   '#fee8e6',
  blue:       '#1565c0',
  blueLight:  '#e3f2fd',
  purple:     '#6a1b9a',
  purpleLight:'#f3e5f5',
};

/* ══════════════ HTTP HANDLERS ══════════════ */

function doGet(e) {
  var action = e.parameter && e.parameter.action;
  if (action === 'ping') {
    return respond({ ok: true, msg: 'Wanago ERP connected ✅', ts: new Date().toISOString() });
  }
  return respond({ ok: true, msg: 'Wanago ERP Sheets v2 — POST data to sync' });
}

function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var action = data.action || 'sync';

    if (action === 'sync') {
      PropertiesService.getScriptProperties().setProperty('lastPayload', e.postData.contents);
      return handleSync(data);
    }
    if (action === 'setupTrigger') {
      var msg = setupDailyTrigger(data.hour || 19);
      return respond({ ok: true, msg: msg });
    }
    if (action === 'sendEODR') {
      var raw = PropertiesService.getScriptProperties().getProperty('lastPayload');
      if (!raw) return respond({ ok: false, error: 'No data synced yet — sync ERP first.' });
      var result = sendEODR(JSON.parse(raw));
      return respond({ ok: true, msg: 'EODR sent to ' + result + ' members' });
    }

    return respond({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return respond({ ok: false, error: err.message });
  }
}

function handleSync(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  writeSummary(ss, data);
  writeTeam(ss, data.team || []);
  writeSheet(ss, SHEETS.leads,      data.leads      || [], leadHeaders(),      leadFields());
  writeSheet(ss, SHEETS.customers,  data.customers  || [], customerHeaders(),  customerFields());
  writeSheet(ss, SHEETS.bookings,   data.bookings   || [], bookingHeaders(),   bookingFields());
  writeSheet(ss, SHEETS.payments,   data.payments   || [], paymentHeaders(),   paymentFields());
  writeSheet(ss, SHEETS.invoices,   data.invoices   || [], invoiceHeaders(),   invoiceFields());
  writeSheet(ss, SHEETS.quotations, data.quotations || [], quotationHeaders(), quotationFields());
  writeActivity(ss, data.recentActivity || []);
  return respond({ ok: true, syncedAt: data.syncedAt, sheets: 9 });
}

/* ══════════════ SUMMARY DASHBOARD ══════════════ */

function writeSummary(ss, data) {
  var sh = getSheet(ss, SHEETS.summary);
  sh.clearContents();
  sh.clearFormats();

  var s      = data.summary  || {};
  var leads  = data.leads    || [];
  var books  = data.bookings || [];
  var pays   = data.payments || [];
  var team   = data.team     || [];
  var tz     = Session.getScriptTimeZone();
  var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var todayFmt = Utilities.formatDate(new Date(), tz, 'dd MMM yyyy, EEEE');
  var tsStr    = data.syncedAt
    ? Utilities.formatDate(new Date(data.syncedAt), tz, 'dd-MMM-yyyy HH:mm')
    : Utilities.formatDate(new Date(), tz, 'dd-MMM-yyyy HH:mm');

  // ── Today's computed stats ──
  var leadsToday  = leads.filter(function(l){ return (l.createdAt||'').slice(0,10) === todayStr; });
  var booksToday  = books.filter(function(b){ return (b.createdAt||'').slice(0,10) === todayStr; });
  var paysToday   = pays.filter(function(p){ return (p.date||'').slice(0,10) === todayStr && ['completed','received'].indexOf(p.status) > -1; });
  var revToday    = paysToday.reduce(function(acc,p){ return acc + Number(p.amount||0); }, 0);
  var fuToday     = leads.filter(function(l){ return (l.followUpDate||'').slice(0,10) === todayStr; }).length;

  // ── Pipeline breakdown ──
  var stageOrder  = ['new','contacted','interested','hot','proposal','won','lost'];
  var stageLabel  = { new:'New', contacted:'Contacted', interested:'Interested', hot:'Hot 🔥', proposal:'Proposal', won:'Won ✅', lost:'Lost ❌' };
  var stageCnt    = {};
  stageOrder.forEach(function(st){ stageCnt[st] = leads.filter(function(l){ return l.stage===st; }).length; });

  // ── Team performance ──
  var perfMap = {};
  leads.forEach(function(l){
    var a = l.assignedTo || 'Unassigned';
    if (!perfMap[a]) perfMap[a] = { leads:0, won:0, bookings:0, revenue:0 };
    perfMap[a].leads++;
    if (l.stage === 'won') perfMap[a].won++;
  });
  books.forEach(function(b){
    var a = b.assignedTo || 'Unassigned';
    if (!perfMap[a]) perfMap[a] = { leads:0, won:0, bookings:0, revenue:0 };
    perfMap[a].bookings++;
  });
  pays.forEach(function(p){
    if (['completed','received'].indexOf(p.status) === -1) return;
    var bk = books.filter(function(b){ return b.ref === p.bookingRef || b.id === p.bookingRef; })[0];
    var a  = (bk && bk.assignedTo) ? bk.assignedTo : 'Unassigned';
    if (!perfMap[a]) perfMap[a] = { leads:0, won:0, bookings:0, revenue:0 };
    perfMap[a].revenue += Number(p.amount||0);
  });
  var agents = Object.keys(perfMap).sort(function(a,b){ return perfMap[b].revenue - perfMap[a].revenue; });

  // ── Build rows ──
  var rows = [], fmt_col = 6;

  function row(a,b,c,d,e,f){ rows.push([a||'',b||'',c||'',d||'',e||'',f||'']); return rows.length; }
  var styleQueue = [];
  function q(r, opts){ styleQueue.push(Object.assign({ r:r }, opts)); }

  // Header
  var R = row(data.company || 'Wanago ERP', '', '', '', '', '');
  q(R, { merge:true, bg:C.dark, fg:C.white, bold:true, sz:16, align:'center' });

  R = row('📅  ' + todayFmt + '     ⏱ Last synced: ' + tsStr, '', '', '', '', '');
  q(R, { merge:true, bg:C.mid, fg:'#a8d5b5', sz:10, align:'center' });

  row('','','','','','');

  // ── TODAY ──
  R = row('📅  TODAY AT A GLANCE', '', '', '', '', '');
  q(R, { merge:true, bg:C.gold, fg:C.white, bold:true, sz:12 });

  R = row('New Leads', leadsToday.length, 'New Bookings', booksToday.length, "Today's Revenue", '₹' + fmtNum(revToday));
  q(R, { labelCols:[1,3,5], bg:C.goldLight });

  R = row('Follow-ups Due', fuToday, 'Payments Received', paysToday.length, 'Active Leads', s.activeLeads||0);
  q(R, { labelCols:[1,3,5], bg:C.goldLight });

  row('','','','','','');

  // ── MONTHLY ──
  R = row('📊  MONTHLY PERFORMANCE', '', '', '', '', '');
  q(R, { merge:true, bg:C.dark, fg:C.white, bold:true, sz:12 });

  R = row('Total Leads', s.totalLeads||0, 'Won Leads', s.wonLeads||0, 'Conversion Rate', s.conversionRate||'0%');
  q(R, { labelCols:[1,3,5], bg:C.light });

  R = row('Hot Leads 🔥', s.hotLeads||0, 'Lost Leads', s.lostLeads||0, 'Leads This Month', s.leadsThisMonth||0);
  q(R, { labelCols:[1,3,5], bg:C.light });

  R = row('Total Revenue', '₹'+fmtNum(s.totalRevenue||0), 'Pending Pmts', '₹'+fmtNum(s.pendingPayments||0), 'Customers', s.totalCustomers||0);
  q(R, { labelCols:[1,3,5], bg:C.light });

  R = row('Total Bookings', s.totalBookings||0, 'Confirmed', s.confirmedBookings||0, 'Invoices/Quotes', (s.totalInvoices||0)+' / '+(s.totalQuotations||0));
  q(R, { labelCols:[1,3,5], bg:C.light });

  row('','','','','','');

  // ── PIPELINE ──
  R = row('🔥  LEAD PIPELINE', '', '', '', '', '');
  q(R, { merge:true, bg:C.dark, fg:C.white, bold:true, sz:12 });

  var half = Math.ceil(stageOrder.length / 2);
  for (var i = 0; i < half; i++) {
    var s1 = stageOrder[i], s2 = stageOrder[i+half];
    R = row(stageLabel[s1], stageCnt[s1]||0, s2 ? stageLabel[s2]:'', s2 ? stageCnt[s2]||0:'', '', '');
    q(R, { labelCols:[1,3], bg:C.light });
  }

  row('','','','','','');

  // ── TEAM PERFORMANCE ──
  if (agents.length > 0) {
    R = row('👥  TEAM PERFORMANCE', '', '', '', '', '');
    q(R, { merge:true, bg:C.dark, fg:C.white, bold:true, sz:12 });

    R = row('Agent', 'Leads', 'Won', 'Bookings', 'Revenue (₹)', 'Conv%');
    q(R, { bg:C.mid, fg:C.white, bold:true });

    agents.forEach(function(name){
      var p   = perfMap[name];
      var cnv = p.leads > 0 ? ((p.won/p.leads)*100).toFixed(0)+'%' : '—';
      R = row(name, p.leads, p.won, p.bookings, p.revenue, cnv);
      var highlight = agents.indexOf(name) === 0 ? C.goldLight : C.gray;
      q(R, { bg:highlight });
    });
  }

  // ── Write values ──
  sh.getRange(1, 1, rows.length, fmt_col).setValues(rows);

  // ── Apply styles ──
  styleQueue.forEach(function(st) {
    try {
      if (st.merge) {
        var mr = sh.getRange(st.r, 1, 1, fmt_col);
        if (st.bg)    mr.setBackground(st.bg);
        if (st.fg)    mr.setFontColor(st.fg);
        if (st.bold)  mr.setFontWeight('bold');
        if (st.sz)    mr.setFontSize(st.sz);
        if (st.align) mr.setHorizontalAlignment(st.align);
        mr.merge();
      } else {
        // Style label columns bold, value columns normal
        if (st.labelCols) {
          for (var c = 1; c <= fmt_col; c++) {
            var cell = sh.getRange(st.r, c, 1, 1);
            if (st.bg) cell.setBackground(st.bg);
            if (st.labelCols.indexOf(c) > -1) {
              cell.setFontWeight('bold').setFontColor('#1a3a2a');
            }
          }
        } else {
          // Full row style
          var fullRow = sh.getRange(st.r, 1, 1, fmt_col);
          if (st.bg)   fullRow.setBackground(st.bg);
          if (st.fg)   fullRow.setFontColor(st.fg);
          if (st.bold) fullRow.setFontWeight('bold');
        }
      }
    } catch(err) { Logger.log('Style error row '+st.r+': '+err.message); }
  });

  // Column widths
  sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 110);
  sh.setColumnWidth(3, 185); sh.setColumnWidth(4, 110);
  sh.setColumnWidth(5, 185); sh.setColumnWidth(6, 90);
}

function fmtNum(n) {
  var v = Number(n) || 0;
  if (v >= 10000000) return (v/10000000).toFixed(2) + ' Cr';
  if (v >= 100000)   return (v/100000).toFixed(2)   + ' L';
  return v.toLocaleString('en-IN');
}

/* ══════════════ TEAM SHEET ══════════════ */

function writeTeam(ss, team) {
  if (!team || team.length === 0) return;
  var sh = getSheet(ss, SHEETS.team);
  sh.clearContents();
  var headers = ['ID','Name','Phone','Email','Role','Department','Office'];
  var fields  = ['id','name','phone','email','role','dept','office'];
  var allRows = [headers].concat(team.map(function(m){
    return fields.map(function(f){ return m[f] || ''; });
  }));
  sh.getRange(1,1,allRows.length,headers.length).setValues(allRows);
  styleHeader(sh, headers.length);
  sh.setFrozenRows(1);
  try { sh.autoResizeColumns(1, headers.length); } catch(e) {}
}

/* ══════════════ DAILY EODR ══════════════ */

// Runs at scheduled time OR via POST action:'sendEODR'
function sendEODR(data) {
  var team   = data.team    || [];
  var waCfg  = data.waConfig || {};
  var tz     = Session.getScriptTimeZone();
  var today  = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var dateStr= Utilities.formatDate(new Date(), tz, 'EEEE, dd MMM yyyy');
  var co     = data.company || 'Wanago ERP';

  var adminRoles = ['admin','founder','ceo','branch_manager','manager','senior_manager','owner'];
  var admins = team.filter(function(m){ return adminRoles.indexOf((m.role||'').toLowerCase()) > -1; });
  var agents = team.filter(function(m){ return adminRoles.indexOf((m.role||'').toLowerCase()) === -1; });

  var sent = 0;

  // Full report → admins
  admins.forEach(function(member) {
    try {
      if (!member.email && !member.phone) return;
      var html = buildFullReportHTML(data, member, dateStr, co, today);
      var subj = '[' + co + '] End of Day Report — ' + dateStr;
      if (member.email) { sendGmail(member.email, subj, html); sent++; }
      if (member.phone && waCfg.accessToken && waCfg.phoneNumberId) {
        sendWhatsApp(member.phone, buildWAMsg(data, null, dateStr, co, today), waCfg);
      }
    } catch(e) { Logger.log('EODR admin ' + member.name + ': ' + e.message); }
  });

  // Personal report → agents
  agents.forEach(function(member) {
    try {
      if (!member.email && !member.phone) return;
      var html = buildPersonalReportHTML(data, member, dateStr, co, today);
      var subj = '[' + co + '] Your Daily Report — ' + dateStr;
      if (member.email) { sendGmail(member.email, subj, html); sent++; }
      if (member.phone && waCfg.accessToken && waCfg.phoneNumberId) {
        sendWhatsApp(member.phone, buildWAMsg(data, member, dateStr, co, today), waCfg);
      }
    } catch(e) { Logger.log('EODR agent ' + member.name + ': ' + e.message); }
  });

  Logger.log('EODR sent to ' + sent + ' recipients');
  return sent;
}

/* ── Full HTML report (Admin / Branch Manager) ── */
function buildFullReportHTML(data, member, dateStr, co, today) {
  var s       = data.summary  || {};
  var leads   = data.leads    || [];
  var books   = data.bookings || [];
  var pays    = data.payments || [];

  var leadsToday = leads.filter(function(l){ return (l.createdAt||'').slice(0,10)===today; });
  var paysToday  = pays.filter(function(p){ return (p.date||'').slice(0,10)===today && ['completed','received'].indexOf(p.status)>-1; });
  var revToday   = paysToday.reduce(function(a,p){ return a+Number(p.amount||0); }, 0);
  var fuToday    = leads.filter(function(l){ return (l.followUpDate||'').slice(0,10)===today; });
  var booksToday = books.filter(function(b){ return (b.createdAt||'').slice(0,10)===today; });

  var h = htmlWrap(co, dateStr, member.name || 'Team');

  h += kpiRow([
    { label:'New Leads', val:leadsToday.length, bg:C.light, clr:C.mid },
    { label:'Bookings',  val:booksToday.length, bg:C.goldLight, clr:'#b8860b' },
    { label:"Revenue",   val:'₹'+fmtNum(revToday), bg:C.blueLight, clr:C.blue },
    { label:'Follow-ups',val:fuToday.length, bg:C.purpleLight, clr:C.purple },
  ]);

  h += '<div style="padding:24px 32px">';

  // Monthly KPIs
  h += sH('📊 Monthly Summary');
  h += '<table style="width:100%;border-collapse:collapse;margin-bottom:6px">';
  h += tR('Total Leads', s.totalLeads||0, 'Won Leads', s.wonLeads||0);
  h += tR('Total Revenue', '₹'+fmtNum(s.totalRevenue||0), 'Pending', '₹'+fmtNum(s.pendingPayments||0));
  h += tR('Bookings', s.totalBookings||0, 'Conversion', s.conversionRate||'0%');
  h += tR('Customers', s.totalCustomers||0, 'Hot Leads', s.hotLeads||0);
  h += '</table>';

  // New leads today
  if (leadsToday.length > 0) {
    h += sH('🆕 New Leads Today (' + leadsToday.length + ')');
    h += dataTable(['Name','Phone','Source','Destination','Assigned To'],
      leadsToday.map(function(l){ return [l.name,l.phone,l.source,l.destination,l.assignedTo]; }));
  }

  // Payments received
  if (paysToday.length > 0) {
    h += sH('💰 Payments Received Today — ₹' + fmtNum(revToday));
    h += dataTable(['Customer','Booking Ref','Amount','Method'],
      paysToday.map(function(p){ return [p.customerName,p.bookingRef,'₹'+fmtNum(p.amount),p.method]; }));
  }

  // Follow-ups
  if (fuToday.length > 0) {
    h += sH('📞 Follow-ups Due Today (' + fuToday.length + ')');
    h += dataTable(['Lead','Phone','Stage','Assigned To'],
      fuToday.map(function(l){ return [l.name,l.phone,l.stage,l.assignedTo]; }));
  }

  // Team performance
  var perfMap = {};
  leads.forEach(function(l){
    var a=l.assignedTo||'Unassigned'; if(!perfMap[a]) perfMap[a]={leads:0,won:0,bookings:0,rev:0};
    perfMap[a].leads++; if(l.stage==='won') perfMap[a].won++;
  });
  books.forEach(function(b){
    var a=b.assignedTo||'Unassigned'; if(!perfMap[a]) perfMap[a]={leads:0,won:0,bookings:0,rev:0};
    perfMap[a].bookings++;
  });
  pays.forEach(function(p){
    if(['completed','received'].indexOf(p.status)===-1) return;
    var bk=books.filter(function(b){return b.ref===p.bookingRef||b.id===p.bookingRef;})[0];
    var a=(bk&&bk.assignedTo)||'Unassigned'; if(!perfMap[a]) perfMap[a]={leads:0,won:0,bookings:0,rev:0};
    perfMap[a].rev+=Number(p.amount||0);
  });
  var agents = Object.keys(perfMap).sort(function(a,b){ return perfMap[b].rev-perfMap[a].rev; });
  if (agents.length > 0) {
    h += sH('👥 Team Performance');
    h += dataTable(['Agent','Leads','Won','Bookings','Revenue','Conv%'],
      agents.map(function(name){
        var p=perfMap[name];
        var c=p.leads>0?((p.won/p.leads)*100).toFixed(0)+'%':'—';
        return [name,p.leads,p.won,p.bookings,'₹'+fmtNum(p.rev),c];
      }));
  }

  h += '</div>';
  h += htmlFooter(co);
  return h;
}

/* ── Personal HTML report (Sales agent — own data only) ── */
function buildPersonalReportHTML(data, member, dateStr, co, today) {
  var name   = member.name || member.id || 'Agent';
  var myLeads= (data.leads   ||[]).filter(function(l){ return l.assignedTo===name||l.assignedTo===member.id; });
  var myBooks= (data.bookings||[]).filter(function(b){ return b.assignedTo===name||b.assignedTo===member.id; });

  var leadsToday = myLeads.filter(function(l){ return (l.createdAt||'').slice(0,10)===today; });
  var fuToday    = myLeads.filter(function(l){ return (l.followUpDate||'').slice(0,10)===today; });
  var pipeline   = myLeads.filter(function(l){ return ['won','lost'].indexOf(l.stage||'')===-1; });
  var myWon      = myLeads.filter(function(l){ return l.stage==='won'; }).length;
  var conv       = myLeads.length > 0 ? ((myWon/myLeads.length)*100).toFixed(1)+'%' : '0%';

  var h = htmlWrap(co, dateStr, name);

  h += kpiRow([
    { label:'My Total Leads', val:myLeads.length,  bg:C.light,       clr:C.mid    },
    { label:'Won',            val:myWon,            bg:C.goldLight,   clr:'#b8860b'},
    { label:'Active',         val:pipeline.length,  bg:C.blueLight,   clr:C.blue   },
    { label:'Conversion',     val:conv,             bg:C.purpleLight, clr:C.purple },
  ]);

  h += '<div style="padding:24px 32px">';

  // Today's activity
  h += sH('📅 Today\'s Activity');
  h += '<p style="font-size:13px;color:#555;margin:0 0 10px">New leads: <strong>' + leadsToday.length + '</strong> &nbsp;|&nbsp; Bookings: <strong>' + myBooks.filter(function(b){return (b.createdAt||'').slice(0,10)===today;}).length + '</strong> &nbsp;|&nbsp; Follow-ups due: <strong>' + fuToday.length + '</strong></p>';

  // Follow-ups
  if (fuToday.length > 0) {
    h += sH('📞 Your Follow-ups Today (' + fuToday.length + ')');
    h += dataTable(['Lead','Phone','Stage','Notes'],
      fuToday.map(function(l){ return [l.name,l.phone,l.stage,(l.notes||'').slice(0,80)]; }));
  }

  // Active pipeline
  if (pipeline.length > 0) {
    h += sH('🔥 Your Active Pipeline (' + pipeline.length + ')');
    h += dataTable(['Lead','Phone','Destination','Stage','Follow-up Date'],
      pipeline.slice(0,20).map(function(l){ return [l.name,l.phone,l.destination,l.stage,l.followUpDate||'—']; }));
  } else {
    h += '<p style="text-align:center;color:#aaa;padding:20px;font-size:13px">No active leads assigned to you yet.</p>';
  }

  h += '</div>';
  h += htmlFooter(co);
  return h;
}

/* ── WhatsApp message (brief) ── */
function buildWAMsg(data, member, dateStr, co, today) {
  var s = data.summary || {};
  if (member) {
    var name   = member.name || 'Agent';
    var myL    = (data.leads||[]).filter(function(l){ return l.assignedTo===name||l.assignedTo===member.id; });
    var fuCount= myL.filter(function(l){ return (l.followUpDate||'').slice(0,10)===today; }).length;
    var myWon  = myL.filter(function(l){ return l.stage==='won'; }).length;
    return '🌿 *' + co + '*\n📅 Daily Report — ' + dateStr
      + '\n\nHi *' + name + '*! 👋\n\n'
      + '📋 *Your Stats*\n'
      + '• Total Leads: *' + myL.length + '*\n'
      + '• Won: *' + myWon + '*\n'
      + '• Follow-ups Due Today: *' + fuCount + '*\n\n'
      + '_Detailed report sent to your email_ ✉️';
  }
  var paysToday = (data.payments||[]).filter(function(p){ return (p.date||'').slice(0,10)===today&&['completed','received'].indexOf(p.status)>-1; });
  var revToday  = paysToday.reduce(function(a,p){return a+Number(p.amount||0);},0);
  var lToday    = (data.leads||[]).filter(function(l){return (l.createdAt||'').slice(0,10)===today;}).length;
  return '🌿 *' + co + '* — EODR\n📅 ' + dateStr
    + '\n\n📊 *Today*\n'
    + '• New Leads: *' + lToday + '*\n'
    + '• Revenue: *₹' + fmtNum(revToday) + '*\n'
    + '• Payments: *' + paysToday.length + '*\n\n'
    + '📈 *Month Total*\n'
    + '• Leads: *' + (s.totalLeads||0) + '* | Won: *' + (s.wonLeads||0) + '*\n'
    + '• Revenue: *₹' + fmtNum(s.totalRevenue||0) + '*\n'
    + '• Conversion: *' + (s.conversionRate||'0%') + '*\n\n'
    + '_Full report sent to your email_ ✉️';
}

/* ── Send Gmail ── */
function sendGmail(to, subject, htmlBody) {
  GmailApp.sendEmail(to, subject, 'Please view this email in an HTML-capable client.', {
    htmlBody: htmlBody,
    name:     'Wanago ERP'
  });
}

/* ── Send WhatsApp via Business API ── */
function sendWhatsApp(to, message, waCfg) {
  var phone = String(to).replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;
  UrlFetchApp.fetch('https://graph.facebook.com/v19.0/' + waCfg.phoneNumberId + '/messages', {
    method:           'post',
    contentType:      'application/json',
    headers:          { Authorization: 'Bearer ' + waCfg.accessToken },
    payload:          JSON.stringify({ messaging_product:'whatsapp', to:phone, type:'text', text:{ body:message } }),
    muteHttpExceptions: true
  });
}

/* ══════════════ TRIGGER MANAGEMENT ══════════════ */

// Run once from Apps Script editor, OR via POST action:'setupTrigger'
function setupDailyTrigger(hour) {
  hour = Number(hour) || 19;
  // Remove old EODR triggers
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'runDailyEODR') ScriptApp.deleteTrigger(t);
  });
  // Create new
  ScriptApp.newTrigger('runDailyEODR').timeBased().everyDays(1).atHour(hour).create();
  var msg = 'Daily EODR trigger set for ' + hour + ':00 every day.';
  Logger.log(msg);
  return msg;
}

// Called by time-based trigger automatically
function runDailyEODR() {
  var raw = PropertiesService.getScriptProperties().getProperty('lastPayload');
  if (!raw) { Logger.log('runDailyEODR: no payload stored'); return; }
  sendEODR(JSON.parse(raw));
}

/* ══════════════ HTML HELPERS ══════════════ */

function htmlWrap(co, dateStr, recipientName) {
  return '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f0;margin:0;padding:16px">'
    + '<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)">'
    + '<div style="background:linear-gradient(135deg,#0d3223 0%,#1a5c3a 100%);padding:28px 32px;text-align:center">'
    + '<div style="font-size:22px;font-weight:bold;color:#fff">🌿 ' + esc(co) + '</div>'
    + '<div style="color:#a8d5b5;font-size:14px;margin-top:6px">End of Day Report — ' + esc(dateStr) + '</div>'
    + '<div style="color:#c9a84c;font-size:13px;margin-top:4px;font-weight:bold">Hi ' + esc(recipientName) + '!</div>'
    + '</div>';
}

function kpiRow(items) {
  var cols = 'grid-template-columns:repeat('+items.length+',1fr)';
  var h = '<div style="display:grid;'+cols+';gap:1px;background:#e0e0e0;border-bottom:2px solid #c9a84c">';
  items.forEach(function(it){
    h += '<div style="background:'+it.bg+';padding:16px;text-align:center">'
      + '<div style="font-size:22px;font-weight:bold;color:'+it.clr+'">'+it.val+'</div>'
      + '<div style="font-size:11px;color:#777;margin-top:3px">'+it.label+'</div>'
      + '</div>';
  });
  return h + '</div>';
}

function sH(title) {
  return '<div style="background:#0d3223;color:#fff;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:bold;margin:20px 0 10px">'
    + title + '</div>';
}

function tR(l1,v1,l2,v2) {
  return '<tr>'
    + '<td style="padding:7px 10px;font-size:12px;color:#555;background:#f9f9f9;width:32%">'+esc(String(l1))+'</td>'
    + '<td style="padding:7px 10px;font-size:13px;font-weight:bold;color:#1a3a2a;width:18%">'+esc(String(v1))+'</td>'
    + '<td style="padding:7px 10px;font-size:12px;color:#555;background:#f9f9f9;width:32%">'+esc(String(l2))+'</td>'
    + '<td style="padding:7px 10px;font-size:13px;font-weight:bold;color:#1a3a2a;width:18%">'+esc(String(v2))+'</td>'
    + '</tr>';
}

function dataTable(headers, rows) {
  var h = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px">';
  h += '<tr style="background:#0d3223;color:#fff">';
  headers.forEach(function(hd){ h += '<th style="padding:7px 10px;text-align:left;white-space:nowrap">'+esc(hd)+'</th>'; });
  h += '</tr>';
  rows.forEach(function(row, i) {
    var bg = i%2===0 ? '#f9f9f9' : '#fff';
    h += '<tr style="background:'+bg+'">';
    row.forEach(function(cell){ h += '<td style="padding:6px 10px;color:#333">'+esc(String(cell||''))+'</td>'; });
    h += '</tr>';
  });
  return h + '</table>';
}

function htmlFooter(co) {
  return '<div style="background:#f5f5f5;padding:14px 32px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #e0e0e0">'
    + '🌿 ' + esc(co) + ' — Wanago ERP &nbsp;|&nbsp; Automated Report &nbsp;|&nbsp; Do not reply</div>'
    + '</div></body></html>';
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ══════════════ GENERIC SHEET WRITERS ══════════════ */

function writeSheet(ss, name, data, headers, fields) {
  var sh = getSheet(ss, name);
  sh.clearContents();
  var allRows = [headers].concat(data.map(function(item){
    return fields.map(function(f){ var v=item[f]; return (v===null||v===undefined)?'':v; });
  }));
  sh.getRange(1,1,allRows.length,headers.length).setValues(allRows);
  styleHeader(sh, headers.length);
  sh.setFrozenRows(1);
  try { sh.autoResizeColumns(1, headers.length); } catch(e) {}
}

function writeActivity(ss, acts) {
  var sh = getSheet(ss, SHEETS.activity);
  sh.clearContents();
  var headers = ['Time','Type','Message'];
  var rows = [headers].concat(acts.map(function(a){ return [a.time||'',a.type||'',a.message||'']; }));
  sh.getRange(1,1,rows.length,3).setValues(rows);
  styleHeader(sh,3); sh.setFrozenRows(1);
  sh.setColumnWidth(1,180); sh.setColumnWidth(2,120); sh.setColumnWidth(3,420);
}

function getSheet(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function styleHeader(sh, n) {
  sh.getRange(1,1,1,n).setBackground(C.dark).setFontColor(C.white).setFontWeight('bold').setFontSize(11);
}

function respond(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════ COLUMN DEFINITIONS ══════════════ */

function leadHeaders()      { return ['ID','Name','Phone','Email','Source','Stage','Destination','Budget','Assigned To','Follow-Up','Notes','Created']; }
function leadFields()       { return ['id','name','phone','email','source','stage','destination','budget','assignedTo','followUpDate','notes','createdAt']; }
function customerHeaders()  { return ['ID','Name','Phone','Email','City','Total Spend (₹)','Travel Type','DOB','Anniversary','Created']; }
function customerFields()   { return ['id','name','phone','email','city','totalSpend','travelType','dob','anniversary','createdAt']; }
function bookingHeaders()   { return ['ID','Ref','Customer','Phone','Destination','Travel Date','Return','Pax','Total (₹)','Paid (₹)','Pending (₹)','Status','Assigned To','Created']; }
function bookingFields()    { return ['id','ref','customerName','customerPhone','destination','travelDate','returnDate','pax','totalAmount','paidAmount','pendingAmount','status','assignedTo','createdAt']; }
function paymentHeaders()   { return ['ID','Date','Customer','Booking Ref','Amount (₹)','Method','Status','Notes']; }
function paymentFields()    { return ['id','date','customerName','bookingRef','amount','method','status','notes']; }
function invoiceHeaders()   { return ['ID','Invoice No','Customer','Booking Ref','Total (₹)','Status','Due Date','Created']; }
function invoiceFields()    { return ['id','invoiceNo','customerName','bookingRef','totalAmount','status','dueDate','createdAt']; }
function quotationHeaders() { return ['ID','Customer','Destination','Total (₹)','Status','Valid Days','Created']; }
function quotationFields()  { return ['id','customerName','destination','totalAmount','status','validDays','createdAt']; }
