import { db } from "../../../config/db.js";

// client_interviews stores hr_employee_id (there is NO hr_name column); the HR
// name comes from the employees join, which is also what /hr-list returns.
const INTERVIEW_FROM = `
    FROM client_interviews ci
    LEFT JOIN employees e ON e.id = ci.hr_employee_id
    LEFT JOIN clients c ON c.id = ci.client_id
    LEFT JOIN languages l ON l.id = ci.language_id`;

// DATE/TIME columns reject '' in strict mode; treat blank as NULL.
const blankToNull = (v) => (v === "" ? null : v);

/* =========================
   GET ALL INTERVIEWS (search + filter + pagination)
========================= */
export const getAllInterviews = async (queryParams = {}) => {
  const {
    page = 1, limit = 50, search = "", hr = "",
    status = "", call_status = "", joined = "",
    job_profile = "", language_id = "",
  } = queryParams;

  const parsedPage = Math.max(1, Number(page));
  const parsedLimit = Math.max(1, Number(limit));
  const offset = (parsedPage - 1) * parsedLimit;

  let where = ` WHERE 1=1`;
  const values = [];

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    where += ` AND (ci.candidate_name LIKE ? OR ci.candidate_phone LIKE ? OR ci.job_profile LIKE ?)`;
    values.push(s, s, s);
  }

  if (hr) {
    // the HR dropdown submits the name (from /hr-list); a numeric employee id also works
    if (/^\d+$/.test(String(hr))) {
      where += ` AND ci.hr_employee_id = ?`;
      values.push(Number(hr));
    } else {
      where += ` AND e.name = ?`;
      values.push(hr);
    }
  }
  if (status) { where += ` AND ci.client_status = ?`; values.push(status); }
  if (call_status) { where += ` AND ci.call_status_id = ?`; values.push(Number(call_status)); }
  if (joined) { where += ` AND ci.joined = ?`; values.push(joined); }
  if (job_profile) { where += ` AND ci.job_profile = ?`; values.push(job_profile); }
  if (language_id) { where += ` AND ci.language_id = ?`; values.push(Number(language_id)); }

  const sql = `
    SELECT ci.*, e.name AS hr_name, c.client_code, c.company_name, l.name AS language_name
    ${INTERVIEW_FROM}${where}
    ORDER BY ci.id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS total ${INTERVIEW_FROM}${where}`;

  const [rows] = await db.query(sql, [...values, parsedLimit, offset]);
  const [countResult] = await db.query(countSql, values);
  const totalRows = countResult[0]?.total || 0;

  return {
    rows,
    totalRows,
    currentPage: parsedPage,
    totalPages: Math.ceil(totalRows / parsedLimit),
  };
};

/* =========================
   CLIENT DECISIONS (Interview Tracker outcomes)
   HR schedules -> client accepts/rejects in the client portal -> rows land here.
========================= */
const CLIENT_DECISIONS = ["accepted", "rejected"];
const CALL_STATUS_INTERVIEW_SCHEDULED = 6;

export const getClientDecisions = async (queryParams = {}) => {
  const {
    page = 1, limit = 50, search = "", decision = "",
    hr = "", client = "", joined = "",
  } = queryParams;

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(500, Math.max(1, Number(limit) || 50));
  const offset = (parsedPage - 1) * parsedLimit;

  let where = ` WHERE ci.client_status <> 'pending'`;
  const values = [];

  if (CLIENT_DECISIONS.includes(decision)) {
    where += ` AND ci.client_status = ?`;
    values.push(decision);
  }
  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    where += ` AND (ci.candidate_name LIKE ? OR ci.candidate_phone LIKE ? OR ci.job_profile LIKE ? OR c.company_name LIKE ? OR c.client_code LIKE ?)`;
    values.push(s, s, s, s, s);
  }
  if (hr) {
    if (/^\d+$/.test(String(hr))) {
      where += ` AND ci.hr_employee_id = ?`;
      values.push(Number(hr));
    } else {
      where += ` AND e.name LIKE ?`;
      values.push(`%${String(hr).trim()}%`);
    }
  }
  if (client) {
    if (/^\d+$/.test(String(client))) {
      where += ` AND ci.client_id = ?`;
      values.push(Number(client));
    } else {
      where += ` AND c.client_code = ?`;
      values.push(String(client).trim());
    }
  }
  if (joined === "Yes" || joined === "No") {
    where += ` AND ci.joined = ?`;
    values.push(joined);
  }

  const sql = `
    SELECT ci.*, e.name AS hr_name, c.client_code, c.company_name, l.name AS language_name,
           COALESCE(ci.client_decided_at, ci.updated_at) AS decided_at
    ${INTERVIEW_FROM}${where}
    ORDER BY decided_at DESC, ci.id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS total ${INTERVIEW_FROM}${where}`;

  const [rows] = await db.query(sql, [...values, parsedLimit, offset]);
  const [countResult] = await db.query(countSql, values);
  const totalRows = countResult[0]?.total || 0;

  return {
    rows,
    totalRows,
    currentPage: parsedPage,
    totalPages: Math.max(1, Math.ceil(totalRows / parsedLimit)),
  };
};

export const getClientDecisionSummary = async () => {
  const [[row]] = await db.query(
    `SELECT
       SUM(client_status = 'pending' AND call_status_id = ?) AS awaiting,
       SUM(client_status = 'accepted') AS accepted,
       SUM(client_status = 'rejected') AS rejected,
       SUM(client_status = 'accepted' AND joined = 'Yes') AS joined
     FROM client_interviews`,
    [CALL_STATUS_INTERVIEW_SCHEDULED],
  );
  return {
    awaiting: Number(row?.awaiting || 0),
    accepted: Number(row?.accepted || 0),
    rejected: Number(row?.rejected || 0),
    joined: Number(row?.joined || 0),
  };
};

/* =========================
   GET SCHEDULED INTERVIEWS (legacy, with JOINs)
========================= */
export const getScheduledInterviews = async ({
  page = 1, limit = 50, search = "", client = "", hr = "",
  status = "", call_status = "", joined = "", job_profile = "", language_id = "",
}) => {
  const offset = (page - 1) * limit;

  let query = `
    SELECT ci.*, c.client_code, c.company_name,
           e.name AS hr_name, l.name AS language_name
    FROM client_interviews ci
    LEFT JOIN clients c ON c.id = ci.client_id
    LEFT JOIN employees e ON e.id = ci.hr_employee_id
    LEFT JOIN languages l ON l.id = ci.language_id
    WHERE 1=1
  `;

  const values = [];

  if (search) { query += ` AND (ci.candidate_name LIKE ? OR ci.candidate_phone LIKE ?)`; values.push(`%${search}%`, `%${search}%`); }
  if (client) { query += ` AND ci.client_id = ?`; values.push(Number(client)); }
  if (hr) { query += ` AND ci.hr_employee_id = ?`; values.push(Number(hr)); }
  if (status) { query += ` AND ci.client_status = ?`; values.push(status); }
  if (joined) { query += ` AND ci.joined = ?`; values.push(joined); }
  if (job_profile) { query += ` AND ci.job_profile = ?`; values.push(job_profile); }
  if (language_id) { query += ` AND ci.language_id = ?`; values.push(Number(language_id)); }
  if (call_status) { query += ` AND ci.call_status_id = ?`; values.push(Number(call_status)); }

  query += ` ORDER BY ci.created_at DESC LIMIT ? OFFSET ?`;
  values.push(Number(limit), Number(offset));

  const [rows] = await db.query(query, values);

  let countQuery = `
    SELECT COUNT(*) as total
    FROM client_interviews ci
    LEFT JOIN clients c ON c.id = ci.client_id
    LEFT JOIN employees e ON e.id = ci.hr_employee_id
    WHERE 1=1
  `;
  const countValues = [];

  if (search) { countQuery += ` AND (ci.candidate_name LIKE ? OR ci.candidate_phone LIKE ?)`; countValues.push(`%${search}%`, `%${search}%`); }
  if (client) { countQuery += ` AND ci.client_id = ?`; countValues.push(Number(client)); }
  if (hr) { countQuery += ` AND ci.hr_employee_id = ?`; countValues.push(Number(hr)); }
  if (status) { countQuery += ` AND ci.client_status = ?`; countValues.push(status); }
  if (joined) { countQuery += ` AND ci.joined = ?`; countValues.push(joined); }
  if (call_status) { countQuery += ` AND ci.call_status_id = ?`; countValues.push(Number(call_status)); }
  if (job_profile) { countQuery += ` AND ci.job_profile = ?`; countValues.push(job_profile); }
  if (language_id) { countQuery += ` AND ci.language_id = ?`; countValues.push(Number(language_id)); }

  const [[{ total }]] = await db.query(countQuery, countValues);

  return { rows, total, totalPages: Math.ceil(total / limit) };
};

/* =========================
   HR LIST DROPDOWN (names come from the employees join)
========================= */
export const getUniqueHRList = async () => {
  const [rows] = await db.query(`
    SELECT DISTINCT e.name AS hr_name
    FROM client_interviews ci
    JOIN employees e ON e.id = ci.hr_employee_id
    WHERE ci.hr_employee_id IS NOT NULL
    ORDER BY e.name ASC
  `);
  return rows;
};

/* =========================
   GET BY ID
========================= */
export const getInterviewById = async (id) => {
  const [rows] = await db.query(`SELECT * FROM client_interviews WHERE id = ?`, [id]);
  if (!rows.length) throw new Error("Interview not found");
  return rows[0];
};

/* =========================
   CREATE
========================= */
export const createCandidate = async (data) => {
  if (!data.candidate_name) throw new Error("candidate_name required");
  if (!data.candidate_phone) throw new Error("candidate_phone required");

  const [result] = await db.query(
    `INSERT INTO client_interviews (
      candidate_name, candidate_phone, job_profile, language_id,
      experience, current_ctc, expected_ctc, notice_period, hr_employee_id,
      client_id, call_status_id, interview_date, interview_time,
      selection_date, joining_date, client_status, joined, cv_file
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.candidate_name, data.candidate_phone, data.job_profile || null,
      data.language_id || null, data.experience || null, data.current_ctc || null,
      data.expected_ctc || null, data.notice_period || null, data.hr_employee_id || null,
      data.client_id || null, data.call_status_id || 1, data.interview_date || null,
      data.interview_time || null, data.selection_date || null, data.joining_date || null,
      data.client_status || "pending", data.joined || "No", data.cv_file || null,
    ]
  );

  return getInterviewById(result.insertId);
};

/* =========================
   UPDATE (full row)
========================= */
export const updateCandidate = async (id, data) => {
  const old = await getInterviewById(id);

  const updated = {
    candidate_name: data.candidate_name ?? old.candidate_name,
    candidate_phone: data.candidate_phone ?? old.candidate_phone,
    job_profile: data.job_profile ?? old.job_profile,
    language_id: data.language_id ?? old.language_id,
    experience: data.experience ?? old.experience,
    current_ctc: data.current_ctc ?? old.current_ctc,
    expected_ctc: data.expected_ctc ?? old.expected_ctc,
    notice_period: data.notice_period ?? old.notice_period,
    hr_employee_id: data.hr_employee_id ?? old.hr_employee_id,
    client_id: data.client_id ?? old.client_id,
    call_status_id: data.call_status_id ?? old.call_status_id,
    interview_date: blankToNull(data.interview_date ?? old.interview_date),
    interview_time: blankToNull(data.interview_time ?? old.interview_time),
    selection_date: blankToNull(data.selection_date ?? old.selection_date),
    joining_date: blankToNull(data.joining_date ?? old.joining_date),
    client_status: data.client_status ?? old.client_status,
    joined: data.joined ?? old.joined,
    cv_file: data.cv_file ?? old.cv_file,
  };

  await db.query(
    `UPDATE client_interviews SET
      candidate_name=?, candidate_phone=?, job_profile=?, language_id=?,
      experience=?, current_ctc=?, expected_ctc=?, notice_period=?, hr_employee_id=?,
      client_id=?, call_status_id=?, interview_date=?, interview_time=?,
      selection_date=?, joining_date=?, client_status=?, joined=?, cv_file=?
    WHERE id=?`,
    [
      updated.candidate_name, updated.candidate_phone, updated.job_profile,
      updated.language_id, updated.experience, updated.current_ctc,
      updated.expected_ctc, updated.notice_period, updated.hr_employee_id,
      updated.client_id, updated.call_status_id, updated.interview_date,
      updated.interview_time, updated.selection_date, updated.joining_date,
      updated.client_status, updated.joined, updated.cv_file, id,
    ]
  );

  return getInterviewById(id);
};

/* =========================
   UPDATE JOINED STATUS (partial update: only the keys that were sent)
========================= */
export const updateJoinedStatus = async (id, { joined, joining_date, selection_date } = {}) => {
  await getInterviewById(id); // throws "Interview not found"

  const sets = [];
  const values = [];

  if (joined !== undefined) {
    if (!["Yes", "No"].includes(joined)) throw new Error("joined must be 'Yes' or 'No'");
    sets.push("joined=?");
    values.push(joined);
  }
  if (joining_date !== undefined) { sets.push("joining_date=?"); values.push(blankToNull(joining_date)); }
  if (selection_date !== undefined) { sets.push("selection_date=?"); values.push(blankToNull(selection_date)); }

  if (!sets.length) throw new Error("Nothing to update");

  await db.query(`UPDATE client_interviews SET ${sets.join(", ")} WHERE id=?`, [...values, id]);
  return getInterviewById(id);
};

/* =========================
   DELETE
========================= */
export const deleteCandidate = async (id) => {
  const existing = await getInterviewById(id);
  if (!existing) throw new Error("Not found");
  await db.query(`DELETE FROM client_interviews WHERE id=?`, [id]);
  return true;
};
