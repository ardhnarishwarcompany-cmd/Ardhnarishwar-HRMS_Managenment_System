import crypto from "crypto";
import { db } from "../../config/db.js";
import { sendEmail } from "../../utils/mailer.js";
import { resolveActor } from "./webForms.access.js";
import { ensureSchema } from "../website-bridge/adapter.js";

const ALLOWED_TYPES = [
  "contact",
  "job_application",
  "enquiry",
  "demo_request",
  "vendor_registration",
  "employee_new_joining",
];

const STATUSES = ["New", "Read", "Hold", "Solved", "Archived"];
const MESSAGE_MAX = 5000;
const PAYLOAD_MAX = 20000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Coerce any JSON value to a trimmed, length-capped string ("" when absent) */
const str = (v, max) => (v == null ? "" : String(v)).trim().slice(0, max);

/* ---------- WEBSITE BRIDGE: who may see what ----------
 * Super Admin / Manager / TL / service key  -> everything.
 * HR                                        -> every non-contact form + ONLY the
 *                                              contact chats visitors assigned to them. */
const ADMIN_ACTOR = /^(SUPER_?ADMIN|ADMIN|MANAGER|TL|SERVICE)$/i;
const isAdminActor = (req) => ADMIN_ACTOR.test(String(req.user?.role || ""));
const hrIdOf = (req) => {
  const u = req.user || {};
  const v = u.employee_id ?? u.id ?? u.userId ?? null;
  return v == null || v === "" ? "" : String(v);
};
const scopeSql = (req) =>
  isAdminActor(req)
    ? { sql: "", params: [] }
    : { sql: "(s.form_type <> 'contact' OR (s.assigned_hr_id IS NOT NULL AND s.assigned_hr_id = ?))", params: [hrIdOf(req) || "-none-"] };
const canSee = (req, sub) =>
  isAdminActor(req) || sub.form_type !== "contact" || (hrIdOf(req) !== "" && String(sub.assigned_hr_id || "") === hrIdOf(req));

/* Load a submission and enforce visibility. Sends the error itself and returns null on failure. */
const loadVisible = async (req, res) => {
  await ensureSchema();
  const [[sub]] = await db.query("SELECT * FROM web_form_submissions WHERE id = ?", [req.params.id]);
  if (!sub) {
    res.status(404).json({ success: false, message: "Not found" });
    return null;
  }
  if (!canSee(req, sub)) {
    res.status(403).json({ success: false, message: "This conversation belongs to another HR." });
    return null;
  }
  return sub;
};

/* never send the visitor's secret chat token to the portals */
const publicSub = (s) => {
  if (!s) return s;
  const { chat_token, ...rest } = s;
  return { ...rest, is_chat: !!chat_token };
};

/* Validate + normalise the fields shared by submit and edit. Returns { error } or { fields } */
const normaliseFields = (body) => {
  const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const fields = {
    name: str(b.name, 150),
    email: str(b.email, 150),
    phone: str(b.phone, 30),
    subject: str(b.subject, 200),
    message: str(b.message, MESSAGE_MAX),
    form_type: ALLOWED_TYPES.includes(str(b.form_type, 40)) ? str(b.form_type, 40) : "contact",
  };
  if (!fields.name) return { error: "name is required" };
  if (!fields.email && !fields.phone) return { error: "email or phone required" };
  if (fields.email && !EMAIL_RE.test(fields.email)) return { error: "a valid email address is required" };
  return { fields };
};

/* ---------- PUBLIC: website form submission (X-API-Key protected) ---------- */
export const submitForm = async (req, res) => {
  try {
    const apiKey = str(req.headers["x-api-key"], 200);
    if (!apiKey)
      return res.status(401).json({ success: false, message: "Missing X-API-Key header" });
    const [[key]] = await db.query(
      "SELECT id FROM web_form_keys WHERE api_key = ? AND is_active = 1",
      [apiKey],
    );
    if (!key)
      return res.status(401).json({ success: false, message: "Invalid API key" });

    const { error, fields } = normaliseFields(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const { form_type: _t, name: _n, email: _e, phone: _p, subject: _s, message: _m, ...rest } =
      req.body && typeof req.body === "object" ? req.body : {};
    const payload = Object.keys(rest).length ? JSON.stringify(rest) : null;
    if (payload && payload.length > PAYLOAD_MAX)
      return res.status(413).json({ success: false, message: "Extra form data is too large" });

    const source = req.headers.origin || req.headers.referer || "api";

    const [r] = await db.query(
      `INSERT INTO web_form_submissions
       (form_type, name, email, phone, subject, message, payload, source)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        fields.form_type,
        fields.name,
        fields.email || null,
        fields.phone || null,
        fields.subject || null,
        fields.message || null,
        payload,
        String(source).slice(0, 150),
      ],
    );
    res.json({ success: true, id: r.insertId, message: "Submission received" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------- ADMIN / HR: inbox ---------- */
export const listSubmissions = async (req, res) => {
  try {
    await ensureSchema();
    const status = str(req.query.status, 20);
    const form_type = str(req.query.form_type, 40);
    const group = str(req.query.group, 10); // all | inquiry | contact | other
    const sc = scopeSql(req);
    const where = [];
    const params = [];
    if (sc.sql) {
      where.push(sc.sql);
      params.push(...sc.params);
    }
    if (status && STATUSES.includes(status)) {
      where.push("s.status = ?");
      params.push(status);
    }
    if (form_type && ALLOWED_TYPES.includes(form_type)) {
      where.push("s.form_type = ?");
      params.push(form_type);
    }
    if (group === "inquiry") where.push("s.form_type = 'enquiry'");
    else if (group === "contact") where.push("s.form_type = 'contact'");
    else if (group === "other") where.push("s.form_type NOT IN ('enquiry','contact')");

    const [rows] = await db.query(
      `SELECT s.*,
         (SELECT COUNT(*) FROM web_form_replies r WHERE r.submission_id = s.id) AS reply_count,
         (SELECT MAX(r.created_at) FROM web_form_replies r WHERE r.submission_id = s.id) AS last_reply_at
       FROM web_form_submissions s
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY COALESCE(
         (SELECT MAX(r2.created_at) FROM web_form_replies r2 WHERE r2.submission_id = s.id), s.created_at
       ) DESC LIMIT 500`,
      params,
    );
    const [[counts]] = await db.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(s.status='New'),0)      AS unread,
              COALESCE(SUM(s.status='Read'),0)     AS read_count,
              COALESCE(SUM(s.status='Hold'),0)     AS hold,
              COALESCE(SUM(s.status='Solved'),0)   AS solved,
              COALESCE(SUM(s.status='Archived'),0) AS archived,
              COALESCE(SUM(s.form_type='enquiry'),0) AS g_inquiry,
              COALESCE(SUM(s.form_type='contact'),0) AS g_contact,
              COALESCE(SUM(s.form_type NOT IN ('enquiry','contact')),0) AS g_other,
              COALESCE(SUM(s.form_type='enquiry' AND s.status='New'),0) AS new_inquiry,
              COALESCE(SUM(s.form_type='contact' AND s.status='New'),0) AS new_contact
         FROM web_form_submissions s
         ${sc.sql ? "WHERE " + sc.sql : ""}`,
      sc.params,
    );
    res.json({ success: true, submissions: rows.map(publicSub), counts });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const status = str(req.body?.status, 20);
    if (!STATUSES.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const sub = await loadVisible(req, res);
    if (!sub) return;
    await db.query("UPDATE web_form_submissions SET status = ? WHERE id = ?", [status, sub.id]);
    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* Edit the submission details */
export const updateSubmission = async (req, res) => {
  try {
    const { error, fields } = normaliseFields(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const sub = await loadVisible(req, res);
    if (!sub) return;
    await db.query(
      `UPDATE web_form_submissions
         SET name = ?, email = ?, phone = ?, subject = ?, message = ?, form_type = ?
       WHERE id = ?`,
      [
        fields.name,
        fields.email || null,
        fields.phone || null,
        fields.subject || null,
        fields.message || null,
        sub.form_type === "contact" && sub.assigned_hr_id ? "contact" : fields.form_type, // keep chats assigned
        sub.id,
      ],
    );
    const [[submission]] = await db.query("SELECT * FROM web_form_submissions WHERE id = ?", [sub.id]);
    res.json({ success: true, submission: publicSub(submission), message: "Updated" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* Permanently delete a submission and its reply thread */
export const deleteSubmission = async (req, res) => {
  try {
    const sub = await loadVisible(req, res);
    if (!sub) return;
    await db.query("DELETE FROM web_form_replies WHERE submission_id = ?", [sub.id]);
    await db.query("DELETE FROM web_form_submissions WHERE id = ?", [sub.id]);
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------- ADMIN: API keys ---------- */
export const listKeys = async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, api_key, label, is_active, created_at FROM web_form_keys ORDER BY id",
    );
    res.json({ success: true, keys: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const createKey = async (req, res) => {
  try {
    const { label } = req.body;
    if (!label?.trim())
      return res.status(400).json({ success: false, message: "label required" });
    const apiKey = crypto.randomBytes(32).toString("hex");
    await db.query("INSERT INTO web_form_keys (api_key, label) VALUES (?,?)", [
      apiKey,
      label.trim(),
    ]);
    res.json({ success: true, api_key: apiKey });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const revokeKey = async (req, res) => {
  try {
    await db.query("UPDATE web_form_keys SET is_active = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------- ADMIN / HR: reply thread (chat) + email to the visitor ---------- */
const esc = (v = "") =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const getReplies = async (req, res) => {
  try {
    const sub = await loadVisible(req, res);
    if (!sub) return;
    const [replies] = await db.query(
      "SELECT * FROM web_form_replies WHERE submission_id = ? ORDER BY created_at ASC, id ASC",
      [sub.id],
    );
    // Opening the chat marks it Read. A visitor's new message sets it back to New.
    if (sub.status === "New") {
      await db.query("UPDATE web_form_submissions SET status = 'Read' WHERE id = ?", [sub.id]);
      sub.status = "Read";
    }
    res.json({ success: true, submission: publicSub(sub), replies });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const sendReply = async (req, res) => {
  try {
    const text = String(req.body.message || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "Reply message is required" });
    if (text.length > 5000)
      return res.status(400).json({ success: false, message: "Reply is too long (max 5000 chars)" });

    const sub = await loadVisible(req, res);
    if (!sub) return;
    const isChat = !!sub.chat_token;
    if (!sub.email && !isChat)
      return res.status(400).json({
        success: false,
        message: "This visitor did not give an email address, so the reply cannot be emailed",
      });

    const actor = await resolveActor(req);
    const senderName = actor.name;
    const company = process.env.COMPANY_NAME || "Recruweb";

    let result = { delivered: false, error: "No email on file" };
    if (sub.email) {
      const subject = `Re: ${sub.subject || "Your inquiry"} - ${company}`;
      const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;color:#222">
        <p style="margin:0 0 12px">Hi ${esc(sub.name)},</p>
        <div style="white-space:pre-wrap;line-height:1.6">${esc(text)}</div>
        <p style="margin:20px 0 0">Regards,<br/><b>${esc(senderName)}</b><br/>${esc(company)}</p>
        ${
          sub.message
            ? `<hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
               <p style="color:#888;font-size:12px;margin:0 0 4px">Your original message:</p>
               <div style="color:#888;font-size:12px;white-space:pre-wrap">${esc(sub.message)}</div>`
            : ""
        }
      </div>`;
      result = await sendEmail(sub.email, subject, html, {
        text: `Hi ${sub.name},\n\n${text}\n\nRegards,\n${senderName}\n${company}`,
        replyTo: process.env.COMPANY_EMAIL || undefined,
      });
    }
    const emailStatus = result.delivered ? "sent" : "failed";

    const [r] = await db.query(
      `INSERT INTO web_form_replies
       (submission_id, message, sent_by_id, sent_by_name, sent_by_role, to_email, email_status, email_error)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        sub.id,
        text,
        actor.id == null ? "" : String(actor.id).slice(0, 50),
        String(senderName).slice(0, 150),
        String(actor.role || "").slice(0, 30),
        sub.email || "",
        emailStatus,
        result.delivered ? null : String(result.error || (result.dev ? "SMTP not configured" : "unknown")).slice(0, 500),
      ],
    );
    if (sub.status === "New")
      await db.query("UPDATE web_form_submissions SET status = 'Read' WHERE id = ?", [sub.id]);

    const [[reply]] = await db.query("SELECT * FROM web_form_replies WHERE id = ?", [r.insertId]);
    res.json({
      success: true,
      emailed: result.delivered,
      live_chat: isChat,
      reply,
      message: isChat
        ? "Sent to the visitor's live chat"
        : result.delivered
          ? "Reply sent to " + sub.email
          : "Reply saved, but the email could not be sent: " + (result.error || "SMTP not configured"),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
