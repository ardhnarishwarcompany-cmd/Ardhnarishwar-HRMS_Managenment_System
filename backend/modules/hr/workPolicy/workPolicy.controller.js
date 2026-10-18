import { db } from "../../../config/db.js";

/* =========================================
GET POLICIES
========================================= */
export const getPolicies = async (req, res) => {
  try {
    const { category, status, department } = req.query;

    let query = `
      SELECT 
        p.*,
        d.name AS department
      FROM work_policies p
      LEFT JOIN departments d ON d.id = p.departmentId
      WHERE 1=1
    `;

    const params = [];

    if (category) {
      query += " AND p.category = ?";
      params.push(category);
    }

    if (status) {
      query += " AND p.status = ?";
      params.push(status);
    }

    if (department && department !== "All") {
      query += " AND d.name = ?";
      params.push(department);
    }

    query += " ORDER BY p.createdAt DESC";

    const [rows] = await db.query(query, params);

    // BUGFIX: Super Admin's "Work Policy & Target" page (Company Policies)
    // creates/reads from a *different* table (`policies` + `policy_rules`,
    // via /api/super-admin/policies) than the one this endpoint reads
    // (`work_policies`). The two were never wired together, so anything
    // created from the Admin/Super Admin panel never appeared here for
    // HR (and for IT, which reuses this same /hr/work-policies endpoint).
    // The Sales (`modules/sales/workPolicy`) and Client
    // (`modules/client/workPolicy`) portals already merge in rows from
    // `policies` for exactly this reason — mirroring that same merge here
    // so HR and IT show Super-Admin-created policies too.
    let globalPolicies = [];
    if (!department || department === "All") {
      const [globalRows] = await db.query(
        `SELECT id, title, category, description, is_active, auto_apply, created_at, updated_at
         FROM policies ORDER BY id DESC`
      );
      globalPolicies = globalRows;
    }

    const existingTitles = new Set(
      rows.map((r) => String(r.title || "").trim().toLowerCase())
    );

    for (const p of globalPolicies) {
      if (category && p.category !== category) continue;
      const wantsActive = status === "active" ? 1 : status === "archived" ? 0 : null;
      if (wantsActive !== null && Boolean(p.is_active) !== Boolean(wantsActive)) continue;

      const key = String(p.title || "").trim().toLowerCase();
      if (!key || existingTitles.has(key)) continue;

      rows.push({
        id: `sa-${p.id}`,
        policy_code: `SA-POL-${p.id}`,
        title: p.title,
        category: p.category,
        department: "All",
        effective_date: p.created_at,
        updatedAt: p.updated_at,
        status: p.is_active ? "active" : "archived",
        description: p.description || "",
      });
    }

    // 🔥 mapping for frontend
    const formatted = rows.map((r) => ({
      id: r.id,
      policyId: r.policy_code,
      title: r.title,
      category: r.category,
      department: r.department || "All",
      effectiveDate: r.effective_date,
      lastUpdated: r.updatedAt,
      status: r.status,
      description: r.description,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error("GET POLICY ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
CREATE POLICY
========================================= */
export const createPolicy = async (req, res) => {
  try {
    const { title, category, department, status, effectiveDate, description } =
      req.body;

    if (!title || !category || !effectiveDate) {
      return res.status(400).json({
        success: false,
        message: "Title, Category, Effective Date required",
      });
    }

    // 🔥 generate policy code
    const [[last]] = await db.query(
      "SELECT id FROM work_policies ORDER BY id DESC LIMIT 1"
    );

    const nextId = last ? last.id + 1 : 1;
    const policyCode = `POL${String(nextId).padStart(3, "0")}`;

    // 🔥 departmentId from name
    let departmentId = 0;
    if (department && department !== "All") {
      const [[dept]] = await db.query(
        "SELECT id FROM departments WHERE name = ? LIMIT 1",
        [department]
      );
      if (dept) departmentId = dept.id;
      else return res.status(400).json({ success: false, message: `Department "${department}" not found` });
    }

    // work_policies.client_id is NOT NULL — tokens from HR/IT/Super Admin
    // portals don't carry a tenant id, so fall back to 0 (= company-wide).
    const clientId =
      Number(req.user?.client_id ?? req.user?.clientId ?? req.client?.id ?? 0) || 0;

    await db.query(
      `INSERT INTO work_policies
      (client_id, policy_code, title, category, departmentId, status, effective_date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        policyCode,
        title,
        category,
        departmentId,
        status || "draft",
        effectiveDate,
        description || "",
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("CREATE POLICY ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================
UPDATE POLICY
========================================= */
export const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, department, status, effectiveDate, description } =
      req.body;

    let departmentId = 0;
    if (department && department !== "All") {
      const [[dept]] = await db.query(
        "SELECT id FROM departments WHERE name = ? LIMIT 1",
        [department]
      );
      if (dept) departmentId = dept.id;
      else return res.status(400).json({ success: false, message: `Department "${department}" not found` });
    }

    await db.query(
      `UPDATE work_policies SET
        title=?,
        category=?,
        departmentId=?,
        status=?,
        effective_date=?,
        description=?
      WHERE id=?`,
      [title, category, departmentId, status, effectiveDate, description, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE POLICY ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
DELETE POLICY
========================================= */
export const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM work_policies WHERE id=?", [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE POLICY ERROR:", err);
    res.status(500).json({ success: false });
  }
};