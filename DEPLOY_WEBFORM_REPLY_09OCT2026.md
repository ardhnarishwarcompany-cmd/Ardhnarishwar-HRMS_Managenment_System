# Website Form Inbox + Reply (09 Oct 2026)

## Changed files
backend/utils/mailer.js                              (replyTo/text support)
backend/config/initDb.js                             (web_form_replies table auto-create)
backend/modules/webForms/webForms.controller.js      (reply endpoints, reply_count)
backend/modules/webForms/webForms.routes.js          (GET replies, POST reply)
backend/migrations/2026-10-09_web_form_replies.sql   (table + dummy data delete)
HR/src/components/webforms/ReplyChatModal.jsx        (NEW chat popup)
HR/src/pages/webforms/WebFormsInbox.jsx
admin/src/components/webforms/ReplyChatModal.jsx     (NEW chat popup)
admin/src/pages/webForms/WebFormsInbox.jsx

## Deploy on VPS (extract zip over /, paths are already var/www/...)
cd /var/www/ardhnarishwar-hrms/backend && pm2 restart ardhnarishwar-hrms-backend   # creates table
mysql -u<user> -p <db> < migrations/2026-10-09_web_form_replies.sql                  # removes dummy rows
cd ../HR && npm run build
cd ../admin && npm run build
# (nginx already serves the dist folders)

## Needed in backend/.env (already present for OTP mails)
EMAIL_HOST/EMAIL_USER/EMAIL_PASS (Gmail App Password) ; COMPANY_NAME=Recruweb ; COMPANY_EMAIL=<reply-to address>
# CORS_ORIGINS must include https://www.recruweb.com and https://recruweb.com

## Recruweb site
Use recruweb-contact-submit.js in the Contact page form.
