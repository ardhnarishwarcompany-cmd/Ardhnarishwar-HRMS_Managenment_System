import fs from "fs";
import path from "path";
import { db } from "../../../config/db.js";

/**
 * IT Deliverables — standalone uploads shown as separate IT dashboard
 * features: Video Documentation, Project Reports, Source Code.
 *
 * Table: it_deliverables
 *   type ENUM('video','project_report','source_code')
 *   title, description, file_path, file_name, file_size,
 *   uploaded_by (employee id), uploaded_by_name, created_at
 */

const TYPES = ["video", "project_report", "source_code"];

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS it_deliverables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('video','project_report','source_code') NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      uploaded_by INT NULL,
      uploaded_by_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_type (type)
    )
  `);
  tableReady = true;
}

const toFileUrl = (filePath) =>
  filePath ? "/uploads/deliverables/" + filePath.split(/[\\/]/).pop() : null;

/* GET /api/it-deliverables?type=video */
export const listDeliverables = async (req, res) => {
  try {
    await ensureTable();
    const { type } = req.query;
    const role = String(req.employee?.role || "").toUpperCase();
    const isSuperAdmin = role === "SUPER_ADMIN";
    const where = [];
    const params = [];
    if (type && TYPES.includes(type)) {
      where.push("d.type = ?");
      params.push(type);
    }
    // Everyone sees only their own uploads; Super Admin sees all.
    if (!isSuperAdmin) {
      where.push("d.uploaded_by = ?");
      params.push(req.employee?.id ?? -1);
    }
    let sql = "SELECT d.id, d.type, d.title, d.description, d.file_path, d.file_name, d.file_size, d.uploaded_by, COALESCE(NULLIF(TRIM(e.name), ''), d.uploaded_by_name) AS uploaded_by_name, d.created_at FROM it_deliverables d LEFT JOIN employees e ON e.id = d.uploaded_by";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY d.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, file_url: toFileUrl(r.file_path) })),
    });
  } catch (err) {
    console.error("listDeliverables error:", err);
    res.status(500).json({ success: false, message: "Failed to load items" });
  }
};

/* POST /api/it-deliverables  (multipart: file + type, title, description) */
export const createDeliverable = async (req, res) => {
  try {
    await ensureTable();
    const { type, title, description } = req.body;

    if (!TYPES.includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid deliverable type" });
    }
    if (!title || !title.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File is required" });
    }

    const uploadedBy = req.employee?.id || null;
    const uploadedByName = req.employee?.code || null;

    const [result] = await db.query(
      `INSERT INTO it_deliverables
         (type, title, description, file_path, file_name, file_size,
          uploaded_by, uploaded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        title.trim(),
        description?.trim() || null,
        req.file.path,
        req.file.originalname,
        req.file.size,
        uploadedBy,
        uploadedByName,
      ],
    );

    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("createDeliverable error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

/* DELETE /api/it-deliverables/:id */
export const deleteDeliverable = async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT file_path, uploaded_by FROM it_deliverables WHERE id = ?",
      [id],
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }
    // Only the uploader or Super Admin may remove a deliverable.
    const role = String(req.employee?.role || "").toUpperCase();
    const isOwner =
      rows[0].uploaded_by != null &&
      Number(rows[0].uploaded_by) === Number(req.employee?.id);
    if (!isOwner && role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only the uploader or Super Admin can delete this item",
      });
    }
    await db.query("DELETE FROM it_deliverables WHERE id = ?", [id]);
    // best-effort file cleanup
    try {
      const p = rows[0].file_path;
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
      console.error("file cleanup failed:", e.message);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("deleteDeliverable error:", err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};
