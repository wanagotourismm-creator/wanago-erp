# WANAGO ERP - Add wipeAllData + disable IndexedDB
Write-Host "Deploying..." -ForegroundColor Cyan
git add js/utils.js
git add js/firestore.js
git commit -m "fix: add wipeAllData(), disable IndexedDB persistence"
git push origin main
Write-Host "Done!" -ForegroundColor Green
