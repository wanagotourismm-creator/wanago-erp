// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Team Auth Module
//  Admin creates Firebase accounts for agents
// ═══════════════════════════════════════════════════════════════

import { auth } from '../firebase/firebase-config.js';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Create account for a team member ──
async function createTeamAccount(name, email, password, role, memberId) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const member = DB.settings.team.find(m => m.id === memberId);
    if (member) {
      member.firebaseUid = cred.user.uid;
      member.email = email;
      member.accountCreated = true;
      member.accountCreatedAt = new Date().toISOString();
      saveDB();
    }

    return { success: true, uid: cred.user.uid };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ── Send password reset email ──
async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ── Get team member from Firebase UID ──
function getMemberByUid(uid) {
  return (DB.settings.team || []).find(m => m.firebaseUid === uid) || null;
}

// ── Determine role from team member ──
function getRoleFromMember(member) {
  if (!member) return 'agent';
  const role = (member.role || '').toLowerCase();
  if (['founder','ceo','co_founder'].includes(role)) return 'founder_ceo';
  if (['admin'].includes(role)) return 'admin';
  if (['branch_manager','team_lead','senior_manager','sales_manager','operations_manager','finance_manager','marketing_manager'].includes(role)) return 'manager';
  return 'agent';
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

window.createTeamAccount = createTeamAccount;
window.sendPasswordReset = sendPasswordReset;
window.getMemberByUid = getMemberByUid;
window.getRoleFromMember = getRoleFromMember;
