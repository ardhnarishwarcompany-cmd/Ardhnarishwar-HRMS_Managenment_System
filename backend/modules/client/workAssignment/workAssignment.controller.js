import path from "path";
import fs from "fs";
import { db } from "../../../config/db.js";

/* =========================================
   SHARED FILE RULES
   Client "task files" (attachments) and employee deliverables
   share one allow-list so both sides accept the same formats.
========================================= */
export const FILE_TYPES = {
  video: [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"],
  document: [".pdf", ".txt", ".rtf", ".odt"],
  word: [".doc", ".docx"],
  excel: [".xls", ".xlsx", ".csv"],
  code: [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".cs", ".php", ".html", ".css", ".json", ".xml", ".sql", ".sh", ".yml", ".yaml", ".md", ".zip"],
  other: [],
};

export const ATTACHMENTS_DIR = "uploads/assignment-attachments";
export const DELIVERABLES_DIR = "uploads/assignment-deliverables";

const ATTACHMENTS_DDL = `CREATE TABLE IF NOT EXISTS client_assignment_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  assignment_id INT NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT DEFAULT 0,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_caa_assignment(assignment_id),
  INDEX idx_caa_client(client_id)
)`;

const DELIVERABLES_DDL = `CREATE TABLE IF NOT EXISTS client_assignment_deliverables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  assignment_id INT NOT NULL,
  employee_id INT NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assignment(assignment_id),
  INDEX idx_employee(employee_id)
)`;

let fileTablesReady = false;
const ensureFileTables = async () => {
  if (fileTablesReady) return;
  await db.query(ATTACHMENTS_DDL);
  await db.query(DELIVERABLES_DDL);
  fileTablesReady = true;
};

const resolveClientId = async (req) => {
  if (req.client?.id) return Number(req.client.id);
  if (req.employee?.client_id) return Number(req.employee.client_id);
  const clientCode = req.client?.client_code || req.employee?.client_code;
  if (!clientCode) return null;
  const [rows] = await db.query(
    `SELECT id FROM clients WHERE client_code = ? LIMIT 1`,
    [clientCode],
  );
  return rows[0]?.id ? Number(rows[0].id) : null;
};

const validateUpload = (file, type) => {
  const allowed = FILE_TYPES[type];
  if (!allowed) return "Invalid file type";
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.length && !allowed.includes(ext)) {
    return `Invalid file for ${type}. Allowed: ${allowed.join(", ")}`;
  }
  return null;
};

const publicUrl = (folder, filePath) =>
  `/${folder}/${String(filePath).split(/[\\/]/).pop()}`;

const removeFileQuietly = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

const loadAssignmentForRequest = async (req, res) => {
  const clientId = await resolveClientId(req);
  const assignmentId = Number(req.params.id);
  if (!clientId || !assignmentId) {
    res.status(400).json({ success: false, message: "Invalid assignment" });
    return null;
  }
  const [[assignment]] = await db.query(
    `SELECT id, employee_id, title FROM client_work_assignments WHERE id = ? AND client_id = ?`,
    [assignmentId, clientId],
  );
  if (!assignment) {
    res.status(404).json({ success: false, message: "Assignment not found" });
    return null;
  }
  if (
    req.employee &&
    Number(assignment.employee_id) !== Number(req.employee.employee_id)
  ) {
    res.status(403).json({
      success: false,
      message: "This assignment is not assigned to you",
    });
    return null;
  }
  return { clientId, assignmentId, assignment };
};

/* =========================================
GET ASSIGNMENTS (client admin: all, employee: own)
========================================= */
export const getAssignments = async (req, res) => {
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) {
      return res.status(401).json({ success: false });
    }

    await ensureFileTables();

    const { status, priority } = req.query;

    let query = `
      SELECT 
        t.*,
        e.name AS employee_name,
        e.employeeCode,
        d.name AS department_name,
        (SELECT COUNT(*) FROM client_assignment_attachments a WHERE a.assignment_id = t.id) AS attachment_count,
        (SELECT COUNT(*) FROM client_assignment_deliverables dv WHERE dv.assignment_id = t.id) AS deliverable_count
      FROM client_work_assignments t
      JOIN client_employees e ON e.id = t.employee_id
      LEFT JOIN departments d ON d.id = e.departmentId
      WHERE t.client_id = ?
    `;

    const params = [clientId];

    if (req.employee) {
      query += " AND t.employee_id = ?";
      params.push(req.employee.employee_id);
    }

    if (status) {
      query += " AND t.status = ?";
      params.push(status);
    }

    if (priority) {
      query += " AND t.priority = ?";
      params.push(priority);
    }

    query += " ORDER BY t.created_at DESC";

    const [rows] = await db.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("GET ASSIGNMENTS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
CREATE ASSIGNMENT (client admin)
========================================= */
export const createAssignment = async (req, res) => {
  try {
    if (req.employee) {
      return res.status(403).json({
        success: false,
        message: "Only client administrators can manage assignments",
      });
    }
    const clientId = await resolveClientId(req);
    if (!clientId) {
      return res.status(403).json({ success: false });
    }

    const { title, description, employeeId, targetValue, unit, deadline, priority } =
      req.body;

    if (!String(title || "").trim() || !employeeId) {
      return res.status(400).json({
        success: false,
        message: "Title and employee are required",
      });
    }

    const [[employee]] = await db.query(
      `SELECT id FROM client_employees WHERE id = ? AND client_id = ? LIMIT 1`,
      [employeeId, clientId],
    );
    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Selected employee does not belong to this client",
      });
    }

    const [result] = await db.query(
      `INSERT INTO client_work_assignments
      (client_id, employee_id, title, description, target_value, unit, deadline, priority, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        employeeId,
        String(title).trim(),
        String(description || "").trim() || null,
        targetValue || 0,
        unit || "",
        deadline || null,
        priority || "medium",
        clientId,
      ],
    );

    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
UPDATE ASSIGNMENT (client admin)
========================================= */
export const updateAssignment = async (req, res) => {
  try {
    if (req.employee) {
      return res.status(403).json({
        success: false,
        message: "Only client administrators can manage assignments",
      });
    }
    const clientId = await resolveClientId(req);
    if (!clientId) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;
    const { title, description, targetValue, unit, deadline, priority } = req.body;

    await db.query(
      `UPDATE client_work_assignments SET
        title = ?,
        description = ?,
        target_value = ?,
        unit = ?,
        deadline = ?,
        priority = ?
      WHERE id = ? AND client_id = ?`,
      [
        title,
        String(description || "").trim() || null,
        targetValue || 0,
        unit || "",
        deadline || null,
        priority || "medium",
        id,
        clientId,
      ],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
UPDATE STATUS (assigned employee)
========================================= */
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_value, status } = req.body;

    if (!req.employee) {
      return res.status(403).json({
        success: false,
        message: "Employee access only",
      });
    }

    await db.query(
      `UPDATE client_work_assignments 
       SET current_value = ?, status = ?
       WHERE id = ? AND employee_id = ?`,
      [
        current_value || 0,
        status || "in_progress",
        id,
        req.employee.employee_id,
      ],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE PROGRESS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
DELETE (client admin)
========================================= */
export const deleteAssignment = async (req, res) => {
  try {
    if (req.employee) {
      return res.status(403).json({
        success: false,
        message: "Only client administrators can manage assignments",
      });
    }
    const clientId = await resolveClientId(req);
    if (!clientId) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;

    await ensureFileTables();
    const [files] = await db.query(
      `SELECT file_path FROM client_assignment_attachments WHERE assignment_id = ? AND client_id = ?
       UNION ALL
       SELECT file_path FROM client_assignment_deliverables WHERE assignment_id = ? AND client_id = ?`,
      [id, clientId, id, clientId],
    );

    await db.query(
      `DELETE FROM client_assignment_attachments WHERE assignment_id = ? AND client_id = ?`,
      [id, clientId],
    );
    await db.query(
      `DELETE FROM client_assignment_deliverables WHERE assignment_id = ? AND client_id = ?`,
      [id, clientId],
    );
    await db.query(
      `DELETE FROM client_work_assignments 
       WHERE id = ? AND client_id = ?`,
      [id, clientId],
    );

    files.forEach((f) => removeFileQuietly(f.file_path));

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
   TASK ATTACHMENTS (uploaded by the CLIENT when assigning work:
   briefs, reference videos, project files, documents)
========================================= */
export const listAssignmentAttachments = async (req, res) => {
  try {
    const ctx = await loadAssignmentForRequest(req, res);
    if (!ctx) return;
    await ensureFileTables();
    const [rows] = await db.query(
      `SELECT * FROM client_assignment_attachments WHERE assignment_id = ? AND client_id = ? ORDER BY created_at DESC`,
      [ctx.assignmentId, ctx.clientId],
    );
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, file_url: publicUrl(ATTACHMENTS_DIR, r.file_path) })),
    });
  } catch (e) {
    console.error("LIST ATTACHMENTS ERROR:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const createAssignmentAttachment = async (req, res) => {
  try {
    if (req.employee) {
      removeFileQuietly(req.file?.path);
      return res.status(403).json({
        success: false,
        message: "Only client administrators can attach task files",
      });
    }
    const ctx = await loadAssignmentForRequest(req, res);
    if (!ctx) {
      removeFileQuietly(req.file?.path);
      return;
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select a file" });
    }

    const type = String(req.body.type || "document").toLowerCase();
    const invalid = validateUpload(req.file, type);
    if (invalid) {
      removeFileQuietly(req.file.path);
      return res.status(400).json({ success: false, message: invalid });
    }

    const title = String(req.body.title || req.file.originalname).trim();
    if (!title) {
      removeFileQuietly(req.file.path);
      return res.status(400).json({ success: false, message: "File title is required" });
    }

    await ensureFileTables();
    const [r] = await db.query(
      `INSERT INTO client_assignment_attachments
       (client_id, assignment_id, type, title, description, file_path, file_name, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ctx.clientId,
        ctx.assignmentId,
        type,
        title,
        String(req.body.description || "").trim() || null,
        req.file.path,
        req.file.originalname,
        req.file.size,
        ctx.clientId,
      ],
    );

    res.status(201).json({
      success: true,
      id: r.insertId,
      message: "Task file attached successfully",
    });
  } catch (e) {
    console.error("CREATE ATTACHMENT ERROR:", e);
    removeFileQuietly(req.file?.path);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteAssignmentAttachment = async (req, res) => {
  try {
    if (req.employee) {
      return res.status(403).json({
        success: false,
        message: "Only client administrators can remove task files",
      });
    }
    const ctx = await loadAssignmentForRequest(req, res);
    if (!ctx) return;
    const attachmentId = Number(req.params.attachmentId);
    await ensureFileTables();
    const [[row]] = await db.query(
      `SELECT id, file_path FROM client_assignment_attachments WHERE id = ? AND assignment_id = ? AND client_id = ?`,
      [attachmentId, ctx.assignmentId, ctx.clientId],
    );
    if (!row) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    await db.query(`DELETE FROM client_assignment_attachments WHERE id = ?`, [row.id]);
    removeFileQuietly(row.file_path);
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE ATTACHMENT ERROR:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

/* =========================================
   DELIVERABLES (uploaded by the assigned EMPLOYEE)
========================================= */
export const listAssignmentDeliverables = async (req, res) => {
  try {
    const ctx = await loadAssignmentForRequest(req, res);
    if (!ctx) return;
    await ensureFileTables();
    const [rows] = await db.query(
      `SELECT * FROM client_assignment_deliverables WHERE assignment_id = ? AND client_id = ? ORDER BY created_at DESC`,
      [ctx.assignmentId, ctx.clientId],
    );
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, file_url: publicUrl(DELIVERABLES_DIR, r.file_path) })),
    });
  } catch (e) {
    console.error("LIST DELIVERABLES ERROR:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const createAssignmentDeliverable = async (req, res) => {
  try {
    if (!req.employee?.employee_id) {
      removeFileQuietly(req.file?.path);
      return res.status(403).json({
        success: false,
        message: "Only assigned employees can upload deliverables",
      });
    }
    const ctx = await loadAssignmentForRequest(req, res);
    if (!ctx) {
      removeFileQuietly(req.file?.path);
      return;
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select a file" });
    }

    const type = String(req.body.type || "document").toLowerCase();
    const invalid = validateUpload(req.file, type);
    if (invalid) {
      removeFileQuietly(req.file.path);
      return res.status(400).json({ success: false, message: invalid });
    }

    const title = String(req.body.title || req.file.originalname).trim();
    if (!title) {
      removeFileQuietly(req.file.path);
      return res.status(400).json({ success: false, message: "Deliverable title is required" });
    }

    await ensureFileTables();
    const [r] = await db.query(
      `INSERT INTO client_assignment_deliverables
       (client_id, assignment_id, employee_id, type, title, description, file_path, file_name, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ctx.clientId,
        ctx.assignmentId,
        req.employee.employee_id,
        type,
        title,
        String(req.body.description || "").trim() || null,
        req.file.path,
        req.file.originalname,
        req.file.size,
      ],
    );

    res.status(201).json({
      success: true,
      id: r.insertId,
      message: "Deliverable uploaded successfully",
    });
  } catch (e) {
    console.error("CREATE DELIVERABLE ERROR:", e);
    removeFileQuietly(req.file?.path);
    res.status(500).json({ success: false, message: e.message });
  }
};
