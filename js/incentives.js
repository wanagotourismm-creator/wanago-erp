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

function renderIncentiveDashboard() {
  const month = document.getElementById('inc-month')?.value || getCurrentMonth();
  let agents = getAllAgentsWithBookings(month);

  // ── Role-based filtering ──
  if (isAgent()) {
    // Agent sees ONLY their own data
    const myName = getCurrentAgentName();
    agents = agents.filter(a => a === myName);
    if (!agents.length) agents = [myName]; // still show their card even with 0 bookings
  } else if (isManager() && !isAdmin()) {
    // Manager sees their subordinates
    const visibleIds = visibleMemberIds();
    if (visibleIds) {
      const team = DB.settings.team || [];
      const visibleNames = team.filter(m => visibleIds.has(m.id)).map(m => m.name);
      agents = agents.filter(a => visibleNames.includes(a));
    }
  }
  // Admin sees all — no filter
  const settings = DB.incentiveSettings;
  const teamBonusOn = isTeamBonusActive(month);

  // Calculate days remaining in month
  const now = new Date();
  const currentMonth = now.toISOString().slice(0,7);
  const isCurrentMonth = month === currentMonth;
  const lastDay = new Date(parseInt(month.slice(0,4)), parseInt(month.slice(5,7)), 0).getDate();
  const today = now.getDate();
  const daysLeft = isCurrentMonth ? Math.max(0, lastDay - today) : 0;
  const daysTotal = lastDay;
  const daysPassed = isCurrentMonth ? today : lastDay;
  const hoursLeftToday = isCurrentMonth ? Math.max(0, 20 - now.getHours()) : 0; // assuming 8pm end

  // Team stats
  const teamProfit = getTeamMonthlyProfit(month);
  const teamTarget = getTeamMonthlyTarget(month);
  const teamPct = teamTarget > 0 ? Math.round(teamProfit/teamTarget*100) : 0;
  const teamRemaining = Math.max(0, teamTarget - teamProfit);
  const teamDailyNeeded = daysLeft > 0 ? Math.round(teamRemaining / daysLeft) : 0;

  // Update header stats
  // Hide team-level stats for agents
  const teamStatsEl = document.getElementById('inc-team-stats');
  if (teamStatsEl) teamStatsEl.style.display = isAgent() ? 'none' : '';

  document.getElementById('inc-team-profit').textContent = formatMoney(teamProfit);
  document.getElementById('inc-team-target').textContent = teamTarget > 0 ? formatMoney(teamTarget) : 'Not Set';
  document.getElementById('inc-team-pct').textContent = teamPct + '%';
  document.getElementById('inc-team-bonus').textContent = teamBonusOn ? 'Active (+2%)' : 'Not Yet';
  document.getElementById('inc-team-bonus').style.color = teamBonusOn ? 'var(--g600)' : 'var(--red)';

  // For agents, show personalized header instead
  const agentHeader = document.getElementById('inc-agent-header');
  if (agentHeader) {
    if (isAgent()) {
      const myName = getCurrentAgentName();
      const myProfit = getAgentMonthlyProfit(myName, month);
      const myTarget = getAgentMonthlyTarget(myName, month);
      const myPct = myTarget > 0 ? Math.round(myProfit/myTarget*100) : 0;
      const myRemaining = Math.max(0, myTarget - myProfit);
      const myDailyNeeded = daysLeft > 0 ? Math.round(myRemaining / daysLeft) : 0;
      const urgencyColor = daysLeft <= 3 ? '#ff6b6b' : daysLeft <= 7 ? '#f0ad4e' : '#52c285';

      agentHeader.style.display = '';
      agentHeader.innerHTML = '<div style="background:linear-gradient(135deg,var(--g800),var(--g500));border-radius:14px;padding:20px 24px;color:#fff;margin-bottom:16px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">' +
          '<div><div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Your Performance — ' + new Date(month+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'}) + '</div>' +
          '<div style="font-size:24px;font-weight:900;font-family:DM Serif Display,serif">' + myName + '</div></div>' +
          '<div style="display:flex;gap:20px;align-items:center">' +
            '<div style="text-align:center"><div style="font-size:28px;font-weight:900;font-family:DM Serif Display,serif">' + formatMoney(myProfit) + '</div><div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase">Profit Achieved</div></div>' +
            '<div style="width:1px;height:36px;background:rgba(255,255,255,.2)"></div>' +
            '<div style="text-align:center"><div style="font-size:28px;font-weight:900;color:' + urgencyColor + '">' + daysLeft + '</div><div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase">Days Left</div></div>' +
            (myRemaining > 0 ? '<div style="width:1px;height:36px;background:rgba(255,255,255,.2)"></div><div style="text-align:center"><div style="font-size:22px;font-weight:900;color:#ff6b6b">' + formatMoney(myRemaining) + '</div><div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase">Still Needs</div></div>' : '') +
            (myDailyNeeded > 0 ? '<div style="width:1px;height:36px;background:rgba(255,255,255,.2)"></div><div style="text-align:center"><div style="font-size:22px;font-weight:900;color:#ffd700">' + formatMoney(myDailyNeeded) + '</div><div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase">Per Day</div></div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="margin-top:12px"><div style="height:8px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + Math.min(myPct,100) + '%;background:' + urgencyColor + ';border-radius:4px;transition:.4s"></div></div><div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:rgba(255,255,255,.4)"><span>Target: ' + (myTarget>0?formatMoney(myTarget):'Not Set') + '</span><span style="font-weight:700;color:#fff">' + myPct + '% achieved</span></div></div>' +
      '</div>';
    } else {
      agentHeader.style.display = 'none';
    }
  }

  // Live clock & countdown bar
  const liveBar = document.getElementById('inc-live-bar');
  if (liveBar && isCurrentMonth) {
    const urgencyColor = daysLeft <= 3 ? 'var(--red)' : daysLeft <= 7 ? 'var(--amb)' : 'var(--g600)';
    const monthProgress = Math.round((daysPassed / daysTotal) * 100);
    liveBar.style.display = '';
    liveBar.innerHTML = '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
      '<div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:' + urgencyColor + ';animation:blink 1s infinite"></div><span style="font-size:13px;font-weight:700;color:' + urgencyColor + '" id="inc-live-clock"></span></div>' +
      '<div style="height:20px;width:1px;background:rgba(255,255,255,.2)"></div>' +
      '<div><span style="font-size:24px;font-weight:900;color:#fff;font-family:DM Serif Display,serif">' + daysLeft + '</span><span style="font-size:11px;color:rgba(255,255,255,.6);margin-left:4px">days left</span></div>' +
      '<div style="height:20px;width:1px;background:rgba(255,255,255,.2)"></div>' +
      '<div><span style="font-size:11px;color:rgba(255,255,255,.5)">Month Progress</span><div style="width:120px;height:6px;background:rgba(255,255,255,.15);border-radius:3px;margin-top:4px;overflow:hidden"><div style="height:100%;width:' + monthProgress + '%;background:' + urgencyColor + ';border-radius:3px;transition:.3s"></div></div></div>' +
      (teamTarget > 0 ? '<div style="height:20px;width:1px;background:rgba(255,255,255,.2)"></div><div><span style="font-size:11px;color:rgba(255,255,255,.5)">Team Still Needs</span><div style="font-size:16px;font-weight:800;color:#fff">' + formatMoney(teamRemaining) + '</div></div>' +
      (daysLeft > 0 ? '<div style="height:20px;width:1px;background:rgba(255,255,255,.2)"></div><div><span style="font-size:11px;color:rgba(255,255,255,.5)">Daily Run Rate</span><div style="font-size:16px;font-weight:800;color:' + (teamDailyNeeded > 5000 ? '#ff6b6b' : '#fff') + '">' + formatMoney(teamDailyNeeded) + '/day</div></div>' : '') : '') +
    '</div>';
    // Start live clock
    function tickClock() {
      const n = new Date();
      const el = document.getElementById('inc-live-clock');
      if (el) el.textContent = n.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',second:'2-digit'}) + ' · ' + n.toLocaleDateString('en-IN', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
    }
    tickClock(); clearInterval(window._incClockInterval); window._incClockInterval = setInterval(tickClock, 1000);
  } else if (liveBar) { liveBar.style.display = 'none'; }

  // AI strip
  renderIncAIStrip(month, teamProfit, teamTarget, daysPassed, daysTotal, daysLeft);

  // Agent cards
  const grid = document.getElementById('inc-agents-grid');
  if (!agents.length) { grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--textd);grid-column:1/-1"><div style="font-size:14px;font-weight:600">No agents with bookings this month</div><div style="font-size:12px;margin-top:4px">Set targets in the Settings tab and create confirmed bookings to see incentives here</div></div>'; return; }

  const agentData = agents.map(agent => {
    const profit = getAgentMonthlyProfit(agent, month);
    const target = getAgentMonthlyTarget(agent, month);
    const pct = target > 0 ? Math.round(profit/target*100) : 0;
    const remaining = Math.max(0, target - profit);
    const dailyNeeded = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
    const bookings = getAgentMonthlyBookings(agent, month);
    let totalIncentive = 0, totalBase = 0, totalFast = 0, totalHV = 0, totalSelf = 0;
    bookings.forEach(b => {
      const calc = calculateBookingIncentive(b);
      totalBase += calc.base; totalFast += calc.fastClosure; totalHV += calc.highValue; totalSelf += calc.selfGenerated;
      totalIncentive += calc.total;
    });
    const teamBonus = teamBonusOn ? Math.round(profit * settings.teamBonusPercent / 100) : 0;
    totalIncentive += teamBonus;
    let level = 'Below Minimum';
    for (const slab of settings.slabs) { if (pct >= slab.min && (pct < slab.max || slab.max === 999)) { level = slab.level; break; } }
    // Next level info
    let nextLevel = null, nextPct = 0;
    for (const slab of settings.slabs) { if (pct < slab.min || (pct >= slab.min && pct < slab.max)) { if (slab.percent > 0 && pct < slab.min) { nextLevel = slab.level; nextPct = slab.min; break; } if (pct >= slab.min && slab.max !== 999) { const nextIdx = settings.slabs.indexOf(slab) + 1; if (nextIdx < settings.slabs.length) { nextLevel = settings.slabs[nextIdx].level; nextPct = settings.slabs[nextIdx].min; } break; } } }
    const profitToNextLevel = nextPct > 0 && target > 0 ? Math.max(0, Math.round(target * nextPct / 100) - profit) : 0;

    return { agent, profit, target, pct, remaining, dailyNeeded, bookings: bookings.length, totalIncentive, totalBase, totalFast, totalHV, totalSelf, teamBonus, level, nextLevel, profitToNextLevel };
  }).sort((a,b) => b.profit - a.profit);

  const medals = ['#1','#2','#3'];
  grid.innerHTML = agentData.map((d, i) => {
    const progressColor = d.pct >= 100 ? 'var(--g500)' : d.pct >= 70 ? 'var(--amb)' : d.pct >= 50 ? 'var(--blue)' : 'var(--red)';
    const levelColor = d.pct >= 100 ? 'var(--g700)' : d.pct >= 70 ? 'var(--amb)' : 'var(--textd)';
    const urgentRemaining = d.remaining > 0 && daysLeft <= 5;

    return '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--sh)">' +

      // Header with rank + earnings
      '<div style="background:linear-gradient(135deg,var(--g800),var(--g600));padding:14px 16px;color:#fff">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<div style="display:flex;align-items:center;gap:10px"><div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">' + initials(d.agent) + '</div><div><div style="font-size:14px;font-weight:700">' + (i < 3 ? medals[i]+' ' : '#'+(i+1)+' ') + d.agent + '</div><div style="font-size:10px;color:rgba(255,255,255,.6)">' + d.level + '</div></div></div>' +
          '<div style="text-align:right"><div style="font-size:22px;font-weight:900;font-family:DM Serif Display,serif">' + formatMoney(d.totalIncentive) + '</div><div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px">Total Incentive</div></div>' +
        '</div>' +
      '</div>' +

      '<div style="padding:14px 16px">' +

      // Progress bar with percentage
      '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="color:var(--textd)">Target: ' + (d.target>0?formatMoney(d.target):'Not Set') + '</span><span style="font-weight:800;font-size:16px;color:' + progressColor + '">' + d.pct + '%</span></div>' +
        '<div style="height:10px;background:var(--border);border-radius:5px;overflow:hidden;position:relative"><div style="height:100%;width:' + Math.min(d.pct,100) + '%;background:' + progressColor + ';border-radius:5px;transition:.4s"></div></div>' +
      '</div>' +

      // Profit + Bookings + Remaining
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">' +
        '<div style="background:var(--g50);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:15px;font-weight:700;color:var(--g700)">' + formatMoney(d.profit) + '</div><div style="font-size:9px;color:var(--textd)">Achieved</div></div>' +
        '<div style="background:var(--cream);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:15px;font-weight:700">' + d.bookings + '</div><div style="font-size:9px;color:var(--textd)">Bookings</div></div>' +
        '<div style="background:' + (d.remaining > 0 ? 'var(--red2)' : 'var(--g50)') + ';border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:15px;font-weight:700;color:' + (d.remaining > 0 ? 'var(--red)' : 'var(--g600)') + '">' + (d.remaining > 0 ? formatMoney(d.remaining) : 'Done') + '</div><div style="font-size:9px;color:var(--textd)">' + (d.remaining > 0 ? 'Still Needs' : 'Target Met!') + '</div></div>' +
      '</div>' +

      // Pressure zone — daily run rate + next level
      (d.remaining > 0 && isCurrentMonth ? '<div style="background:linear-gradient(135deg,#fff5f5,#fff0f0);border:1px solid rgba(192,57,43,.12);border-radius:10px;padding:10px 12px;margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-size:9px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px">Daily Run Rate Needed</div><div style="font-size:18px;font-weight:900;color:var(--red);font-family:DM Serif Display,serif">' + formatMoney(d.dailyNeeded) + '<span style="font-size:11px;font-weight:500;color:var(--textd)">/day</span></div></div>' +
          '<div style="text-align:right"><div style="font-size:9px;color:var(--textd)">Days Left</div><div style="font-size:22px;font-weight:900;color:' + (daysLeft <= 3 ? 'var(--red)' : daysLeft <= 7 ? 'var(--amb)' : 'var(--g600)') + '">' + daysLeft + '</div></div>' +
        '</div>' +
      '</div>' : '') +

      // Next level motivation
      (d.nextLevel && d.profitToNextLevel > 0 ? '<div style="background:var(--amb2);border:1px solid rgba(214,137,16,.15);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;gap:10px">' +
        '<div><div style="font-size:10px;font-weight:700;color:var(--amb);text-transform:uppercase;letter-spacing:.5px">Next Level Unlock</div><div style="font-size:12px;color:var(--textm)">Just <strong>' + formatMoney(d.profitToNextLevel) + '</strong> more profit to reach <strong>' + d.nextLevel + '</strong></div></div>' +
      '</div>' : '') +

      // Target met celebration
      (d.pct >= 100 ? '<div style="background:linear-gradient(135deg,var(--g50),#e8f5e9);border:1px solid var(--g200);border-radius:10px;padding:10px 12px;margin-bottom:12px;text-align:center"><span style="font-size:13px;font-weight:700;color:var(--g700)">TARGET ACHIEVED! Top Performer Level Unlocked!</span></div>' : '') +

      // Incentive breakdown pills
      '<div style="display:flex;flex-wrap:wrap;gap:4px">' +
        (d.totalBase > 0 ? '<span style="background:var(--g50);color:var(--g700);border:1px solid var(--g200);font-size:10px;padding:2px 8px;border-radius:12px">Base: ' + formatMoney(d.totalBase) + '</span>' : '') +
        (d.totalFast > 0 ? '<span style="background:var(--amb2);color:var(--amb);border:1px solid rgba(214,137,16,.2);font-size:10px;padding:2px 8px;border-radius:12px">Fast: ' + formatMoney(d.totalFast) + '</span>' : '') +
        (d.totalHV > 0 ? '<span style="background:var(--gold2);color:#7a5800;border:1px solid rgba(201,168,76,.25);font-size:10px;padding:2px 8px;border-radius:12px">HV: ' + formatMoney(d.totalHV) + '</span>' : '') +
        (d.totalSelf > 0 ? '<span style="background:var(--blue2);color:var(--blue);border:1px solid rgba(37,99,235,.15);font-size:10px;padding:2px 8px;border-radius:12px">Self: ' + formatMoney(d.totalSelf) + '</span>' : '') +
        (d.teamBonus > 0 ? '<span style="background:#f3e8ff;color:#7c3aed;border:1px solid rgba(124,58,237,.15);font-size:10px;padding:2px 8px;border-radius:12px">Team: ' + formatMoney(d.teamBonus) + '</span>' : '') +
      '</div>' +

      '</div></div>';
  }).join('');
}

// ══════ SETTINGS TAB ══════
function renderIncentiveSettings() {
  const settings = DB.incentiveSettings;
  // Slabs
  const slabsEl = document.getElementById('inc-slabs-list');
  if (slabsEl) slabsEl.innerHTML = settings.slabs.map((s,i) => '<tr><td>' + s.min + '% – ' + (s.max===999?'∞':s.max+'%') + '</td><td><input class="form-input" style="width:100%" value="' + s.level + '" onchange="updateSlab('+i+',\'level\',this.value)"></td><td><input class="form-input" type="number" style="width:70px" value="' + s.percent + '" onchange="updateSlab('+i+',\'percent\',this.value)">%</td></tr>').join('');
  // Fast closure
  document.getElementById('inc-fc-24').value = settings.fastClosureBonus[0]?.amount || 300;
  document.getElementById('inc-fc-48').value = settings.fastClosureBonus[1]?.amount || 150;
  // High value
  document.getElementById('inc-hv-threshold').value = settings.highValueThreshold;
  document.getElementById('inc-hv-bonus').value = settings.highValueBonus;
  // Self generated
  document.getElementById('inc-self-pct').value = settings.selfGeneratedBonus;
  // Team bonus
  document.getElementById('inc-team-bonus-pct').value = settings.teamBonusPercent;
  // Monthly rewards
  settings.monthlyRewards.forEach((r,i) => { const el = document.getElementById('inc-reward-'+(i+1)); if(el) el.value = r.amount; });
  // Quarterly
  document.getElementById('inc-quarterly-amt').value = settings.quarterlyRewardAmount;
  // Agent targets
  renderAgentTargets();
}

function renderAgentTargets() {
  const month = document.getElementById('inc-target-month')?.value || getCurrentMonth();
  const agents = (DB.settings.team || []).filter(m => ['sales','operations','management'].includes(m.dept));
  const tbody = document.getElementById('inc-targets-tbody');
  if (!tbody) return;
  if (!agents.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--textd)">No sales team members found. Add team in Settings.</td></tr>'; return; }
  tbody.innerHTML = agents.map(m => {
    const target = getAgentMonthlyTarget(m.name, month);
    const profit = getAgentMonthlyProfit(m.name, month);
    const pct = target > 0 ? Math.round(profit/target*100) : 0;
    return '<tr><td style="font-weight:600">' + m.name + '</td><td><span class="pill pill-blue">' + (DEPT_LABELS[m.dept]||m.dept) + '</span></td><td><input class="form-input" type="number" style="width:120px" value="' + target + '" onchange="setAgentMonthlyTarget(\'' + m.name + '\',\'' + month + '\',this.value);renderIncentiveDashboard()"></td><td>' + formatMoney(profit) + ' <span style="font-size:10px;color:' + (pct>=100?'var(--g600)':pct>=50?'var(--amb)':'var(--red)') + ';font-weight:700">(' + pct + '%)</span></td></tr>';
  }).join('');
}

function updateSlab(idx, field, value) {
  if (field === 'percent') DB.incentiveSettings.slabs[idx].percent = parseFloat(value) || 0;
  else DB.incentiveSettings.slabs[idx][field] = value;
  saveDB(); showToast('Slab updated');
}

function saveIncentiveSettings() {
  const s = DB.incentiveSettings;
  s.fastClosureBonus[0].amount = parseInt(document.getElementById('inc-fc-24').value) || 0;
  s.fastClosureBonus[1].amount = parseInt(document.getElementById('inc-fc-48').value) || 0;
  s.highValueThreshold = parseInt(document.getElementById('inc-hv-threshold').value) || 15000;
  s.highValueBonus = parseInt(document.getElementById('inc-hv-bonus').value) || 500;
  s.selfGeneratedBonus = parseFloat(document.getElementById('inc-self-pct').value) || 2;
  s.teamBonusPercent = parseFloat(document.getElementById('inc-team-bonus-pct').value) || 2;
  s.monthlyRewards.forEach((r,i) => { const el = document.getElementById('inc-reward-'+(i+1)); if(el) r.amount = parseInt(el.value)||0; });
  s.quarterlyRewardAmount = parseInt(document.getElementById('inc-quarterly-amt').value) || 10000;
  saveDB();
  showToast('Incentive settings saved!');
  renderIncentiveDashboard();
}


function renderIncAIStrip(month, teamProfit, teamTarget, daysPassed, daysTotal, daysLeft) {
  const el = document.getElementById('inc-ai-strip');
  if (!el || isAgent()) { if (el) el.style.display = 'none'; return; }
  el.style.display = '';

  const cards = [];
  const monthProgress = daysTotal > 0 ? Math.round((daysPassed / daysTotal) * 100) : 0;
  const teamPct = teamTarget > 0 ? Math.round((teamProfit / teamTarget) * 100) : 0;

  // 1. Team pace analysis
  if (teamTarget > 0) {
    const gap = teamPct - monthProgress;
    if (gap >= 10) {
      cards.push({ icon:'', color:'#16a34a', bg:'#f0fdf4',
        title: 'Team is Ahead of Pace! +'+gap+'%',
        sub: teamPct+'% target achieved with '+monthProgress+'% of month gone · '+formatMoney(teamProfit)+' profit so far' });
    } else if (gap >= -5) {
      cards.push({ icon:'', color:'#f59e0b', bg:'#fffbeb',
        title: 'On Track — Stay Consistent',
        sub: teamPct+'% of target at '+monthProgress+'% of month · Need '+formatMoney(Math.max(0,teamTarget-teamProfit))+' more' });
    } else {
      const projectedEnd = daysTotal > 0 ? Math.round((teamProfit / daysPassed) * daysTotal) : teamProfit;
      cards.push({ icon:'', color:'#dc2626', bg:'#fee2e2',
        title: 'Team Behind Pace — Action Needed',
        sub: 'At current pace: projected '+formatMoney(projectedEnd)+' vs target '+formatMoney(teamTarget)+' · Push harder the next '+daysLeft+'d' });
    }
  }

  // 2. At-risk agents (below 50% of personal target, month > 50% done)
  if (monthProgress >= 50) {
    const allAgents = typeof getAllAgentsWithBookings === 'function' ? getAllAgentsWithBookings(month) : [];
    const atRisk = allAgents.filter(agent => {
      const t = typeof getAgentMonthlyTarget === 'function' ? getAgentMonthlyTarget(agent, month) : 0;
      if (!t) return false;
      const p = typeof getAgentMonthlyProfit === 'function' ? getAgentMonthlyProfit(agent, month) : 0;
      return Math.round((p/t)*100) < 50;
    });
    if (atRisk.length) {
      cards.push({ icon:'', color:'#f97316', bg:'#fff7ed',
        title: atRisk.length+' Agent'+(atRisk.length>1?'s':'')+' Below 50% Target Mid-Month',
        sub: atRisk.join(', ')+' — coach and reassign leads to close the gap' });
    }
  }

  // 3. Top performer this month
  if (typeof getAllAgentsWithBookings === 'function' && typeof getAgentMonthlyProfit === 'function') {
    const agents = getAllAgentsWithBookings(month);
    if (agents.length > 1) {
      const ranked = agents.map(a => ({ name:a, profit: getAgentMonthlyProfit(a, month) })).sort((a,b)=>b.profit-a.profit);
      if (ranked[0].profit > 0) {
        cards.push({ icon:'', color:'#b45309', bg:'#fffbeb',
          title: ranked[0].name+' Leading This Month',
          sub: formatMoney(ranked[0].profit)+' profit · '+(ranked[1]?'2nd: '+ranked[1].name+' ('+formatMoney(ranked[1].profit)+')':'') });
      }
    }
  }

  if (!cards.length) { el.style.display = 'none'; return; }

  el.innerHTML =
    '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;box-shadow:var(--sh)">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:6px">Incentive Intelligence <span style="font-size:10px;font-weight:400;color:var(--textd)">AI pace analysis</span></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:9px">'+
        cards.map(c =>
          '<div style="background:'+c.bg+';border:1px solid '+c.color+'22;border-radius:9px;padding:10px 12px">'+
            '<div><div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.3">'+c.title+'</div>'+
            '<div style="font-size:10.5px;color:var(--textd);margin-top:2px;line-height:1.4">'+c.sub+'</div></div>'+
          '</div>'
        ).join('')+
      '</div>'+
    '</div>';
}

// ══════ PAYOUT TAB ══════
function renderPayoutTab() {
  const month = document.getElementById('payout-month')?.value || getCurrentMonth();

  const allAgents = getAllAgentsWithBookings(month);
  const settings = DB.incentiveSettings;
  const teamBonusOn = isTeamBonusActive(month);

  // Build payout rows
  const rows = allAgents.map(agent => {
    const profit = getAgentMonthlyProfit(agent, month);
    const target = getAgentMonthlyTarget(agent, month);
    const pct = target > 0 ? Math.round(profit / target * 100) : 0;
    const bookings = getAgentMonthlyBookings(agent, month);
    let totalBase = 0, totalBoosts = 0;
    bookings.forEach(b => {
      const c = calculateBookingIncentive(b);
      totalBase += c.base;
      totalBoosts += c.fastClosure + c.highValue + c.selfGenerated;
    });
    const teamBonus = teamBonusOn ? Math.round(profit * settings.teamBonusPercent / 100) : 0;
    // Monthly rank rewards
    const allRanked = allAgents.map(a => ({ name: a, profit: getAgentMonthlyProfit(a, month) })).sort((a, b) => b.profit - a.profit);
    const rank = allRanked.findIndex(r => r.name === agent);
    const rankReward = rank >= 0 && rank < settings.monthlyRewards.length ? (settings.monthlyRewards[rank]?.amount || 0) : 0;
    const totalIncentive = totalBase + totalBoosts + teamBonus + rankReward;

    // Check if already paid this month
    const payLog = (DB.incentiveLogs || []).find(l => l.agent === agent && l.month === month && l.status === 'paid');

    return { agent, profit, target, pct, bookings: bookings.length, totalBase, totalBoosts, teamBonus, rankReward, totalIncentive, rank, paid: !!payLog, paidAt: payLog?.paidAt, paidBy: payLog?.paidBy, paidAmount: payLog?.amount };
  }).sort((a, b) => b.totalIncentive - a.totalIncentive);

  const totalPayable = rows.filter(r => !r.paid).reduce((s, r) => s + r.totalIncentive, 0);
  const totalPaid = rows.filter(r => r.paid).reduce((s, r) => s + (r.paidAmount || r.totalIncentive), 0);

  const el = document.getElementById('inc-payout-content');
  if (!el) return;

  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
        '<div style="background:var(--g50);border:1px solid var(--g200);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--red)">' + formatMoney(totalPayable) + '</div><div style="font-size:10px;color:var(--textd);margin-top:2px">Pending Payout</div></div>' +
        '<div style="background:var(--g50);border:1px solid var(--g200);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--g700)">' + formatMoney(totalPaid) + '</div><div style="font-size:10px;color:var(--textd);margin-top:2px">Already Paid</div></div>' +
        '<div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--text)">' + formatMoney(totalPayable + totalPaid) + '</div><div style="font-size:10px;color:var(--textd);margin-top:2px">Total This Month</div></div>' +
      '</div>' +
      (isAdmin() ? '<button class="btn btn-primary" onclick="markAllPaid(\'' + month + '\')">Mark All Pending as Paid</button>' : '') +
    '</div>' +

    '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--sh)">' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="background:var(--cream)">' +
          '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--textd)">AGENT</th>' +
          '<th style="padding:10px 14px;font-size:10px;color:var(--textd);text-align:right">PROFIT</th>' +
          '<th style="padding:10px 14px;font-size:10px;color:var(--textd);text-align:right">ACHIEVE%</th>' +
          '<th style="padding:10px 14px;font-size:10px;color:var(--textd);text-align:right">BASE</th>' +
          '<th style="padding:10px 14px;font-size:10px;color:var(--textd);text-align:right">BOOSTS</th>' +
          '<th style="padding:10px 14px;font-size:10px;color:var(--textd);text-align:right">BONUS</th>' +
          '<th style="padding:10px 14px;font-size:10px;color:var(--textd);text-align:right">TOTAL</th>' +
          '<th style="padding:10px 14px;font-size:10px;color:var(--textd);text-align:center">STATUS</th>' +
          (isAdmin() ? '<th style="padding:10px 14px;font-size:10px;color:var(--textd)"></th>' : '') +
        '</tr></thead>' +
        '<tbody>' +
          rows.map((r, i) => {
            const medals = ['#1', '#2', '#3'];
            return '<tr style="border-bottom:1px solid var(--border);' + (r.paid ? 'opacity:.65' : '') + '">' +
              '<td style="padding:10px 14px;font-weight:600">' + (i < 3 ? '<span style="font-size:10px;font-weight:800;color:var(--amb)">' + medals[i] + '</span> ' : '') + r.agent + '</td>' +
              '<td style="padding:10px 14px;text-align:right;font-size:13px">' + formatMoney(r.profit) + '</td>' +
              '<td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:700;color:' + (r.pct >= 100 ? 'var(--g600)' : r.pct >= 70 ? 'var(--amb)' : 'var(--red)') + '">' + r.pct + '%</td>' +
              '<td style="padding:10px 14px;text-align:right;font-size:13px">' + formatMoney(r.totalBase) + '</td>' +
              '<td style="padding:10px 14px;text-align:right;font-size:13px;color:var(--amb)">' + (r.totalBoosts > 0 ? '+' + formatMoney(r.totalBoosts) : '—') + '</td>' +
              '<td style="padding:10px 14px;text-align:right;font-size:13px;color:#7c3aed">' + ((r.teamBonus + r.rankReward) > 0 ? '+' + formatMoney(r.teamBonus + r.rankReward) : '—') + '</td>' +
              '<td style="padding:10px 14px;text-align:right;font-size:15px;font-weight:800;color:var(--g700)">' + formatMoney(r.totalIncentive) + '</td>' +
              '<td style="padding:10px 14px;text-align:center">' +
                (r.paid
                  ? '<span style="background:var(--g50);color:var(--g700);border:1px solid var(--g200);font-size:10px;padding:3px 8px;border-radius:20px">Paid ' + (r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : '') + '</span>'
                  : '<span style="background:#fff5f5;color:var(--red);border:1px solid rgba(220,38,38,.2);font-size:10px;padding:3px 8px;border-radius:20px">Pending</span>') +
              '</td>' +
              (isAdmin() ? '<td style="padding:10px 14px">' +
                (!r.paid ? '<button class="btn btn-sm btn-outline" style="font-size:11px" onclick="markAgentPaid(\'' + r.agent + '\',\'' + month + '\',' + r.totalIncentive + ')">Pay</button>' : '') +
              '</td>' : '') +
            '</tr>';
          }).join('') +
        '</tbody>' +
        '<tfoot><tr style="background:var(--cream);font-weight:700">' +
          '<td style="padding:10px 14px" colspan="6">Total Incentive Payable</td>' +
          '<td style="padding:10px 14px;text-align:right;font-size:16px;color:var(--g700)">' + formatMoney(rows.reduce((s, r) => s + r.totalIncentive, 0)) + '</td>' +
          '<td colspan="' + (isAdmin() ? '2' : '1') + '"></td>' +
        '</tr></tfoot>' +
      '</table>' +
    '</div>' +

    // Payout History
    '<div style="margin-top:20px;font-size:13px;font-weight:700;color:var(--textm);margin-bottom:10px">Payout History</div>' +
    _renderPayoutHistory();
}

function _renderPayoutHistory() {
  const logs = (DB.incentiveLogs || []).filter(l => l.status === 'paid').sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).slice(0, 30);
  if (!logs.length) return '<div style="text-align:center;padding:24px;color:var(--textd);font-size:13px">No payouts recorded yet</div>';
  return '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr style="background:var(--cream)"><th style="text-align:left;padding:8px 14px;font-size:10px;color:var(--textd)">AGENT</th><th style="padding:8px 14px;font-size:10px;color:var(--textd)">MONTH</th><th style="padding:8px 14px;font-size:10px;color:var(--textd);text-align:right">AMOUNT</th><th style="padding:8px 14px;font-size:10px;color:var(--textd)">PAID ON</th><th style="padding:8px 14px;font-size:10px;color:var(--textd)">BY</th></tr></thead>' +
    '<tbody>' +
    logs.map(l => '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 14px;font-weight:600">' + l.agent + '</td><td style="padding:8px 14px;color:var(--textd)">' + l.month + '</td><td style="padding:8px 14px;text-align:right;font-weight:700;color:var(--g700)">' + formatMoney(l.amount) + '</td><td style="padding:8px 14px;color:var(--textd)">' + new Date(l.paidAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) + '</td><td style="padding:8px 14px;color:var(--textd)">' + (l.paidBy || '—') + '</td></tr>').join('') +
    '</tbody></table></div>';
}

function markAgentPaid(agent, month, amount) {
  if (!confirm('Mark incentive of ' + formatMoney(amount) + ' as paid to ' + agent + ' for ' + month + '?')) return;
  if (!Array.isArray(DB.incentiveLogs)) DB.incentiveLogs = [];
  // Remove any prior entry for this agent/month
  DB.incentiveLogs = DB.incentiveLogs.filter(l => !(l.agent === agent && l.month === month));
  const session = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
  DB.incentiveLogs.push({ agent, month, amount, status: 'paid', paidAt: new Date().toISOString(), paidBy: session.name || session.email || 'Admin' });
  saveDB();
  showToast('Payment of ' + formatMoney(amount) + ' recorded for ' + agent);
  renderPayoutTab();
}

function markAllPaid(month) {
  const allAgents = getAllAgentsWithBookings(month);
  const unpaid = allAgents.filter(agent => {
    return !(DB.incentiveLogs || []).some(l => l.agent === agent && l.month === month && l.status === 'paid');
  });
  if (!unpaid.length) { showToast('All agents already paid for this month'); return; }
  const settings = DB.incentiveSettings;
  const teamBonusOn = isTeamBonusActive(month);
  const allRanked = allAgents.map(a => ({ name: a, profit: getAgentMonthlyProfit(a, month) })).sort((a, b) => b.profit - a.profit);
  if (!confirm('Mark incentives as paid for ' + unpaid.length + ' agent(s) for ' + month + '?')) return;
  const session = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
  if (!Array.isArray(DB.incentiveLogs)) DB.incentiveLogs = [];
  unpaid.forEach(agent => {
    const profit = getAgentMonthlyProfit(agent, month);
    const bookings = getAgentMonthlyBookings(agent, month);
    let total = 0;
    bookings.forEach(b => { const c = calculateBookingIncentive(b); total += c.total; });
    if (teamBonusOn) total += Math.round(profit * settings.teamBonusPercent / 100);
    const rank = allRanked.findIndex(r => r.name === agent);
    if (rank >= 0 && rank < settings.monthlyRewards.length) total += (settings.monthlyRewards[rank]?.amount || 0);
    DB.incentiveLogs = DB.incentiveLogs.filter(l => !(l.agent === agent && l.month === month));
    DB.incentiveLogs.push({ agent, month, amount: total, status: 'paid', paidAt: new Date().toISOString(), paidBy: session.name || session.email || 'Admin' });
  });
  saveDB();
  showToast(unpaid.length + ' agent(s) marked as paid');
  renderPayoutTab();
}

// ══════ DYNAMIC STRUCTURE TAB ══════
function renderStructureTab() {
  const s = DB.incentiveSettings;
  const el = document.getElementById('inc-structure-content');
  if (!el) return;

  el.innerHTML =
    '<div class="card" style="max-width:800px">' +
      '<div class="card-header"><div><div class="card-title">Incentive Structure Reference</div><div class="card-sub">As per current Wanago Sales Incentive Settings</div></div></div>' +
      '<div class="form-section">Incentive Slabs (Profit-Based)</div>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
        '<thead><tr style="background:var(--cream)"><th style="padding:10px 14px;text-align:left;font-size:11px">Target Achievement</th><th style="padding:10px 14px;text-align:left;font-size:11px">Performance Level</th><th style="padding:10px 14px;text-align:left;font-size:11px">Incentive %</th></tr></thead>' +
        '<tbody>' +
          s.slabs.map(sl =>
            '<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px 14px">' +
            (sl.max === 999 ? sl.min + '%+' : sl.min + '% – ' + sl.max + '%') +
            '</td><td>' + sl.level + '</td><td style="color:' + (sl.percent === 0 ? 'var(--red)' : 'var(--g600)') + ';font-weight:600">' +
            (sl.percent === 0 ? 'No Incentive' : sl.percent + '% of Profit') + '</td></tr>'
          ).join('') +
        '</tbody>' +
      '</table>' +
      '<div class="form-section">Performance Boosters</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">' +
        '<div style="background:var(--cream);border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:var(--amb);margin-bottom:8px">Fast Closure Bonus</div><div style="font-size:12px;line-height:2">' +
          s.fastClosureBonus.map(fc => 'Within ' + fc.withinHours + ' Hours → <strong>₹' + fc.amount + '</strong>').join('<br>') +
        '</div></div>' +
        '<div style="background:var(--cream);border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:8px">High-Value Booking</div><div style="font-size:12px;line-height:2">Profit above ₹' + s.highValueThreshold.toLocaleString() + ' → <strong>₹' + s.highValueBonus + ' Bonus</strong></div></div>' +
        '<div style="background:var(--cream);border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:8px">Self-Generated Lead</div><div style="font-size:12px;line-height:2">+' + s.selfGeneratedBonus + '% Additional on Profit</div></div>' +
        '<div style="background:var(--cream);border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:8px">Team Bonus</div><div style="font-size:12px;line-height:2">Team hits target → +' + s.teamBonusPercent + '% for everyone</div></div>' +
      '</div>' +
      '<div class="form-section">Monthly & Quarterly Rewards</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
        '<div style="background:var(--cream);border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:var(--g700);margin-bottom:8px">Monthly Rewards</div><div style="font-size:12px;line-height:2">' +
          s.monthlyRewards.map((r, i) => ['#1', '#2', '#3'][i] + ' ' + r.label + ' → <strong>₹' + r.amount.toLocaleString() + '</strong>').join('<br>') +
        '</div></div>' +
        '<div style="background:var(--cream);border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:8px">Quarterly Reward</div><div style="font-size:12px;line-height:2">Top Performer (3 months) → <strong>' + (s.quarterlyRewardLabel || '₹' + s.quarterlyRewardAmount.toLocaleString()) + '</strong></div></div>' +
      '</div>' +
    '</div>';
}

window.renderIncentiveDashboard=renderIncentiveDashboard;window.renderIncentiveSettings=renderIncentiveSettings;
window.renderAgentTargets=renderAgentTargets;window.updateSlab=updateSlab;window.saveIncentiveSettings=saveIncentiveSettings;
window.renderPayoutTab=renderPayoutTab;window.markAgentPaid=markAgentPaid;window.markAllPaid=markAllPaid;
window.renderStructureTab=renderStructureTab;

initPage(renderIncentiveDashboard);
