import { db } from "../../config/db.js";
import { PLAN_CATALOG, UNIVERSAL_TERMS } from "./planCatalog.js";

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */
const ensureTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proposal_number VARCHAR(30) NOT NULL UNIQUE,
      client_id INT NULL,
      client_code VARCHAR(50) NULL,
      client_name VARCHAR(150) NOT NULL,
      client_email VARCHAR(150) NULL,
      client_phone VARCHAR(30) NULL,
      client_company VARCHAR(200) NULL,
      title VARCHAR(200) NOT NULL,
      intro TEXT NULL,
      items JSON NOT NULL,
      subtotal DECIMAL(12,2) DEFAULT 0,
      discount_pct DECIMAL(5,2) DEFAULT 0,
      discount_amount DECIMAL(12,2) DEFAULT 0,
      tax_pct DECIMAL(5,2) DEFAULT 0,
      tax_amount DECIMAL(12,2) DEFAULT 0,
      total DECIMAL(12,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      valid_until DATE NULL,
      terms TEXT NULL,
      notes TEXT NULL,
      token_amount DECIMAL(12,2) DEFAULT 0,
      agreement_months INT NULL,
      replacement_months INT NULL,
      status ENUM('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED') DEFAULT 'DRAFT',
      response_note VARCHAR(500) NULL,
      created_by VARCHAR(120) NULL,
      sent_at DATETIME NULL,
      responded_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_proposals_client (client_code),
      INDEX idx_proposals_status (status)
    )
  `);

  /* MIGRATION: if the table pre-exists with an older schema, add every
     missing column so queries never fail with "Unknown column". */
  const REQUIRED_COLUMNS = [
    ["client_id", "INT NULL"],
    ["client_code", "VARCHAR(50) NULL"],
    ["client_email", "VARCHAR(150) NULL"],
    ["client_phone", "VARCHAR(30) NULL"],
    ["client_company", "VARCHAR(200) NULL"],
    ["intro", "TEXT NULL"],
    ["subtotal", "DECIMAL(12,2) DEFAULT 0"],
    ["discount_pct", "DECIMAL(5,2) DEFAULT 0"],
    ["discount_amount", "DECIMAL(12,2) DEFAULT 0"],
    ["tax_pct", "DECIMAL(5,2) DEFAULT 0"],
    ["tax_amount", "DECIMAL(12,2) DEFAULT 0"],
    ["total", "DECIMAL(12,2) DEFAULT 0"],
    ["currency", "VARCHAR(10) DEFAULT 'INR'"],
    ["valid_until", "DATE NULL"],
    ["terms", "TEXT NULL"],
    ["notes", "TEXT NULL"],
    ["response_note", "VARCHAR(500) NULL"],
    ["created_by", "VARCHAR(120) NULL"],
    ["sent_at", "DATETIME NULL"],
    ["responded_at", "DATETIME NULL"],
    ["token_amount", "DECIMAL(12,2) DEFAULT 0"],
    ["agreement_months", "INT NULL"],
    ["replacement_months", "INT NULL"],
    /* Sales-portal workflow (draft -> admin approval -> client) */
    ["sales_employee_id", "INT NULL"],
    ["created_by_role", "ENUM('admin','sales') NOT NULL DEFAULT 'admin'"],
    ["submitted_at", "DATETIME NULL"],
    ["approval_note", "TEXT NULL"],
    ["approved_by", "VARCHAR(120) NULL"],
    ["approved_at", "DATETIME NULL"],
  ];

  const [cols] = await db.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proposals'`,
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));

  for (const [name, def] of REQUIRED_COLUMNS) {
    if (!existing.has(name)) {
      await db.query(`ALTER TABLE proposals ADD COLUMN ${name} ${def}`);
      console.log(`[proposals] migrated: added column ${name}`);
    }
  }

  /* MIGRATION 2: legacy columns from an older schema that are NOT NULL
     with no default (and not filled by our INSERT) make every save fail
     with "Field 'X' doesn't have a default value". Relax them to NULL. */
  const INSERTED_COLUMNS = new Set([
    "id",
    "proposal_number",
    "client_id",
    "client_code",
    "client_name",
    "client_email",
    "client_phone",
    "client_company",
    "title",
    "intro",
    "items",
    "subtotal",
    "discount_pct",
    "discount_amount",
    "tax_pct",
    "tax_amount",
    "total",
    "currency",
    "valid_until",
    "terms",
    "notes",
    "status",
    "response_note",
    "created_by",
    "sent_at",
    "responded_at",
    "created_at",
    "updated_at",
    "token_amount",
    "agreement_months",
    "replacement_months",
    "sales_employee_id",
    "created_by_role",
    "submitted_at",
    "approval_note",
    "approved_by",
    "approved_at",
  ]);

  for (const c of cols) {
    const isLegacy = !INSERTED_COLUMNS.has(c.COLUMN_NAME);
    const isStrict =
      c.IS_NULLABLE === "NO" &&
      c.COLUMN_DEFAULT === null &&
      !String(c.EXTRA || "").includes("auto_increment") &&
      !/timestamp/i.test(c.COLUMN_TYPE);
    if (isLegacy && isStrict) {
      await db.query(
        `ALTER TABLE proposals MODIFY COLUMN ${c.COLUMN_NAME} ${c.COLUMN_TYPE} NULL`,
      );
      console.log(
        `[proposals] migrated: relaxed legacy column ${c.COLUMN_NAME} to NULL`,
      );
    }
  }

  /* Copy values from legacy column names if they exist (old schema). */
  const LEGACY_COPIES = [
    ["discount_percent", "discount_pct"],
    ["tax_percent", "tax_pct"],
  ];
  for (const [oldCol, newCol] of LEGACY_COPIES) {
    if (existing.has(oldCol)) {
      await db.query(
        `UPDATE proposals SET ${newCol} = ${oldCol} WHERE ${newCol} = 0 AND ${oldCol} <> 0`,
      );
    }
  }

  /* MIGRATION 3: widen the status enum for the sales approval workflow. */
  const statusCol = cols.find((c) => c.COLUMN_NAME === "status");
  if (statusCol && !/PENDING_APPROVAL/.test(statusCol.COLUMN_TYPE)) {
    await db.query(
      `ALTER TABLE proposals MODIFY COLUMN status
         ENUM('DRAFT','PENDING_APPROVAL','REVISION','SENT','ACCEPTED','REJECTED','EXPIRED')
         NOT NULL DEFAULT 'DRAFT'`,
    );
    console.log("[proposals] migrated: status enum widened for sales workflow");
  }

  /* MIGRATION 4: the Sales portal records the owning rep on clients.employee_id
     (Sales "Add Client" inserts it). Older databases lack the column, which
     breaks both Add Client and the rep's proposal client picker. */
  const [[clientOwnerCol]] = await db.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'employee_id'`,
  );
  if (Number(clientOwnerCol?.n) === 0) {
    await db.query(
      "ALTER TABLE clients ADD COLUMN employee_id INT NULL, ADD INDEX idx_clients_employee (employee_id)",
    );
    console.log("[proposals] migrated: added clients.employee_id (owning sales rep)");
  }
};
ensureTable().catch((e) => console.error("proposals schema error:", e.message));

export const PROPOSAL_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "REVISION",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

/* Statuses a client is allowed to see. Explicit whitelist — never
   `status <> 'DRAFT'` — so unapproved sales drafts can never leak. */
export const CLIENT_VISIBLE_STATUSES = ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
export const CLIENT_VISIBLE_SQL = `status IN (${CLIENT_VISIBLE_STATUSES.map(() => "?").join(",")})`;

/* Columns returned to list/detail views, plus the owning rep's name. */
export const PROPOSAL_SELECT = `
  SELECT p.*, e.name AS sales_employee_name, e.employeeCode AS sales_employee_code
  FROM proposals p
  LEFT JOIN employees e ON e.id = p.sales_employee_id`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/* Mark SENT proposals past their validity date as EXPIRED. */
export const expireStale = async () => {
  await db.query(
    `UPDATE proposals SET status = 'EXPIRED'
     WHERE status = 'SENT' AND valid_until IS NOT NULL AND valid_until < CURDATE()`,
  );
};

/* Totals are ALWAYS computed server-side — never trust client math. */
const computeTotals = (items, discountPct, taxPct) => {
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.qty) * Number(it.rate),
    0,
  );
  const dPct = Math.min(Math.max(Number(discountPct) || 0, 0), 100);
  const tPct = Math.min(Math.max(Number(taxPct) || 0, 0), 100);
  const discountAmount = (subtotal * dPct) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * tPct) / 100;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount_pct: dPct,
    discount_amount: Number(discountAmount.toFixed(2)),
    tax_pct: tPct,
    tax_amount: Number(taxAmount.toFixed(2)),
    total: Number((taxable + taxAmount).toFixed(2)),
  };
};

/* Items carry a service name (required) + optional description. */
const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0)
    return "At least one line item is required";
  for (const it of items) {
    if (!it.service || String(it.service).trim() === "")
      return "Every line item needs a service name";
    const qty = Number(it.qty);
    const rate = Number(it.rate);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100000)
      return "Line item quantity must be a positive number";
    if (!Number.isFinite(rate) || rate < 0 || rate > 1000000000)
      return "Line item rate must be a valid non-negative number";
    if (it.mrp !== undefined && it.mrp !== null && it.mrp !== "") {
      const mrp = Number(it.mrp);
      if (!Number.isFinite(mrp) || mrp < 0 || mrp > 1000000000)
        return "Line item MRP must be a valid non-negative number";
    }
  }
  return null;
};

const sanitizeItems = (items) =>
  items.map((it) => ({
    service: String(it.service).trim().slice(0, 200),
    description: it.description ? String(it.description).trim().slice(0, 500) : "",
    qty: Number(it.qty),
    rate: Number(it.rate),
    /* MRP vs offer comparison (optional). 0 / empty means "no MRP shown". */
    mrp:
      it.mrp !== undefined && it.mrp !== null && it.mrp !== "" && Number(it.mrp) > 0
        ? Number(it.mrp)
        : null,
    unit: it.unit ? String(it.unit).trim().slice(0, 80) : "",
    plan_id: it.plan_id ? String(it.plan_id).trim().slice(0, 60) : null,
  }));

/* Resolve a registered client's code from its id so the client portal
   (which is scoped by client_code from the JWT) can see the proposal. */
const resolveClientCode = async (clientId) => {
  if (!clientId) return null;
  const [[row]] = await db.query(
    "SELECT client_code FROM clients WHERE id = ? LIMIT 1",
    [clientId],
  );
  return row?.client_code || null;
};

/* AUTO-LINK: if the admin typed the details manually but the email
   matches a registered client, link the proposal to that account so it
   appears in their portal. */
export const resolveClientByEmail = async (email) => {
  if (!email) return null;
  try {
    const [[row]] = await db.query(
      "SELECT id, client_code FROM clients WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [String(email).trim()],
    );
    return row || null;
  } catch {
    return null;
  }
};

export const nextProposalNumber = async () => {
  const year = new Date().getFullYear();
  const [[{ cnt }]] = await db.query(
    "SELECT COUNT(*) AS cnt FROM proposals WHERE proposal_number LIKE ?",
    [`PRP-${year}-%`],
  );
  const [[mx]] = await db.query(
    "SELECT MAX(CAST(SUBSTRING_INDEX(proposal_number, '-', -1) AS UNSIGNED)) AS mx FROM proposals WHERE proposal_number LIKE ?",
    [`PRP-${year}-%`],
  );
  const next = Math.max(Number(mx && mx.mx) || 0, Number(cnt) || 0) + 1;
  return `PRP-${year}-${String(next).padStart(4, "0")}`;
};

export const parseRow = (row) => ({
  ...row,
  items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
});

/* Shared extraction + validation for create/update. Returns
   { error } or { values } ready for SQL. */
export const buildProposalValues = async (body) => {
  const {
    client_id,
    client_name,
    client_email,
    client_phone,
    client_company,
    title,
    intro,
    items,
    discount_pct,
    tax_pct,
    currency,
    valid_until,
    terms,
    notes,
    token_amount,
    agreement_months,
    replacement_months,
  } = body;

  if (!client_name || !String(client_name).trim() || !title || !String(title).trim())
    return { error: "client_name and title are required" };

  const itemErr = validateItems(items);
  if (itemErr) return { error: itemErr };

  const cleanItems = sanitizeItems(items);
  const totals = computeTotals(cleanItems, discount_pct, tax_pct);
  let clientId = client_id ? Number(client_id) : null;
  let clientCode = await resolveClientCode(clientId);

  /* Manual entry but the email belongs to a registered client?
     Auto-link so the proposal shows up in their portal. */
  if (!clientId && client_email) {
    const match = await resolveClientByEmail(client_email);
    if (match) {
      clientId = match.id;
      clientCode = match.client_code || null;
    }
  }

  return {
    values: {
      client_id: clientId,
      client_code: clientCode,
      client_name: String(client_name).trim().slice(0, 150),
      client_email: client_email ? String(client_email).trim().slice(0, 150) : null,
      client_phone: client_phone ? String(client_phone).trim().slice(0, 30) : null,
      client_company: client_company
        ? String(client_company).trim().slice(0, 200)
        : null,
      title: String(title).trim().slice(0, 200),
      intro: intro ? String(intro).trim() : null,
      items: JSON.stringify(cleanItems),
      ...totals,
      currency: currency || "INR",
      valid_until: valid_until || null,
      terms: terms ? String(terms) : null,
      notes: notes ? String(notes) : null,
      token_amount:
        token_amount !== undefined && token_amount !== null && token_amount !== ""
          ? Math.max(0, Number(token_amount) || 0)
          : 0,
      agreement_months:
        agreement_months !== undefined && agreement_months !== null && agreement_months !== ""
          ? Math.max(0, parseInt(agreement_months, 10) || 0) || null
          : null,
      replacement_months:
        replacement_months !== undefined && replacement_months !== null && replacement_months !== ""
          ? Math.max(0, parseInt(replacement_months, 10) || 0) || null
          : null,
    },
  };
};

/* ------------------------------------------------------------------ */
/* Super Admin: CRUD + status                                          */
/* ------------------------------------------------------------------ */

/* Predefined plan catalog (Recruweb Official Payment Structure) */
export const getPlanCatalog = async (_req, res) => {
  res.json({
    success: true,
    data: { plans: PLAN_CATALOG, universal_terms: UNIVERSAL_TERMS },
  });
};

export const createProposal = async (req, res) => {
  try {
    const { error, values: v } = await buildProposalValues(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const proposal_number = await nextProposalNumber();

    const [r] = await db.query(
      `INSERT INTO proposals
        (proposal_number, client_id, client_code, client_name, client_email,
         client_phone, client_company, title, intro, items,
         subtotal, discount_pct, discount_amount, tax_pct, tax_amount, total,
         currency, valid_until, terms, notes,
         token_amount, agreement_months, replacement_months, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposal_number,
        v.client_id,
        v.client_code,
        v.client_name,
        v.client_email,
        v.client_phone,
        v.client_company,
        v.title,
        v.intro,
        v.items,
        v.subtotal,
        v.discount_pct,
        v.discount_amount,
        v.tax_pct,
        v.tax_amount,
        v.total,
        v.currency,
        v.valid_until,
        v.terms,
        v.notes,
        v.token_amount,
        v.agreement_months,
        v.replacement_months,
        req.user?.name || req.user?.email || "Super Admin",
      ],
    );

    res.json({
      success: true,
      data: { id: r.insertId, proposal_number },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const listProposals = async (req, res) => {
  try {
    await expireStale();
    const { status, q, source } = req.query;
    let sql = `${PROPOSAL_SELECT} WHERE 1=1`;
    const params = [];
    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }
    /* source=sales -> only rep-submitted proposals; source=admin -> only own */
    if (source === "sales" || source === "admin") {
      sql += " AND p.created_by_role = ?";
      params.push(source);
    }
    if (q) {
      sql +=
        " AND (p.proposal_number LIKE ? OR p.client_name LIKE ? OR p.client_company LIKE ? OR p.title LIKE ? OR e.name LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    /* proposals waiting on the admin float to the top */
    sql += " ORDER BY (p.status = 'PENDING_APPROVAL') DESC, p.created_at DESC";
    const [rows] = await db.query(sql, params);

    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'DRAFT') AS draft,
        SUM(status = 'PENDING_APPROVAL') AS pending_approval,
        SUM(status = 'REVISION') AS revision,
        SUM(status = 'SENT') AS sent,
        SUM(status = 'ACCEPTED') AS accepted,
        SUM(status = 'REJECTED') AS rejected,
        SUM(status = 'EXPIRED') AS expired,
        SUM(created_by_role = 'sales') AS from_sales,
        COALESCE(SUM(CASE WHEN status = 'ACCEPTED' THEN total ELSE 0 END), 0) AS accepted_value
      FROM proposals
    `);

    res.json({ success: true, data: rows.map(parseRow), stats });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getProposal = async (req, res) => {
  try {
    await expireStale();
    const [[row]] = await db.query(`${PROPOSAL_SELECT} WHERE p.id = ?`, [
      req.params.id,
    ]);
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });
    res.json({ success: true, data: parseRow(row) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* Super Admin may edit anything that has not yet gone to the client
   (own drafts, plus rep submissions awaiting review or returned). */
const ADMIN_EDITABLE = new Set(["DRAFT", "PENDING_APPROVAL", "REVISION"]);

export const updateProposal = async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT * FROM proposals WHERE id = ?", [
      req.params.id,
    ]);
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });
    if (!ADMIN_EDITABLE.has(row.status))
      return res.status(400).json({
        success: false,
        message: "Only proposals that have not been sent to the client can be edited",
      });

    const { error, values: v } = await buildProposalValues(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    await db.query(
      `UPDATE proposals SET
        client_id = ?, client_code = ?, client_name = ?, client_email = ?,
        client_phone = ?, client_company = ?, title = ?, intro = ?, items = ?,
        subtotal = ?, discount_pct = ?, discount_amount = ?, tax_pct = ?,
        tax_amount = ?, total = ?, currency = ?, valid_until = ?, terms = ?, notes = ?,
        token_amount = ?, agreement_months = ?, replacement_months = ?
       WHERE id = ?`,
      [
        v.client_id,
        v.client_code,
        v.client_name,
        v.client_email,
        v.client_phone,
        v.client_company,
        v.title,
        v.intro,
        v.items,
        v.subtotal,
        v.discount_pct,
        v.discount_amount,
        v.tax_pct,
        v.tax_amount,
        v.total,
        v.currency,
        v.valid_until,
        v.terms,
        v.notes,
        v.token_amount,
        v.agreement_months,
        v.replacement_months,
        req.params.id,
      ],
    );

    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* A proposal can only go to the client if it is linked to a registered
   account (client_id / client_code), otherwise it never appears in any
   client portal. Tries a last-chance auto-link by email. Returns an error
   message, or null when the proposal is (now) linked. */
export const ensureClientLinked = async (row) => {
  if (row.client_id || row.client_code) return null;
  const linked = row.client_email ? await resolveClientByEmail(row.client_email) : null;
  if (!linked)
    return "This proposal is not linked to any registered client, so it would never appear in a client portal. Select a registered client (or use the client's registered email) first.";
  await db.query("UPDATE proposals SET client_id = ?, client_code = ? WHERE id = ?", [
    linked.id,
    linked.client_code || null,
    row.id,
  ]);
  return null;
};

export const updateProposalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    const [[row]] = await db.query("SELECT * FROM proposals WHERE id = ?", [
      req.params.id,
    ]);
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });

    if (status === "SENT") {
      const linkErr = await ensureClientLinked(row);
      if (linkErr) return res.status(400).json({ success: false, message: linkErr });
    }

    /* Sending a rep's submission directly counts as an approval. */
    const approvalStamp =
      status === "SENT" && row.created_by_role === "sales"
        ? ", approved_by = ?, approved_at = NOW(), approval_note = NULL"
        : "";
    const extra =
      status === "SENT"
        ? `, sent_at = NOW()${approvalStamp}`
        : ["ACCEPTED", "REJECTED"].includes(status)
          ? ", responded_at = NOW()"
          : "";

    const params = [status];
    if (approvalStamp) params.push(req.user?.name || req.user?.email || "Super Admin");
    params.push(req.params.id);

    await db.query(`UPDATE proposals SET status = ?${extra} WHERE id = ?`, params);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ---- Sales-submission review ---- */

export const approveProposal = async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT * FROM proposals WHERE id = ?", [
      req.params.id,
    ]);
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });
    if (row.status !== "PENDING_APPROVAL")
      return res.status(400).json({
        success: false,
        message: `Only proposals pending approval can be approved (this one is ${row.status})`,
      });

    const linkErr = await ensureClientLinked(row);
    if (linkErr) return res.status(400).json({ success: false, message: linkErr });

    await db.query(
      `UPDATE proposals
         SET status = 'SENT', sent_at = NOW(), approved_by = ?, approved_at = NOW(), approval_note = NULL
       WHERE id = ?`,
      [req.user?.name || req.user?.email || "Super Admin", req.params.id],
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const returnProposal = async (req, res) => {
  try {
    const note = String(req.body?.note || "").trim();
    if (note.length < 3)
      return res.status(400).json({
        success: false,
        message: "Please tell the sales rep what needs to change (note is required)",
      });

    const [[row]] = await db.query("SELECT * FROM proposals WHERE id = ?", [
      req.params.id,
    ]);
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });
    if (row.status !== "PENDING_APPROVAL")
      return res.status(400).json({
        success: false,
        message: `Only proposals pending approval can be returned (this one is ${row.status})`,
      });

    await db.query(
      `UPDATE proposals
         SET status = 'REVISION', approval_note = ?, approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [note.slice(0, 2000), req.user?.name || req.user?.email || "Super Admin", req.params.id],
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteProposal = async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT status FROM proposals WHERE id = ?", [
      req.params.id,
    ]);
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });
    /* Super Admin may delete a proposal in any status (Draft, Sent, Accepted, Expired...) */
    await db.query("DELETE FROM proposals WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ------------------------------------------------------------------ */
/* Client portal: view own proposals + accept / reject                 */
/* ------------------------------------------------------------------ */

/* Match proposals to the logged-in client by client_code, client_id, or
   the client's registered email — so proposals created via manual entry
   (but with the client's email) still appear in their portal. */
export const clientMatch = async (client) => {
  let email = null;
  try {
    const [[row]] = await db.query("SELECT email FROM clients WHERE id = ?", [
      client.id,
    ]);
    email = row?.email || null;
  } catch {
    /* clients table shape may differ — code/id matching still applies */
  }
  if (email) {
    return {
      sql: "(client_code = ? OR client_id = ? OR client_email = ?)",
      params: [client.client_code, client.id, email],
    };
  }
  return {
    sql: "(client_code = ? OR client_id = ?)",
    params: [client.client_code, client.id],
  };
};

export const listMyProposals = async (req, res) => {
  try {
    await expireStale();
    const m = await clientMatch(req.client);
    const [rows] = await db.query(
      `SELECT * FROM proposals
       WHERE ${m.sql} AND ${CLIENT_VISIBLE_SQL}
       ORDER BY created_at DESC`,
      [...m.params, ...CLIENT_VISIBLE_STATUSES],
    );
    res.json({ success: true, data: rows.map(parseRow) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getMyProposal = async (req, res) => {
  try {
    await expireStale();
    const m = await clientMatch(req.client);
    const [[row]] = await db.query(
      `SELECT * FROM proposals
       WHERE id = ? AND ${m.sql} AND ${CLIENT_VISIBLE_SQL}`,
      [req.params.id, ...m.params, ...CLIENT_VISIBLE_STATUSES],
    );
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });
    res.json({ success: true, data: parseRow(row) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const respondToProposal = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["ACCEPT", "REJECT"].includes(action))
      return res
        .status(400)
        .json({ success: false, message: "action must be ACCEPT or REJECT" });

    await expireStale();
    const m = await clientMatch(req.client);
    const [[row]] = await db.query(
      `SELECT * FROM proposals WHERE id = ? AND ${m.sql} AND ${CLIENT_VISIBLE_SQL}`,
      [req.params.id, ...m.params, ...CLIENT_VISIBLE_STATUSES],
    );
    if (!row)
      return res.status(404).json({ success: false, message: "Proposal not found" });
    if (row.status !== "SENT")
      return res.status(400).json({
        success: false,
        message: `This proposal is ${row.status} and can no longer be responded to`,
      });

    await db.query(
      `UPDATE proposals SET status = ?, response_note = ?, responded_at = NOW()
       WHERE id = ?`,
      [
        action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        note ? String(note).slice(0, 500) : null,
        req.params.id,
      ],
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
