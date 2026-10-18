import { db } from "../../config/db.js";

const EMP_JOIN = (col, alias) =>
  `(SELECT name FROM employees WHERE id = ${col}) AS ${alias}`;

/* ================= EMPLOYEE LIST (for assignment dropdowns) ================= */
export const getItEmployees = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, employeeCode FROM employees WHERE isActive = 1 ORDER BY name",
    );
    res.json(rows);
  } catch (err) {
    console.error("getItEmployees error:", err);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

/* ================= TASK ASSIGNMENT ================= */
export const getTasks = async (req, res) => {
  try {
    const manager = isItManager(req);
    const employeeId = Number(req.employee?.id || req.employee?.employee_id);

    if (!manager && (!Number.isInteger(employeeId) || employeeId <= 0)) {
      return res.status(401).json({
        message: "Unable to identify the logged-in employee",
      });
    }

    const [rows] = await db.query(
      `SELECT t.*, ${EMP_JOIN("t.assigned_to", "assigned_to_name")},
              COALESCE(${EMP_JOIN("t.created_by", "x").replace(" AS x", "")}, t.created_by_label) AS created_by_name
       FROM it_tasks t
       ${manager ? "" : "WHERE t.assigned_to = ?"}
       ORDER BY FIELD(t.status,'To Do','In Progress','Review','Done'), t.due_date IS NULL, t.due_date`,
      manager ? [] : [employeeId],
    );

    res.json(rows);
  } catch (err) {
    console.error("getTasks error:", err);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, assigned_to, priority, due_date } = req.body;
    if (!title?.trim())
      return res.status(400).json({ message: "Title is required" });
    const [r] = await db.query(
      `INSERT INTO it_tasks (title, description, assigned_to, priority, due_date, created_by)
       VALUES (?,?,?,?,?,?)`,
      [
        title.trim(),
        description || null,
        assigned_to || null,
        priority || "Medium",
        due_date || null,
        req.employee?.id || null,
      ],
    );
    res.status(201).json({ id: r.insertId, message: "Task created" });
  } catch (err) {
    console.error("createTask error:", err);
    res.status(500).json({ message: "Failed to create task" });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["To Do", "In Progress", "Review", "Done"];
    if (!allowed.includes(status))
      return res.status(400).json({ message: "Invalid status" });
    const manager = isItManager(req);
    const employeeId = Number(req.employee?.id || req.employee?.employee_id);

    if (!manager && (!Number.isInteger(employeeId) || employeeId <= 0)) {
      return res.status(401).json({
        message: "Unable to identify the logged-in employee",
      });
    }

    const [r] = await db.query(
      `UPDATE it_tasks
       SET status=?
       WHERE id=?
       ${manager ? "" : "AND assigned_to=?"}`,
      manager ? [status, req.params.id] : [status, req.params.id, employeeId],
    );
    if (!r.affectedRows)
      return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task updated" });
  } catch (err) {
    console.error("updateTaskStatus error:", err);
    res.status(500).json({ message: "Failed to update task" });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const manager = isItManager(req);
    const employeeId = Number(req.employee?.id || req.employee?.employee_id);

    if (!manager && (!Number.isInteger(employeeId) || employeeId <= 0)) {
      return res.status(401).json({
        message: "Unable to identify the logged-in employee",
      });
    }

    const [r] = await db.query(
      `DELETE FROM it_tasks
       WHERE id=?
       ${manager ? "" : "AND assigned_to=?"}`,
      manager ? [req.params.id] : [req.params.id, employeeId],
    );

    if (!r.affectedRows) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("deleteTask error:", err);
    res.status(500).json({ message: "Failed to fetch task" });
  }
};

/* ================= DAILY WORK SUBMISSION ================= */
export const getDailyWork = async (req, res) => {
  try {
    const manager = isItManager(req);
    const employeeId = Number(req.employee?.id || req.employee?.employee_id);

    if (!manager && (!Number.isInteger(employeeId) || employeeId <= 0)) {
      return res.status(401).json({
        message: "Unable to identify the logged-in employee",
      });
    }

    const [rows] = await db.query(
      manager
        ? `SELECT w.*, ${EMP_JOIN("w.employee_id", "employee_name")}
           FROM it_daily_work w
           ORDER BY w.work_date DESC, w.id DESC LIMIT 200`
        : `SELECT w.*, ${EMP_JOIN("w.employee_id", "employee_name")}
           FROM it_daily_work w
           WHERE w.employee_id = ?
           ORDER BY w.work_date DESC, w.id DESC LIMIT 200`,
      manager ? [] : [employeeId],
    );

    res.json(rows);
  } catch (err) {
    console.error("getDailyWork error:", err);
    res.status(500).json({ message: "Failed to fetch daily work" });
  }
};

export const deleteDailyWork = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid daily work ID" });
    }

    const manager = isItManager(req);
    const employeeId = Number(req.employee?.id || req.employee?.employee_id);

    if (!manager && (!Number.isInteger(employeeId) || employeeId <= 0)) {
      return res.status(401).json({
        message: "Unable to identify the logged-in employee",
      });
    }

    const [result] = await db.query(
      manager
        ? `DELETE FROM it_daily_work WHERE id = ?`
        : `DELETE FROM it_daily_work WHERE id = ? AND employee_id = ?`,
      manager ? [id] : [id, employeeId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Submission not found or you are not allowed to delete it",
      });
    }

    res.json({ message: "Daily work submission deleted successfully" });
  } catch (err) {
    console.error("deleteDailyWork error:", err);
    res.status(500).json({ message: "Failed to delete daily work submission" });
  }
};

export const submitDailyWork = async (req, res) => {
  try {
    const { work_date, summary, hours_spent, blockers } = req.body;
    if (!work_date || !summary?.trim())
      return res
        .status(400)
        .json({ message: "Date and work summary are required" });
    const hours = Number(hours_spent);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24)
      return res.status(400).json({ message: "Hours must be 0-24" });
    const empId = req.employee?.id;
    await db.query(
      `INSERT INTO it_daily_work (employee_id, work_date, summary, hours_spent, blockers)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE summary=VALUES(summary), hours_spent=VALUES(hours_spent), blockers=VALUES(blockers)`,
      [empId, work_date, summary.trim(), hours, blockers || null],
    );
    res.status(201).json({ message: "Daily work submitted" });
  } catch (err) {
    console.error("submitDailyWork error:", err);
    res.status(500).json({ message: "Failed to submit daily work" });
  }
};

/* ================= TIMESHEET ================= */
const IT_MANAGER_ROLES = new Set(["SUPER_ADMIN", "super_admin", "hr", "HR", "it_lead"]);
const isItManager = (req) => IT_MANAGER_ROLES.has(String(req.employee?.role || ""));

export const getTimesheet = async (req, res) => {
  try {
    // Developers see only their own hours; Super Admin / HR / IT lead see the whole team.
    const scopeOwn = !isItManager(req);
    const [rows] = await db.query(
      `SELECT t.*, ${EMP_JOIN("t.employee_id", "employee_name")}
       FROM it_timesheets t
       ${scopeOwn ? "WHERE t.employee_id = ?" : ""}
       ORDER BY t.entry_date DESC, t.id DESC LIMIT 300`,
      scopeOwn ? [req.employee?.id] : [],
    );
    res.json(rows);
  } catch (err) {
    console.error("getTimesheet error:", err);
    res.status(500).json({ message: "Failed to fetch timesheet" });
  }
};

export const addTimesheetEntry = async (req, res) => {
  try {
    const { entry_date, project, task, hours, notes } = req.body;
    if (!entry_date || !project?.trim())
      return res
        .status(400)
        .json({ message: "Date and project are required" });
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24)
      return res.status(400).json({ message: "Hours must be 0-24" });
    await db.query(
      `INSERT INTO it_timesheets (employee_id, entry_date, project, task, hours, notes)
       VALUES (?,?,?,?,?,?)`,
      [
        req.employee?.id,
        entry_date,
        project.trim(),
        task || null,
        h,
        notes || null,
      ],
    );
    res.status(201).json({ message: "Timesheet entry added" });
  } catch (err) {
    console.error("addTimesheetEntry error:", err);
    res.status(500).json({ message: "Failed to add entry" });
  }
};

export const deleteTimesheetEntry = async (req, res) => {
  try {
    await db.query(
      "DELETE FROM it_timesheets WHERE id=? AND employee_id=?",
      [req.params.id, req.employee?.id],
    );
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete entry" });
  }
};

/* ================= CODE REVIEW STATUS ================= */
export const getCodeReviews = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, ${EMP_JOIN("c.author_id", "author_name")},
              ${EMP_JOIN("c.reviewer_id", "reviewer_name")},
              (SELECT title FROM it_tasks WHERE id = c.task_id) AS task_title
       FROM it_code_reviews c
       ORDER BY FIELD(c.status,'Open','Changes Requested','Approved','Merged'), c.updated_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getCodeReviews error:", err);
    res.status(500).json({ message: "Failed to fetch code reviews" });
  }
};

export const createCodeReview = async (req, res) => {
  try {
    const { pr_title, pr_link, reviewer_id, task_id } = req.body;
    if (!pr_title?.trim())
      return res.status(400).json({ message: "PR title is required" });
    const [r] = await db.query(
      `INSERT INTO it_code_reviews (pr_title, pr_link, task_id, author_id, reviewer_id)
       VALUES (?,?,?,?,?)`,
      [pr_title.trim(), pr_link || null, task_id || null, req.employee?.id, reviewer_id || null],
    );
    // A PR under review moves the linked task to the Review column automatically
    if (task_id)
      await db.query(
        "UPDATE it_tasks SET status='Review' WHERE id=? AND status<>'Done'",
        [task_id],
      );
    res.status(201).json({ id: r.insertId, message: "Review requested" });
  } catch (err) {
    console.error("createCodeReview error:", err);
    res.status(500).json({ message: "Failed to create review" });
  }
};


export const deleteCodeReview = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid code review ID" });
    }

    const [result] = await db.query(
      "DELETE FROM it_code_reviews WHERE id=?",
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Code review deleted successfully" });
  } catch (err) {
    console.error("deleteCodeReview error:", err);
    res.status(500).json({ message: "Failed to delete code review" });
  }
};

export const updateCodeReview = async (req, res) => {
  try {
    const { status, comments } = req.body || {};
    const allowed = ["Open", "Changes Requested", "Approved", "Merged"];

    // A suggestion note can be saved without changing the review status.
    // When status is supplied, it must be one of the database enum values.
    if (status !== undefined && !allowed.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const hasStatus = status !== undefined;
    const hasComments = comments !== undefined;
    if (!hasStatus && !hasComments)
      return res.status(400).json({ message: "Nothing to update" });

    let result;
    if (hasStatus && hasComments) {
      [result] = await db.query(
        "UPDATE it_code_reviews SET status=?, comments=? WHERE id=?",
        [status, comments === "" ? null : comments, req.params.id],
      );
    } else if (hasStatus) {
      [result] = await db.query(
        "UPDATE it_code_reviews SET status=? WHERE id=?",
        [status, req.params.id],
      );
    } else {
      [result] = await db.query(
        "UPDATE it_code_reviews SET comments=? WHERE id=?",
        [comments === "" ? null : comments, req.params.id],
      );
    }

    if (!result.affectedRows)
      return res.status(404).json({ message: "Review not found" });

    // Only a real status transition can change the linked task state.
    if (hasStatus) {
      const [[cr]] = await db.query(
        "SELECT task_id FROM it_code_reviews WHERE id=?",
        [req.params.id],
      );
      if (cr?.task_id) {
        const next = status === "Merged" ? "Done" : "Review";
        await db.query("UPDATE it_tasks SET status=? WHERE id=?", [next, cr.task_id]);
      }
    }

    res.json({ message: "Review updated" });
  } catch (err) {
    console.error("updateCodeReview error:", err);
    res.status(500).json({ message: "Failed to update review" });
  }
};

/* ================= PROJECT MILESTONE TRACKER ================= */
export const getMilestones = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, ${EMP_JOIN("m.owner_id", "owner_name")}
       FROM it_milestones m ORDER BY m.target_date IS NULL, m.target_date`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getMilestones error:", err);
    res.status(500).json({ message: "Failed to fetch milestones" });
  }
};

export const createMilestone = async (req, res) => {
  try {
    const { project, milestone, description, target_date, owner_id } =
      req.body;
    if (!project?.trim() || !milestone?.trim())
      return res
        .status(400)
        .json({ message: "Project and milestone are required" });
    const [r] = await db.query(
      `INSERT INTO it_milestones (project, milestone, description, target_date, owner_id)
       VALUES (?,?,?,?,?)`,
      [
        project.trim(),
        milestone.trim(),
        description || null,
        target_date || null,
        owner_id || null,
      ],
    );
    res.status(201).json({ id: r.insertId, message: "Milestone created" });
  } catch (err) {
    console.error("createMilestone error:", err);
    res.status(500).json({ message: "Failed to create milestone" });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const { progress, status } = req.body;
    const p = Number(progress);
    if (!Number.isFinite(p) || p < 0 || p > 100)
      return res.status(400).json({ message: "Progress must be 0-100" });
    const allowed = [
      "Not Started",
      "On Track",
      "At Risk",
      "Delayed",
      "Completed",
    ];
    if (!allowed.includes(status))
      return res.status(400).json({ message: "Invalid status" });
    const [r] = await db.query(
      "UPDATE it_milestones SET progress=?, status=? WHERE id=?",
      [p, status, req.params.id],
    );
    if (!r.affectedRows)
      return res.status(404).json({ message: "Milestone not found" });
    res.json({ message: "Milestone updated" });
  } catch (err) {
    console.error("updateMilestone error:", err);
    res.status(500).json({ message: "Failed to update milestone" });
  }
};

/* ================= BUG REPORTING ================= */
export const getBugs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, ${EMP_JOIN("b.reported_by", "reported_by_name")},
              ${EMP_JOIN("b.assigned_to", "assigned_to_name")}
       FROM it_bugs b
       ORDER BY FIELD(b.status,'Open','Reopened','In Progress','Fixed','Closed'),
                FIELD(b.severity,'Critical','High','Medium','Low'), b.updated_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getBugs error:", err);
    res.status(500).json({ message: "Failed to fetch bugs" });
  }
};

export const reportBug = async (req, res) => {
  try {
    const { title, description, severity, project, assigned_to } = req.body;
    if (!title?.trim())
      return res.status(400).json({ message: "Title is required" });
    const [r] = await db.query(
      `INSERT INTO it_bugs (title, description, severity, project, reported_by, assigned_to)
       VALUES (?,?,?,?,?,?)`,
      [
        title.trim(),
        description || null,
        severity || "Medium",
        project || null,
        req.employee?.id,
        assigned_to || null,
      ],
    );
    res.status(201).json({ id: r.insertId, message: "Bug reported" });
  } catch (err) {
    console.error("reportBug error:", err);
    res.status(500).json({ message: "Failed to report bug" });
  }
};

export const updateBug = async (req, res) => {
  try {
    const { title, description, severity, project, assigned_to } = req.body || {};
    const allowed = ["Low", "Medium", "High", "Critical"];

    if (!title?.trim())
      return res.status(400).json({ message: "Title is required" });

    if (severity && !allowed.includes(severity))
      return res.status(400).json({ message: "Invalid severity" });

    const [r] = await db.query(
      `UPDATE it_bugs
       SET title=?, description=?, severity=?, project=?, assigned_to=?
       WHERE id=?`,
      [
        title.trim(),
        description || null,
        severity || "Medium",
        project || null,
        assigned_to || null,
        req.params.id,
      ],
    );

    if (!r.affectedRows)
      return res.status(404).json({ message: "Bug not found" });

    res.json({ message: "Bug updated successfully" });
  } catch (err) {
    console.error("updateBug error:", err);
    res.status(500).json({ message: "Failed to update bug" });
  }
};

export const deleteBug = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ message: "Invalid bug ID" });

    const [r] = await db.query(
      "DELETE FROM it_bugs WHERE id=?",
      [id],
    );

    if (!r.affectedRows)
      return res.status(404).json({ message: "Bug not found" });

    res.json({ message: "Bug deleted successfully" });
  } catch (err) {
    console.error("deleteBug error:", err);
    res.status(500).json({ message: "Failed to delete bug" });
  }
};

export const updateBugStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["Open", "In Progress", "Fixed", "Closed", "Reopened"];
    if (!allowed.includes(status))
      return res.status(400).json({ message: "Invalid status" });
    const [r] = await db.query("UPDATE it_bugs SET status=? WHERE id=?", [
      status,
      req.params.id,
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ message: "Bug not found" });
    res.json({ message: "Bug updated" });
  } catch (err) {
    console.error("updateBugStatus error:", err);
    res.status(500).json({ message: "Failed to update bug" });
  }
};

/* ================= PERFORMANCE REPORTING ================= */
/*
 * Business rule (HRMS):
 *  - A developer sees ONLY their own engineering scorecard.
 *  - SUPER_ADMIN / hr see the whole IT team: employees in an engineering
 *    department (IT / Frontend / QA…) plus anyone who has engineering
 *    activity (tasks, hours, PRs, bugs). HR / Sales / Marketing staff with
 *    no activity are never listed.
 */
export const getPerformanceReport = async (req, res) => {
  try {
    const role = String(req.employee?.role || "").toUpperCase();
    const isManager = role === "SUPER_ADMIN" || role === "HR";
    const me = Number(req.employee?.id || 0);

    const scope = isManager
      ? `AND (
           d.name IN ('IT','Frontend','Backend','Quality Assurance','Engineering','Development')
           OR EXISTS (SELECT 1 FROM it_tasks t WHERE t.assigned_to = e.id)
           OR EXISTS (SELECT 1 FROM it_timesheets ts WHERE ts.employee_id = e.id)
           OR EXISTS (SELECT 1 FROM it_code_reviews c WHERE c.author_id = e.id)
           OR EXISTS (SELECT 1 FROM it_bugs b WHERE b.reported_by = e.id OR b.assigned_to = e.id)
         )`
      : `AND e.id = ?`;

    const [rows] = await db.query(
      `SELECT e.id, e.name, e.employeeCode, d.name AS department, g.name AS designation,
        (SELECT COUNT(*) FROM it_tasks t WHERE t.assigned_to = e.id) AS tasks_total,
        (SELECT COUNT(*) FROM it_tasks t WHERE t.assigned_to = e.id AND t.status = 'Done') AS tasks_done,
        (SELECT COUNT(*) FROM it_tasks t WHERE t.assigned_to = e.id AND t.status = 'In Progress') AS tasks_in_progress,
        (SELECT COUNT(*) FROM it_tasks t WHERE t.assigned_to = e.id AND t.status <> 'Done'
           AND t.due_date IS NOT NULL AND t.due_date < CURDATE()) AS tasks_overdue,
        (SELECT COUNT(*) FROM it_daily_work w WHERE w.employee_id = e.id
           AND w.work_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS daily_submissions_30d,
        (SELECT COALESCE(SUM(ts.hours),0) FROM it_timesheets ts WHERE ts.employee_id = e.id
           AND ts.entry_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS hours_30d,
        (SELECT COALESCE(SUM(ts.hours),0) FROM it_timesheets ts WHERE ts.employee_id = e.id
           AND ts.entry_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) AS hours_7d,
        (SELECT COUNT(*) FROM it_code_reviews c WHERE c.author_id = e.id) AS prs_total,
        (SELECT COUNT(*) FROM it_code_reviews c WHERE c.author_id = e.id AND c.status = 'Merged') AS prs_merged,
        (SELECT COUNT(*) FROM it_bugs b WHERE b.assigned_to = e.id AND b.status IN ('Fixed','Closed')) AS bugs_fixed,
        (SELECT COUNT(*) FROM it_bugs b WHERE b.assigned_to = e.id AND b.status NOT IN ('Fixed','Closed')) AS bugs_open,
        (SELECT COUNT(*) FROM it_bugs b WHERE b.reported_by = e.id) AS bugs_reported
       FROM employees e
       LEFT JOIN departments d ON d.id = e.departmentId
       LEFT JOIN designations g ON g.id = e.designationId
       WHERE e.isActive = 1 ${scope}
       ORDER BY tasks_done DESC, hours_30d DESC, e.name ASC`,
      isManager ? [] : [me],
    );
    res.json(rows);
  } catch (err) {
    console.error("getPerformanceReport error:", err);
    res.status(500).json({ message: "Failed to build performance report" });
  }
};

/* ================= FEATURE DEPLOYMENT LOG ================= */
export const getDeployments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM dev_deployments ORDER BY deployed_at DESC LIMIT 300`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getDeployments error:", err);
    res.status(500).json({ message: "Failed to load deployments" });
  }
};

export const logDeployment = async (req, res) => {
  try {
    const { project, version_tag, environment, features, status } = req.body;
    if (!project || !String(project).trim())
      return res.status(400).json({ message: "Project is required" });

    const envAllowed = ["Development", "Staging", "Production"];
    const statusAllowed = ["Success", "Failed", "Rolled Back"];
    const env = envAllowed.includes(environment) ? environment : "Production";
    const st = statusAllowed.includes(status) ? status : "Success";

    const [emp] = await db.query(
      "SELECT id, name FROM employees WHERE id = ?",
      [req.employee?.id || 0],
    );

    const [r] = await db.query(
      `INSERT INTO dev_deployments
        (project, version_tag, environment, features, status, deployed_by_id, deployed_by)
       VALUES (?,?,?,?,?,?,?)`,
      [
        String(project).trim(),
        version_tag ? String(version_tag).trim() : null,
        env,
        features ? String(features).trim() : null,
        st,
        emp[0]?.id || null,
        emp[0]?.name || "IT Team",
      ],
    );
    res.status(201).json({ message: "Deployment logged", id: r.insertId });
  } catch (err) {
    console.error("logDeployment error:", err);
    res.status(500).json({ message: "Failed to log deployment" });
  }
};

export const deleteDeployment = async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM dev_deployments WHERE id=?", [
      req.params.id,
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ message: "Deployment not found" });
    res.json({ message: "Deployment deleted" });
  } catch (err) {
    console.error("deleteDeployment error:", err);
    res.status(500).json({ message: "Failed to delete deployment" });
  }
};
