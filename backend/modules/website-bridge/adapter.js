// Website Bridge adapter (v2).
// Recruweb data is stored in the EXISTING Website Forms tables
// (web_form_submissions / web_form_replies) so HR + Super Admin see it in the
// portals they already use. HR list comes live from the `employees` table.
// Overrides (backend/.env): WB_USERS_TABLE, WB_ID_COL, WB_NAME_COL, WB_EMAIL_COL,
// WB_ROLE_COL, WB_HR_ROLE_REGEX, WB_SA_ROLE_REGEX
let _db = null;

async function getDb() {
  if (_db) return _db;
  const m = await import("../../config/db.js");
  const cands = [m.default, m.pool, m.db, m.connection, m.sequelize, ...Object.values(m)];
  _db = cands.find((v) => v && typeof v.query === "function");
  if (!_db) throw new Error("config/db.js does not export a usable pool");
  return _db;
}

export async function q(sql, params = []) {
  const db = await getDb();
  if (typeof db.getQueryInterface === "function") {
    const [rows] = await db.query(sql, { replacements: params });
    return rows;
  }
  const p = typeof db.promise === "function" ? db.promise() : db;
  const [rows] = await p.query(sql, params);
  return rows;
}

const id = (s) => "`" + String(s).replace(/`/g, "") + "`";

// ---------------------------------------------------------------- schema ---
// Adds the bridge columns to web_form_submissions (idempotent).
const NEW_COLS = [
  ["assigned_hr_id", "VARCHAR(50) NULL"],
  ["assigned_hr_name", "VARCHAR(150) NULL"],
  ["chat_token", "CHAR(48) NULL"],
  ["ext_ref", "VARCHAR(80) NULL"],
];
let schemaReady = null;
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const have = await q(
        `SELECT COLUMN_NAME c FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'web_form_submissions'`
      );
      if (!have.length) throw new Error("table web_form_submissions not found");
      const set = new Set(have.map((r) => String(r.c || r.COLUMN_NAME)));
      for (const [col, ddl] of NEW_COLS) {
        if (!set.has(col)) await q(`ALTER TABLE web_form_submissions ADD COLUMN ${id(col)} ${ddl}`);
      }
      const idx = await q(
        `SELECT INDEX_NAME n FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'web_form_submissions'`
      );
      const names = new Set(idx.map((r) => String(r.n || r.INDEX_NAME)));
      if (!names.has("idx_wfs_chat_token")) await q("CREATE INDEX idx_wfs_chat_token ON web_form_submissions (chat_token)");
      if (!names.has("idx_wfs_hr")) await q("CREATE INDEX idx_wfs_hr ON web_form_submissions (assigned_hr_id)");
      if (!names.has("idx_wfs_ext")) await q("CREATE INDEX idx_wfs_ext ON web_form_submissions (ext_ref)");
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

// ------------------------------------------------------ employees detect ---
let userMap = null;
export async function getUserMap() {
  if (userMap) return userMap;
  const env = process.env;
  const cols = await q(
    `SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`
  );
  const byTable = {};
  for (const r of cols) (byTable[r.t || r.TABLE_NAME] ||= new Set()).add(String(r.c || r.COLUMN_NAME));
  const pick = (set, list) => list.find((x) => set.has(x));

  const t = env.WB_USERS_TABLE || "employees";
  const set = byTable[t];
  if (!set) throw new Error(`Table '${t}' not found. Set WB_USERS_TABLE in backend/.env`);

  const idCol = env.WB_ID_COL || pick(set, ["id", "employee_id", "user_id"]);
  const nameCol = env.WB_NAME_COL || pick(set, ["name", "full_name", "fullname", "employee_name", "first_name"]);
  const emailCol = env.WB_EMAIL_COL || pick(set, ["email", "official_email", "work_email", "company_email"]) || null;
  let roleCol = env.WB_ROLE_COL || pick(set, ["role", "role_name", "user_role", "user_type", "type", "employee_type"]) || null;
  let roleJoin = null;
  if (!roleCol && set.has("role_id") && byTable.roles) {
    const rn = pick(byTable.roles, ["name", "role_name", "title"]);
    if (rn) roleJoin = { col: "role_id", table: "roles", nameCol: rn, idCol: pick(byTable.roles, ["id"]) || "id" };
  }
  if (!idCol || !nameCol) throw new Error(`Could not detect id/name columns in '${t}'. Set WB_ID_COL / WB_NAME_COL`);

  userMap = {
    table: t,
    idCol,
    nameCol,
    emailCol,
    roleCol,
    roleJoin,
    lastName: !env.WB_NAME_COL && nameCol === "first_name" && set.has("last_name") ? "last_name" : null,
    deletedCol: set.has("deleted_at") ? "deleted_at" : null,
    activeCol: set.has("is_active") ? "is_active" : null,
    statusCol: set.has("status") ? "status" : null,
    designationCol: pick(set, ["designation", "job_title", "position"]) || null,
    departmentCol: pick(set, ["department", "department_name", "dept"]) || null,
  };
  return userMap;
}

const HR_RE = () => new RegExp(process.env.WB_HR_ROLE_REGEX || "(^|[^a-z])hr([^a-z]|$)|human\\s*resource|recruit", "i");
const SA_RE = () => new RegExp(process.env.WB_SA_ROLE_REGEX || "super[\\s_-]*admin", "i");
const INACTIVE_RE = /inactive|terminat|resign|left|exit|abscond|suspend|deleted|relieved/i;
export const isSuperAdminRole = (r) => SA_RE().test(String(r || ""));
export const isHrRole = (r) => !isSuperAdminRole(r) && HR_RE().test(String(r || ""));

async function loadAllUsers() {
  const m = await getUserMap();
  const nameExpr = m.lastName
    ? `TRIM(CONCAT(u.${id(m.nameCol)}, ' ', COALESCE(u.${id(m.lastName)}, '')))`
    : `u.${id(m.nameCol)}`;
  const roleExpr = m.roleJoin
    ? `r.${id(m.roleJoin.nameCol)}`
    : m.roleCol
      ? `u.${id(m.roleCol)}`
      : "NULL";
  const join = m.roleJoin
    ? `LEFT JOIN ${id(m.roleJoin.table)} r ON r.${id(m.roleJoin.idCol)} = u.${id(m.roleJoin.col)}`
    : "";
  const where = [];
  if (m.deletedCol) where.push(`u.${id(m.deletedCol)} IS NULL`);
  if (m.activeCol) where.push(`u.${id(m.activeCol)} = 1`);
  const col = (c) => (c ? `u.${id(c)}` : "NULL");
  const rows = await q(
    `SELECT CAST(u.${id(m.idCol)} AS CHAR) AS uid, ${nameExpr} AS uname, ${col(m.emailCol)} AS uemail,
            ${roleExpr} AS urole, ${col(m.designationCol)} AS udesig, ${col(m.departmentCol)} AS udept,
            ${col(m.statusCol)} AS ustatus
       FROM ${id(m.table)} u ${join}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY uname`
  );
  return rows.filter((r) => r.uname && !(r.ustatus && INACTIVE_RE.test(String(r.ustatus))));
}

const shape = (r) => ({
  id: String(r.uid),
  name: String(r.uname).trim(),
  designation: r.udesig || null,
  email: r.uemail || null,
  role: r.urole || null,
});

// HR accounts = exactly who can log in to the HR portal (see hrAuth.service.js):
// active employees whose department is "HR". Resigned/terminated are left out.
export async function listHrUsers() {
  const dept = process.env.WB_HR_DEPARTMENT || "HR";
  const rows = await q(
    `SELECT CAST(e.id AS CHAR) AS uid, e.name AS uname, e.email AS uemail, g.name AS udesig, st.name AS ustatus
       FROM employees e
       JOIN departments dep ON dep.id = e.departmentId
       LEFT JOIN designations g ON g.id = e.designationId
       LEFT JOIN employee_statuses st ON st.id = e.statusId
      WHERE e.isActive = 1 AND dep.name = ?
      ORDER BY e.name`,
    [dept]
  );
  return rows
    .filter((r) => r.uname && !(r.ustatus && /resign|terminat/i.test(String(r.ustatus))))
    .map((r) => ({ id: String(r.uid), name: String(r.uname).trim(), designation: r.udesig || null, email: r.uemail || null, role: "hr" }));
}

export async function getHrById(uid) {
  const hrs = await listHrUsers();
  return hrs.find((h) => h.id === String(uid)) || null;
}

export async function roleStats() {
  const all = await loadAllUsers();
  const counts = {};
  for (const r of all) counts[String(r.urole ?? "(none)")] = (counts[String(r.urole ?? "(none)")] || 0) + 1;
  return { totalActive: all.length, roles: counts };
}
