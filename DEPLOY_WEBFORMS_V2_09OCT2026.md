# Website Forms v2 – live data, Edit/Delete/Archive/Reply, Solved/Hold

## Kya badla
- Convert-to-candidate hata diya. Ab buttons: Reply, Edit, Archive/Unarchive, Delete.
- Reply popup ke andar Hold / Solved buttons (status badge ke saath).
- Filters: All, New, Read, Hold, Solved, Archived.
- Local backend ab live backend se real Recruweb submissions fetch karta hai (fake/local data nahi).

## Files
backend/modules/webForms/webForms.access.js   (NEW – service key auth + live forward)
backend/modules/webForms/webForms.routes.js
backend/modules/webForms/webForms.controller.js (edit, delete, Hold/Solved, convert removed)
backend/config/initDb.js                       (tables + status enum -> varchar auto-migrate)
backend/migrations/2026-10-09_web_form_replies.sql
backend/.env.production.example
HR/src/pages/webforms/WebFormsInbox.jsx, HR/src/components/webforms/{ReplyChatModal,EditSubmissionModal}.jsx
admin/src/pages/webForms/WebFormsInbox.jsx, admin/src/components/webforms/{ReplyChatModal,EditSubmissionModal}.jsx

## 1) LIVE VPS (pehle ye)
Random key banao:   openssl rand -hex 32
backend/.env (live) me add:   WEBFORMS_SERVICE_KEY=<wo key>
Zip extract karo, phir:
  cd /var/www/ardhnarishwar-hrms/backend && pm2 restart ardhnarishwar-hrms-backend
  cd ../HR && npm run build ; cd ../admin && npm run build
(initDb khud status column update kar deta hai. Optional: migrations/*.sql se purane dummy rows delete.)

## 2) LOCAL PC
backend/.env me add (restart backend):
  WEBFORMS_UPSTREAM_URL=https://ardhnarishwar-hrms-backend.recruweb.com/api
  WEBFORMS_UPSTREAM_KEY=<live wali same key>
Local HR panel (localhost:5173/web-forms) ab live ka data dikhayega; Reply/Edit/Delete/Solved/Hold sab live DB par lagte hain
aur reply email live server ke SMTP se visitor ke email par jata hai.

## 3) Recruweb website (jaruri)
Contact form ko recruweb-contact-submit.js se live backend par POST hona chahiye
(HRMS_API = https://ardhnarishwar-hrms-backend.recruweb.com/api). Live .env me CORS_ORIGINS me
https://www.recruweb.com aur https://recruweb.com hone chahiye. Live .env me SMTP_USER/SMTP_PASS (Gmail app password) bhi.
