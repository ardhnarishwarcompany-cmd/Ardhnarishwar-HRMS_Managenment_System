import { db } from "../../../config/db.js";

// helper
const getClientId = async (client_code) => {
  const [rows] = await db.query(
    `SELECT id FROM clients WHERE client_code = ? LIMIT 1`,
    [client_code],
  );

  if (!rows.length) throw new Error("Client not found");

  return rows[0].id;
};

// helper — enterprise call id generator
const generateCallId = async () => {
  const today = new Date();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const datePrefix = `${yyyy}${mm}${dd}`;

  // find last call today
  const [rows] = await db.query(
    `SELECT call_id 
     FROM SuperAdmin_sales_calls
     WHERE call_id LIKE ?
     ORDER BY call_id DESC
     LIMIT 1`,
    [`${datePrefix}-%`]
  );

  let nextNumber = 1;

  if (rows.length) {
    const lastSeq = rows[0].call_id.split("-")[1];
    nextNumber = Number(lastSeq) + 1;
  }

  const seq = String(nextNumber).padStart(4, "0");

  return `${datePrefix}-${seq}`;
};


// ==============================
// CREATE CALL
// ==============================
export const createCall = async (req, res) => {
  try {
    const employeeId = req.salesUser.employeeId;

    const {
      client_code,
      call_id,
      customer_name,
      phone,
      email,
      language,
      call_time,
      call_date,
      status,
      follow_up_datetime,
      remarks,
      sold_date,
      salary,
      ctc,
      lpa,
    } = req.body;

    let client_id = null;

    if (client_code) {
      try {
        client_id = await getClientId(client_code);
      } catch (err) {
        return res.status(400).json({
          message: "Invalid client code",
        });
      }
    }

const finalCallId = call_id || await generateCallId();

    const [result] = await db.query(
      `INSERT INTO SuperAdmin_sales_calls
       (client_id, employee_id, call_id, customer_name, phone, email, language,
        call_time, call_date, status, follow_up_datetime, remarks, sold_date,
        salary, ctc, lpa)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        client_id,
        employeeId,
        finalCallId,
        customer_name,
        phone,
        email,
        language || null,
        call_time || null,
        call_date || null,
        status || "hold",
        follow_up_datetime || null,
        remarks,
        sold_date || null,
        salary === "" || salary === undefined ? null : salary,
        ctc === "" || ctc === undefined ? null : ctc,
        lpa === "" || lpa === undefined ? null : lpa,
      ],
    );

    res.json({
      success: true,
      message: "Call created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Create call error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// ==============================
// GET MY CALLS
// ==============================
export const getMyCalls = async (req, res) => {
  try {
    const employeeId = req.salesUser.employeeId;

    const [rows] = await db.query(
      `SELECT 
          sc.*,
          c.client_code
       FROM SuperAdmin_sales_calls sc
       LEFT JOIN clients c ON c.id = sc.client_id
       WHERE sc.employee_id = ?
       ORDER BY sc.created_at DESC`,
      [employeeId],
    );

    res.json(rows);
  } catch (err) {
    console.error("Get calls error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// UPDATE CALL
// ==============================
export const updateCall = async (req, res) => {
  try {
    const employeeId = req.salesUser.employeeId;
    const callIdParam = req.params.id;

    const {
      client_code,
      call_id,
      customer_name,
      phone,
      email,
      language,
      call_time,
      call_date,
      status,
      follow_up_datetime,
      remarks,
      sold_date,
      salary,
      ctc,
      lpa,
    } = req.body;

    let client_id = null;

    if (client_code) {
      try {
        client_id = await getClientId(client_code);
      } catch (err) {
        return res.status(400).json({
          message: "Invalid client code",
        });
      }
    }
    // 🔐 ownership check
    const [existing] = await db.query(
      `SELECT id FROM SuperAdmin_sales_calls
       WHERE id = ? AND employee_id = ?
       LIMIT 1`,
      [callIdParam, employeeId],
    );

    if (!existing.length) {
      return res.status(403).json({
        message: "You can only update your own calls",
      });
    }

    await db.query(
      `UPDATE SuperAdmin_sales_calls SET
        client_id = ?,
        call_id = ?,
        customer_name = ?,
        phone = ?,
        email = ?,
        language = ?,
        call_time = ?,
        call_date = ?,
        status = ?,
        follow_up_datetime = ?,
        remarks = ?,
        sold_date = ?,
        salary = ?,
        ctc = ?,
        lpa = ?
       WHERE id = ? AND employee_id = ?`,
      [
        client_id,
        call_id,
        customer_name,
        phone,
        email,
        language || null,
        call_time || null,
        call_date || null,
        status,
        follow_up_datetime || null,
        remarks,
        sold_date || null,
        salary === "" || salary === undefined ? null : salary,
        ctc === "" || ctc === undefined ? null : ctc,
        lpa === "" || lpa === undefined ? null : lpa,
        callIdParam,
        employeeId,
      ],
    );

    res.json({
      success: true,
      message: "Call updated successfully",
    });
  } catch (err) {
    console.error("Update call error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};
