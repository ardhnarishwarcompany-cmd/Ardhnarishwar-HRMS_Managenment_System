import * as service from "./workPolicy.service.js";
import PDFDocument from "pdfkit";
import { db } from "../../../config/db.js";

// helper
const getClientId = async (client_code) => {
  const [rows] = await db.query(
    `SELECT id FROM clients WHERE client_code = ? LIMIT 1`,
    [client_code]
  );

  if (!rows.length) throw new Error("Client not found");

  return rows[0].id;
};

// Get Client Code from Client/Employee
const getClientCode = (req) => {
  return req.client?.client_code || req.employee?.client_code;
};

// ✅ GET ALL (SECURE)
export const getAllPolicies = async (req, res) => {
  try {
    const clientCode = getClientCode(req);

    if (!clientCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const clientId = await getClientId(clientCode);

    const data = await service.getAllPolicies(clientId);

    res.json({ success: true, data });
  } catch (err) {
    console.error("GET POLICIES:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ DOWNLOAD POLICY PDF
export const downloadPolicyPdf = async (req, res) => {
  try {
    const clientCode = getClientCode(req);
    if (!clientCode) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const clientId = await getClientId(clientCode);
    const policyId = String(req.params.id);

    let policy;

    if (policyId.startsWith("sa-")) {
      const superAdminId = Number(policyId.slice(3));
      if (!Number.isInteger(superAdminId) || superAdminId <= 0) {
        return res.status(404).json({ success: false, message: "Policy not found" });
      }

      const [rows] = await db.query(
        `SELECT id, title, category, description, is_active, created_at, updated_at
         FROM policies
         WHERE id = ?
         LIMIT 1`,
        [superAdminId]
      );
      policy = rows[0] ? {
        ...rows[0],
        client_id: 0,
        type: rows[0].category || "general",
        isActive: rows[0].is_active,
      } : null;
    } else {
      const numericId = Number(policyId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return res.status(404).json({ success: false, message: "Policy not found" });
      }

      const [rows] = await db.query(
        `SELECT *
         FROM work_policies
         WHERE id = ? AND (client_id = ? OR client_id = 0)
         LIMIT 1`,
        [numericId, clientId]
      );
      policy = rows[0];
    }

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    const [clients] = await db.query(
      `SELECT company_name, business_address
       FROM clients
       WHERE id = ?
       LIMIT 1`,
      [clientId]
    );
    const company = clients[0] || {};

    const safeName = String(policy.title || "Work-Policy")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "") || "Work-Policy";

    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.pdf"`
    );

    doc.pipe(res);

    const pageWidth = 595.28;
    const contentWidth = pageWidth - 112;

    doc.rect(0, 0, pageWidth, 92).fill("#24133f");
    doc.rect(0, 92, pageWidth, 5).fill("#c69b3c");

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(19)
      .text(company.company_name || "Company", 56, 27, {
        width: contentWidth,
      });

    doc
      .fillColor("#d9cbed")
      .font("Helvetica")
      .fontSize(9)
      .text(company.business_address || "", 56, 53, {
        width: contentWidth,
      });

    doc
      .fillColor("#d7b76a")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("WORK POLICY", 56, 72);

    doc.y = 125;

    doc
      .fillColor("#3d225f")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(policy.title || "Work Policy", {
        width: contentWidth,
      });

    doc.moveDown(0.8);

    const type = policy.type || policy.category || "general";
    const status =
      policy.status ||
      (policy.isActive === 1 || policy.is_active === 1 ? "active" : "inactive");

    doc
      .fillColor("#555555")
      .font("Helvetica")
      .fontSize(10)
      .text(`Type: ${String(type).replace(/_/g, " ")}`)
      .text(`Status: ${status}`)
      .text(
        `Effective / Created: ${
          policy.effective_date || policy.createdAt || policy.created_at
            ? new Date(
                policy.effective_date ||
                  policy.createdAt ||
                  policy.created_at
              ).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "-"
        }`
      );

    doc.moveDown(1.2);

    doc
      .fillColor("#3d225f")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Policy Details");

    doc.moveDown(0.4);

    doc
      .fillColor("#222222")
      .font("Helvetica")
      .fontSize(10.5)
      .text(policy.description || "No policy description available.", {
        width: contentWidth,
        lineGap: 4,
        paragraphGap: 8,
      });

    doc.moveDown(1);

    doc
      .fillColor("#3d225f")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Policy Information");

    doc.moveDown(0.4);

    const departmentId = policy.departmentId ?? policy.department_id;
    const autoApply = policy.autoApply ?? policy.auto_apply;
    const automated = policy.isAutomated ?? policy.is_automated;

    doc
      .fillColor("#333333")
      .font("Helvetica")
      .fontSize(9.5)
      .text(`Department ID: ${departmentId || "All Departments"}`)
      .text(`Automated: ${automated ? "Yes" : "No"}`)
      .text(`Auto Apply: ${autoApply ? "Yes" : "No"}`)
      .text(`Policy Code: ${policy.policy_code || "-"}`);

    doc.moveDown(2);

    doc
      .fillColor("#666666")
      .font("Helvetica")
      .fontSize(8)
      .text(
        `${company.company_name || "Company"} | System generated Work Policy`,
        {
          align: "center",
          width: contentWidth,
        }
      );

    doc.end();
  } catch (err) {
    console.error("DOWNLOAD WORK POLICY PDF:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
};

// ✅ CREATE
export const createPolicy = async (req, res) => {
  try {
    if (req.employee) return res.status(403).json({success:false,message:"Only client administrators can manage work policies"});
    const clientId = await getClientId(req.client.client_code);

    const data = await service.createPolicy({
      ...req.body,
      client_id: clientId,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("CREATE POLICY:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ UPDATE (SECURE)
export const updatePolicy = async (req, res) => {
  try {
    if (req.employee) return res.status(403).json({success:false,message:"Only client administrators can manage work policies"});
    const clientId = await getClientId(req.client.client_code);

    const data = await service.updatePolicy(
      req.params.id,
      clientId,
      req.body
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Policy not found or not editable by this account",
      });
    }

    res.json({ success: true, policy: data });
  } catch (err) {
    console.error("UPDATE POLICY:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ DELETE (SECURE)
export const deletePolicy = async (req, res) => {
  try {
    if (req.employee) return res.status(403).json({success:false,message:"Only client administrators can manage work policies"});
    const clientId = await getClientId(req.client.client_code);

    const removed = await service.deletePolicy(req.params.id, clientId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Policy not found or not editable by this account",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE POLICY:", err);
    res.status(500).json({ message: err.message });
  }
};