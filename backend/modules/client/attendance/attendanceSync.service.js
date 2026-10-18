import { db } from "../../../config/db.js";

/**
 * =========================================================
 * CLIENT -> SUPER ADMIN ATTENDANCE SYNC (one-way)
 * =========================================================
 * Single source of truth: super_admin_attendance.
 *
 * Priority order for a given (employee, date):
 *   1. GEO / SMART punches            (source = 'GEO' / 'SMART')
 *   2. Super Admin / HR manual entry  (source = 'ADMIN' or NULL/legacy)
 *   3. Client entry                   (source = 'CLIENT')
 *
 * A client entry NEVER overwrites a row whose source is not
 * 'CLIENT'. All functions are fail-safe: a sync failure only
 * logs a warning and never breaks the client flow.
 */

const SOURCE_CLIENT = "CLIENT";

const VALID_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "WFH",
  "LEAVE",
];

let columnsReady = false;

/* =========================================
ENSURE SYNC COLUMNS (guarded - MySQL 8 has
no "ADD COLUMN IF NOT EXISTS")
========================================= */
export const ensureAttendanceSyncColumns = async () => {
  if (columnsReady) return;

  const addColumnIfMissing = async (column, definition) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS c
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'super_admin_attendance'
         AND column_name = ?`,
      [column]
    );
    if (!rows[0].c) {
      await db.query(
        `ALTER TABLE super_admin_attendance ADD COLUMN ${column} ${definition}`
      );
    }
  };

  await addColumnIfMissing("source", "VARCHAR(20) NULL DEFAULT NULL");
  await addColumnIfMissing("client_id", "INT NULL DEFAULT NULL");
  await addColumnIfMissing("marked_by_id", "INT NULL DEFAULT NULL");
  await addColumnIfMissing("marked_by_name", "VARCHAR(150) NULL DEFAULT NULL");
  await addColumnIfMissing("marked_by_role", "VARCHAR(50) NULL DEFAULT NULL");
  await addColumnIfMissing("marked_by_at", "TIMESTAMP NULL DEFAULT NULL");
  await addColumnIfMissing("shift_id", "INT NULL DEFAULT NULL");
  await addColumnIfMissing("shift_name", "VARCHAR(100) NULL DEFAULT NULL");
  await addColumnIfMissing("shift_start", "TIME NULL DEFAULT NULL");
  await addColumnIfMissing("shift_end", "TIME NULL DEFAULT NULL");

  columnsReady = true;
};

/* =========================================
HELPERS
========================================= */
const toDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

const normalizeStatus = (status) => {
  const s = String(status || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  return VALID_STATUSES.includes(s) ? s : "PRESENT";
};

/**
 * Map a client_employees row to the HRMS employees table.
 * Match by employeeCode first (unique in HRMS), then email.
 * Returns { id, name } or null when the person only exists
 * on the client side (no HRMS record -> nothing to sync).
 */
const mapToHrmsEmployee = async (clientEmployeeId) => {
  const [ceRows] = await db.query(
    `SELECT employeeCode, email FROM client_employees WHERE id = ? LIMIT 1`,
    [clientEmployeeId]
  );
  if (!ceRows.length) return null;
  const ce = ceRows[0];

  if (ce.employeeCode) {
    const [byCode] = await db.query(
      `SELECT id, name FROM employees WHERE employeeCode = ? LIMIT 1`,
      [ce.employeeCode]
    );
    if (byCode.length) return byCode[0];
  }

  if (ce.email) {
    const [byEmail] = await db.query(
      `SELECT id, name FROM employees WHERE email = ? LIMIT 1`,
      [ce.email]
    );
    if (byEmail.length) return byEmail[0];
  }

  return null;
};

/* =========================================
FETCH A CLIENT ATTENDANCE ROW (for hooks)
========================================= */
export const getClientAttendanceRow = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM client_attendance WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

/* =========================================
SYNC ONE CLIENT ROW -> SUPER ADMIN TABLE
row: { client_id, employee_id, attendance_date,
       check_in, check_out, status }
========================================= */
export const syncClientAttendanceToSuperAdmin = async (row) => {
  try {
    if (!row || !row.employee_id) return;
    await ensureAttendanceSyncColumns();

    const employee = await mapToHrmsEmployee(row.employee_id);
    if (!employee) return; // client-only employee, not in HRMS

    const date = toDateOnly(row.attendance_date);
    if (!date) return;

    const status = normalizeStatus(row.status);

    const [existing] = await db.query(
      `SELECT id, source FROM super_admin_attendance
       WHERE employee_id = ? AND date = ?
       ORDER BY id ASC
       LIMIT 1`,
      [employee.id, date]
    );

    if (existing.length) {
      // Higher-priority sources (GEO/SMART punches, Admin/HR
      // entries incl. legacy NULL source) always win.
      if (existing[0].source !== SOURCE_CLIENT) return;

      await db.query(
        `UPDATE super_admin_attendance
         SET check_in = TIME(?), check_out = TIME(?), status = ?, client_id = ?
         WHERE id = ? AND source = ?`,
        [
          row.check_in || null,
          row.check_out || null,
          status,
          row.client_id || null,
          existing[0].id,
          SOURCE_CLIENT,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO super_admin_attendance
         (employee_id, employee_name, date, check_in, check_out, status, source, client_id)
         VALUES (?, ?, ?, TIME(?), TIME(?), ?, ?, ?)`,
        [
          employee.id,
          employee.name,
          date,
          row.check_in || null,
          row.check_out || null,
          status,
          SOURCE_CLIENT,
          row.client_id || null,
        ]
      );
    }
  } catch (err) {
    console.warn(
      "[attendance-sync] client -> super admin sync failed:",
      err.message
    );
  }
};

/* =========================================
REMOVE A CLIENT-SOURCED ROW (on delete /
before re-sync). Only deletes rows whose
source = 'CLIENT' - never touches GEO,
SMART, Admin or HR records.
========================================= */
export const removeClientSyncedAttendance = async (row) => {
  try {
    if (!row || !row.employee_id) return;
    await ensureAttendanceSyncColumns();

    const employee = await mapToHrmsEmployee(row.employee_id);
    if (!employee) return;

    const date = toDateOnly(row.attendance_date);
    if (!date) return;

    await db.query(
      `DELETE FROM super_admin_attendance
       WHERE employee_id = ? AND date = ? AND source = ?`,
      [employee.id, date, SOURCE_CLIENT]
    );
  } catch (err) {
    console.warn(
      "[attendance-sync] client sync removal failed:",
      err.message
    );
  }
};
