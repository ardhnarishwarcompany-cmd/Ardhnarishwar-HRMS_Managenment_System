# Email OTP Attendance Workflow

## Production flow

1. **Super Admin** creates/activates the company workspace and grants the company access.
2. **Company Admin** opens **Organization OTP Portal Authority**.
3. Company registers one or more **authorized HR / Manager / Attendance Authority** email addresses (up to 4).
4. An employee opens OTP Attendance and requests **Clock-IN** or **Clock-OUT**.
5. The backend validates the company, employee, attendance policy, and OTP method.
6. A secure 6-digit OTP is generated for 5 minutes with a maximum of 3 verification attempts.
7. The OTP is sent through **Gmail SMTP** to the registered authorized HR / Manager email(s). It is not sent to the employee phone number and is not exposed through an in-app OTP endpoint.
8. The authorized person shares/enters the OTP through the attendance workflow.
9. The backend verifies the OTP, consumes it, prevents duplicate IN/OUT punches, evaluates Present/Late/Half Day policy, and writes the attendance record to the tenant database.
10. Audit logging records OTP dispatch success/failure and the attendance event without storing the plaintext OTP.

## SMTP configuration

Set these environment variables in `.env` or your deployment secret store:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
GMAIL_USER=your-gmail-account@gmail.com
GMAIL_PASS=your-gmail-app-password
FROM_EMAIL=info@yourdomain.com
FROM_NAME=Your Company
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

`GMAIL_PASS` should be a Google **App Password** for the Gmail account used for SMTP authentication when the account supports App Passwords. Do not use a normal Gmail account password.

If `FROM_EMAIL` is not an authorized sender alias for the authenticated Gmail account, the backend automatically retries using `GMAIL_USER` as the sender so OTP delivery is not blocked by a Gmail sender-alias restriction.

## Security behavior

- OTP is hashed in memory and never returned by an API.
- OTP expires after 5 minutes.
- Maximum 3 verification attempts.
- 30-second resend throttle per employee/company OTP key.
- OTP is deleted from memory after successful verification or expiry.
- No plaintext OTP is stored in the notification vault.
- Recipient emails are masked in API responses and audit logs.

## Responsive UI

The OTP page and Organization Portal include mobile/tablet breakpoints, responsive cards, flexible approver grids, and horizontally scrollable attendance tables on small screens.
