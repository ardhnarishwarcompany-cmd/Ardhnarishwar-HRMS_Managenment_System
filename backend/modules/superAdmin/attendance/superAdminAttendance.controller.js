import { db } from "../../../config/db.js";
import {
  getClientAttendanceRow,
  removeClientSyncedAttendance,
} from "../../client/attendance/attendanceSync.service.js";

const VALID_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "WFH",
  "LEAVE",
];

// Rows written from this screen are tagged so the client-portal sync never
// overwrites a Super Admin decision (see attendanceSync.service.js).
const SOURCE_ADMIN = "ADMIN";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const fail = (res, err) =>
  res
    .status(err?.status || 500)
    .json({ success: false, message: err?.message || "Request failed" });

const normalizeStatus = (status) => {
  if (!status) return null;
  const s = String(status).trim().toUpperCase().replace(/\s+/g, "_");
  return VALID_STATUSES.includes(s) ? s : null;
};

const normalizeDate = (value) => {
  const s = String(value ?? "").trim().slice(0, 10);
  if (!DATE_RE.test(s)) throw httpError(400, "Date is required (YYYY-MM-DD)");
  return s;
};

// "HH:MM" | "HH:MM:SS" | "" | null -> "HH:MM:SS" | null
// Blank times become NULL instead of '' (which MySQL rejects for TIME).
const normalizeTime = (value, label) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(TIME_RE);
  if (!m) throw httpError(400, `${label} must be a valid time (HH:MM)`);
  return `${m[1]}:${m[2]}:${m[3] || "00"}`;
};

const isClientSource = (value) => {
  const s = String(value || "").toLowerCase();
  return s === "client" || s === "client_portal";
};

const hasKey = (body, key) =>
  Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;

const getMarker = (req) => ({
  id: req.user?.id || null,
  name: req.user?.name || null,
  role: req.user?.role || "SUPER_ADMIN",
});

/**
 * Resolve the shift picked in the Add / Edit modal to a snapshot that is
 * stored on the attendance row. Shift start = check-in window start, shift
 * end = check-out window start (same convention saveShiftTimings uses for
 * login_settings). Returns null when no shift was chosen.
 */
const resolveShift = async (shiftId) => {
  if (shiftId === undefined || shiftId === null || shiftId === "") return null;

  const id = Number(shiftId);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, "Invalid shift");

  const [rows] = await db.query(
    `SELECT id, name, check_in_start, check_out_start
       FROM shift_timings
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
  if (!rows.length) {
    throw httpError(400, "Selected shift no longer exists. Refresh and pick again.");
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    start: rows[0].check_in_start,
    end: rows[0].check_out_start,
  };
};

/* =========================================
GET ALL ATTENDANCE
========================================= */
export const getAllAttendance = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    // Internal attendance + client-portal attendance in a single feed.
    // Client rows are tagged with source='client' and the client_code so the
    // tracker can show where they came from. Shift columns prefer the
    // snapshot taken when the row was marked and fall back to the live shift.
    // CLIENT-sourced mirror rows (written by attendanceSync for HR/IT views)
    // are skipped here: the original client_attendance row below already
    // represents them, and listing both would duplicate every client entry.
    let query = `
      SELECT * FROM (
        SELECT a.id, a.employee_id, a.date, a.check_in, a.check_out, a.status,
               COALESCE(a.is_active, 1) AS is_active,
               a.method, a.geo_status, a.created_at, a.updated_at,
               LOWER(COALESCE(a.source, 'internal')) AS source, a.client_id,
               NULL AS client_code,
               NULL AS client_name,
               e.employeeCode, COALESCE(e.name, a.employee_name) AS name,
               COALESCE(e.name, a.employee_name) AS employee_name,
               a.shift_id,
               COALESCE(a.shift_name, st.name) AS shift_name,
               COALESCE(a.shift_start, st.check_in_start) AS shift_start,
               COALESCE(a.shift_end, st.check_out_start) AS shift_end,
               a.marked_by_id, a.marked_by_name, a.marked_by_role, a.marked_by_at
          FROM super_admin_attendance a
          LEFT JOIN employees e ON a.employee_id = e.id
          LEFT JOIN shift_timings st ON st.id = a.shift_id
         WHERE COALESCE(a.source, '') <> 'CLIENT'
        UNION ALL
        SELECT ca.id, ca.employee_id, ca.attendance_date AS date,
               TIME(ca.check_in) AS check_in, TIME(ca.check_out) AS check_out,
               UPPER(ca.status) AS status,
               1 AS is_active,
               'client_portal' AS method, NULL AS geo_status,
               ca.createdAt AS created_at, ca.updatedAt AS updated_at,
               'client' AS source, ca.client_id, c.client_code,
               COALESCE(c.company_name, c.client_name) AS client_name,
               ce.employeeCode, ce.name,
               ce.name AS employee_name,
               NULL AS shift_id, NULL AS shift_name, NULL AS shift_start, NULL AS shift_end,
               NULL AS marked_by_id,
               COALESCE(c.company_name, c.client_name) AS marked_by_name,
               'CLIENT' AS marked_by_role,
               ca.updatedAt AS marked_by_at
          FROM client_attendance ca
          LEFT JOIN client_employees ce ON ce.id = ca.employee_id
          LEFT JOIN clients c ON c.id = ca.client_id
      ) t
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (t.name LIKE ? OR t.employeeCode LIKE ? OR t.client_code LIKE ? OR t.client_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const normalizedFilter = normalizeStatus(status);
    if (normalizedFilter) {
      query += ` AND t.status = ?`;
      params.push(normalizedFilter);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC`;

    const [rows] = await db.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    fail(res, err);
  }
};

/* =========================================
GET EMPLOYEES (FOR DROPDOWN)
========================================= */
export const getEmployeesList = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, employeeCode, name 
      FROM employees 
      WHERE isActive = 1
      ORDER BY name ASC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    fail(res, err);
  }
};

/* =========================================
CREATE (one row per employee per day)
A second "Add" for the same employee + date updates the existing row instead
of producing a duplicate, so the HR / IT dashboards never show two records
for one day.
========================================= */
export const createAttendance = async (req, res) => {
  try {
    const body = req.body || {};

    const employeeId = Number(body.employee_id);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      throw httpError(400, "Please select an employee");
    }

    const [[employee]] = await db.query(
      `SELECT id, name FROM employees WHERE id = ? LIMIT 1`,
      [employeeId]
    );
    if (!employee) throw httpError(404, "Employee not found");

    const date = normalizeDate(body.date);
    const status = normalizeStatus(body.status) || "PRESENT";
    const checkIn = normalizeTime(body.check_in, "Check-in");
    const checkOut = normalizeTime(body.check_out, "Check-out");
    const isActive = hasKey(body, "is_active") ? (body.is_active ? 1 : 0) : 1;
    const shift = await resolveShift(body.shift_id);
    const marker = getMarker(req);

    const [existing] = await db.query(
      `SELECT id FROM super_admin_attendance
        WHERE employee_id = ? AND date = ?
        ORDER BY id ASC
        LIMIT 1`,
      [employeeId, date]
    );

    if (existing.length) {
      await db.query(
        `UPDATE super_admin_attendance
            SET employee_name = ?,
                check_in = ?,
                check_out = ?,
                status = ?,
                is_active = ?,
                method = COALESCE(method, 'MANUAL'),
                source = ?,
                shift_id = ?,
                shift_name = ?,
                shift_start = ?,
                shift_end = ?,
                marked_by_id = ?,
                marked_by_name = ?,
                marked_by_role = ?,
                marked_by_at = NOW()
          WHERE id = ?`,
        [
          employee.name,
          checkIn,
          checkOut,
          status,
          isActive,
          SOURCE_ADMIN,
          shift?.id ?? null,
          shift?.name ?? null,
          shift?.start ?? null,
          shift?.end ?? null,
          marker.id,
          marker.name,
          marker.role,
          existing[0].id,
        ]
      );

      return res.json({
        success: true,
        id: existing[0].id,
        updated: true,
        message: "Attendance for this employee and date already existed and was updated",
      });
    }

    const [result] = await db.query(
      `INSERT INTO super_admin_attendance
        (employee_id, employee_name, date, check_in, check_out, status, is_active,
         method, source,
         shift_id, shift_name, shift_start, shift_end,
         marked_by_id, marked_by_name, marked_by_role, marked_by_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        employee.id,
        employee.name,
        date,
        checkIn,
        checkOut,
        status,
        isActive,
        SOURCE_ADMIN,
        shift?.id ?? null,
        shift?.name ?? null,
        shift?.start ?? null,
        shift?.end ?? null,
        marker.id,
        marker.name,
        marker.role,
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    fail(res, err);
  }
};

/* =========================================
UPDATE
========================================= */
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (isClientSource(req.query.source) || isClientSource(body.source)) {
      throw httpError(
        400,
        "Client portal records are managed by the client. Edit them in the Client Portal."
      );
    }

    const [[existing]] = await db.query(
      `SELECT id FROM super_admin_attendance WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!existing) throw httpError(404, "Attendance record not found");

    const marker = getMarker(req);

    const sets = [
      "source = ?",
      "marked_by_id = ?",
      "marked_by_name = ?",
      "marked_by_role = ?",
      "marked_by_at = NOW()",
    ];
    const params = [SOURCE_ADMIN, marker.id, marker.name, marker.role];

    if (hasKey(body, "check_in")) {
      sets.push("check_in = ?");
      params.push(normalizeTime(body.check_in, "Check-in"));
    }
    if (hasKey(body, "check_out")) {
      sets.push("check_out = ?");
      params.push(normalizeTime(body.check_out, "Check-out"));
    }
    if (hasKey(body, "is_active")) {
      sets.push("is_active = ?");
      params.push(body.is_active ? 1 : 0);
    }

    const status = normalizeStatus(body.status);
    if (status) {
      sets.push("status = ?");
      params.push(status);
    }

    if (body.date) {
      sets.push("date = ?");
      params.push(normalizeDate(body.date));
    }
    if (body.employee_name) {
      sets.push("employee_name = ?");
      params.push(String(body.employee_name).trim());
    }

    // shift_id present in the payload: "" / null clears the shift, an id
    // re-snapshots it. Omitted: leave the stored shift untouched.
    if (hasKey(body, "shift_id")) {
      const shift = await resolveShift(body.shift_id);
      sets.push("shift_id = ?", "shift_name = ?", "shift_start = ?", "shift_end = ?");
      params.push(
        shift?.id ?? null,
        shift?.name ?? null,
        shift?.start ?? null,
        shift?.end ?? null
      );
    }

    params.push(existing.id);

    await db.query(
      `UPDATE super_admin_attendance
          SET ${sets.join(", ")}
        WHERE id = ?`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
};

/* =========================================
DELETE
========================================= */
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    if (isClientSource(req.query.source)) {
      // Capture the row first so the CLIENT-sourced mirror row in
      // super_admin_attendance is cleaned up too (fail-safe).
      const clientRow = await getClientAttendanceRow(Number(id));
      if (!clientRow) {
        return res
          .status(404)
          .json({ success: false, message: "Attendance record not found" });
      }

      await db.query(`DELETE FROM client_attendance WHERE id = ?`, [clientRow.id]);
      await removeClientSyncedAttendance(clientRow);

      return res.json({ success: true, message: "Attendance deleted successfully" });
    }

    const [result] = await db.query(
      `DELETE FROM super_admin_attendance WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res
        .status(404)
        .json({ success: false, message: "Attendance record not found" });
    }

    res.json({ success: true, message: "Attendance deleted successfully" });
  } catch (err) {
    fail(res, err);
  }
};

/* =========================================
GET GLOBAL ATTENDANCE SETTINGS
The Admin page reads the same login_settings row used by attendance.
Only columns that exist in this project schema are queried/updated.
========================================= */
export const getAttendanceSettings = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT default_login_time, default_logout_time,
             grace_period, late_threshold, updated_at
      FROM login_settings
      ORDER BY id ASC
      LIMIT 1
    `);

    const row = rows[0];
    res.json({
      success: true,
      data: {
        shiftStartTime: row?.default_login_time ?? null,
        shiftEndTime: row?.default_logout_time ?? null,
        gracePeriod: row?.grace_period ?? null,
        lateThreshold: row?.late_threshold ?? null,
        halfDayThreshold: null,
        autoPresentEnabled: false,
        autoAbsentEnabled: false,
        updatedAt: row?.updated_at ?? null,
      },
    });
  } catch (err) {
    console.error("attendance settings get error:", err);
    fail(res, err);
  }
};

export const updateAttendanceSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const shiftStartTime = body.shiftStartTime ?? body.shift_start_time ?? body.defaultLoginTime ?? null;
    const shiftEndTime = body.shiftEndTime ?? body.shift_end_time ?? body.defaultLogoutTime ?? null;
    const gracePeriod = Number(body.gracePeriod ?? body.grace_period ?? 0);
    const lateThreshold = Number(body.lateThreshold ?? body.late_threshold ?? 0);

    const [existing] = await db.query("SELECT id FROM login_settings ORDER BY id ASC LIMIT 1");
    if (existing.length) {
      await db.query(
        `UPDATE login_settings
         SET default_login_time=?, default_logout_time=?, grace_period=?, late_threshold=?
         WHERE id=?`,
        [shiftStartTime || null, shiftEndTime || null, gracePeriod, lateThreshold, existing[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO login_settings
         (default_login_time, default_logout_time, grace_period, late_threshold)
         VALUES (?,?,?,?)`,
        [shiftStartTime || null, shiftEndTime || null, gracePeriod, lateThreshold]
      );
    }

    return getAttendanceSettings(req, res);
  } catch (err) {
    console.error("attendance settings update error:", err);
    fail(res, err);
  }
};

/* =========================================
GET IT / HR PORTAL SHIFT TIMINGS
Reads the exact shared shift_timings table written by the IT Developer portal.
========================================= */
export const getShiftTimings = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id, name,
        TIME_FORMAT(check_in_start, '%H:%i') AS checkInStart,
        TIME_FORMAT(check_in_end, '%H:%i') AS checkInEnd,
        TIME_FORMAT(check_out_start, '%H:%i') AS checkOutStart,
        TIME_FORMAT(check_out_end, '%H:%i') AS checkOutEnd,
        grace_minutes AS graceMinutes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM shift_timings
      ORDER BY id ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("shift timings get error:", err);
    fail(res, err);
  }
};
