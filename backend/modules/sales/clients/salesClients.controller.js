import bcrypt from "bcryptjs";

import { db } from "../../../config/db.js";

/* =====================================================
   Helper: Generate Client Code (C1001 style)
===================================================== */
const generateClientCode = async () => {
  try {
    const [rows] = await db.query(`
      SELECT id FROM clients ORDER BY id DESC LIMIT 1
    `);

    if (!rows.length) return "C1001";

    const nextId = rows[0].id + 1;
    return `C${1000 + nextId}`;
  } catch (err) {
    throw new Error(`Client code generation failed: ${err.message}`);
  }
};

const CLIENT_COLUMNS = `
  id,
  client_code,
  company_name,
  client_name,
  email,
  phone,
  gst_number,
  business_address,
  website,
  company_description,
  status,
  created_at,
  updated_at
`;

/* =========================================
LIST MY CLIENTS (created by the logged-in rep)
========================================= */
export const getMySalesClients = async (req, res) => {
  try {
    const employee_id = req.salesUser.employeeId;
    const q = String(req.query.q || "").trim();

    let sql = `SELECT ${CLIENT_COLUMNS} FROM clients WHERE employee_id = ?`;
    const params = [employee_id];

    if (q) {
      sql += ` AND (company_name LIKE ? OR client_name LIKE ? OR client_code LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }

    sql += ` ORDER BY created_at DESC, id DESC`;

    const [rows] = await db.query(sql, params);

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("List sales clients error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================================
CREATE CLIENT
========================================= */
export const createSalesClient = async (
  req,
  res
) => {
  try {
    const {
      company_name,
      client_name,
      email,
      phone,
      business_address,
      gst_number,
      website,
      company_description,
      password,
    } = req.body;

    const employee_id =
      req.salesUser.employeeId;

    if (!company_name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name required",
      });
    }

    if (!password?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Password required",
      });
    }

    const password_hash =
      await bcrypt.hash(password, 10);

    const client_code =
      await generateClientCode();

    const [result] = await db.query(
      `
      INSERT INTO clients (
        client_code,
        company_name,
        client_name,
        email,
        phone,
        business_address,
        gst_number,
        website,
        company_description,
        password_hash,
        employee_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        client_code,
        company_name,
        client_name || null,
        email || null,
        phone || null,
        business_address || null,
        gst_number || null,
        website || null,
        company_description || null,
        password_hash,
        employee_id,
      ]
    );

    const [[created]] = await db.query(
      `SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.json({
      success: true,
      message: "Client created successfully",
      data: created || null,
    });
  } catch (err) {
    console.error(
      "Create sales client error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


/* =========================================
EDIT CLIENT (only the rep who created it)
========================================= */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const clean = (v, max) => (v == null ? "" : String(v)).trim().slice(0, max);

export const updateSalesClient = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const employee_id = req.salesUser.employeeId;

    const [[cur]] = await db.query(
      "SELECT * FROM clients WHERE id = ? AND employee_id = ? LIMIT 1",
      [id, employee_id]
    );
    if (!cur) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const b = req.body || {};
    const company_name = clean(b.company_name, 150);
    if (!company_name) {
      return res.status(400).json({ success: false, message: "Company name required" });
    }

    const statusIn = String(b.status || "").toUpperCase();
    const next = {
      company_name,
      client_name: clean(b.client_name, 120) || null,
      email: clean(b.email, 150).toLowerCase() || null,
      phone: clean(b.phone, 20).replace(/\D/g, "") || null,
      gst_number: clean(b.gst_number, 50).toUpperCase() || null,
      website: clean(b.website, 255) || null,
      business_address: clean(b.business_address, 2000) || null,
      company_description: clean(b.company_description, 5000) || null,
      status: ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(statusIn) ? statusIn : cur.status,
    };

    // validate only what the user actually changed (old records may be messy)
    if (next.email && next.email !== String(cur.email || "").toLowerCase()) {
      if (!EMAIL_RE.test(next.email))
        return res.status(400).json({ success: false, message: "Enter a valid email address" });
      const [dup] = await db.query(
        "SELECT id FROM clients WHERE email = ? AND id <> ? LIMIT 1",
        [next.email, id]
      );
      if (dup.length)
        return res.status(409).json({ success: false, message: "This email is already used by another client" });
    }
    if (next.phone && next.phone !== String(cur.phone || "") && !/^\d{10}$/.test(next.phone)) {
      return res.status(400).json({ success: false, message: "Phone must be exactly 10 digits" });
    }
    if (next.gst_number && next.gst_number !== String(cur.gst_number || "").toUpperCase() && !GST_RE.test(next.gst_number)) {
      return res.status(400).json({ success: false, message: "Enter a valid 15-character GST number" });
    }

    const sets = [
      "company_name = ?", "client_name = ?", "email = ?", "phone = ?",
      "gst_number = ?", "website = ?", "business_address = ?",
      "company_description = ?", "status = ?",
    ];
    const vals = [
      next.company_name, next.client_name, next.email, next.phone,
      next.gst_number, next.website, next.business_address,
      next.company_description, next.status,
    ];

    const newPassword = clean(b.password, 100);
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      sets.push("password_hash = ?");
      vals.push(await bcrypt.hash(newPassword, 10));
    }

    vals.push(id, employee_id);
    await db.query(
      "UPDATE clients SET " + sets.join(", ") + " WHERE id = ? AND employee_id = ?",
      vals
    );

    const [[updated]] = await db.query(
      `SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ? LIMIT 1`,
      [id]
    );
    return res.json({ success: true, message: "Client updated", data: updated || null });
  } catch (err) {
    console.error("Update sales client error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================
DELETE CLIENT (only if nothing is linked to it)
========================================= */
export const deleteSalesClient = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const employee_id = req.salesUser.employeeId;

    const [[client]] = await db.query(
      "SELECT id FROM clients WHERE id = ? AND employee_id = ? LIMIT 1",
      [id, employee_id]
    );
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const [tables] = await db.query(
      `SELECT c.TABLE_NAME AS table_name
         FROM information_schema.COLUMNS c
         JOIN information_schema.TABLES t
           ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
        WHERE c.TABLE_SCHEMA = DATABASE()
          AND c.COLUMN_NAME = 'client_id'
          AND t.TABLE_TYPE = 'BASE TABLE'
          AND c.TABLE_NAME <> 'clients'`
    );

    const used = [];
    for (const row of tables) {
      const [[r]] = await db.query(
        "SELECT COUNT(*) AS n FROM `" + row.table_name + "` WHERE client_id = ?",
        [id]
      );
      if (r.n > 0) used.push(row.table_name);
    }

    if (used.length) {
      const names = used.map((t) => t.replace(/^client_/, "").replace(/_/g, " ")).join(", ");
      return res.status(409).json({
        success: false,
        message: "This client already has linked records (" + names + "), so it cannot be deleted. Set its status to Inactive instead.",
      });
    }

    await db.query("DELETE FROM clients WHERE id = ? AND employee_id = ?", [id, employee_id]);
    return res.json({ success: true, message: "Client deleted" });
  } catch (err) {
    console.error("Delete sales client error:", err);
    if (err.errno === 1451) {
      return res.status(409).json({
        success: false,
        message: "This client has linked records and cannot be deleted. Set its status to Inactive instead.",
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};
