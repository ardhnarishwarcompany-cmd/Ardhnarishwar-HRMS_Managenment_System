import {
  fetchAdminServices,
  createAdminServiceItem,
  updateAdminServiceItem,
  deleteAdminServiceItem,
} from "./admin.services.service.js";

import puppeteer from "puppeteer";
import { db } from "../../../config/db.js";

// GET
export const getAllAdminServices = async (req, res) => {
  const data = await fetchAdminServices();
  res.json(data);
};

// CREATE
export const createAdminService = async (req, res) => {
  const newItem = await createAdminServiceItem(req.body);
  res.json(newItem);
};

// UPDATE
export const updateAdminService = async (req, res) => {
  const { id } = req.params;
  const updated = await updateAdminServiceItem(id, req.body);
  res.json(updated);
};

// DELETE
export const deleteAdminService = async (req, res) => {
  const { id } = req.params;
  await deleteAdminServiceItem(id);
  res.json({ message: "Deleted" });
};

export const generateServicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(`SELECT * FROM admin_services WHERE id = ?`, [
      id,
    ]);

    if (!rows.length) {
      return res.status(404).send("Service not found");
    }

    const service = rows[0];

    const pType = (service.pricing_type || "").toUpperCase();
    const pVal = parseFloat(service.pricing_value);
    const isFixed = pType === "FIXED" || (!isNaN(pVal) && pVal >= 100);
    const isPercent = pType === "CTC_PERCENT" && !isNaN(pVal) && pVal < 100;
    const isDays = pType === "DAYS_SALARY";

    const formatPdfPrice = (val) => {
      if (val === null || val === undefined || val === "") return "—";
      const num = parseFloat(val);
      if (isNaN(num)) return String(val);
      if (isPercent) return `${num}% of CTC`;
      if (isDays) return `${num} Days Salary`;
      return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const hasMrp = service.mrp && parseFloat(service.mrp) > 0;
    const descText = (service.description || "").trim();
    const validDesc = descText && !["no", "none", "n/a", "na", "null", "undefined", "false", "-", "0"].includes(descText.toLowerCase());

    const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }

        .card {
          width: 820px;
          background: linear-gradient(145deg, #ffffff 0%, #faf5ff 45%, #f0fdf4 100%);
          border-radius: 28px;
          padding: 40px 48px;
          box-shadow: 0 20px 50px rgba(109, 40, 217, 0.08);
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 24px;
          border-bottom: 1.5px solid #e2e8f0;
          margin-bottom: 28px;
        }

        .brand-block {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .company {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .subtitle {
          font-size: 11px;
          font-weight: 700;
          color: #7c3aed;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .date-badge {
          background: #ffffff;
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }

        .plan-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          color: #7c3aed;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: #f3e8ff;
          padding: 4px 10px;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 24px 0;
          letter-spacing: -0.5px;
        }

        .price-box {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          padding: 24px 28px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .mrp-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #e2e8f0;
        }

        .mrp-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mrp-val {
          text-decoration: line-through;
          color: #94a3b8;
          font-size: 16px;
          font-weight: 600;
          font-family: monospace;
        }

        .offer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .offer-label {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }

        .offer-sub {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }

        .offer-val {
          font-size: 32px;
          font-weight: 900;
          color: #047857;
          font-family: monospace;
          letter-spacing: -0.5px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .detail-item {
          background: rgba(255,255,255,0.85);
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }

        .detail-item-title {
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        .detail-item-val {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .desc-box {
          background: rgba(255, 255, 255, 0.7);
          padding: 18px 20px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          line-height: 1.5;
          color: #334155;
          margin-bottom: 24px;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          padding-top: 18px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>

    <body>
      <div class="card">
        <div class="header">
          <div class="brand-block">
            <div>
              <div class="company">ARDHNARISHWAR</div>
              <div class="subtitle">Premium HR & Talent Solutions</div>
            </div>
          </div>
          <div class="date-badge">
            Proposal Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>

        <div>
          <div class="plan-tag">Service Package</div>
          <h1 class="title">${service.service_name} — Plan ${service.plan_name}</h1>
        </div>

        <div class="price-box">
          ${hasMrp ? `
          <div class="mrp-row">
            <span class="mrp-label">Standard MRP</span>
            <span class="mrp-val">${formatPdfPrice(service.mrp)}</span>
          </div>` : ''}

          <div class="offer-row">
            <div>
              <div class="offer-label">Exclusive Offer Price</div>
              <div class="offer-sub">${isFixed ? "Fixed plan fee (exclusive of 18% GST)" : `Pricing model: ${pType.replace("_", " ")}`}</div>
            </div>
            <div class="offer-val">${formatPdfPrice(service.pricing_value)}</div>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-item-title">Replacement</div>
            <div class="detail-item-val">${service.replacement_months} ${Number(service.replacement_months) === 1 ? "Month" : "Months"}</div>
          </div>

          <div class="detail-item">
            <div class="detail-item-title">Booking Token</div>
            <div class="detail-item-val">₹${Number(service.token_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>

          <div class="detail-item">
            <div class="detail-item-title">Payment Terms</div>
            <div class="detail-item-val">${service.payment_terms} ${/^\d+$/.test(String(service.payment_terms).trim()) ? "Days" : ""}</div>
          </div>
        </div>

        ${validDesc ? `
        <div class="desc-box">
          <strong style="color: #0f172a; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Scope & Description</strong>
          ${descText}
        </div>` : ''}

        <div class="footer">
          <span>Official Service Proposal · Ardhnarishwar HRMS</span>
          <span>Designed for premium client experience</span>
        </div>
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // The template is self-contained (no remote fonts/images), so "load" is enough;
    // networkidle0 with the default 30s timeout intermittently failed on slow machines.
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });

    const pdf = await page.pdf({
      printBackground: true,

      width: "900px", 
      height: "600px", 
      
      margin: {
        top: "0px",
        bottom: "0px",
        left: "0px",
        right: "0px",
      },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=service.pdf",
    });

    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).send("PDF generation failed");
  }
};
