import { db } from "../../config/db.js";

export const createComplaint = async (data) => {
  const [res] = await db.query(
    `INSERT INTO complaints 
    (title, description, category, priority, created_by_id, created_by_role, client_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description,
      data.category,
      data.priority,
      data.created_by_id,
      data.created_by_role,
      data.client_id, // ✅ IMPORTANT
    ],
  );

  return res;
};

// GET ALL (ROLE BASED)
// created_by_id is a client id for client complaints and an employee id otherwise,
// so each lookup table is joined only for the roles that own it (ids never collide).
export const getComplaints = async (user) => {
  let query = `
SELECT 
  c.*,

  e.name AS employee_name,
  d.name AS department_name,

  cl.company_name AS client_name

FROM complaints c

LEFT JOIN employees e ON c.created_by_id = e.id AND c.created_by_role NOT IN ('client','admin')
LEFT JOIN departments d ON e.departmentId = d.id

LEFT JOIN clients cl ON c.client_id = cl.id AND c.created_by_role = 'client'

WHERE c.is_active = 1
`;
  let values = [];

  const unrestricted = ["admin", "super_admin", "SUPER_ADMIN", "manager", "MANAGER"].includes(user.role);

  if (!unrestricted && user.role === "employee") {
    query += ` AND c.created_by_id = ? AND c.created_by_role = 'employee' AND c.client_id = ?`;
    values.push(user.id, user.client_id);
  }

  if (!unrestricted && user.role === "client") {
    query += ` AND c.client_id = ?`;
    values.push(user.id);
  }

  if (!unrestricted && user.role === "hr") {
    // BUGFIX: the IT complaint box tells IT staff their complaint is
    // "routed to HR and Super Admin automatically", but this used to only
    // ever show HR their *own* complaints (created_by_role = 'hr'), so an
    // IT-raised complaint was never visible to HR and could never get a
    // reply from them — only Super Admin could see/answer it. HR now also
    // sees complaints raised from the IT portal, matching that promise.
    query += ` AND ((c.created_by_id = ? AND c.created_by_role = 'hr') OR c.created_by_role = 'it')`;
    values.push(user.employee_id || user.id);
  }

  if (!unrestricted && user.role === "sales") {
    query += ` AND c.created_by_id = ? AND c.created_by_role = 'sales'`;
    values.push(user.id);
  }

  // IT developers see only the complaints they raised
  if (!unrestricted && user.role === "it") {
    query += ` AND c.created_by_id = ? AND c.created_by_role = 'it'`;
    values.push(user.id);
  }

  query += ` ORDER BY c.created_at DESC`;

  const [rows] = await db.query(query, values);
  return rows;
};

// GET SINGLE + REPLIES
export const getSingleComplaint = async (id, user) => {
  let query = `
    SELECT
      c.*,
      e.name AS employee_name,
      d.name AS department_name,
      cl.company_name AS client_name
    FROM complaints c
    LEFT JOIN employees e ON c.created_by_id = e.id AND c.created_by_role NOT IN ('client','admin')
    LEFT JOIN departments d ON e.departmentId = d.id
    LEFT JOIN clients cl ON c.client_id = cl.id AND c.created_by_role = 'client'
    WHERE c.id = ?`;
  let values = [id];

  // 🔒 client employee sees only complaints they created
  if (user.role === "employee") {
    query += ` AND c.created_by_id = ? AND c.created_by_role = 'employee' AND c.client_id = ?`;
    values.push(user.id, user.client_id);
  }

  // 🔒 HR sees their own complaints + complaints raised from the IT portal
  // (see matching note in getComplaints above for why 'it' is included)
  if (user.role === "hr") {
    query += ` AND ((c.created_by_id = ? AND c.created_by_role = 'hr') OR c.created_by_role = 'it')`;
    values.push(user.employee_id || user.id);
  }

  // 🔒 client restriction
  if (user.role === "client") {
    query += ` AND c.client_id = ?`;
    values.push(user.id);
  }

  // 🔒 IT developer sees only their own complaint
  if (user.role === "it") {
    query += ` AND c.created_by_id = ? AND c.created_by_role = 'it'`;
    values.push(user.id);
  }

  const [complaint] = await db.query(query, values);

  if (!complaint.length) {
    return { complaint: null, replies: [] };
  }

  // sender_id points at clients for client replies, employees for portal staff,
  // and the admin account for admin/manager replies — resolve by role.
  const [replies] = await db.query(
    `
    SELECT 
      r.*,
      e.name AS employee_name,
      cl.company_name AS client_name,
      CASE
        WHEN r.sender_role = 'client' THEN cl.company_name
        WHEN r.sender_role = 'admin' THEN 'Super Admin'
        ELSE COALESCE(e.name, r.sender_role)
      END AS sender_name
    FROM complaint_replies r
    LEFT JOIN employees e ON r.sender_id = e.id AND r.sender_role NOT IN ('client','admin')
    LEFT JOIN clients cl ON r.sender_id = cl.id AND r.sender_role = 'client'
    WHERE r.complaint_id = ?
    ORDER BY r.created_at ASC
    `,
    [id],
  );

  return {
    complaint: complaint[0],
    replies,
  };
};
// ADD REPLY
export const addReply = async (data) => {
  const [[complaint]] = await db.query(`SELECT id, client_id, created_by_id, created_by_role FROM complaints WHERE id=? AND is_active=1`,[data.complaint_id]);
  if(!complaint) throw new Error("Complaint not found");
  if(data.sender_role==='employee' && (Number(complaint.created_by_id)!==Number(data.sender_id) || complaint.created_by_role!=='employee')) throw new Error("You can only reply to your own complaint");
  if(data.sender_role==='client' && Number(complaint.client_id)!==Number(data.client_id)) throw new Error("Complaint does not belong to this client");
  const [res] = await db.query(`INSERT INTO complaint_replies (complaint_id, message, sender_id, sender_role) VALUES (?, ?, ?, ?)`,[data.complaint_id, data.message, data.sender_id, data.sender_role]); return res;
};

// UPDATE STATUS
export const updateStatus = async (id, status) => {
  const [res] = await db.query(
    `UPDATE complaints SET status = ? WHERE id = ?`,
    [status, id],
  );

  return res;
};


const httpError = (status, message) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

const loadOwned = async (id, user) => {
  const [[c]] = await db.query(
    `SELECT id, status, created_by_id, created_by_role FROM complaints WHERE id = ? AND is_active = 1`,
    [id],
  );
  if (!c) throw httpError(404, "Complaint not found");
  if (
    Number(c.created_by_id) !== Number(user.id) ||
    String(c.created_by_role) !== String(user.role)
  )
    throw httpError(403, "You can only change your own complaint");
  return c;
};

// EDIT (owner only, only while status is open)
export const updateComplaint = async (id, user, data) => {
  const c = await loadOwned(id, user);
  if (c.status !== "open") throw httpError(400, "Only open complaints can be edited");
  const title = String(data.title || "").trim();
  const description = String(data.description || "").trim();
  const priority = String(data.priority || "").toLowerCase();
  if (!title || !description) throw httpError(400, "Title and description are required");
  if (!["low", "medium", "high"].includes(priority)) throw httpError(400, "Invalid priority");
  const [res] = await db.query(
    `UPDATE complaints SET title = ?, description = ?, priority = ? WHERE id = ?`,
    [title.slice(0, 255), description, priority, id],
  );
  return res;
};

// DELETE (owner only, soft delete)
export const deleteComplaint = async (id, user) => {
  await loadOwned(id, user);
  const [res] = await db.query(`UPDATE complaints SET is_active = 0 WHERE id = ?`, [id]);
  return res;
};
