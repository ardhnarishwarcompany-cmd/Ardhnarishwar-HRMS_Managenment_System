import { db } from "../../../config/db.js";

export const getMyEODReports = async (
  employeeId
) => {
  const [rows] = await db.query(
    `
    SELECT 
      id,
      employee_id AS employeeId,
      employee_name AS employeeName,
      department,
      department_id AS departmentId,
      report_date AS date,
      tasks_completed AS tasksCompleted,
      tasks_in_progress AS tasksInProgress,
      blockers,
      tomorrow_plan AS tomorrowPlan,
      notes,
      status,
      submitted_at AS submittedAt,
      approved_by AS approvedBy
    FROM eod_reports
    WHERE employee_id = ?
    ORDER BY id DESC
    `,
    [employeeId]
  );

  return rows;
};

export const createEOD = async (
  data,
  employeeId
) => {
  // GET EMPLOYEE
  const [rows] = await db.query(
    `
    SELECT
      e.id,
      e.name,
      e.departmentId,
      d.name AS departmentName
    FROM employees e
    LEFT JOIN departments d
      ON d.id = e.departmentId
    WHERE e.id = ?
    LIMIT 1
    `,
    [employeeId]
  );

  const employee = rows[0];

  if (!employee) {
    throw new Error(
      "Employee not found"
    );
  }

  const payload = {
    employee_id: employee.id,

    employee_name: employee.name,

    department:
      employee.departmentName || "",

    department_id:
      employee.departmentId,

    report_date: data.date,

    tasks_completed:
      data.tasksCompleted,

    tasks_in_progress:
      data.tasksInProgress,

    blockers: data.blockers,

    tomorrow_plan:
      data.tomorrowPlan,

    notes: data.notes,

    status: "submitted",
  };

  await db.query(
    `
    INSERT INTO eod_reports
    SET ?
    `,
    [payload]
  );
};

export const updateEOD = async (
  id,
  data,
  employeeId
) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM eod_reports
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  const existing = rows[0];

  if (!existing) {
    throw new Error(
      "EOD not found"
    );
  }

  // SECURITY
  if (
    existing.employee_id !== employeeId
  ) {
    throw new Error(
      "Access denied"
    );
  }

  if (
    existing.status === "approved"
  ) {
    throw new Error(
      "Approved EOD cannot be edited"
    );
  }

  const payload = {
    tasks_completed:
      data.tasksCompleted,

    tasks_in_progress:
      data.tasksInProgress,

    blockers: data.blockers,

    tomorrow_plan:
      data.tomorrowPlan,

    notes: data.notes,
  };

  await db.query(
    `
    UPDATE eod_reports
    SET ?
    WHERE id = ? AND employee_id = ?
    `,
    [payload, id, employeeId]
  );
};