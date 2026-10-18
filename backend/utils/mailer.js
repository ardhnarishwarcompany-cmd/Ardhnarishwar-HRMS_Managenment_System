/**
 * Shared email sender for OTP and notifications.
 * Uses EMAIL_HOST/EMAIL_USER/EMAIL_PASS (same as superadmin email module),
 * falling back to SMTP_HOST/SMTP_USER/SMTP_PASS (documents module).
 * Dev mode: when neither is configured, logs and reports delivered:false.
 */
import nodemailer from "nodemailer";

const cfg = () => {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
  if (!user || !pass) return null;
  return {
    host: host || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  };
};

export const sendEmail = async (to, subject, html, opts = {}) => {
  const c = cfg();
  if (!c) {
    console.log(`[MAIL dev-mode] To ${to} | ${subject}`);
    return { delivered: false, dev: true };
  }
  try {
    const transporter = nodemailer.createTransport(c);
    await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || "HRMS"}" <${c.auth.user}>`,
      to,
      subject,
      html,
      ...(opts.text ? { text: opts.text } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    return { delivered: true };
  } catch (e) {
    console.error("[MAIL] send failed:", e.message);
    return { delivered: false, error: e.message };
  }
};

export const otpEmailHtml = (otp, minutes) => `
  <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="margin:0 0 8px;color:#111">Your login code</h2>
    <p style="color:#555;margin:0 0 16px">Use this one-time password to sign in. It expires in ${minutes} minutes.</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f6f7f9;border-radius:8px;color:#111">${otp}</div>
    <p style="color:#999;font-size:12px;margin:16px 0 0">If you did not request this, ignore this email.</p>
  </div>`;
