import { db } from "../../../config/db.js";

const CALL_STATUS_INTERVIEW_SCHEDULED = 6;

// helper
const getClientId = async (client_code) => {
  const [rows] = await db.query(
    `SELECT id FROM clients WHERE client_code = ? LIMIT 1`,
    [client_code],
  );

  if (!rows.length) throw new Error("Client not found");

  return rows[0].id;
};

// ================= GET
// Shows every interview HR has scheduled for this client, plus interviews the
// client already decided on (kept visible as history even if HR later moves the
// call status to SELECTED / REJECTED).
export const getClientInterviewsService = async (client_code) => {
  const client_id = await getClientId(client_code);

  const [rows] = await db.query(
    `SELECT ci.*, l.name AS language_name
     FROM client_interviews ci
     LEFT JOIN languages l ON l.id = ci.language_id
     WHERE ci.client_id = ?
       AND (ci.call_status_id = ? OR ci.client_status <> 'pending')
     ORDER BY ci.interview_date DESC, ci.interview_time DESC, ci.created_at DESC`,
    [client_id, CALL_STATUS_INTERVIEW_SCHEDULED],
  );
  return rows;
};

// ================= UPDATE
export const updateClientDecisionService = async (client_code, id, payload) => {
  const client_id = await getClientId(client_code);

  const { client_status, client_remarks } = payload || {};
  const remarks = String(client_remarks || "").trim();

  if (!["accepted", "rejected"].includes(client_status)) {
    throw new Error("Invalid status");
  }
  if (!remarks) {
    throw new Error("Remarks are required");
  }

  const [existing] = await db.query(
    `SELECT client_status FROM client_interviews WHERE id = ? AND client_id = ? LIMIT 1`,
    [id, client_id],
  );

  if (!existing.length) throw new Error("Interview not found");
  if (existing[0].client_status !== "pending") {
    throw new Error("Decision already submitted for this candidate");
  }

  await db.query(
    `UPDATE client_interviews
     SET client_status = ?, client_remarks = ?, client_decided_at = NOW()
     WHERE id = ? AND client_id = ?`,
    [client_status, remarks, id, client_id],
  );
};
