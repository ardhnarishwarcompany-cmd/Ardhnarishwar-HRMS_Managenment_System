import { db } from "../../../config/db.js";

// helper
const getClientId = async (client_code) => {
  const [rows] = await db.query(
    `SELECT id FROM clients WHERE client_code = ? LIMIT 1`,
    [client_code],
  );

  if (!rows.length) {
    const err = new Error("Client code not found");
    err.status = 404;
    throw err;
  }

  return rows[0].id;
};

const PAYMENT_STATUSES = ["paid", "partial", "unpaid"];
const PAYMENT_METHODS = ["online", "cash"];
const SUBSCRIPTION_STATUSES = ["active", "expired", "cancelled"];

const toDateOrNull = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

/**
 * Validates and normalises the Add/Edit Sale payload.
 * Returns { ok:false, message } on the first problem, otherwise { ok:true, data }.
 */
const validateSalePayload = (body) => {
  const client_code = String(body.client_code || "").trim();
  const plan_name = String(body.plan_name || "").trim();
  if (!client_code) return { ok: false, message: "Client code is required" };
  if (!plan_name) return { ok: false, message: "Plan name is required" };

  const billing_months = parseInt(body.billing_months, 10);
  if (!Number.isInteger(billing_months) || billing_months < 1 || billing_months > 60)
    return { ok: false, message: "Billing months must be between 1 and 60" };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0)
    return { ok: false, message: "Amount must be a valid non-negative number" };

  const amount_paid =
    body.amount_paid === "" || body.amount_paid == null ? 0 : Number(body.amount_paid);
  if (!Number.isFinite(amount_paid) || amount_paid < 0)
    return { ok: false, message: "Amount paid must be a valid non-negative number" };
  if (amount_paid > amount)
    return { ok: false, message: "Amount paid cannot exceed the sale amount" };

  const payment_status = String(body.payment_status || "unpaid").toLowerCase();
  if (!PAYMENT_STATUSES.includes(payment_status))
    return { ok: false, message: "Invalid payment status" };

  const payment_method = String(body.payment_method || "online").toLowerCase();
  if (!PAYMENT_METHODS.includes(payment_method))
    return { ok: false, message: "Invalid payment method" };

  const subscription_status = String(body.subscription_status || "active").toLowerCase();
  if (!SUBSCRIPTION_STATUSES.includes(subscription_status))
    return { ok: false, message: "Invalid subscription status" };

  const purchase_date = toDateOrNull(body.purchase_date);
  const start_date = toDateOrNull(body.start_date);
  const due_date = toDateOrNull(body.due_date);
  if (purchase_date === undefined) return { ok: false, message: "Purchase date is invalid" };
  if (start_date === undefined) return { ok: false, message: "Start date is invalid" };
  if (due_date === undefined) return { ok: false, message: "Due date is invalid" };
  if (!purchase_date) return { ok: false, message: "Purchase date is required" };
  if (start_date && start_date < purchase_date)
    return { ok: false, message: "Subscription start cannot be before the purchase date" };
  if (due_date && start_date && due_date < start_date)
    return { ok: false, message: "Payment due date cannot be before the subscription start" };

  return {
    ok: true,
    data: {
      client_code,
      plan_name,
      billing_months,
      amount,
      amount_paid,
      payment_status,
      payment_method,
      purchase_date,
      start_date,
      due_date,
      subscription_status,
      remarks: body.remarks ? String(body.remarks).trim().slice(0, 1000) : null,
    },
  };
};

// ==============================
// CREATE SALE
// ==============================
export const createSale = async (req, res) => {
  try {
    const employeeId = req.salesUser.employeeId; // ðŸ”¥ from token

    const validated = validateSalePayload(req.body);
    if (!validated.ok) {
      return res.status(400).json({ message: validated.message });
    }
    const {
      client_code,
      plan_name,
      billing_months,
      amount,
      amount_paid,
      payment_status,
      payment_method,
      purchase_date,
      start_date,
      due_date,
      subscription_status,
      remarks,
    } = validated.data;

    const client_id = await getClientId(client_code);

    const [result] = await db.query(
      `INSERT INTO sales_report
       (employee_id, client_id, plan_name, billing_months, amount,
        amount_paid, payment_status, payment_method,
        purchase_date, start_date, due_date,
        subscription_status, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        employeeId,
        client_id,
        plan_name,
        billing_months,
        amount,
        amount_paid,
        payment_status,
        payment_method,
        purchase_date,
        start_date,
        due_date,
        subscription_status,
        remarks,
      ],
    );

    res.status(201).json({ message: "Sale created", id: result.insertId });
  } catch (err) {
    console.error("Create sale error:", err);
    res
      .status(err.status || 500)
      .json({ message: err.status ? err.message : "Server error" });
  }
};

// ==============================
// GET MY SALE
// ==============================
export const getMySales = async (req, res) => {
  try {
    const employeeId = req.salesUser.employeeId;

    const [rows] = await db.query(
      `SELECT 
          sr.*,
          c.client_code
       FROM sales_report sr
       LEFT JOIN clients c ON c.id = sr.client_id
       WHERE sr.employee_id = ?
       ORDER BY sr.created_at DESC`,
      [employeeId],
    );

    res.json(rows);
  } catch (err) {
    console.error("Get sales error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// UPDATE SALE
// ==============================
export const updateSale = async (req, res) => {
  try {
    const employeeId = req.salesUser.employeeId; // ðŸ”¥ security
    const saleId = req.params.id;

    const validated = validateSalePayload(req.body);
    if (!validated.ok) {
      return res.status(400).json({ message: validated.message });
    }
    const {
      client_code,
      plan_name,
      billing_months,
      amount,
      amount_paid,
      payment_status,
      payment_method,
      purchase_date,
      start_date,
      due_date,
      subscription_status,
      remarks,
    } = validated.data;

    // ðŸ”¥ get client_id from code
    const client_id = await getClientId(client_code);

    // ðŸ”¥ IMPORTANT: ensure user updates only their own sale
    const [existing] = await db.query(
      `SELECT id FROM sales_report 
       WHERE id = ? AND employee_id = ? 
       LIMIT 1`,
      [saleId, employeeId],
    );

    if (!existing.length) {
      return res.status(403).json({
        message: "Sale not found or access denied",
      });
    }

    // ðŸ”¥ update query
    await db.query(
      `UPDATE sales_report SET
        client_id = ?,
        plan_name = ?,
        billing_months = ?,
        amount = ?,
        amount_paid = ?,
        payment_status = ?,
        payment_method = ?,
        purchase_date = ?,
        start_date = ?,
        due_date = ?,
        subscription_status = ?,
        remarks = ?
       WHERE id = ? AND employee_id = ?`,
      [
        client_id,
        plan_name,
        billing_months,
        amount,
        amount_paid,
        payment_status,
        payment_method,
        purchase_date,
        start_date,
        due_date,
        subscription_status,
        remarks,
        saleId,
        employeeId,
      ],
    );

    res.json({
      success: true,
      message: "Sale updated successfully",
    });
  } catch (err) {
    console.error("Update sale error:", err);
    res
      .status(err.status || 500)
      .json({ message: err.status ? err.message : "Server error" });
  }
};
