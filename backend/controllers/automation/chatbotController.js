import { db } from "../../config/db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { detectIntent, extractName } from "../../services/intentService.js";
import {

  fetchAdminContext,
  fetchAllEmployees, fetchAllClients, fetchCompanyStats,
  fetchEmployeeByName, fetchClientByName, fetchAttendanceByEmployee,
  fetchHRDashboardContext, fetchEmployeeDashboardContext,
  fetchClientDashboardContext, fetchSalesDashboardContext
} from "../../services/queryService.js";
import { answerSalesQuestion } from "../../services/salesAssistant.service.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3";

const generateSessionId = () => "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

const normalizeUserType = (role, bodyType) => {

  const raw = (bodyType || role || "USER").toString().toUpperCase();
  const map = { CLIENT_ADMIN:"CLIENT", CLIENT:"CLIENT", HR:"HR", EMPLOYEE:"EMPLOYEE", SALES:"SALES", SUPER_ADMIN:"SUPER_ADMIN", ADMIN:"ADMIN", CANDIDATE:"CANDIDATE", USER:"USER" };
  return map[raw] || raw;
};

const fetchContextData = async (message, intent, userType, userId) => {
  const name = extractName(message);
  try {
    if (userType === "ADMIN" || userType === "SUPER_ADMIN") {
      return await fetchAdminContext(message, intent, name);
    }
    if (userType === "HR") {
      return await fetchHRDashboardContext(message, intent, name, userId);
    }
    if (userType === "EMPLOYEE") {
      return await fetchEmployeeDashboardContext(message, intent, userId);


    }
    if (userType === "CLIENT") {
      return await fetchClientDashboardContext(message, intent, userId);
    }
    if (userType === "SALES") {
      return await fetchSalesDashboardContext(message, intent, userId);
    }
  } catch (err) {
    console.error("Context fetch error:", err.message);
  }
  return null;
};

const buildPrompt = (message, userType, contextData) => {

   const role = userType; // 👈 add this line (SAFE FIX)
  if (contextData) {
    return `You are an intelligent HRMS DATA ASSISTANT.


Your job:

- Return accurate data from database
- Give summary/insight ONLY where useful
- Respect role-based access strictly

ROLE ACCESS RULES:

1. ADMIN / SUPER_ADMIN:
- Full access
- Can see all company data
- Can get summaries, analytics, insights

2. CLIENT:
- Access ONLY their company data
- Show ALL related records (no hiding)
- Summary allowed but ONLY for their data

3. EMPLOYEE / HR / SALES:
- Only allowed scoped data
- No cross-access

DATA RULES:
- Do not provide SQL queries in any response. Answer all questions without generating, suggesting, or displaying any database query syntax.
- ONLY use provided DATA
- DO NOT hallucinate
- DO NOT guess missing values
- DO NOT modify actual data

ANSWER BEHAVIOR:

1. IF DIRECT QUESTION (count / specific):
→ Give exact answer clearly

Example:
"Today 12 employees are absent."

---

2. IF LIST / MULTIPLE RECORDS:
→ Show all records clearly

---

3. IF LARGE DATA:
→ First show structured data
→ Then give short useful summary

Example:
- Total employees: 120  
- Present: 102  
- Absent: 18  

Summary:
Most employees are present today with an attendance rate of ~85%.

---

4. IF USER ASKS ANALYSIS / TREND:
→ Then ONLY do summary + explanation based on data

---

5. IF DATA NOT FOUND / OUT OF DATABASE:

→ Reply EXACTLY:

"Is jankari ke liye aap HR team se sampark karein:
Email: support@company.com
Phone: +91-9876543210"

OUTPUT FORMAT RULES:

- MINIMUM 3 lines (mandatory)
- MAX: unlimited
- Format depends on question:
  ✔️ numbers → sentence
  ✔️ records → structured list
  ✔️ mixed → data + summary

- Keep response clean & readable

STRICT RULES:

- NO unnecessary explanation
- NO AI talk
- NO assumptions
- NO extra story
- NO data outside DB
- NO markdown/code blocks in final output


EMPTY DATA RULE:

If data = empty/null:
→ Treat same as NOT FOUND
→ Show contact message
LINE RULE:

- Always minimum 3 lines
- If small data → format properly instead of adding fake content

DATA:
${contextData}

USER QUERY: ${message}

OUTPUT:

- Simple bullet points only
- If data exists, show it
- If empty, say "No records found"

- Maximum 10 lines`;


  }

  return `You are a HRMS assistant.

If no data is available, reply ONLY:
"No records found."

Do not generate JSON, code, or extra instructions.`;
};



const callOllama = async (prompt) => {

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
       signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
       messages: [
  {
    role: "system",
    content: "You are a database display engine. NEVER generate assumptions, summaries, or explanations. ONLY format given data."
  },
  {
    role: "user",
    content: prompt
  }
]
      }),
    });


    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${errText}`);
    }

    const data = await response.json();

    return data?.message?.content?.trim() || null;

  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      console.error("Ollama timeout error");
      return "Server took too long to respond.";
    }

    console.error("Ollama error:", error.message);
    return null;
  }
};

const sendMessage = asyncHandler(async (req, res) => {
  const { message, session_id, user_type: clientUserType } = req.body;

  if (!message || !message.trim()) return res.status(400).json({ success: false, message: "Message is required" });

  const blockedPatterns = [
  "generate a comprehensive report",
  "act as",
  "ignore previous instructions",
  "you are now",
  "assume you are"
];

if (blockedPatterns.some(p => message.toLowerCase().includes(p))) {
  return res.json({
    success: true,
    data: {
      response: "Invalid request format."
    }
  });
}

  const userType = normalizeUserType(req.user?.role, clientUserType);
  // Sales tokens carry `employeeId` instead of `id` (see salesAuth.controller.js)
  const userId = req.user?.id || req.user?.employeeId || null;
 const rawIntent = detectIntent(message);
const intent = (rawIntent || "").toUpperCase().trim();


  console.log("USER TYPE:", userType);
console.log("INTENT:", intent);
console.log("USER ID:", userId);

  // Sales portal: answer straight from the rep's own data (no LLM round-trip).
  if (userType === "SALES") {
    const salesReply = await answerSalesQuestion(message, intent, userId);
    if (salesReply) {
      const sid = session_id || generateSessionId();
      await db.query(
        `INSERT INTO chatbot_conversations (user_type, user_id, session_id, message, response, is_ai_response) VALUES (?, ?, ?, ?, ?, ?)`,
        [userType, userId, sid, message, salesReply, 0]
      );
      return res.json({ success: true, data: { session_id: sid, response: salesReply, user_type: userType } });
    }
  }

  // Greeting ka seedha reply
 const greetings = ["hi", "hii", "hello", "hey"];

if (greetings.includes(message.toLowerCase().trim())) {
  return res.json({
    success: true,
    data: {
      session_id: session_id || generateSessionId(),
      response: `Hello! I'm your ${userType} Assistant. How can I help you today?`,
      user_type: userType,
    }
  });
}

if (message.length < 3) {
  return res.json({
    success: true,
    data: {
      response: "Hello! Please ask a valid question."
    }
  });
}

  let contextData = null;

try {
  contextData = await Promise.race([
    fetchContextData(message, intent, userType, userId),
    new Promise(resolve => setTimeout(() => resolve(null), 2000))
  ]);
} catch (e) {
  console.log("Context timeout");
}
  const prompt = buildPrompt(message, userType, contextData);
  const reply = await callOllama(prompt);
  const response = reply || "I couldn't find specific data for your query.";
  const finalSessionId = session_id || generateSessionId();

  await db.query(
    `INSERT INTO chatbot_conversations (user_type, user_id, session_id, message, response, is_ai_response) VALUES (?, ?, ?, ?, ?, ?)`,
    [userType, userId, finalSessionId, message, response, 1]
  );

  res.json({ success: true, data: { session_id: finalSessionId, response, user_type: userType } });
});

const getConversations = asyncHandler(async (req, res) => {
  const { session_id, user_type, page = 1, limit = 50 } = req.query;
  let query = "SELECT * FROM chatbot_conversations WHERE 1=1";
  const params = [];
  if (session_id) { query += " AND session_id = ?"; params.push(session_id); }
  else if (user_type) { query += " AND user_type = ?"; params.push(user_type); }
  else if (req.user?.id) { query += " AND user_id = ?"; params.push(req.user.id); }
  query += " ORDER BY created_at ASC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const [rows] = await db.query(query, params);
  res.json({ success: true, data: { conversations: rows, page: parseInt(page), limit: parseInt(limit) } });
});

// ---------- AI Chat settings (persisted, single row id=1) ----------

const DEFAULT_SETTINGS = {
  autoRespond: true,
  humanHandoff: true,
  responseTime: 3,
  sentimentAnalysis: true,
  language: "en",
  workingHours: "9 AM - 6 PM",
};

const getSettings = asyncHandler(async (req, res) => {
  const [rows] = await db.query("SELECT settings FROM chatbot_settings WHERE id = 1");
  let settings = DEFAULT_SETTINGS;
  if (rows.length) {
    const raw = rows[0].settings;
    settings = { ...DEFAULT_SETTINGS, ...(typeof raw === "string" ? JSON.parse(raw) : raw) };
  }
  res.json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const allowed = ["autoRespond", "humanHandoff", "responseTime", "sentimentAnalysis", "language", "workingHours"];
  const clean = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) clean[key] = req.body[key];
  }
  const merged = { ...DEFAULT_SETTINGS, ...clean };
  await db.query(
    `INSERT INTO chatbot_settings (id, settings) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE settings = VALUES(settings)`,
    [JSON.stringify(merged)]
  );
  res.json({ success: true, message: "Settings updated", data: merged });
});

// ---------- AI response templates (persisted CRUD) ----------

const DEFAULT_TEMPLATES = [
  ["client", "pricing", "Our pricing starts from $999/month for basic packages. Would you like me to share our detailed pricing brochure?", "pricing_inquiry"],
  ["client", "demo", "I'd be happy to schedule a demo for you! Our team will reach out within 24 hours to confirm a suitable time.", "demo_request"],
  ["client", "support", "Our support team is available 24/7. You can reach us at support@company.com or call our helpline.", "support_request"],
  ["candidate", "jobs", "We're currently hiring! Please check our careers page for open positions. Which role interests you?", "job_inquiry"],
  ["candidate", "interview", "Your interview has been scheduled. You'll receive a confirmation email with all details within 24 hours.", "interview_info"],
  ["candidate", "status", "Your application is under review. We'll update you within 5-7 working days.", "application_status"],
  ["sales", "lead", "New lead assigned! Check your CRM dashboard for full details. Remember to follow up within 24 hours.", "lead_assigned"],
  ["sales", "target", "You're currently at 75% of your monthly target. Keep up the great work! Need help with any deals?", "target_progress"],
  ["sales", "commission", "Your commission structure: 5% on deals up to $10K, 8% on $10K-$50K, 12% on $50K+. View detailed breakdown in your dashboard.", "commission_info"],
];

const getResponseTemplates = asyncHandler(async (req, res) => {
  // lazy-seed defaults on first use so the UI is never empty
  const [[{ cnt }]] = await db.query("SELECT COUNT(*) AS cnt FROM chatbot_templates");
  if (cnt === 0) {
    await db.query(
      "INSERT INTO chatbot_templates (category, keyword, response, intent) VALUES ?",
      [DEFAULT_TEMPLATES]
    );
  }
  const [rows] = await db.query("SELECT * FROM chatbot_templates ORDER BY category, id");
  res.json({ success: true, data: rows });
});

const createResponseTemplate = asyncHandler(async (req, res) => {
  const { category, keyword, response, intent } = req.body;
  if (!category || !keyword || !response) {
    return res.status(400).json({ success: false, message: "category, keyword and response are required" });
  }
  const [result] = await db.query(
    "INSERT INTO chatbot_templates (category, keyword, response, intent) VALUES (?, ?, ?, ?)",
    [category, keyword, response, intent || null]
  );
  res.status(201).json({ success: true, message: "Template created", data: { id: result.insertId } });
});

const updateResponseTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category, keyword, response, intent } = req.body;
  if (!category || !keyword || !response) {
    return res.status(400).json({ success: false, message: "category, keyword and response are required" });
  }
  const [result] = await db.query(
    "UPDATE chatbot_templates SET category = ?, keyword = ?, response = ?, intent = ? WHERE id = ?",
    [category, keyword, response, intent || null, id]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: "Template not found" });
  }
  res.json({ success: true, message: "Template updated" });
});

const deleteResponseTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await db.query("DELETE FROM chatbot_templates WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: "Template not found" });
  }
  res.json({ success: true, message: "Template deleted" });
});

export {
  sendMessage,
  getConversations,
  getSettings,
  updateSettings,
  getResponseTemplates,
  createResponseTemplate,
  updateResponseTemplate,
  deleteResponseTemplate,
};