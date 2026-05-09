/* ══════════════════════════════════════════════════
   utils.js — Shared utility functions
   Branch: js/utils
   Dependencies: none
══════════════════════════════════════════════════ */

'use strict';

/* ── Date formatting ── */
function formatDate(d) {
  if (!d || d === 'TBD' || d === '—') return d || '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

/* ── Overdue check (date string vs today) ── */
function isOverdue(d) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toISOString().split('T')[0]);
}

/* ── Toast notifications ── */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', '': 'ℹ' };
  el.innerHTML = `
    <span style="color:${type === 'error' ? 'var(--red)' : type === 'warning' ? 'var(--amber)' : 'var(--g500)'}">
      ${icons[type] || 'ℹ'}
    </span>
    <span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all .3s';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* ── Modal helpers ── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeMBG(e, id) { if (e.target === e.currentTarget) closeModal(id); }

/* ── Segment tag toggle ── */
function toggleTag(el) { el.classList.toggle('sel'); }

/* ── Tab switching (by element reference) ── */
function switchTab(el, contentId) {
  const bar = el.closest('.tab-bar');
  bar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const parent = bar.parentElement;
  parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const target = document.getElementById(contentId);
  if (target) target.classList.add('active');
}

/* ── Tab switching (by content element id) ── */
function switchTabById(contentId) {
  const target = document.getElementById(contentId);
  if (!target) return;
  const page = target.closest('.page');
  const bar  = page.querySelector('.tab-bar');
  bar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  page.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  target.classList.add('active');
  // Activate matching tab button by index
  const idx = [...page.querySelectorAll('.tab-content')].indexOf(target);
  const tabs = bar.querySelectorAll('.tab');
  if (tabs[idx]) tabs[idx].classList.add('active');
}

/* ── Global keyboard handler ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-bg.open').forEach(m => m.classList.remove('open'));
  }
});

/* ── Global search (placeholder UX) ── */
document.getElementById('global-search').addEventListener('input', function () {
  if (this.value.length > 2) toast(`Searching "${this.value}"...`, '');
});
