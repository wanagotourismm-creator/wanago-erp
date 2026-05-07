// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Integrations API Layer
//  Meta Ads · WhatsApp Business · Gmail
//  All credentials live in DB.settings.integrations (Admin-only)
// ═══════════════════════════════════════════════════════════════
'use strict';

var WanagoIntegrations = (function () {

  function getCreds() {
    try { return (DB.settings && DB.settings.integrations) || {}; } catch(e) { return {}; }
  }
  function saveCreds(key, data) {
    try {
      if (!DB.settings.integrations) DB.settings.integrations = {};
      DB.settings.integrations[key] = Object.assign(DB.settings.integrations[key] || {}, data);
      if (typeof saveDB === 'function') saveDB();
    } catch(e) {}
  }

  /* ══════════════════════════════════════════════
     META ADS  (Facebook Marketing API v19.0)
  ══════════════════════════════════════════════ */
  var Meta = {
    BASE: 'https://graph.facebook.com/v19.0',

    get creds() { return getCreds().meta || {}; },
    get token()     { return this.creds.accessToken || ''; },
    get accountId() { return (this.creds.adAccountId || '').replace(/^act_/, ''); },
    get pageId()    { return this.creds.pageId || ''; },

    isConfigured: function () { return !!(this.token && this.accountId); },

    _fetch: async function (path, params) {
      if (!this.isConfigured()) throw new Error('Meta Ads not configured. Set credentials in Admin → Integrations.');
      params = params || {};
      params.access_token = this.token;
      var url = this.BASE + path + '?' + new URLSearchParams(params);
      var res = await fetch(url);
      var data = await res.json();
      if (data.error) throw new Error(data.error.message || 'Meta API error');
      return data;
    },

    getCampaigns: async function (limit) {
      return this._fetch('/act_' + this.accountId + '/campaigns', {
        fields: 'id,name,status,objective,created_time,daily_budget,lifetime_budget,start_time,stop_time',
        limit: limit || 25
      });
    },

    getAccountInsights: async function (datePreset) {
      return this._fetch('/act_' + this.accountId + '/insights', {
        fields: 'spend,reach,impressions,clicks,actions,ctr,cpc,cpm,frequency,unique_clicks',
        date_preset: datePreset || 'last_30d',
        level: 'account'
      });
    },

    getCampaignInsights: async function (datePreset) {
      return this._fetch('/act_' + this.accountId + '/insights', {
        fields: 'campaign_id,campaign_name,spend,reach,impressions,clicks,actions,ctr,cpc,cpm',
        date_preset: datePreset || 'last_30d',
        level: 'campaign',
        limit: 20
      });
    },

    getAdSets: async function (campaignId) {
      return this._fetch('/' + campaignId + '/adsets', {
        fields: 'id,name,status,daily_budget,targeting',
        limit: 10
      });
    },

    verifyToken: async function () {
      if (!this.token) throw new Error('No access token');
      return this._fetch('/me', { fields: 'id,name' });
    }
  };

  /* ══════════════════════════════════════════════
     WHATSAPP BUSINESS  (Cloud API via Meta)
  ══════════════════════════════════════════════ */
  var WhatsApp = {
    BASE: 'https://graph.facebook.com/v19.0',

    get creds()   { return getCreds().whatsapp || {}; },
    get token()   { return this.creds.accessToken || ''; },
    get phoneId() { return this.creds.phoneNumberId || ''; },
    get bizId()   { return this.creds.businessAccountId || ''; },

    isConfigured: function () { return !!(this.token && this.phoneId); },

    _fmtPhone: function (phone) {
      phone = (phone || '').replace(/[^0-9+]/g, '');
      if (phone.startsWith('+')) phone = phone.slice(1);
      if (phone.length === 10) phone = '91' + phone;
      return phone;
    },

    send: async function (to, message) {
      if (!this.isConfigured()) throw new Error('WhatsApp Business API not configured.');
      var res = await fetch(this.BASE + '/' + this.phoneId + '/messages', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + this.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this._fmtPhone(to),
          type: 'text',
          text: { preview_url: true, body: message }
        })
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error.message || 'WhatsApp send failed');
      return data;
    },

    sendTemplate: async function (to, templateName, langCode, components) {
      if (!this.isConfigured()) throw new Error('WhatsApp Business API not configured.');
      var res = await fetch(this.BASE + '/' + this.phoneId + '/messages', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + this.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: this._fmtPhone(to),
          type: 'template',
          template: { name: templateName, language: { code: langCode || 'en_US' }, components: components || [] }
        })
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error.message || 'Template send failed');
      return data;
    },

    getProfile: async function () {
      if (!this.isConfigured()) throw new Error('WhatsApp API not configured.');
      var res = await fetch(this.BASE + '/' + this.phoneId + '?fields=display_phone_number,verified_name,quality_rating&access_token=' + this.token);
      var data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    },

    getTemplates: async function () {
      if (!this.bizId) throw new Error('Business Account ID not set.');
      var res = await fetch(this.BASE + '/' + this.bizId + '/message_templates?fields=name,status,category,language&access_token=' + this.token);
      var data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    },

    bulkSend: async function (contacts, buildMsg, onProgress) {
      var results = { sent: 0, failed: 0, errors: [] };
      for (var i = 0; i < contacts.length; i++) {
        var c = contacts[i];
        try {
          var msg = typeof buildMsg === 'function' ? buildMsg(c) : buildMsg;
          await this.send(c.phone || c.mobile, msg);
          results.sent++;
        } catch (e) {
          results.failed++;
          results.errors.push({ name: c.name, error: e.message });
        }
        if (onProgress) onProgress(i + 1, contacts.length, results);
        if (i < contacts.length - 1) await new Promise(r => setTimeout(r, 500));
      }
      return results;
    }
  };

  /* ══════════════════════════════════════════════
     GMAIL  (Gmail API via Google OAuth2)
  ══════════════════════════════════════════════ */
  var Gmail = {
    SEND_URL: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',

    get creds()    { return getCreds().gmail || {}; },
    get clientId() { return this.creds.clientId || ''; },
    get token()    { return this.creds.accessToken || ''; },
    get fromName() { return this.creds.fromName || (function(){ try{ var s=JSON.parse(sessionStorage.getItem('wanago_session')||'{}'); return s.name||'Wanago Tourism'; }catch(e){return 'Wanago Tourism';} })(); },

    isConfigured: function () { return !!(this.token || this.clientId); },

    authorize: async function () {
      if (!this.clientId) throw new Error('Google Client ID not set in Admin → Integrations.');
      return new Promise(function (resolve, reject) {
        var params = new URLSearchParams({
          client_id: Gmail.clientId,
          redirect_uri: 'https://wanago.in/oauth',
          response_type: 'token',
          scope: 'https://www.googleapis.com/auth/gmail.send',
          prompt: 'select_account'
        });
        var popup = window.open('https://accounts.google.com/o/oauth2/v2/auth?' + params, 'gmail_auth', 'width=520,height=620,left=200,top=100');
        if (!popup) { reject(new Error('Popup blocked. Allow popups for this site.')); return; }
        var interval = setInterval(function () {
          try {
            if (popup.closed) { clearInterval(interval); reject(new Error('Auth window closed.')); return; }
            var hash = popup.location.hash;
            if (hash && hash.includes('access_token')) {
              var p = new URLSearchParams(hash.slice(1));
              var tok = p.get('access_token');
              clearInterval(interval);
              popup.close();
              saveCreds('gmail', { accessToken: tok });
              resolve(tok);
            }
          } catch (e) { /* cross-origin, keep polling */ }
        }, 600);
      });
    },

    _encode: function (to, subject, body, fromName) {
      var raw = [
        'From: "' + (fromName || this.fromName) + '" <me>',
        'To: ' + to,
        'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=',
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        btoa(unescape(encodeURIComponent(body)))
      ].join('\r\n');
      return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },

    send: async function (to, subject, htmlBody, fromName) {
      var token = this.token;
      if (!token) token = await this.authorize();
      var res = await fetch(this.SEND_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: this._encode(to, subject, htmlBody, fromName) })
      });
      var data = await res.json();
      if (data.error) {
        if (data.error.code === 401) { saveCreds('gmail', { accessToken: '' }); throw new Error('Gmail token expired. Please re-authorize in Admin → Integrations.'); }
        throw new Error(data.error.message || 'Gmail send failed');
      }
      return data;
    },

    bulkSend: async function (contacts, subject, buildHtml, onProgress, fromName) {
      var results = { sent: 0, failed: 0, errors: [] };
      for (var i = 0; i < contacts.length; i++) {
        var c = contacts[i];
        if (!c.email) { results.failed++; continue; }
        try {
          var html = typeof buildHtml === 'function' ? buildHtml(c) : buildHtml;
          await this.send(c.email, subject, html, fromName);
          results.sent++;
        } catch (e) {
          results.failed++;
          results.errors.push({ name: c.name, error: e.message });
        }
        if (onProgress) onProgress(i + 1, contacts.length, results);
        if (i < contacts.length - 1) await new Promise(r => setTimeout(r, 800));
      }
      return results;
    }
  };

  /* ── Public API ── */
  return {
    Meta: Meta,
    WhatsApp: WhatsApp,
    Gmail: Gmail,
    getCreds: getCreds,
    saveCreds: saveCreds
  };

})();

window.WanagoIntegrations = WanagoIntegrations;
