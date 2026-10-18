import { db } from "../../../config/db.js";
import fs from "fs";
import path from "path";
// helper
const getClientId = async (client_code) => {
  const [rows] = await db.query(
    `SELECT id FROM clients WHERE client_code = ? LIMIT 1`,
    [client_code],
  );

  if (!rows.length) throw new Error("Client not found");

  return rows[0].id;
};

// ================= CREATE
export const createInterviewService = async (employee_id, payload) => {
  const {
    candidate_name,
    candidate_phone,
    location,
    job_profile,
    experience,
    current_ctc,
    expected_ctc,
    notice_period,
    client_code,
    interview_date,
    interview_time,
    call_status_id,
    cv_file,
    hr_remarks,
    language_id,
    address,
    lead_id,
  } = payload;

  const client_id = await getClientId(client_code);

  if (!candidate_name || !candidate_phone || !client_id) {
    throw new Error("Missing required fields");
  }

  const [result] = await db.query(
    `INSERT INTO client_interviews
    (candidate_name, candidate_phone, location,job_profile, experience, current_ctc, expected_ctc, notice_period,
    hr_employee_id, client_id, call_status_id, interview_date, interview_time, cv_file, hr_remarks, language_id, address, lead_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      candidate_name,
      candidate_phone,
      location || null,
      job_profile || null,
      experience || null,
      current_ctc || null,
      expected_ctc || null,
      notice_period || null,
      employee_id,
      client_id,
      call_status_id || null,
      interview_date || null,
      interview_time || null,
      cv_file || null,
      hr_remarks || null,
      language_id || null,
      address || null,
      lead_id || null,
    ],
  );

  return { id: result.insertId };
};

// ================= LIST (OWN ONLY + client_code)
export const listInterviewsService = async (employee_id) => {
  const [rows] = await db.query(
    `
    SELECT 
    ci.*,
    c.client_code,
    c.company_name,
    l.name AS language_name
    FROM client_interviews ci
    LEFT JOIN clients c ON c.id = ci.client_id
    LEFT JOIN languages l ON l.id = ci.language_id
    WHERE ci.hr_employee_id = ?
    ORDER BY ci.created_at DESC
    `,
    [employee_id],
  );

  return rows;
};

// ================= UPDATE (HR editable only)
export const updateInterviewService = async (employee_id, id, payload) => {
  const {
    candidate_name,
    candidate_phone,
    location,
    job_profile,
    experience,
    current_ctc,
    expected_ctc,
    notice_period,
    client_code,
    interview_date,
    interview_time,
    call_status_id,
    cv_file,
    hr_remarks,
    language_id,
    address,
    lead_id,
  } = payload;

  const client_id = await getClientId(client_code);

  // get old CV
  const [oldRows] = await db.query(
    `SELECT cv_file FROM client_interviews WHERE id=? AND hr_employee_id=?`,
    [id, employee_id],
  );

  if (!oldRows.length) {
    throw new Error("Interview not found");
  }

  const oldCV = oldRows[0].cv_file;

  // if new CV uploaded use it otherwise keep old
  const finalCV = cv_file || oldCV;

  try {
    if (cv_file && oldCV) {
      const relativePath = oldCV.replace("/uploads", "");

      const oldPath = path.join(process.cwd(), "uploads", relativePath);

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
  } catch (err) {
    console.log(`File delete error: ${err.message}`);
  }

  await db.query(
    `UPDATE client_interviews
      SET
      candidate_name = ?,
      candidate_phone = ?,
      location = ?,
      job_profile = ?,
      experience = ?,
      current_ctc = ?,
      expected_ctc = ?,
      notice_period = ?,
      client_id = ?,
      call_status_id = ?,
      interview_date = ?,
      interview_time = ?,
      cv_file = ?,
      hr_remarks = ?,
      language_id = ?,
      address = ?
     WHERE id = ? AND hr_employee_id = ?`,
    [
      candidate_name,
      candidate_phone,
      location || null,
      job_profile || null,
      experience || null,
      current_ctc || null,
      expected_ctc || null,
      notice_period || null,
      client_id,
      call_status_id || null,
      interview_date || null,
      interview_time || null,
      finalCV,
      hr_remarks || null,
      language_id || null,
      address || null,
      id,
      employee_id,
    ],
  );
};


// ================= GET LOCATIONS
export const getLocationsService = async () => {
  const [rows] = await db.query(
    `SELECT id, name FROM locations ORDER BY name ASC`
  );

  return rows;
};

// ================= GET LANGUAGES
export const getLanguagesService = async () => {
  const [rows] = await db.query(`SELECT id, name FROM languages`);
  return rows;
};

// ================= GET CLIENTS (for the client picker in Add/Edit Interview)
export const getClientsService = async () => {
  const [rows] = await db.query(
    `SELECT id, client_code, company_name, status
     FROM clients
     ORDER BY company_name ASC, client_code ASC`,
  );
  return rows;
};