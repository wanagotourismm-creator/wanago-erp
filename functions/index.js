// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firebase Cloud Functions
//
//  WHAT THESE DO:
//  ──────────────
//  1. validateLead      — server-side lead validation before save
//  2. sendNotification  — push notifications to team members
//  3. dailyBackup       — auto-backup data every day at midnight
//
//  HOW TO DEPLOY:
//  ──────────────
//  1. Install Firebase CLI: npm install -g firebase-tools
//  2. In project folder: firebase login
//  3. firebase init functions (select wanago-erp project)
//  4. Copy this file to functions/index.js
//  5. firebase deploy --only functions
//
//  WHY CLOUD FUNCTIONS:
//  ─────────────────────
//  - Backend validation (can't be bypassed by users)
//  - Push notifications work even when app is closed
//  - Scheduled tasks (backups, reminders)
//  - Mobile app can call these same endpoints
// ═══════════════════════════════════════════════════════════════

const functions  = require('firebase-functions');
const admin      = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const COMPANY_ID  = 'wanago-erp';
const CONFIG_PATH = `companies/${COMPANY_ID}/config`;

// ── 1. VALIDATE LEAD (HTTPS callable) ────────────────────────
// Called before saving a lead to validate on the server.
// Mobile app: WanagoServices.leads.validate(data)
// Web app:    firebase.functions().httpsCallable('validateLead')

exports.validateLead = functions.https.onCall(async (data, context) => {
  // Must be authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { name, phone, source, destination } = data;
  const errors = [];

  // Validate required fields
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!phone || !/^[0-9+\-\s]{7,15}$/.test(phone.replace(/\s/g, ''))) {
    errors.push('Valid phone number required');
  }

  // Check for duplicate phone (server-side check)
  if (phone) {
    const clean = phone.replace(/\D/g, '');
    const existing = await db
      .collection(`companies/${COMPANY_ID}/leads`)
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (!existing.empty) {
      const lead = existing.docs[0].data();
      errors.push(`Duplicate: Lead already exists (${lead.name || 'Unknown'})`);
    }
  }

  if (errors.length) {
    throw new functions.https.HttpsError('invalid-argument', errors.join(', '));
  }

  return { valid: true, message: 'Lead data is valid' };
});

// ── 2. SEND NOTIFICATION (HTTPS callable) ────────────────────
// Send push notification to a team member.
// Mobile: WanagoServices.notifications.send(memberId, title, body)

exports.sendNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const { memberId, title, body, type, url } = data;

  try {
    // Get FCM token for the team member
    const settingsSnap = await db.doc(`${CONFIG_PATH}/settings`).get();
    if (!settingsSnap.exists) {
      return { sent: false, reason: 'Settings not found' };
    }

    const settings = settingsSnap.data();
    const team = settings.team || [];
    const member = team.find(m => m.id === memberId);

    if (!member || !member.fcmToken) {
      return { sent: false, reason: 'No FCM token for member' };
    }

    // Send push notification via FCM
    await admin.messaging().send({
      token: member.fcmToken,
      notification: {
        title: title || 'Wanago ERP',
        body:  body  || 'You have a new notification',
      },
      data: {
        type: type || 'general',
        url:  url  || '/pages/dashboard.html',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          icon:     'notification_icon',
          color:    '#228050',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    });

    // Log the notification
    await db.collection(`companies/${COMPANY_ID}/notifications`).add({
      memberId,
      title,
      body,
      type:     type || 'general',
      sentBy:   context.auth.uid,
      sentAt:   admin.firestore.FieldValue.serverTimestamp(),
      delivered: true,
    });

    return { sent: true };
  } catch(e) {
    console.error('[sendNotification]', e.message);
    return { sent: false, reason: e.message };
  }
});

// ── 3. DAILY BACKUP (Scheduled) ──────────────────────────────
// Runs every day at midnight IST (18:30 UTC).
// Creates a backup snapshot in companies/{id}/backups/{date}

exports.dailyBackup = functions.pubsub
  .schedule('30 18 * * *')   // 18:30 UTC = midnight IST
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const collections = ['leads', 'bookings', 'payments', 'customers', 'invoices'];
      const backup = {};

      for (const col of collections) {
        const snap = await db.collection(`companies/${COMPANY_ID}/${col}`).get();
        backup[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      backup._createdAt  = new Date().toISOString();
      backup._recordCount = Object.values(backup).reduce((s, v) =>
        s + (Array.isArray(v) ? v.length : 0), 0
      );

      // Save to backups collection (keep last 30 days)
      await db.doc(`companies/${COMPANY_ID}/backups/${today}`).set(backup);

      // Clean up old backups (older than 30 days)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const oldBackups = await db
        .collection(`companies/${COMPANY_ID}/backups`)
        .where('_createdAt', '<', cutoffStr)
        .get();

      const deletePromises = oldBackups.docs.map(d => d.ref.delete());
      await Promise.all(deletePromises);

      console.log(`[dailyBackup] Backed up ${backup._recordCount} records for ${today}`);
      return { success: true, date: today, records: backup._recordCount };
    } catch(e) {
      console.error('[dailyBackup] Failed:', e.message);
      return { success: false, error: e.message };
    }
  });

// ── 4. FOLLOW-UP REMINDER (Scheduled) ────────────────────────
// Runs every day at 9am IST to remind agents of follow-ups.

exports.followupReminder = functions.pubsub
  .schedule('30 3 * * *')   // 3:30 UTC = 9am IST
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Find leads with follow-up date = today
      const snap = await db
        .collection(`companies/${COMPANY_ID}/leads`)
        .where('followup', '==', today)
        .where('stage', 'not-in', ['won', 'lost'])
        .get();

      if (snap.empty) return { sent: 0 };

      // Get team settings for FCM tokens
      const settingsSnap = await db.doc(`${CONFIG_PATH}/settings`).get();
      const team = settingsSnap.exists ? (settingsSnap.data().team || []) : [];

      let sent = 0;
      for (const doc of snap.docs) {
        const lead = doc.data();
        const agent = team.find(m => m.id === lead.createdBy || m.name === lead.agent);
        if (!agent || !agent.fcmToken) continue;

        try {
          await admin.messaging().send({
            token: agent.fcmToken,
            notification: {
              title: 'Follow-up Reminder',
              body:  `${lead.name || 'A lead'} needs follow-up today`,
            },
            data: { type: 'followup', leadId: doc.id },
          });
          sent++;
        } catch(e) { /* FCM token may be stale */ }
      }

      console.log(`[followupReminder] Sent ${sent} reminders for ${today}`);
      return { sent };
    } catch(e) {
      console.error('[followupReminder]', e.message);
      return { error: e.message };
    }
  });
