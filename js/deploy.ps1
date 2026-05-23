# WANAGO ERP - Fix null textContent errors on all pages
Write-Host "Deploying null-safety fixes..." -ForegroundColor Cyan

git add js/bookings.js
git add js/packages.js
git add js/customers.js
git add js/leads.js
git add js/invoices.js
git add js/expenses.js
git add js/reports.js
git add js/support.js
git add js/marketing.js
git add js/hrms.js
git add js/admin.js
git add js/whatsapp.js

git commit -m "fix: null-safe textContent on all pages, prevent crashes when elements missing"
git push origin main

Write-Host "Done!" -ForegroundColor Green
