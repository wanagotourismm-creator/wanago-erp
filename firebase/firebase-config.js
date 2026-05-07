// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firebase Configuration
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// IMPORTANT: After deploying to Vercel, add your Vercel domain to
// Firebase Console → Authentication → Settings → Authorized domains
const firebaseConfig = {
  apiKey: "AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU",
  authDomain: "wanago-erp.firebaseapp.com",
  projectId: "wanago-erp",
  storageBucket: "wanago-erp.firebasestorage.app",
  messagingSenderId: "445920648182",
  appId: "1:445920648182:web:2ef6f9110767bc9f36c5d7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
