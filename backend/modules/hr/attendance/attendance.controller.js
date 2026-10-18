import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as service from "./attendance.service.js";

/* =========================================
GET ATTENDANCE
========================================= */
export const getAttendance = asyncHandler(async (req, res) => {
  const { rows, scope, viewer } = await service.getAttendanceFeed(req);

  res.json({
    success: true,
    data: rows,
    scope,
    viewer,
  });
});

/* =========================================
CHECK-IN
========================================= */
export const checkIn = asyncHandler(async (req, res) => {
  await service.checkIn(req);

  res.json({
    success: true,
    message: "Checked in successfully",
  });
});

/* =========================================
CHECK-OUT
========================================= */
export const checkOut = asyncHandler(async (req, res) => {
  await service.checkOut(req);

  res.json({
    success: true,
    message: "Checked out successfully",
  });
});

/* =========================================
SHIFT TIMINGS (GLOBAL SETTINGS)
========================================= */
export const getShiftTimings = asyncHandler(async (req, res) => {
  const data = await service.getShiftTimings();

  res.json({
    success: true,
    data,
  });
});

export const saveShiftTimings = asyncHandler(async (req, res) => {
  const shifts = Array.isArray(req.body) ? req.body : req.body?.shifts;
  const data = await service.saveShiftTimings(shifts || []);

  res.json({
    success: true,
    message: "Shift timings saved",
    data,
  });
});
/* =========================================
EXPORT ATTENDANCE (CSV)
========================================= */
export const exportAttendance = asyncHandler(async (req, res) => {
  const rows = await service.getAttendance(req);
  const list = Array.isArray(rows) ? rows : (rows?.data || rows?.records || []);

  const pick = (row, keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return row[k];
    }
    return "";
  };

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const header = [
    "Employee",
    "Department",
    "Date",
    "Expected Login",
    "Actual Login",
    "Expected Logout",
    "Actual Logout",
    "Hours",
    "Status",
  ];

  const lines = [header.map(esc).join(",")];

  for (const row of list) {
    lines.push([
      pick(row, ["employeeName", "employee_name", "name", "employee"]),
      pick(row, ["department", "dept"]),
      pick(row, ["date", "attendanceDate", "attendance_date"]),
      pick(row, ["expectedLogin", "expected_login"]),
      pick(row, ["actualLogin", "actual_login", "checkIn", "check_in"]),
      pick(row, ["expectedLogout", "expected_logout"]),
      pick(row, ["actualLogout", "actual_logout", "checkOut", "check_out"]),
      pick(row, ["hours", "totalHours", "total_hours"]),
      pick(row, ["status"]),
    ].map(esc).join(","));
  }

  const csv = lines.join("\n");
  const filename = `attendance-export-${new Date().toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});
