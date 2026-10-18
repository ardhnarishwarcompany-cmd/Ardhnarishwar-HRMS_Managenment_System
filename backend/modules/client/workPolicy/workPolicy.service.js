// // workPolicy.service.js
// import {db} from "../../../config/db.js";

// export const getAllPolicies = async () => {
//   const [rows] = await db.query("SELECT * FROM work_policies ORDER BY id DESC");
//   return rows;
// };

// export const createPolicy = async (data) => {
//   const {
//     title,
//     type,
//     departmentId,
//     description,
//     isActive,
//     isAutomated,
//     autoDeduction,
//     autoApply,
//   } = data;

//   const [result] = await db.query(
//     `INSERT INTO work_policies 
//     (title, type, departmentId, description, isActive, isAutomated, autoDeduction, autoApply)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       title,
//       type,
//       departmentId,
//       description,
//       isActive,
//       isAutomated,
//       autoDeduction,
//       autoApply,
//     ]
//   );

//   const [rows] = await db.query(
//     "SELECT * FROM work_policies WHERE id = ?",
//     [result.insertId]
//   );

//   return rows[0];
// };

// export const updatePolicy = async (id, data) => {
//   const {
//     title,
//     type,
//     departmentId,
//     description,
//     isActive,
//     isAutomated,
//     autoDeduction,
//     autoApply,
//   } = data;

//   await db.query(
//     `UPDATE work_policies SET 
//       title=?, type=?, departmentId=?, description=?, 
//       isActive=?, isAutomated=?, autoDeduction=?, autoApply=?
//      WHERE id=?`,
//     [
//       title,
//       type,
//       departmentId,
//       description,
//       isActive,
//       isAutomated,
//       autoDeduction,
//       autoApply,
//       id,
//     ]
//   );

//   const [rows] = await db.query(
//     "SELECT * FROM work_policies WHERE id = ?",
//     [id]
//   );

//   return rows[0];
// };

// export const deletePolicy = async (id) => {
//   await db.query("DELETE FROM work_policies WHERE id = ?", [id]);
// };






import { db } from "../../../config/db.js";

// ✅ GET
export const getAllPolicies = async (clientId) => {
  const [rows] = await db.query(
    `SELECT * FROM work_policies
     WHERE client_id = ? OR client_id = 0
     ORDER BY id DESC`,
    [clientId]
  );

  const [globalPolicies] = await db.query(
    `SELECT id, title, category, description, is_active, created_at, updated_at
     FROM policies ORDER BY id DESC`
  );
  const existingTitles = new Set(rows.map((p) => String(p.title || "").trim().toLowerCase()));
  for (const p of globalPolicies) {
    const key = String(p.title || "").trim().toLowerCase();
    if (!key || existingTitles.has(key)) continue;
    rows.push({
      id: `sa-${p.id}`, client_id: 0, title: p.title, category: p.category,
      description: p.description || "", status: p.is_active ? "active" : "archived",
      isActive: p.is_active ? 1 : 0, isAutomated: 1, autoApply: p.auto_apply ? 1 : 0,
      policy_code: `SA-POL-${p.id}`, effective_date: p.created_at,
      createdAt: p.created_at, updatedAt: p.updated_at, departmentId: 0, type: "general",
    });
  }
  return rows;
};

const POLICY_TYPES = ["attendance", "leave", "behavior", "meal_management", "general"];

const toFlag = (v, fallback = 1) => {
  if (v === undefined || v === null || v === "") return fallback;
  return v === true || v === 1 || v === "1" || v === "true" ? 1 : 0;
};

// Normalises the camelCase payload from the client portal into the exact
// column values work_policies accepts (ENUM-safe type, INT departmentId,
// TINYINT flags, nullable autoDeduction).
const normalisePolicyInput = (data = {}) => {
  const departmentId = Number(data.departmentId ?? data.department_id ?? 0);
  const autoDeduction = String(data.autoDeduction ?? data.auto_deduction ?? "").trim();

  return {
    title: String(data.title ?? "").trim(),
    type: POLICY_TYPES.includes(data.type) ? data.type : "general",
    departmentId: Number.isInteger(departmentId) && departmentId > 0 ? departmentId : 0,
    description: data.description ?? "",
    isActive: toFlag(data.isActive ?? data.is_active),
    isAutomated: toFlag(data.isAutomated ?? data.is_automated),
    autoDeduction: autoDeduction || null,
    autoApply: toFlag(data.autoApply ?? data.auto_apply),
  };
};

const getPolicyById = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM work_policies WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

// ✅ CREATE
export const createPolicy = async (data) => {
  const p = normalisePolicyInput(data);

  const [result] = await db.query(
    `INSERT INTO work_policies
       (client_id, title, type, departmentId, description,
        isActive, isAutomated, autoDeduction, autoApply)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.client_id,
      p.title,
      p.type,
      p.departmentId,
      p.description,
      p.isActive,
      p.isAutomated,
      p.autoDeduction,
      p.autoApply,
    ]
  );

  return getPolicyById(result.insertId);
};

// Client admins can manage every row they can see: their own policies plus the
// company-wide ones HR/IT create with client_id = 0 (those tokens carry no tenant).
// Mirrors the WHERE clause in getAllPolicies.
const OWNED_OR_COMPANY_WIDE = "id = ? AND client_id IN (?, 0)";

// ✅ UPDATE (SECURE) — returns null when no visible row matched
export const updatePolicy = async (id, clientId, data) => {
  const policyId = Number(id);
  if (!Number.isInteger(policyId) || policyId <= 0) return null;

  const p = normalisePolicyInput(data);

  const [result] = await db.query(
    `UPDATE work_policies
     SET title = ?, type = ?, departmentId = ?, description = ?,
         isActive = ?, isAutomated = ?, autoDeduction = ?, autoApply = ?
     WHERE ${OWNED_OR_COMPANY_WIDE}`,
    [
      p.title,
      p.type,
      p.departmentId,
      p.description,
      p.isActive,
      p.isAutomated,
      p.autoDeduction,
      p.autoApply,
      policyId,
      clientId,
    ]
  );

  if (!result.affectedRows) return null;

  return getPolicyById(policyId);
};

// ✅ DELETE (SECURE) — resolves to the number of rows removed (0 = nothing visible matched)
export const deletePolicy = async (id, clientId) => {
  const policyId = Number(id);
  if (!Number.isInteger(policyId) || policyId <= 0) return 0;

  const [result] = await db.query(
    `DELETE FROM work_policies WHERE ${OWNED_OR_COMPANY_WIDE}`,
    [policyId, clientId]
  );

  return result.affectedRows;
};