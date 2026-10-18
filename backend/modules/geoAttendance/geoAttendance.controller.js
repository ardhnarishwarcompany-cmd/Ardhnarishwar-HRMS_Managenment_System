import { db } from "../../config/db.js";

/* Haversine distance in meters */
const distanceM = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ---------- Office locations (admin) ---------- */
export const listOffices = async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM office_locations WHERE is_active = 1 ORDER BY id",
    );
    res.json({ success: true, offices: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const createOffice = async (req, res) => {
  try {
    const { name, latitude, longitude, radius_m } = req.body;
    if (!name || latitude == null || longitude == null)
      return res
        .status(400)
        .json({ success: false, message: "name, latitude, longitude required" });
    const [r] = await db.query(
      "INSERT INTO office_locations (name, latitude, longitude, radius_m) VALUES (?,?,?,?)",
      [name, latitude, longitude, radius_m || 200],
    );
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteOffice = async (req, res) => {
  try {
    await db.query(
      "UPDATE office_locations SET is_active = 0 WHERE id = ?",
      [req.params.id],
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------- Geo punches list (admin) ---------- */
export const listGeoPunches = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const [rows] = await db.query(
      `SELECT a.*, o.name AS office_name
       FROM super_admin_attendance a
       LEFT JOIN office_locations o ON o.id = a.office_id
       WHERE a.date = ? AND a.method = 'GEO'
       ORDER BY a.check_in DESC`,
      [date],
    );
    res.json({ success: true, punches: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------- Fence check helper ---------- */
const resolveFence = async (lat, lng) => {
  const [offices] = await db.query(
    "SELECT * FROM office_locations WHERE is_active = 1",
  );
  let nearest = null;
  let nearestDist = Infinity;
  for (const o of offices) {
    const d = distanceM(
      Number(lat),
      Number(lng),
      Number(o.latitude),
      Number(o.longitude),
    );
    if (d < nearestDist) {
      nearestDist = d;
      nearest = o;
    }
  }
  const inside = nearest ? nearestDist <= nearest.radius_m : false;
  return {
    office: nearest,
    distance_m: Number.isFinite(nearestDist) ? Math.round(nearestDist) : null,
    geo_status: inside ? "INSIDE" : "OUTSIDE",
    hasOffices: offices.length > 0,
  };
};

/* ---------- Employee punch (employee token) ---------- */
export const geoPunch = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null)
      return res
        .status(400)
        .json({ success: false, message: "latitude and longitude required" });

    const empId = req.employee?.id || req.employee?.employee_id;
    const empName = req.employee?.name || req.employee?.employee_name || "";
    if (!empId)
      return res.status(401).json({ success: false, message: "No employee in token" });

    const fence = await resolveFence(latitude, longitude);
    const officeName = fence.office?.name || "Office";
    const officeId = fence.office?.id || null;
    const isInside = fence.geo_status === "INSIDE";

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 8);
    const [[existing]] = await db.query(
      "SELECT * FROM super_admin_attendance WHERE employee_id = ? AND date = ?",
      [empId, today],
    );

    if (!existing) {
      // late check: after login setting default time + grace
      const [[ls]] = await db.query("SELECT default_login_time FROM login_settings LIMIT 1");
      const late = ls?.default_login_time && now > ls.default_login_time;
      await db.query(
        `INSERT INTO super_admin_attendance
         (employee_id, employee_name, date, check_in, status, method, check_in_lat, check_in_lng, geo_status, office_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          empId,
          empName,
          today,
          now,
          late ? "LATE" : "PRESENT",
          "GEO",
          latitude,
          longitude,
          fence.geo_status,
          officeId,
        ],
      );
      return res.json({
        success: true,
        action: "check_in",
        message: isInside
          ? `Checked in at ${officeName}`
          : `Checked in (GPS recorded)`,
      });
    }

    if (existing.check_out) {
      await db.query(
        `UPDATE super_admin_attendance
         SET check_in = ?, check_out = NULL, check_in_lat = ?, check_in_lng = ?, geo_status = ?, office_id = ?
         WHERE id = ?`,
        [now, latitude, longitude, fence.geo_status, officeId, existing.id],
      );
      return res.json({
        success: true,
        action: "check_in",
        message: isInside
          ? `Checked in at ${officeName}`
          : `Checked in (GPS recorded)`,
      });
    }

    await db.query(
      `UPDATE super_admin_attendance
       SET check_out = ?, check_out_lat = ?, check_out_lng = ?
       WHERE id = ?`,
      [now, latitude, longitude, existing.id],
    );
    return res.json({
      success: true,
      action: "check_out",
      message: isInside
        ? `Checked out at ${officeName}`
        : `Checked out (GPS recorded)`,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ---------- Today status (employee token) ---------- */
export const geoToday = async (req, res) => {
  try {
    const empId = req.employee?.id || req.employee?.employee_id;
    const today = new Date().toISOString().slice(0, 10);
    const [[row]] = await db.query(
      "SELECT date, check_in, check_out, status, geo_status FROM super_admin_attendance WHERE employee_id = ? AND date = ?",
      [empId, today],
    );
    res.json({ success: true, today: row || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
