// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firebase Configuration (ESM module)
// ═══════════════════════════════════════════════════════════════

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU",
  authDomain:        "wanago-erp.firebaseapp.com",
  projectId:         "wanago-erp",
  storageBucket:     "wanago-erp.firebasestorage.app",
  messagingSenderId: "445920648182",
  appId:             "1:445920648182:web:2ef6f9110767bc9f36c5d7"
};

const apps = getApps();
const app = apps.length ? apps[0] : initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
