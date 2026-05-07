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
  document.getElementById('inc-team-bonus').textContent = teamBonusOn ? '✅ Active (+2%)' : '❌ Not Yet';
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

  // Agent cards
  const grid = document.getElementById('inc-agents-grid');
  if (!agents.length) { grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--textd);grid-column:1/-1"><div style="font-size:36px;margin-bottom:10px">🎯</div><div style="font-size:14px;font-weight:600">No agents with bookings this month</div><div style="font-size:12px;margin-top:4px">Set targets in the Settings tab and create confirmed bookings to see incentives here</div></div>'; return; }

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

  const medals = ['🥇','🥈','🥉'];
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
        '<div style="background:' + (d.remaining > 0 ? 'var(--red2)' : 'var(--g50)') + ';border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:15px;font-weight:700;color:' + (d.remaining > 0 ? 'var(--red)' : 'var(--g600)') + '">' + (d.remaining > 0 ? formatMoney(d.remaining) : '✅ Done') + '</div><div style="font-size:9px;color:var(--textd)">' + (d.remaining > 0 ? 'Still Needs' : 'Target Met!') + '</div></div>' +
      '</div>' +

      // Pressure zone — daily run rate + next level
      (d.remaining > 0 && isCurrentMonth ? '<div style="background:linear-gradient(135deg,#fff5f5,#fff0f0);border:1px solid rgba(192,57,43,.12);border-radius:10px;padding:10px 12px;margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-size:9px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px">⏰ Daily Run Rate Needed</div><div style="font-size:18px;font-weight:900;color:var(--red);font-family:DM Serif Display,serif">' + formatMoney(d.dailyNeeded) + '<span style="font-size:11px;font-weight:500;color:var(--textd)">/day</span></div></div>' +
          '<div style="text-align:right"><div style="font-size:9px;color:var(--textd)">Days Left</div><div style="font-size:22px;font-weight:900;color:' + (daysLeft <= 3 ? 'var(--red)' : daysLeft <= 7 ? 'var(--amb)' : 'var(--g600)') + '">' + daysLeft + '</div></div>' +
        '</div>' +
      '</div>' : '') +

      // Next level motivation
      (d.nextLevel && d.profitToNextLevel > 0 ? '<div style="background:var(--amb2);border:1px solid rgba(214,137,16,.15);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:20px">🚀</span>' +
        '<div><div style="font-size:10px;font-weight:700;color:var(--amb);text-transform:uppercase;letter-spacing:.5px">Next Level Unlock</div><div style="font-size:12px;color:var(--textm)">Just <strong>' + formatMoney(d.profitToNextLevel) + '</strong> more profit to reach <strong>' + d.nextLevel + '</strong></div></div>' +
      '</div>' : '') +

      // Target met celebration
      (d.pct >= 100 ? '<div style="background:linear-gradient(135deg,var(--g50),#e8f5e9);border:1px solid var(--g200);border-radius:10px;padding:10px 12px;margin-bottom:12px;text-align:center"><span style="font-size:20px">🎉</span> <span style="font-size:13px;font-weight:700;color:var(--g700)">TARGET ACHIEVED! Top Performer Level Unlocked!</span></div>' : '') +

      // Incentive breakdown pills
      '<div style="display:flex;flex-wrap:wrap;gap:4px">' +
        (d.totalBase > 0 ? '<span style="background:var(--g50);color:var(--g700);border:1px solid var(--g200);font-size:10px;padding:2px 8px;border-radius:12px">Base: ' + formatMoney(d.totalBase) + '</span>' : '') +
        (d.totalFast > 0 ? '<span style="background:var(--amb2);color:var(--amb);border:1px solid rgba(214,137,16,.2);font-size:10px;padding:2px 8px;border-radius:12px">⚡ Fast: ' + formatMoney(d.totalFast) + '</span>' : '') +
        (d.totalHV > 0 ? '<span style="background:var(--gold2);color:#7a5800;border:1px solid rgba(201,168,76,.25);font-size:10px;padding:2px 8px;border-radius:12px">💎 HV: ' + formatMoney(d.totalHV) + '</span>' : '') +
        (d.totalSelf > 0 ? '<span style="background:var(--blue2);color:var(--blue);border:1px solid rgba(37,99,235,.15);font-size:10px;padding:2px 8px;border-radius:12px">🔥 Self: ' + formatMoney(d.totalSelf) + '</span>' : '') +
        (d.teamBonus > 0 ? '<span style="background:#f3e8ff;color:#7c3aed;border:1px solid rgba(124,58,237,.15);font-size:10px;padding:2px 8px;border-radius:12px">👥 Team: ' + formatMoney(d.teamBonus) + '</span>' : '') +
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


window.renderIncentiveDashboard=renderIncentiveDashboard;window.renderIncentiveSettings=renderIncentiveSettings;
window.renderAgentTargets=renderAgentTargets;window.updateSlab=updateSlab;window.saveIncentiveSettings=saveIncentiveSettings;

initPage(renderIncentiveDashboard);
