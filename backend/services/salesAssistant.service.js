import { db } from "../config/db.js";

/*
 * Sales Assistant — deterministic, data-backed answers for the Sales portal chat.
 *
 * Every number comes from the rep's own rows (employee_id / sales_employee_id /
 * assigned_to), so the assistant can never leak another rep's pipeline. No LLM is
 * involved: the reply is assembled from SQL results, which keeps it fast and
 * always correct even when Ollama is not running on the server.
 */

/* ---------- formatting helpers ---------- */

const money = (n, cur = "INR") =>
  `${cur === "INR" || !cur ? "\u20B9" : cur + " "}${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);

const pct = (cur, target) =>
  Number(target) > 0 ? Math.min(100, Math.round((Number(cur || 0) / Number(target)) * 100)) : 0;

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const title = (s = "") => String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const join = (arr) => arr.filter(Boolean).join("\n");
const bullet = (s) => `\u2022 ${s}`;

const safeRows = async (sql, params = []) => {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    console.error("[sales-assistant] query failed:", err.message);
    return [];
  }
};

/* If the question names one of the rows (company / person / code), keep only those rows. */
const filterByMention = (message, rows, fields) => {
  const text = message.toLowerCase();
  const hit = rows.filter((r) =>
    fields.some((f) => {
      const v = String(r[f] || "").trim().toLowerCase();
      return v.length >= 3 && text.includes(v);
    }),
  );
  return hit.length ? hit : rows;
};

/* ---------- topic detection ---------- */

const TOPICS = [
  ["greeting", /^(hi+|hello|hey|namaste|namaskar|good (morning|afternoon|evening))\b/],
  ["thanks", /\b(thanks|thank you|thx|dhanyavad|shukriya)\b/],
  ["help", /\b(help|what can you (do|answer)|options|commands|menu|how do you work|capabilit)/],
  ["profile", /\b(who am i|my (profile|details?|info|name|email|code)|about me|mera profile)\b/],
  ["strategy", /\b(strateg|tips?|advice|suggest|improve|how (do|can|should) i|close more|convert|pitch|objection|negotiat|prioriti|focus (on|today)|what should i do)/],
  ["clients", /\bclients?\b|customers?\b|compan(y|ies)\b|mere client|client list/],
  ["followups", /follow.?ups?|\bcalls?\b|calling|phone|dial|on hold|hold list/],
  ["proposals", /proposals?|quotations?|quotes?\b/],
  ["invoices", /invoices?|\bbills?\b|billing|payments?\b|outstanding|\bdues?\b|overdue|collect|receivable|paid\b|unpaid/],
  ["targets", /targets?|\bkpis?\b|goals?\b|quota|achiev/],
  ["assignments", /assign|\btasks?\b|to.?do\b|my work\b|work list/],
  ["leads", /\bleads?\b|prospects?|pipeline/],
  ["eod", /\beod\b|end of (the )?day|daily report|aaj ka report/],
  ["performance", /performance|rating|score|appraisal|review|ranking/],
  ["sales", /\bsales?\b|revenue|\bsold\b|subscription|\bplans?\b|earning|deals?\b|conversion/],
  ["overview", /overview|summary|dashboard|stat(s|istics)?\b|how am i doing|my day|today|snapshot|kitne|kitna|how many|total|count/],
];

export const detectSalesTopic = (message = "") => {
  const text = String(message).toLowerCase().trim();
  for (const [topic, re] of TOPICS) if (re.test(text)) return topic;
  return null;
};

/* ---------- data blocks (all scoped to the rep) ---------- */

const getRep = async (employeeId) => {
  const [row] = await safeRows(
    `SELECT e.id, e.name, e.email, e.employeeCode, d.name AS department
     FROM employees e LEFT JOIN departments d ON d.id = e.departmentId
     WHERE e.id = ? LIMIT 1`,
    [employeeId],
  );
  return row || { id: employeeId, name: "there", email: "", employeeCode: "" };
};

const clientsBlock = async (rep, message) => {
  const all = await safeRows(
    `SELECT client_code, company_name, client_name, email, phone, status, created_at
     FROM clients WHERE employee_id = ? ORDER BY created_at DESC`,
    [rep.id],
  );
  if (!all.length) return "You have not added any clients yet. Use Clients > Create Client to add your first one.";

  const rows = filterByMention(message, all, ["company_name", "client_name", "client_code"]);
  const active = all.filter((c) => String(c.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = all.filter((c) => c.created_at && new Date(c.created_at) >= monthStart).length;

  const header =
    rows.length === all.length
      ? `You have ${plural(all.length, "client")} (${active} active, ${thisMonth} added this month).`
      : `Found ${plural(rows.length, "matching client")}:`;

  const list = rows
    .slice(0, 8)
    .map((c) =>
      bullet(
        `${c.company_name} (${c.client_code})${c.client_name ? ` \u2014 ${c.client_name}` : ""}${
          c.phone ? ` \u00B7 ${c.phone}` : ""
        }${c.email ? ` \u00B7 ${c.email}` : ""} \u00B7 added ${fmtDate(c.created_at)}`,
      ),
    );
  const more = rows.length > 8 ? `\u2026and ${rows.length - 8} more. Open Clients to see the full list.` : "";
  const detail = rows !== all && rows.length === 1 ? await clientDetail(rep, rows[0]) : "";
  return join([header, ...list, more, detail]);
};

/* Proposals + invoices for one named client, appended when the question singles a client out. */
const clientDetail = async (rep, client) => {
  const company = String(client.company_name || "").trim();
  const person = String(client.client_name || "").trim();
  const code = String(client.client_code || "").trim();
  const [proposals, invoices] = await Promise.all([
    safeRows(
      `SELECT proposal_number, title, status, total, currency FROM proposals
       WHERE sales_employee_id = ? AND created_by_role = 'sales'
         AND (client_company = ? OR client_name = ? OR client_company LIKE ? OR client_name LIKE ?)
       ORDER BY created_at DESC LIMIT 5`,
      [rep.id, company, person || company, `%${code}%`, `%${code}%`],
    ),
    safeRows(
      `SELECT invoice_no, total_amount, paid_amount, status, due_date FROM invoices
       WHERE employee_id = ? AND (client_name LIKE ? OR client_name LIKE ?)
       ORDER BY id DESC LIMIT 5`,
      [rep.id, `%${code}%`, `%${company}%`],
    ),
  ]);
  const lines = [];
  if (proposals.length) {
    lines.push(`Proposals for ${company || person} (${proposals.length}):`);
    proposals.forEach((p) =>
      lines.push(bullet(`${p.proposal_number} \u00B7 ${p.title || ""} \u00B7 ${money(p.total, p.currency)} \u00B7 ${title(String(p.status || "").toLowerCase())}`)),
    );
  }
  if (invoices.length) {
    const due = invoices.reduce(
      (s, i) => s + (String(i.status || "").toLowerCase() === "paid" ? 0 : Number(i.total_amount || 0) - Number(i.paid_amount || 0)),
      0,
    );
    lines.push(`Invoices (${invoices.length}) \u00B7 outstanding ${money(Math.max(0, due))}:`);
    invoices.forEach((i) =>
      lines.push(
        bullet(
          `${i.invoice_no} \u00B7 ${money(i.total_amount)} \u00B7 ${title(String(i.status || "pending").toLowerCase())}${i.due_date ? ` \u00B7 due ${fmtDate(i.due_date)}` : ""}`,
        ),
      ),
    );
  }
  if (!proposals.length && !invoices.length) lines.push("No proposals or invoices yet for this client.");
  return join(lines);
};

const callsBlock = async (rep, message) => {
  const all = await safeRows(
    `SELECT call_id, customer_name, phone, status, call_date, call_time, follow_up_datetime
     FROM SuperAdmin_sales_calls WHERE employee_id = ? ORDER BY created_at DESC`,
    [rep.id],
  );
  if (!all.length) return "No calls logged yet. Add your first call from Calls & Follow-ups.";

  const now = new Date();
  const rows = filterByMention(message, all, ["customer_name", "phone", "call_id"]);
  const by = (s) => all.filter((c) => String(c.status).toLowerCase() === s).length;
  const withFollow = all.filter((c) => c.follow_up_datetime && String(c.status).toLowerCase() === "hold");
  const overdue = withFollow.filter((c) => new Date(c.follow_up_datetime) < now);
  const today = withFollow.filter((c) => daysBetween(now, new Date(c.follow_up_datetime)) === 0 && new Date(c.follow_up_datetime) >= now);
  const upcoming = withFollow.filter((c) => {
    const d = daysBetween(now, new Date(c.follow_up_datetime));
    return d > 0 && d <= 7;
  });

  const summary = `You have logged ${plural(all.length, "call")}: ${by("accepted")} accepted, ${by("hold")} on hold, ${by("rejected")} rejected.`;
  const follow = `Follow-ups: ${overdue.length} overdue, ${today.length} due today, ${upcoming.length} in the next 7 days.`;

  const lines = [];
  if (rows.length !== all.length) {
    lines.push("Matching calls:");
    rows.slice(0, 6).forEach((c) =>
      lines.push(
        bullet(
          `${c.customer_name || "-"} (${c.call_id}) \u00B7 ${c.phone || "-"} \u00B7 ${title(c.status)}${
            c.follow_up_datetime ? ` \u00B7 follow-up ${fmtDateTime(c.follow_up_datetime)}` : ""
          }`,
        ),
      ),
    );
  } else {
    if (overdue.length) {
      lines.push("Overdue follow-ups (call these first):");
      overdue.slice(0, 5).forEach((c) =>
        lines.push(bullet(`${c.customer_name || "-"} \u00B7 ${c.phone || "-"} \u00B7 was due ${fmtDateTime(c.follow_up_datetime)}`)),
      );
    }
    if (today.length) {
      lines.push("Due today:");
      today.slice(0, 5).forEach((c) => lines.push(bullet(`${c.customer_name || "-"} \u00B7 ${c.phone || "-"} \u00B7 ${fmtDateTime(c.follow_up_datetime)}`)));
    }
    if (!overdue.length && !today.length && upcoming.length) {
      lines.push("Coming up:");
      upcoming.slice(0, 5).forEach((c) => lines.push(bullet(`${c.customer_name || "-"} \u00B7 ${fmtDateTime(c.follow_up_datetime)}`)));
    }
  }
  return join([summary, follow, ...lines]);
};

const proposalsBlock = async (rep, message) => {
  const all = await safeRows(
    `SELECT proposal_number, client_company, client_name, title, status, total, currency, valid_until, created_at
     FROM proposals WHERE sales_employee_id = ? AND created_by_role = 'sales' ORDER BY created_at DESC`,
    [rep.id],
  );
  if (!all.length) return "You have no proposals yet. Create one from Proposals > New proposal.";

  const rows = filterByMention(message, all, ["proposal_number", "client_company", "client_name", "title"]);
  const by = (s) => all.filter((p) => p.status === s);
  const acceptedValue = by("ACCEPTED").reduce((s, p) => s + Number(p.total || 0), 0);
  const openValue = ["PENDING_APPROVAL", "SENT"].flatMap(by).reduce((s, p) => s + Number(p.total || 0), 0);

  const summary = `You have ${plural(all.length, "proposal")}: ${by("ACCEPTED").length} accepted (${money(acceptedValue)}), ${by("SENT").length} with clients, ${by("PENDING_APPROVAL").length} awaiting Super Admin approval, ${by("REVISION").length} need revision, ${by("DRAFT").length} drafts, ${by("REJECTED").length} rejected.`;
  const open = openValue ? `Open pipeline value (awaiting approval + with clients): ${money(openValue)}.` : "";
  const list = rows
    .slice(0, 6)
    .map((p) =>
      bullet(
        `${p.proposal_number} \u00B7 ${p.client_company || p.client_name || "-"} \u00B7 ${p.title || ""} \u00B7 ${money(p.total, p.currency)} \u00B7 ${title(p.status.toLowerCase())}${
          p.valid_until ? ` \u00B7 valid till ${fmtDate(p.valid_until)}` : ""
        }`,
      ),
    );
  return join([summary, open, rows.length !== all.length ? "Matching proposals:" : "Recent proposals:", ...list]);
};

const invoicesBlock = async (rep, message) => {
  const all = await safeRows(
    `SELECT invoice_no, client_name, total_amount, paid_amount, status, invoice_date, due_date
     FROM invoices WHERE employee_id = ? ORDER BY id DESC`,
    [rep.id],
  );
  if (!all.length) return "You have not raised any invoices yet. Use Invoices > Create Invoice.";

  const now = new Date();
  const rows = filterByMention(message, all, ["invoice_no", "client_name"]);
  const isPaid = (i) => String(i.status || "").toLowerCase() === "paid";
  const isOverdue = (i) =>
    !isPaid(i) && (String(i.status || "").toLowerCase() === "overdue" || (i.due_date && new Date(i.due_date) < startOfDay(now)));
  const billed = all.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const collected = all.reduce((s, i) => s + (isPaid(i) ? Number(i.total_amount || 0) : Number(i.paid_amount || 0)), 0);
  const outstanding = Math.max(0, billed - collected);
  const overdue = all.filter(isOverdue);
  const pending = all.filter((i) => !isPaid(i) && !isOverdue(i));

  const summary = `You have ${plural(all.length, "invoice")} worth ${money(billed)}: ${all.filter(isPaid).length} paid, ${pending.length} pending, ${overdue.length} overdue.`;
  const cash = `Collected ${money(collected)} \u00B7 Outstanding ${money(outstanding)}.`;
  const focus = rows.length !== all.length ? rows : [...overdue, ...pending];
  const list = focus
    .slice(0, 6)
    .map((i) =>
      bullet(
        `${i.invoice_no} \u00B7 ${i.client_name || "-"} \u00B7 ${money(i.total_amount)} \u00B7 ${title(String(i.status || "pending").toLowerCase())}${
          i.due_date ? ` \u00B7 due ${fmtDate(i.due_date)}` : ""
        }`,
      ),
    );
  const label = rows.length !== all.length ? "Matching invoices:" : focus.length ? "Needs collection:" : "All invoices are paid. Great job!";
  return join([summary, cash, label, ...list]);
};

const targetsBlock = async (rep) => {
  const rows = await safeRows(
    `SELECT id, title, metrics, target_value, current_value, unit, deadline, status, priority
     FROM super_admin_targets WHERE employee_id = ? AND COALESCE(is_active, 1) = 1
     ORDER BY (status = 'completed'), deadline IS NULL, deadline ASC`,
    [rep.id],
  );
  if (!rows.length) return "No targets have been assigned to you yet. They will appear here once the Super Admin sets them.";

  const now = new Date();
  const done = rows.filter((t) => t.status === "completed").length;
  const avg = Math.round(rows.reduce((s, t) => s + pct(t.current_value, t.target_value), 0) / rows.length);
  const summary = `You have ${plural(rows.length, "target")}: ${done} completed, ${rows.length - done} open. Average progress ${avg}%.`;
  const list = rows.slice(0, 8).map((t) => {
    const p = pct(t.current_value, t.target_value);
    const left = t.deadline ? daysBetween(now, new Date(t.deadline)) : null;
    const due =
      left === null ? "" : left < 0 ? ` \u00B7 ${plural(Math.abs(left), "day")} overdue` : left === 0 ? " \u00B7 due today" : ` \u00B7 ${plural(left, "day")} left`;
    return bullet(
      `${t.title} \u2014 ${Number(t.current_value || 0)}/${Number(t.target_value || 0)}${t.unit ? ` ${t.unit}` : ""} (${p}%) \u00B7 ${title(t.status)}${
        t.priority ? ` \u00B7 ${title(t.priority)} priority` : ""
      }${t.deadline ? ` \u00B7 deadline ${fmtDate(t.deadline)}${due}` : ""}`,
    );
  });
  return join([summary, ...list]);
};

const assignmentsBlock = async (rep) => {
  const rows = await safeRows(
    `SELECT title, priority, status, due_date, progress
     FROM work_assignments WHERE assigned_to IN (?, ?) ORDER BY (status = 'completed'), due_date ASC`,
    [rep.employeeCode || "", String(rep.id)],
  );
  if (!rows.length) return "You have no work assignments right now.";
  const now = new Date();
  const by = (s) => rows.filter((r) => r.status === s).length;
  const overdue = rows.filter((r) => r.status !== "completed" && r.due_date && new Date(r.due_date) < startOfDay(now));
  const summary = `You have ${plural(rows.length, "assignment")}: ${by("pending")} pending, ${by("in_progress")} in progress, ${by("completed")} completed${overdue.length ? `, ${overdue.length} overdue` : ""}.`;
  const list = rows
    .filter((r) => r.status !== "completed")
    .slice(0, 6)
    .map((r) =>
      bullet(
        `${r.title} \u00B7 ${title(r.priority || "medium")} priority \u00B7 ${Number(r.progress || 0)}% \u00B7 ${title(r.status)}${
          r.due_date ? ` \u00B7 due ${fmtDate(r.due_date)}` : ""
        }`,
      ),
    );
  return join([summary, ...list]);
};

const leadsBlock = async (rep) => {
  const leads = await safeRows(
    `SELECT l.name, l.phone, l.status, l.assigned_date, l.response_date, b.file_name
     FROM leads l LEFT JOIN lead_batches b ON b.id = l.batch_id
     WHERE COALESCE(l.is_active, 1) = 1
       AND (l.assigned_to = ? OR (l.assigned_to IS NULL AND b.assigned_to = ?))
     ORDER BY l.created_at DESC`,
    [rep.id, rep.id],
  );
  const field = await safeRows(
    `SELECT company_name, owner_name, phone, status, next_followup_date
     FROM field_sales_leads WHERE created_by = ? ORDER BY created_at DESC`,
    [rep.id],
  );
  if (!leads.length && !field.length) return "No leads are assigned to you yet.";

  const by = (s) => leads.filter((l) => String(l.status || "").toLowerCase() === s).length;
  const summary = leads.length
    ? `You have ${plural(leads.length, "assigned lead")}: ${by("pending")} pending, ${by("accepted")} accepted, ${by("rejected")} rejected.`
    : "";
  const pendingList = leads
    .filter((l) => String(l.status || "").toLowerCase() === "pending")
    .slice(0, 6)
    .map((l) => bullet(`${l.name || "-"} \u00B7 ${l.phone || "-"}${l.file_name ? ` \u00B7 batch ${l.file_name}` : ""} \u00B7 assigned ${fmtDate(l.assigned_date)}`));
  const fieldSummary = field.length
    ? `Field leads you captured: ${field.length} (${field.filter((f) => String(f.status).toLowerCase() === "new").length} new).`
    : "";
  const fieldList = field
    .slice(0, 4)
    .map((f) => bullet(`${f.company_name || f.owner_name || "-"} \u00B7 ${f.phone || "-"} \u00B7 ${title(f.status || "new")}${f.next_followup_date ? ` \u00B7 next follow-up ${fmtDate(f.next_followup_date)}` : ""}`));
  return join([summary, pendingList.length ? "Pending leads to work on:" : "", ...pendingList, fieldSummary, ...fieldList]);
};

const eodBlock = async (rep) => {
  const rows = await safeRows(
    `SELECT report_date, status, tasks_completed, submitted_at
     FROM eod_reports WHERE employee_id = ? ORDER BY report_date DESC LIMIT 31`,
    [rep.id],
  );
  if (!rows.length) return "You have not submitted any EOD reports yet. Submit today's from EOD Reports > Submit EOD.";
  const now = new Date();
  const todayDone = rows.some((r) => daysBetween(new Date(r.report_date), now) === 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = rows.filter((r) => new Date(r.report_date) >= monthStart).length;
  const by = (s) => rows.filter((r) => r.status === s).length;
  const summary = `EOD reports: ${thisMonth} submitted this month (${by("approved")} approved, ${by("submitted")} awaiting review${by("rejected") ? `, ${by("rejected")} rejected` : ""}).`;
  const todayLine = todayDone ? "Today's EOD is already submitted." : "Today's EOD is still pending \u2014 submit it before you log off.";
  const list = rows.slice(0, 3).map((r) =>
    bullet(`${fmtDate(r.report_date)} \u00B7 ${title(r.status)}${r.tasks_completed ? ` \u00B7 ${String(r.tasks_completed).slice(0, 80)}` : ""}`),
  );
  return join([summary, todayLine, "Latest:", ...list]);
};

const performanceBlock = async (rep) => {
  const rows = await safeRows(
    `SELECT period, quality, productivity, communication, teamwork, attendance, initiative, deadline, adaptability, avg_score, status, remarks
     FROM performance_records WHERE employee_id = ? ORDER BY created_at DESC LIMIT 3`,
    [rep.id],
  );
  if (!rows.length) return "No performance reviews have been recorded for you yet.";
  const [latest] = rows;
  const metrics = ["quality", "productivity", "communication", "teamwork", "attendance", "initiative", "deadline", "adaptability"]
    .filter((k) => latest[k] != null)
    .map((k) => `${title(k)} ${Number(latest[k])}`)
    .join(" \u00B7 ");
  const summary = `Latest review (${latest.period || "current period"}): average score ${Number(latest.avg_score || 0)}/10 \u00B7 ${title(latest.status || "recorded")}.`;
  const trend =
    rows.length > 1
      ? `Previous periods: ${rows.slice(1).map((r) => `${r.period || "-"} \u2192 ${Number(r.avg_score || 0)}`).join(", ")}.`
      : "";
  return join([summary, metrics ? bullet(metrics) : "", latest.remarks ? bullet(`Remarks: ${latest.remarks}`) : "", trend]);
};

const salesBlock = async (rep) => {
  const rows = await safeRows(
    `SELECT sr.plan_name, sr.amount, sr.amount_paid, sr.payment_status, sr.purchase_date, sr.subscription_status, c.company_name
     FROM sales_report sr LEFT JOIN clients c ON c.id = sr.client_id
     WHERE sr.employee_id = ? ORDER BY sr.purchase_date DESC`,
    [rep.id],
  );
  if (!rows.length) return "No closed sales are recorded for you yet. Log one from Sales Reports > Add Sale.";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenue = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const collected = rows.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const month = rows.filter((r) => r.purchase_date && new Date(r.purchase_date) >= monthStart);
  const monthRevenue = month.reduce((s, r) => s + Number(r.amount || 0), 0);
  const summary = `You have closed ${plural(rows.length, "sale")} worth ${money(revenue)} (collected ${money(collected)}).`;
  const monthLine = `This month: ${plural(month.length, "sale")} \u00B7 ${money(monthRevenue)}.`;
  const list = rows.slice(0, 5).map((r) =>
    bullet(`${r.company_name || "-"} \u00B7 ${r.plan_name || "plan"} \u00B7 ${money(r.amount)} \u00B7 ${title(r.payment_status || "pending")} \u00B7 ${fmtDate(r.purchase_date)}`),
  );
  return join([summary, monthLine, "Recent sales:", ...list]);
};

const overviewBlock = async (rep) => {
  const q = async (sql, params = [rep.id]) => {
    const [row] = await safeRows(sql, params);
    return row || {};
  };
  const [clients, calls, props, inv, targets, leads, eod] = await Promise.all([
    q(`SELECT COUNT(*) n FROM clients WHERE employee_id = ?`),
    q(`SELECT COUNT(*) n,
              SUM(status = 'hold' AND follow_up_datetime IS NOT NULL AND follow_up_datetime < NOW()) overdue,
              SUM(status = 'hold' AND DATE(follow_up_datetime) = CURDATE() AND follow_up_datetime >= NOW()) today
       FROM SuperAdmin_sales_calls WHERE employee_id = ?`),
    q(`SELECT COUNT(*) n, SUM(status = 'ACCEPTED') accepted, SUM(status IN ('SENT','PENDING_APPROVAL')) open,
              COALESCE(SUM(CASE WHEN status = 'ACCEPTED' THEN total END), 0) value
       FROM proposals WHERE sales_employee_id = ? AND created_by_role = 'sales'`),
    q(`SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN LOWER(status) <> 'paid' THEN total_amount - COALESCE(paid_amount, 0) END), 0) outstanding,
              SUM(LOWER(status) = 'overdue' OR (LOWER(status) <> 'paid' AND due_date < CURDATE())) overdue
       FROM invoices WHERE employee_id = ?`),
    q(`SELECT COUNT(*) n, SUM(status = 'completed') done,
              COALESCE(ROUND(AVG(LEAST(100, current_value / NULLIF(target_value, 0) * 100))), 0) avg_pct
       FROM super_admin_targets WHERE employee_id = ? AND COALESCE(is_active, 1) = 1`),
    q(`SELECT COUNT(*) n, SUM(LOWER(l.status) = 'pending') pending
       FROM leads l LEFT JOIN lead_batches b ON b.id = l.batch_id
       WHERE COALESCE(l.is_active, 1) = 1 AND (l.assigned_to = ? OR (l.assigned_to IS NULL AND b.assigned_to = ?))`, [rep.id, rep.id]),
    q(`SELECT SUM(report_date = CURDATE()) today FROM eod_reports WHERE employee_id = ?`),
  ]);
  const n = (v) => Number(v || 0);
  return join([
    `Here is your snapshot for ${fmtDate(new Date())}:`,
    bullet(`Clients: ${n(clients.n)}`),
    bullet(`Leads: ${n(leads.n)} assigned (${n(leads.pending)} pending)`),
    bullet(`Calls: ${n(calls.n)} logged \u00B7 ${n(calls.overdue)} overdue follow-ups \u00B7 ${n(calls.today)} due today`),
    bullet(`Proposals: ${n(props.n)} total \u00B7 ${n(props.accepted)} accepted (${money(props.value)}) \u00B7 ${n(props.open)} open`),
    bullet(`Invoices: ${n(inv.n)} raised \u00B7 ${money(inv.outstanding)} outstanding \u00B7 ${n(inv.overdue)} overdue`),
    bullet(`Targets: ${n(targets.n)} assigned \u00B7 ${n(targets.done)} completed \u00B7 ${n(targets.avg_pct)}% average progress`),
    bullet(`EOD: ${n(eod.today) ? "submitted for today" : "not submitted yet today"}`),
    "Ask me about any of these for the full breakdown.",
  ]);
};

const strategyBlock = async (rep) => {
  const [calls] = await safeRows(
    `SELECT SUM(status = 'hold' AND follow_up_datetime IS NOT NULL AND follow_up_datetime < NOW()) overdue,
            SUM(status = 'hold' AND follow_up_datetime IS NULL) nofollow
     FROM SuperAdmin_sales_calls WHERE employee_id = ?`,
    [rep.id],
  );
  const stale = await safeRows(
    `SELECT proposal_number, client_company, client_name, DATEDIFF(CURDATE(), sent_at) days
     FROM proposals WHERE sales_employee_id = ? AND created_by_role = 'sales' AND status = 'SENT' AND sent_at < NOW() - INTERVAL 3 DAY
     ORDER BY sent_at ASC LIMIT 3`,
    [rep.id],
  );
  const drafts = await safeRows(
    `SELECT COUNT(*) n FROM proposals WHERE sales_employee_id = ? AND created_by_role = 'sales' AND status IN ('DRAFT','REVISION')`,
    [rep.id],
  );
  const overdueInv = await safeRows(
    `SELECT invoice_no, client_name, total_amount FROM invoices
     WHERE employee_id = ? AND LOWER(status) <> 'paid' AND (LOWER(status) = 'overdue' OR due_date < CURDATE()) ORDER BY due_date ASC LIMIT 3`,
    [rep.id],
  );
  const risky = await safeRows(
    `SELECT title, target_value, current_value, unit, deadline FROM super_admin_targets
     WHERE employee_id = ? AND COALESCE(is_active, 1) = 1 AND status <> 'completed'
       AND deadline IS NOT NULL AND deadline <= CURDATE() + INTERVAL 14 DAY
       AND current_value / NULLIF(target_value, 0) < 0.6
     ORDER BY deadline ASC LIMIT 3`,
    [rep.id],
  );
  const [leads] = await safeRows(
    `SELECT SUM(LOWER(l.status) = 'pending') pending FROM leads l LEFT JOIN lead_batches b ON b.id = l.batch_id
     WHERE COALESCE(l.is_active, 1) = 1 AND (l.assigned_to = ? OR (l.assigned_to IS NULL AND b.assigned_to = ?))`,
    [rep.id, rep.id],
  );
  const [eod] = await safeRows(`SELECT SUM(report_date = CURDATE()) today FROM eod_reports WHERE employee_id = ?`, [rep.id]);

  const actions = [];
  if (Number(calls?.overdue)) actions.push(`Clear your ${plural(Number(calls.overdue), "overdue follow-up")} first \u2014 a late call is still better than a missed one.`);
  if (Number(calls?.nofollow)) actions.push(`${plural(Number(calls.nofollow), "call")} on hold have no follow-up date. Set one so nothing slips.`);
  stale.forEach((p) => actions.push(`${p.proposal_number} has been with ${p.client_company || p.client_name} for ${plural(Number(p.days), "day")} \u2014 call to ask if they have questions.`));
  if (Number(drafts?.[0]?.n)) actions.push(`Finish and submit your ${plural(Number(drafts[0].n), "draft / revision proposal")} so the Super Admin can approve them.`);
  overdueInv.forEach((i) => actions.push(`Invoice ${i.invoice_no} (${i.client_name || "-"}, ${money(i.total_amount)}) is overdue \u2014 send a polite payment reminder.`));
  risky.forEach((t) => actions.push(`Target "${t.title}" is at ${pct(t.current_value, t.target_value)}% with the deadline on ${fmtDate(t.deadline)} \u2014 plan the gap of ${Math.max(0, Number(t.target_value) - Number(t.current_value))}${t.unit ? ` ${t.unit}` : ""}.`));
  if (Number(leads?.pending)) actions.push(`${plural(Number(leads.pending), "lead")} are still pending \u2014 qualify or close them so your pipeline stays clean.`);
  if (!Number(eod?.today)) actions.push("Submit today's EOD report before you wrap up.");

  if (!actions.length) {
    return join([
      "Your pipeline is in good shape \u2014 no overdue follow-ups, invoices or at-risk targets.",
      bullet("Prospect: add 3-5 new leads or calls today to keep next month's pipeline full."),
      bullet("Upsell: review accepted proposals for clients who could use an additional service."),
      bullet("Referrals: ask recently accepted clients for one introduction each."),
    ]);
  }
  return join([`Based on your live data, here is where to focus${rep.name ? `, ${rep.name.split(" ")[0]}` : ""}:`, ...actions.slice(0, 7).map((a, i) => `${i + 1}. ${a}`)]);
};

const helpBlock = (rep) =>
  join([
    `I answer from your own Sales Portal data${rep.name ? `, ${rep.name.split(" ")[0]}` : ""}. Try asking:`,
    bullet("\"Show my clients\" or \"details of <company>\""),
    bullet("\"Which follow-ups are due today?\" / \"overdue calls\""),
    bullet("\"Proposal status\" / \"which proposals are accepted?\""),
    bullet("\"Pending invoices\" / \"how much is outstanding?\""),
    bullet("\"My targets\" / \"how far am I from my target?\""),
    bullet("\"My leads\", \"my assignments\", \"EOD status\", \"my performance\""),
    bullet("\"Give me a summary\" or \"what should I focus on today?\""),
  ]);

const profileBlock = (rep) =>
  join([
    `You are ${rep.name || "a Sales team member"}${rep.employeeCode ? ` (${rep.employeeCode})` : ""}.`,
    rep.email ? bullet(`Email: ${rep.email}`) : "",
    bullet(`Department: ${rep.department || "Sales"}`),
    bullet("Role: Sales Executive (Sales Portal)"),
  ]);

/* ---------- entry point ---------- */

/* Names/codes of the rep's own records, used to route questions that quote a record. */
const loadMentionIndex = async (rep) => {
  const [clients, calls, proposals, invoices] = await Promise.all([
    safeRows(`SELECT company_name, client_name, client_code FROM clients WHERE employee_id = ?`, [rep.id]),
    safeRows(`SELECT customer_name, call_id, phone FROM SuperAdmin_sales_calls WHERE employee_id = ?`, [rep.id]),
    safeRows(
      `SELECT proposal_number, client_company, client_name, title FROM proposals WHERE sales_employee_id = ? AND created_by_role = 'sales'`,
      [rep.id],
    ),
    safeRows(`SELECT invoice_no, client_name FROM invoices WHERE employee_id = ?`, [rep.id]),
  ]);
  return { clients, calls, proposals, invoices };
};

/*
 * strong = the quoted record makes up most of the message ("PRP-2026-0011", "Language Test Customer"),
 * so it should beat keyword detection. Weak matches only apply when no keyword matched.
 */
const mentionedTopic = (index, message, strong = false) => {
  const text = String(message || "").toLowerCase().trim();
  if (text.length < 3) return null;
  const has = (rows, fields) =>
    rows.some((r) =>
      fields.some((f) => {
        const v = String(r[f] || "").trim().toLowerCase();
        if (v.length < 3 || !text.includes(v)) return false;
        return !strong || v.length >= text.length * 0.6;
      }),
    );
  const { clients, calls, proposals, invoices } = index;
  if (has(proposals, ["proposal_number"])) return "proposals";
  if (has(invoices, ["invoice_no"])) return "invoices";
  if (has(calls, ["call_id", "phone"])) return "followups";
  if (has(clients, ["company_name", "client_name", "client_code"])) return "clients";
  if (has(calls, ["customer_name"])) return "followups";
  if (has(proposals, ["client_company", "client_name", "title"])) return "proposals";
  if (has(invoices, ["client_name"])) return "invoices";
  return null;
};

const INTENT_TO_TOPIC = {
  CLIENT_INFO: "clients",
  LEAD: "leads",
  TARGET: "targets",
  WORK_ASSIGNMENT: "assignments",
  INVOICE: "invoices",
  EOD: "eod",
  PERFORMANCE: "performance",
  SALES: "sales",
  COMPANY_STATS: "overview",
  EMPLOYEE_INFO: "profile",
  GREETING: "greeting",
};

/**
 * Returns a ready-to-send reply for a Sales portal user, or null when the
 * question is not about sales data (caller may fall back to the LLM path).
 */
export const answerSalesQuestion = async (message, intent, employeeId) => {
  if (!employeeId) return null;
  const rep = await getRep(employeeId);
  const index = await loadMentionIndex(rep);
  const topic =
    mentionedTopic(index, message, true) ||
    detectSalesTopic(message) ||
    INTENT_TO_TOPIC[intent] ||
    mentionedTopic(index, message, false);

  switch (topic) {
    case "greeting":
      return join([
        `Hello ${rep.name ? rep.name.split(" ")[0] : "there"}! I am your Sales Assistant.`,
        "Ask me about your clients, follow-ups, proposals, invoices, targets, leads or EOD reports \u2014 or say \"summary\" for today's snapshot.",
      ]);
    case "thanks":
      return "You're welcome! Ping me whenever you need your numbers.";
    case "help":
      return helpBlock(rep);
    case "profile":
      return profileBlock(rep);
    case "clients":
      return clientsBlock(rep, message);
    case "followups":
      return callsBlock(rep, message);
    case "proposals":
      return proposalsBlock(rep, message);
    case "invoices":
      return invoicesBlock(rep, message);
    case "targets":
      return targetsBlock(rep);
    case "assignments":
      return assignmentsBlock(rep);
    case "leads":
      return leadsBlock(rep);
    case "eod":
      return eodBlock(rep);
    case "performance":
      return performanceBlock(rep);
    case "sales":
      return salesBlock(rep);
    case "strategy":
      return strategyBlock(rep);
    case "overview":
      return overviewBlock(rep);
    default:
      return join([
        "I could not match that to your sales data.",
        helpBlock(rep),
      ]);
  }
};
