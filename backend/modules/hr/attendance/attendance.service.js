import { db } from "../../../config/db.js";

const HR_DEPARTMENT_PATTERN = /^(hr|human\s*resources?)$/i;

const getViewer = async (employeeId) => {
  const [rows] = await db.query(
    `SELECT e.id, e.departmentId, d.name AS departmentName
       FROM employees e
       LEFT JOIN departments d ON d.id = e.departmentId
      WHERE e.id = ?
      LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
};

const isHrViewer = (viewer) =>
  HR_DEPARTMENT_PATTERN.test(String(viewer?.departmentName || "").trim());

/*
 * Visibility rules for the shared HR / IT attendance feed:
 *   - HR department  -> every employee in the company ("all")
 *   - other portals  -> only their own department ("department")
 *   - ?scope=me      -> the viewer's personal records
 * A non-HR viewer asking for "all" is narrowed to their department.
 */
export const resolveScope = (requested, viewer) => {
  const wanted = String(requested || "").toLowerCase();
  const hr = isHrViewer(viewer);

  if (wanted === "me") return "me";
  if (wanted === "all") return hr ? "all" : "department";
  if (wanted === "department") return "department";
  return hr ? "all" : "department";
};

export const getAttendanceFeed = async (req) => {
  const { date, fromDate, toDate, status, department } = req.query;

  const employeeId = Number(req.employee?.id);
  if (!employeeId) {
    throw new Error("Authenticated HR employee required");
  }

  const viewer = await getViewer(employeeId);
  let scope = resolveScope(req.query.scope, viewer);
  if (scope === "department" && !viewer?.departmentId) {
    scope = "me";
  }

  /*
   * Backward compatibility:
   *   ?date=YYYY-MM-DD
   *
   * History:
   *   ?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
   *
   * If no date filter is supplied, return all available attendance
   * history for the resolved scope.
   */
  let dateCondition = "";
  const params = [];

  if (date) {
    dateCondition = " AND a.date = ?";
    params.push(date);
  } else {
    if (fromDate) {
      dateCondition += " AND a.date >= ?";
      params.push(fromDate);
    }

    if (toDate) {
      dateCondition += " AND a.date <= ?";
      params.push(toDate);
    }
  }

  let query = `
    SELECT
      a.id,
      e.id AS employeeId,
      e.employeeCode,
      e.name AS employee,
      d.name AS department,

      a.date AS attendanceDate,

      COALESCE(a.shift_start, st.check_in_start, ls.default_login_time) AS expectedLogin,
      a.check_in AS actualLogin,

      COALESCE(a.shift_end, st.check_out_start, ls.default_logout_time) AS expectedLogout,
      a.check_out AS actualLogout,

      IF(
        a.check_in IS NOT NULL AND a.check_out IS NOT NULL,
        ROUND(TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) / 60, 2),
        0
      ) AS hours,

      CASE
        WHEN a.status = 'PRESENT' THEN 'present'
        WHEN a.status = 'ABSENT' THEN 'absent'
        WHEN a.status = 'LATE' THEN 'late'
        WHEN a.status = 'HALF_DAY' THEN 'half_day'
        WHEN a.status = 'LEAVE' THEN 'on_leave'
        WHEN a.status = 'WFH' THEN 'wfh'
        ELSE 'absent'
      END AS status,

      COALESCE(a.method, 'MANUAL') AS method,
      a.source,
      a.geo_status AS geoStatus,
      a.check_in_lat AS checkInLat,
      a.check_in_lng AS checkInLng,
      a.check_out_lat AS checkOutLat,
      a.check_out_lng AS checkOutLng,
      a.office_id AS officeId,
      a.client_id AS clientId,
      COALESCE(a.is_active, 1) AS isActive,

      a.shift_id AS shiftId,
      COALESCE(a.shift_name, st.name) AS shiftName,
      COALESCE(a.shift_start, st.check_in_start) AS shiftStart,
      COALESCE(a.shift_end, st.check_out_start) AS shiftEnd,

      a.marked_by_id AS markedById,
      a.marked_by_name AS markedByName,
      a.marked_by_role AS markedByRole,
      a.marked_by_at AS markedByAt,

      CASE
        WHEN a.marked_by_role = 'SUPER_ADMIN' THEN 'Super Admin'
        WHEN a.source = 'CLIENT' THEN 'Client Portal'
        WHEN a.method = 'GEO' THEN 'GPS / Geo'
        WHEN a.method = 'WIFI' THEN 'WiFi'
        WHEN a.method = 'OTP' THEN 'OTP'
        ELSE 'System / Manual'
      END AS recordedVia,

      a.created_at AS createdAt,
      a.updated_at AS updatedAt

    FROM employees e

    INNER JOIN super_admin_attendance a
      ON a.employee_id = e.id
      ${dateCondition}

    LEFT JOIN departments d
      ON e.departmentId = d.id

    LEFT JOIN shift_timings st
      ON st.id = a.shift_id

    LEFT JOIN login_settings ls
      ON 1 = 1

    WHERE e.isActive = 1
  `;

  if (scope === "me") {
    query += ` AND e.id = ?`;
    params.push(employeeId);
  } else if (scope === "department") {
    query += ` AND e.departmentId = ?`;
    params.push(viewer.departmentId);
  } else if (department) {
    // Company-wide view may narrow to one department by id or name.
    const wanted = String(department).trim();
    if (/^\d+$/.test(wanted)) {
      query += ` AND e.departmentId = ?`;
      params.push(Number(wanted));
    } else {
      query += ` AND d.name = ?`;
      params.push(wanted);
    }
  }

  if (status) {
    query += ` AND a.status = ?`;
    params.push(status.toUpperCase());
  }

  query += `
    ORDER BY a.date DESC, e.name ASC, a.check_in DESC, a.id DESC
  `;

  const [rows] = await db.query(query, params);

  return {
    rows,
    scope,
    viewer: {
      id: viewer?.id ?? employeeId,
      departmentId: viewer?.departmentId ?? null,
      department: viewer?.departmentName ?? null,
    },
  };
};

export const getAttendance = async (req) => {
  const { rows } = await getAttendanceFeed(req);
  return rows;
};

/* =========================================
CHECK-IN
========================================= */
export const checkIn = async (req) => {
  const employee_id = Number(req.employee?.id);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 8);

  const [existing] = await db.query(
    "SELECT id FROM super_admin_attendance WHERE employee_id=? AND date=?",
    [employee_id, today]
  );

  if (existing.length) {
    throw new Error("Already checked in today");
  }

  await db.query(
    `INSERT INTO super_admin_attendance 
     (employee_id, employee_name, date, check_in, status)
     SELECT id, name, ?, ?, 'PRESENT'
     FROM employees WHERE id=?`,
    [today, now, employee_id]
  );
};

/* =========================================
CHECK-OUT
========================================= */
export const checkOut = async (req) => {
  const employee_id = Number(req.employee?.id);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 8);

  const [rows] = await db.query(
    "SELECT id FROM super_admin_attendance WHERE employee_id=? AND date=?",
    [employee_id, today]
  );

  if (!rows.length) {
    throw new Error("No check-in found");
  }

  await db.query(
    "UPDATE super_admin_attendance SET check_out=? WHERE id=?",
    [now, rows[0].id]
  );
};

/* =========================================
SHIFT TIMINGS (LOGIN SETTINGS)
========================================= */
const toHHMM = (t) => (t ? String(t).slice(0, 5) : "");

export const getShiftTimings = async () => {
  const [rows] = await db.query(
    `SELECT * FROM shift_timings ORDER BY id ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    checkInStart: toHHMM(r.check_in_start),
    checkInEnd: toHHMM(r.check_in_end),
    checkOutStart: toHHMM(r.check_out_start),
    checkOutEnd: toHHMM(r.check_out_end),
    graceMinutes: r.grace_minutes,
  }));
};

export const saveShiftTimings = async (shifts) => {
  if (!Array.isArray(shifts)) {
    throw new Error("Shifts must be an array");
  }

  const isTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || "");

  for (const s of shifts) {
    if (!s.name || !String(s.name).trim()) {
      throw new Error("Each shift needs a name");
    }
    for (const k of ["checkInStart", "checkInEnd", "checkOutStart", "checkOutEnd"]) {
      if (!isTime(s[k])) {
        throw new Error(`Invalid time for ${k} in shift "${s.name}"`);
      }
    }
    const grace = Number(s.graceMinutes);
    if (!Number.isInteger(grace) || grace < 0 || grace > 120) {
      throw new Error(`Invalid grace period in shift "${s.name}"`);
    }
  }

  // Keep existing ids stable: attendance rows reference shift_timings.id, so
  // a save must update in place, insert the new ones (the UI gives them a
  // Date.now() placeholder id) and only delete shifts that were removed.
  const [existingRows] = await db.query(`SELECT id FROM shift_timings`);
  const existingIds = new Set(existingRows.map((r) => Number(r.id)));
  const keptIds = [];

  for (const s of shifts) {
    const values = [
      String(s.name).trim(),
      s.checkInStart,
      s.checkInEnd,
      s.checkOutStart,
      s.checkOutEnd,
      Number(s.graceMinutes),
    ];
    const id = Number(s.id);

    if (Number.isInteger(id) && existingIds.has(id)) {
      await db.query(
        `UPDATE shift_timings
            SET name=?, check_in_start=?, check_in_end=?, check_out_start=?, check_out_end=?, grace_minutes=?
          WHERE id=?`,
        [...values, id]
      );
      keptIds.push(id);
    } else {
      const [result] = await db.query(
        `INSERT INTO shift_timings
          (name, check_in_start, check_in_end, check_out_start, check_out_end, grace_minutes)
         VALUES (?,?,?,?,?,?)`,
        values
      );
      keptIds.push(result.insertId);
    }
  }

  if (keptIds.length) {
    await db.query(`DELETE FROM shift_timings WHERE id NOT IN (?)`, [keptIds]);
  } else {
    await db.query(`DELETE FROM shift_timings`);
  }

  // The office default timing (login_settings) is owned by the Super Admin
  // attendance settings and must not be overwritten by shift edits. Only seed
  // it from the first shift when no default exists yet.
  if (shifts.length > 0) {
    const [existing] = await db.query(`SELECT id FROM login_settings LIMIT 1`);
    if (!existing.length) {
      const first = shifts[0];
      await db.query(
        `INSERT INTO login_settings (default_login_time, default_logout_time, grace_period)
         VALUES (?,?,?)`,
        [first.checkInStart, first.checkOutStart, Number(first.graceMinutes)]
      );
    }
  }

  return getShiftTimings();
};