// Website Bridge v2 — Recruweb website  <->  HRMS Website Forms
//   /api/website-bridge/public/*  called ONLY by the Recruweb backend (x-bridge-key)
//   /api/website-bridge/health    key-protected diagnostics
// Staff (HR / Super Admin) use the normal /api/web-forms inbox routes.
import express from "express";
import crypto from "crypto";
import { q, ensureSchema, listHrUsers, getHrById, getUserMap, roleStats } from "./adapter.js";

const router = express.Router();
router.use(express.json({ limit: "200kb" }));

const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const ok = (res, data, code = 200) => res.status(code).json({ success: true, data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error("[website-bridge]", e);
    fail(res, 500, "Website bridge error: " + e.message);
  });

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const keyOk = (given) => {
  const want = process.env.WB_BRIDGE_KEY;
  return Boolean(want && given && crypto.timingSafeEqual(sha(want), sha(given)));
};
const requireKey = (req, res, next) => {
  if (!process.env.WB_BRIDGE_KEY) return fail(res, 503, "WB_BRIDGE_KEY is not set on the HRMS server.");
  if (!keyOk(req.headers["x-bridge-key"])) return fail(res, 401, "Invalid bridge key.");
  next();
};

const KIND_LABEL = { lead: "Inquiry", client_inquiry: "Get Started", getstarted: "Get Started", popup: "Inquiry Popup" };

// ---- HR list (live from employees) -----------------------------------------
router.get(
  "/public/hrs",
  requireKey,
  wrap(async (_req, res) => {
    const hrs = await listHrUsers();
    ok(res, hrs.map((h) => ({ id: h.id, name: h.name, designation: h.designation })));
  })
);

// ---- Inquiry form -> Website Forms (form_type = enquiry), idempotent -------
router.post(
  "/public/inquiries",
  requireKey,
  wrap(async (req, res) => {
    await ensureSchema();
    const b = req.body || {};
    const kind = clean(b.kind, 30) || "lead";
    const ext = `${kind}:${clean(b.externalId, 60)}`;
    const name = clean(b.name, 150);
    if (!clean(b.externalId, 60) || !name) return fail(res, 400, "externalId and name are required.");
    const dup = await q(`SELECT id FROM web_form_submissions WHERE ext_ref = ? LIMIT 1`, [ext]);
    if (dup.length) return ok(res, { saved: true, duplicate: true });

    const lines = [
      b.company && `Company: ${clean(b.company, 190)}`,
      b.designation && `Designation: ${clean(b.designation, 160)}`,
      b.industry && `Industry: ${clean(b.industry, 160)}`,
      b.positionsNeeded && `Positions needed: ${clean(b.positionsNeeded, 60)}`,
      b.budget && `Budget: ${clean(b.budget, 80)}`,
    ].filter(Boolean);
    const requirement = clean(b.requirement, 4000);
    const message = [lines.join("\n"), requirement && `Requirement:\n${requirement}`].filter(Boolean).join("\n\n");
    const subject = `${KIND_LABEL[kind] || "Inquiry"}${b.company ? " - " + clean(b.company, 120) : ""}`;
    const email = clean(b.email, 150);
    const phone = clean(b.phone, 30);
    if (!email && !phone) return fail(res, 400, "email or phone required.");

    await q(
      `INSERT INTO web_form_submissions (form_type, name, email, phone, subject, message, payload, source, ext_ref)
       VALUES ('enquiry', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email || null,
        phone || null,
        subject.slice(0, 200),
        message.slice(0, 5000) || null,
        JSON.stringify({ kind, company: b.company || null, industry: b.industry || null, budget: b.budget || null }),
        `recruweb.com/${clean(b.source, 40) || kind}`.slice(0, 150),
        ext,
      ]
    );
    ok(res, { saved: true }, 201);
  })
);

// ---- Contact form -> assigned to ONE HR + live chat token ------------------
router.post(
  "/public/contacts",
  requireKey,
  wrap(async (req, res) => {
    await ensureSchema();
    const b = req.body || {};
    const name = clean(b.name, 150);
    const email = clean(b.email, 150);
    const message = clean(b.message, 2000);
    const hrId = clean(b.hrId, 40);
    if (!name || !email || !message || !hrId) return fail(res, 400, "name, email, message and hrId are required.");
    const hr = await getHrById(hrId);
    if (!hr) return fail(res, 400, "Selected HR is not available.");

    const token = crypto.randomBytes(24).toString("hex");
    await q(
      `INSERT INTO web_form_submissions
         (form_type, name, email, phone, subject, message, payload, source, assigned_hr_id, assigned_hr_name, chat_token)
       VALUES ('contact', ?, ?, ?, ?, ?, NULL, 'recruweb.com/contact', ?, ?, ?)`,
      [name, email, clean(b.phone, 30) || null, clean(b.subject, 200) || null, message, hr.id, hr.name.slice(0, 150), token]
    );
    ok(res, { token, hr: { id: hr.id, name: hr.name } }, 201);
  })
);

// ---- Visitor chat (token = secret in the visitor's browser) ----------------
// Message ids: original message = 1, reply N = N + 1 (so "after" paging works).
const byToken = async (token) => {
  const [s] = await q(`SELECT * FROM web_form_submissions WHERE chat_token = ? LIMIT 1`, [token]);
  return s || null;
};

router.get(
  "/public/chat/:token",
  requireKey,
  wrap(async (req, res) => {
    await ensureSchema();
    const s = await byToken(req.params.token);
    if (!s) return fail(res, 404, "Chat not found.");
    const after = Math.max(0, parseInt(req.query.after, 10) || 0);
    const replies = await q(
      `SELECT id, message, sent_by_name, sent_by_role, created_at FROM web_form_replies
        WHERE submission_id = ? AND id + 1 > ? ORDER BY created_at ASC, id ASC LIMIT 200`,
      [s.id, after]
    );
    const msgs = [];
    if (after < 1) msgs.push({ id: 1, from: "me", name: "You", text: s.message || "", at: s.created_at });
    for (const r of replies) {
      const mine = String(r.sent_by_role || "").toUpperCase() === "VISITOR";
      msgs.push({ id: r.id + 1, from: mine ? "me" : "staff", name: mine ? "You" : r.sent_by_name, text: r.message, at: r.created_at });
    }
    ok(res, { hr: { name: s.assigned_hr_name }, status: s.status === "Archived" ? "closed" : "open", messages: msgs });
  })
);

router.post(
  "/public/chat/:token",
  requireKey,
  wrap(async (req, res) => {
    await ensureSchema();
    const s = await byToken(req.params.token);
    if (!s) return fail(res, 404, "Chat not found.");
    if (s.status === "Archived") return fail(res, 409, "This chat has been closed by the HR team.");
    const text = clean(req.body?.text, 2000);
    if (!text) return fail(res, 400, "Message is empty.");
    await q(
      `INSERT INTO web_form_replies (submission_id, message, sent_by_id, sent_by_name, sent_by_role, to_email, email_status, email_error)
       VALUES (?, ?, '', ?, 'VISITOR', ?, 'sent', NULL)`,
      [s.id, text, s.name, s.assigned_hr_name || ""]
    );
    // Visitor wrote again -> shows as New (unread) for the HR / Super Admin
    await q(`UPDATE web_form_submissions SET status = 'New' WHERE id = ? AND status <> 'Archived'`, [s.id]);
    ok(res, { sent: true }, 201);
  })
);

// ---- Health ------------------------------------------------------------------
router.get(
  "/health",
  wrap(async (req, res) => {
    if (!keyOk(req.query.key)) return fail(res, 401, "Pass ?key=<WB_BRIDGE_KEY>");
    const out = { keySet: true, db: false, columns: false, usersTable: null, hrCount: 0, hrList: [], roleStats: null };
    try {
      await q("SELECT 1");
      out.db = true;
      await ensureSchema();
      out.columns = true;
      out.usersTable = await getUserMap();
      const hrs = await listHrUsers();
      out.hrCount = hrs.length;
      out.hrList = hrs.map((h) => ({ id: h.id, name: h.name, role: h.role }));
      out.roleStats = await roleStats();
    } catch (e) {
      out.error = e.message;
    }
    res.json({ success: true, data: out });
  })
);

ensureSchema().catch((e) => console.error("[website-bridge] schema init failed:", e.message));

export default router;
