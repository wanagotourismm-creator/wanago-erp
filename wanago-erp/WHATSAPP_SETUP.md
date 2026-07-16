# WhatsApp Business API Setup Guide

**Purpose:** get Meta's WhatsApp Cloud API connected to this app, and get the 4 message templates approved. Written for a situation where the WhatsApp Business number belongs to the client, not to you directly.

---

## 1. The access problem — two ways to solve it

You need two different kinds of access from your client, and they're not the same thing:

1. **A way to generate credentials** (Access Token, Phone Number ID, App Secret) — this needs *admin-level* access to the Meta Business Manager that owns the WhatsApp Business Account.
2. **A phone number for OTP verification** — whoever registers the WhatsApp Business number needs to receive an SMS/call to verify it. This has to be a real number the client controls (their business line), not something you can do on their behalf without them present at least once.

**Option A — Get added as a partner (recommended, cleanest).**
Ask your client to add you to their Meta Business Manager without sharing their personal login:
1. Client goes to [business.facebook.com](https://business.facebook.com) → **Settings → Users → People** (or **Partners**, if they'd rather not give you a People-level account).
2. **Add person** → your email → assign a role. For everything below (creating the app, generating tokens, submitting templates) you need at least **Employee access with admin permissions on the specific WhatsApp Business Account**, not full Business Manager admin — ask for the WhatsApp Business Account and the Business App to be shared with you specifically, not blanket access to the whole Business Manager (their ad accounts, pages, etc. stay private from you this way).
3. Once accepted, everything from step 2 onward you can do yourself, logged into your own Meta account.

**Option B — Client does it, hands you 4 values.**
If they'd rather not grant any access at all, send them section 2 below to follow themselves (it's written so a non-developer can do it), and have them send back just these 4 values:
- Access Token
- Phone Number ID
- App Secret
- (They also pick the Webhook Verify Token themselves — it's not secret, just a shared password they invent, e.g. `wanago-verify-2026`)

Either way, those 4 values are ALL this app needs — paste them into **Admin → Integrations → WhatsApp (Meta Cloud API)** once you have them, and the connection is live. Nothing else in the app needs Meta access.

---

## 2. Setting up the WhatsApp Business App (do this once)

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App** → choose **Business** as the app type.
2. In the app dashboard, **Add Product → WhatsApp → Set up**.
3. This creates a test WhatsApp Business Account automatically. Under **API Setup**, you'll see:
   - A **temporary access token** (expires in 24h — fine for testing, not for production)
   - A **test phone number** Meta provides for free testing before your real number is verified
   - The **Phone Number ID** (a long number, not the phone number itself)
4. **Add your client's real business phone number**: WhatsApp Manager → **Phone Numbers → Add phone number** → enter the number, verify via SMS/call (this is the step that needs the client's phone in hand). A number already active on the regular WhatsApp app can't be reused — it has to be a number not currently registered on WhatsApp (or you migrate it, which is a separate flow Meta walks you through).
5. **Generate a permanent access token** (the temporary one isn't usable in production): **Business Settings → System Users → Add** → create a system user → assign it to your WhatsApp app with **Full Control** → **Generate Token** → select the `whatsapp_business_messaging` and `whatsapp_business_management` permissions → this token doesn't expire like the default one.
6. **Get the App Secret**: your app's dashboard → **Settings → Basic** → App Secret (click "Show").

You now have 3 of the 4 values: **Access Token**, **Phone Number ID**, **App Secret**.

### Register the webhook (4th value: Verify Token)

1. Pick any string as your Verify Token — it's not issued by Meta, you invent it (e.g. `wanago-verify-2026`). Put it in Admin → Integrations first.
2. In the Meta app dashboard: **WhatsApp → Configuration → Webhook** → **Edit**.
3. Callback URL: `https://wanago-erp.vercel.app/api/whatsapp/webhook`
4. Verify Token: the same string you just invented.
5. Subscribe to the `messages` field (that's what delivers inbound customer messages to the app).

### Paste into the app

**Admin → Integrations → WhatsApp (Meta Cloud API)**, fill in all 4 fields, Save. Send yourself a test WhatsApp message to the business number and confirm it shows up in **WhatsApp Inbox** in the app — that confirms the webhook is wired correctly.

---

## 3. Creating the 4 message templates

**WhatsApp Manager** (business.facebook.com → your Business → WhatsApp Manager, or reachable from the app dashboard's WhatsApp product page) → **Message Templates → Create Template**.

For each of the 4 below: pick **Category: Utility**, **Language: English**, fill the **Body** exactly as written (the `{{1}}`, `{{2}}` etc. stay literally as-is — Meta turns them into variable slots), and when Meta asks for a **sample value** for each variable (required before it'll let you submit), use the examples given.

### Template 1 — `referral_bonus_paid`
**Body:**
> Hi {{1}}, your referral bonus of {{2}} for referring {{3}} has been paid out. Thank you for referring Wanago Tours & Travels — we appreciate it!

**Sample values:** {{1}} → `Priya`, {{2}} → `₹2,500`, {{3}} → `Rahul Menon`

### Template 2 — `booking_request_contacted`
**Body:**
> Hi {{1}}, thanks for your interest in {{2}}! Our team at Wanago Tours & Travels is reviewing your request and will contact you shortly to finalize the details.

**Sample values:** {{1}} → `Anjali`, {{2}} → `Goa Beach Getaway`

### Template 3 — `staff_request_decision`
**Body:**
> Hi, your {{1}} request has been {{2}}. Open the Wanago ERP app for full details.

**Sample values:** {{1}} → `leave`, {{2}} → `approved`

### Template 4 — `international_trip_followup`
**Body:**
> Reminder: {{1}}'s trip to {{2}} departs {{3}}. Please follow up soon.

**Sample values:** {{1}} → `Vikram Nair`, {{2}} → `Dubai`, {{3}} → `in 3 days`

**Name each template exactly** `referral_bonus_paid`, `booking_request_contacted`, `staff_request_decision`, `international_trip_followup` when you submit — those exact names are what you'll type into the app's Admin → WhatsApp Templates panel afterward (case-sensitive, must match what Meta shows).

**Submit all 4.** Review typically takes a few hours to 1-2 days. Meta can reject one over wording — if that happens, edit and resubmit, there's no penalty for a rejection.

---

## 4. After Meta approves a template

Go to **Admin → WhatsApp Templates** in the ERP → **Register Template**:
- **Purpose**: pick the matching one from the dropdown (e.g. `referral_bonus_paid`)
- **Meta Template Name**: the exact name Meta shows in WhatsApp Manager (should match what you submitted)
- **Language Code**: `en` (or whatever Meta shows, e.g. `en_US` if that's what you picked)
- **Category**: Utility
- **Approval Status**: Approved
- **Active**: checked

Save. That purpose now works — the next time that trigger fires outside the 24h window, it sends this template instead of failing silently.
