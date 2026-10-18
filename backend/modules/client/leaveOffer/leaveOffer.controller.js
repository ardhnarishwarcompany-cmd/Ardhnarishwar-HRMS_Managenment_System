import { db } from "../../../config/db.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const LOGO_PATH = path.resolve(process.cwd(), "assets", "logo.png");

const ensureColumn = async (table, column, ddl) => {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  if (!Number(row?.c)) await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
};

const ensureTables = async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS client_leave_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    client_employee_id INT NOT NULL,
    leave_type VARCHAR(60) NOT NULL DEFAULT 'Casual',
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days DECIMAL(5,1) NOT NULL,
    reason TEXT NULL,
    status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
    approver_note VARCHAR(500) NULL,
    decided_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id), INDEX idx_emp (client_employee_id)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS client_offer_letters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    client_employee_id INT NULL,
    candidate_name VARCHAR(150) NOT NULL,
    candidate_email VARCHAR(150) NULL,
    position VARCHAR(150) NOT NULL,
    department VARCHAR(150) NULL,
    salary_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
    joining_date DATE NOT NULL,
    work_mode VARCHAR(40) DEFAULT 'WFO/WFH',
    internship_duration VARCHAR(100) NULL,
    working_days VARCHAR(100) DEFAULT '6 Days per Week',
    office_timings VARCHAR(100) DEFAULT '9:00 AM – 6:00 PM',
    lunch_break VARCHAR(100) DEFAULT '1:00 PM – 1:30 PM',
    notice_period VARCHAR(100) DEFAULT '1 Month',
    responsibilities TEXT NULL,
    template VARCHAR(40) NOT NULL DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id), INDEX idx_offer_emp (client_employee_id)
  )`);
  await ensureColumn("client_offer_letters", "client_employee_id", "INT NULL");
  await ensureColumn("client_offer_letters", "department", "VARCHAR(150) NULL");
  await ensureColumn("client_offer_letters", "work_mode", "VARCHAR(40) DEFAULT 'WFO/WFH'");
  await ensureColumn("client_offer_letters", "internship_duration", "VARCHAR(100) NULL");
  await ensureColumn("client_offer_letters", "working_days", "VARCHAR(100) DEFAULT '6 Days per Week'");
  await ensureColumn("client_offer_letters", "office_timings", "VARCHAR(100) DEFAULT '9:00 AM – 6:00 PM'");
  await ensureColumn("client_offer_letters", "lunch_break", "VARCHAR(100) DEFAULT '1:00 PM – 1:30 PM'");
  await ensureColumn("client_offer_letters", "notice_period", "VARCHAR(100) DEFAULT '1 Month'");
  await ensureColumn("client_offer_letters", "responsibilities", "TEXT NULL");
};
ensureTables().catch((e) => console.error("client leaveOffer init:", e.message));

const isEmployee = (req) => Boolean(req.employee?.employee_id);
const clientIdOf = (req) => Number(req.client?.id || req.employee?.client_id);

export const createLeave = async (req, res) => {
  try {
    const clientId = clientIdOf(req);
    const employeeId = isEmployee(req) ? req.employee.employee_id : Number(req.body.client_employee_id);
    const { leave_type = "Casual", from_date, to_date, reason } = req.body;
    if (!employeeId || !from_date || !to_date) return res.status(400).json({ success:false, message:"Employee, from and to dates are required" });
    const [[emp]] = await db.query("SELECT id, name FROM client_employees WHERE id = ? AND client_id = ? AND isActive = 1", [employeeId, clientId]);
    if (!emp) return res.status(404).json({ success:false, message:"Employee not found for this client" });
    const start = new Date(from_date), end = new Date(to_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return res.status(400).json({success:false,message:"Invalid leave dates"});
    const days = Math.max((end - start) / 86400000 + 1, 0.5);
    const [r] = await db.query(`INSERT INTO client_leave_applications (client_id, client_employee_id, leave_type, from_date, to_date, days, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clientId, employeeId, leave_type, from_date, to_date, days, reason || null]);
    res.json({ success:true, id:r.insertId, message:"Leave request submitted" });
  } catch (e) { res.status(500).json({success:false,message:e.message}); }
};

export const listLeaves = async (req, res) => {
  try {
    const clientId = clientIdOf(req);
    const where = ["l.client_id = ?"], params = [clientId];
    if (isEmployee(req)) { where.push("l.client_employee_id = ?"); params.push(req.employee.employee_id); }
    if (req.query.status) { where.push("l.status = ?"); params.push(req.query.status); }
    const [rows] = await db.query(`SELECT l.*, COALESCE(e.name, CONCAT('Former employee #', l.client_employee_id)) employee_name, e.employeeCode FROM client_leave_applications l LEFT JOIN client_employees e ON e.id=l.client_employee_id WHERE ${where.join(" AND ")} ORDER BY l.status='Pending' DESC, l.created_at DESC`, params);
    res.json({success:true,data:rows});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

export const decideLeave = async (req, res) => {
  try {
    if (isEmployee(req)) return res.status(403).json({success:false,message:"Only client administrators can approve or reject leave"});
    const decision = req.body.decision, note = String(req.body.note || "").trim();
    if (!["Approved","Rejected"].includes(decision)) return res.status(400).json({success:false,message:"Decision must be Approved or Rejected"});
    if (decision === "Rejected" && !note) return res.status(400).json({success:false,message:"Please provide a rejection note"});
    const [r] = await db.query(`UPDATE client_leave_applications SET status=?, approver_note=?, decided_at=NOW() WHERE id=? AND client_id=? AND status='Pending'`, [decision,note||null,req.params.id,clientIdOf(req)]);
    if(!r.affectedRows) return res.status(404).json({success:false,message:"Leave not found or already decided"});
    res.json({success:true,message:`Leave ${decision.toLowerCase()}`});
  }catch(e){res.status(500).json({success:false,message:e.message});}
};

export const adminListClientLeaves = async (req,res)=>{
  try{const {status,client_id}=req.query;const where=["1=1"],p=[];if(status){where.push("l.status=?");p.push(status)}if(client_id){where.push("l.client_id=?");p.push(client_id)}const [rows]=await db.query(`SELECT l.*,COALESCE(e.name,CONCAT('Former employee #',l.client_employee_id)) employee_name,e.employeeCode,c.company_name client_name,c.client_code FROM client_leave_applications l LEFT JOIN client_employees e ON e.id=l.client_employee_id LEFT JOIN clients c ON c.id=l.client_id WHERE ${where.join(" AND ")} ORDER BY l.status='Pending' DESC,l.created_at DESC`,p);res.json({success:true,data:rows})}catch(e){res.status(500).json({success:false,message:e.message})}
};
export const adminDecideClientLeave = async (req,res)=>{
  try{const decision=req.body.decision||req.body.status,note=req.body.note??req.body.approver_note;if(!["Approved","Rejected"].includes(decision))return res.status(400).json({success:false,message:"Decision must be Approved or Rejected"});if(decision==='Rejected'&&!String(note||'').trim())return res.status(400).json({success:false,message:"Rejection note is required"});const approver=req.user?.name||'Super Admin';const [r]=await db.query(`UPDATE client_leave_applications SET status=?,approver_note=?,decided_at=NOW() WHERE id=? AND status='Pending'`,[decision,note?`${note} (${approver})`:`Decided by ${approver}`,req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:'Leave not found or already decided'});res.json({success:true,message:`Leave ${decision.toLowerCase()}`})}catch(e){res.status(500).json({success:false,message:e.message})}
};

const TEMPLATES={standard:{label:"Standard Offer",probation:3,notice:30},senior:{label:"Senior Role Offer",probation:6,notice:60},intern:{label:"Internship Offer",probation:1,notice:15}};
export const listOfferTemplates=(req,res)=>res.json({success:true,data:Object.entries(TEMPLATES).map(([key,t])=>({key,label:t.label}))});

export const listOfferLetters=async(req,res)=>{
  try{const clientId=clientIdOf(req);let where='client_id=?',p=[clientId];if(isEmployee(req)){where+=' AND (client_employee_id=? OR (client_employee_id IS NULL AND candidate_email=?))';p.push(req.employee.employee_id,req.employee.email)}const [rows]=await db.query(`SELECT * FROM client_offer_letters WHERE ${where} ORDER BY created_at DESC`,p);res.json({success:true,data:rows})}catch(e){res.status(500).json({success:false,message:e.message})}
};

const normalizeDetails=(body)=>({
 candidate_name:String(body.candidate_name||'').trim(),candidate_email:String(body.candidate_email||'').trim()||null,position:String(body.position||'').trim(),department:String(body.department||'').trim()||null,salary_monthly:Number(body.salary_monthly||0),joining_date:body.joining_date,work_mode:String(body.work_mode||'WFO/WFH').trim(),internship_duration:String(body.internship_duration||'').trim()||null,working_days:String(body.working_days||'6 Days per Week').trim(),office_timings:String(body.office_timings||'9:00 AM – 6:00 PM').trim(),lunch_break:String(body.lunch_break||'1:00 PM – 1:30 PM').trim(),notice_period:String(body.notice_period||'1 Month').trim(),responsibilities:String(body.responsibilities||'').trim()||null,template:String(body.template||'standard')});

const getOffer=(id,clientId)=>db.query(`SELECT o.*,c.company_name,c.business_address,c.email company_email FROM client_offer_letters o JOIN clients c ON c.id=o.client_id WHERE o.id=? AND o.client_id=? LIMIT 1`,[id,clientId]).then(([r])=>r[0]);

const drawHeader=(doc,company,address)=>{
 const W=595.28;
 doc.rect(0,0,W,105).fill('#24133f');
 doc.rect(0,105,W,5).fill('#c69b3c');
 if(fs.existsSync(LOGO_PATH)) doc.image(LOGO_PATH,42,18,{fit:[68,68]});
 doc.fillColor('#fff').font('Helvetica-Bold').fontSize(18).text(company,125,29,{width:425});
 doc.font('Helvetica').fontSize(8.5).fillColor('#d9cbed').text(address||'',125,55,{width:425});
 doc.fillColor('#d7b76a').font('Helvetica-Bold').fontSize(8).text('OFFER LETTER',125,76,{width:425});
};
const section=(doc,title,body)=>{if(doc.y>730)doc.addPage();doc.fillColor('#3d225f').font('Helvetica-Bold').fontSize(12).text(title);doc.moveDown(.35);doc.fillColor('#222').font('Helvetica').fontSize(9.6).text(body,{width:483,lineGap:3});doc.moveDown(.8)};
const renderOffer=(offer,res)=>{
 const doc=new PDFDocument({size:'A4',margin:56});res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename=Offer-${offer.candidate_name.replace(/[^a-z0-9]+/gi,'_')}.pdf`);doc.pipe(res);
 const fmt=d=>new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});const inr=n=>Number(n||0).toLocaleString('en-IN');
 drawHeader(doc,offer.company_name,offer.business_address);doc.y=130;
 doc.fillColor('#555').font('Helvetica').fontSize(9).text(`Date: ${fmt(offer.created_at)}`,{align:'right'});doc.moveDown(1.1);
 doc.fillColor('#111').font('Helvetica-Bold').fontSize(11).text(`To,`);doc.font('Helvetica-Bold').text(offer.candidate_name);if(offer.candidate_email)doc.font('Helvetica').fontSize(9).text(offer.candidate_email);
 doc.moveDown(.8);doc.fillColor('#3d225f').font('Helvetica-Bold').fontSize(11).text(`Subject: Offer of ${offer.internship_duration?'Internship':'Employment'} – ${offer.position}`);doc.moveDown(.8);
 doc.fillColor('#222').font('Helvetica').fontSize(10).text(`Dear ${offer.candidate_name},\n\nWe are pleased to offer you the position of ${offer.position}${offer.department?` in the ${offer.department} department`:''} at ${offer.company_name}. We are excited to welcome you to our team and look forward to your contribution to the growth and success of our organization.`,{lineGap:3});doc.moveDown(1);
 section(doc,'1. Job Details',`Position: ${offer.position}\n${offer.department?`Department: ${offer.department}\n`:''}Joining Date: ${fmt(offer.joining_date)}\nWork Mode: ${offer.work_mode}\nInternship / Evaluation Duration: ${offer.internship_duration||`${TEMPLATES[offer.template]?.probation||3} Months`}\nWorking Days: ${offer.working_days}\nOffice Timings: ${offer.office_timings}\nLunch Break: ${offer.lunch_break}\nOffice Address: ${offer.business_address||'As communicated by management'}`);
 section(doc,'2. Compensation & Salary Structure',offer.salary_monthly?`Monthly Compensation: Rs. ${inr(offer.salary_monthly)}\nAnnualized Compensation: Rs. ${inr(Number(offer.salary_monthly)*12)}\nFuture salary revisions, incentives, and promotions shall be based on individual performance and company policies.`:'Compensation will be governed by the terms communicated by management and applicable company policy.');
 section(doc,'3. Roles & Responsibilities',offer.responsibilities||`As a ${offer.position}, you will be responsible for completing assigned work, collaborating with relevant teams, maintaining professional standards, following company processes, protecting confidential information, and completing assigned tasks within timelines.`);
 doc.addPage();drawHeader(doc,offer.company_name,offer.business_address);doc.y=130;
 section(doc,'4. Probation / Internship Evaluation',`During the evaluation period, performance may be assessed on Technical Knowledge, Learning Ability, Project Performance, Quality of Work, Discipline, Attendance, Punctuality, Communication Skills, Professional Conduct, Team Collaboration and overall contribution. Successful completion does not automatically guarantee permanent employment; confirmation remains subject to management evaluation and business requirements.`);
 section(doc,'5. Notice Period',`Notice Period: ${offer.notice_period}. A minimum of 15 days' prior written notice may be required before resignation where applicable. Failure to serve the required notice period may result in recovery as per company policy.`);
 section(doc,'6. Career Growth & Learning Opportunities',`The company supports professional development through practical project exposure, learning and development support, modern technology exposure, collaboration, performance feedback, and opportunities for increased responsibility based on individual capability and organizational requirements.`);
 section(doc,'7. Employee Benefits',`Subject to company policy and eligibility, benefits may include paid leave, performance-based growth opportunities, learning and development support, exposure to live industry projects, and career advancement opportunities.`);
 section(doc,'8. Leave Policy',`Leave requests must follow the company's official leave procedure. Planned leave should be requested in advance and approval remains subject to management discretion. Uninformed or unauthorized absence may lead to absence marking, salary deductions, disciplinary action, or other action under company policy.`);
 doc.addPage();drawHeader(doc,offer.company_name,offer.business_address);doc.y=130;
 section(doc,'9. Attendance & Late Coming Policy',`Employees are expected to maintain punctuality and professionalism. Attendance, late arrivals, early departures and half-day treatment will be governed by the company's current attendance policy.`);
 section(doc,'10. Code of Conduct & Professional Responsibilities',`You are expected to follow management instructions, maintain professionalism and discipline, adhere to company policies and procedures, meet assigned deadlines, protect company information and confidentiality, maintain ethical standards, collaborate with team members, demonstrate accountability and continuously improve your professional skills.`);
 section(doc,'Acceptance of Offer',`Please confirm your acceptance of this offer by replying through the official communication channel or using the acceptance workflow provided in the HRMS portal. Your acceptance confirms that you have read and understood the terms stated in this letter.`);
 doc.moveDown(1.5);doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text('Candidate Acceptance');doc.moveDown(.8);doc.font('Helvetica').fontSize(9.5).text('Signature: ______________________________     Date: __________________');doc.moveDown(2);doc.font('Helvetica-Bold').text(`Authorized Signatory, ${offer.company_name}`);
 doc.addPage();drawHeader(doc,offer.company_name,offer.business_address);doc.y=130;
 section(doc,'Welcome to the Team',`We warmly welcome ${offer.candidate_name} to ${offer.company_name}. We wish you a successful and rewarding professional journey and look forward to your contribution to the organization.`);
 section(doc,'Key Employee Information',`Employee / Candidate Name: ${offer.candidate_name}\nPosition: ${offer.position}\nDepartment: ${offer.department||'-'}\nJoining Date: ${fmt(offer.joining_date)}\nWork Mode: ${offer.work_mode}\nMonthly Compensation: Rs. ${inr(offer.salary_monthly)}\nNotice Period: ${offer.notice_period}`);
 section(doc,'Important Note',`This document is system generated from the details entered by the client administrator. The latest approved company policies and management instructions remain applicable where this letter refers to company policy.`);
 doc.addPage();drawHeader(doc,offer.company_name,offer.business_address);doc.y=130;
 section(doc,'Employee Declaration',`I confirm that I have received this offer letter, reviewed the terms and conditions, and understand that employment / internship is subject to the company's applicable policies, procedures and management decisions.`);
 section(doc,'Acknowledgement',`Candidate Name: ${offer.candidate_name}\nPosition: ${offer.position}\nJoining Date: ${fmt(offer.joining_date)}\n
Signature: ______________________________\nDate: _________________________________`);
 doc.moveDown(4);doc.font('Helvetica').fontSize(8).fillColor('#666').text(`${offer.company_name}  |  ${offer.business_address||''}`,{align:'center'});doc.end();
};

export const generateClientOffer=async(req,res)=>{try{if(isEmployee(req))return res.status(403).json({success:false,message:'Employees can only view and download their own offer letter'});const d=normalizeDetails(req.body);if(!d.candidate_name||!d.position||!d.joining_date)return res.status(400).json({success:false,message:'Candidate name, position and joining date are required'});const clientId=clientIdOf(req);if(req.body.client_employee_id){const [[emp]]=await db.query('SELECT id,name,email FROM client_employees WHERE id=? AND client_id=?',[req.body.client_employee_id,clientId]);if(!emp)return res.status(400).json({success:false,message:'Employee not found for this client'});d.candidate_name=emp.name;d.candidate_email=emp.email||d.candidate_email;d.client_employee_id=emp.id}else d.client_employee_id=null;const [r]=await db.query(`INSERT INTO client_offer_letters (client_id,client_employee_id,candidate_name,candidate_email,position,department,salary_monthly,joining_date,work_mode,internship_duration,working_days,office_timings,lunch_break,notice_period,responsibilities,template) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[clientId,d.client_employee_id,d.candidate_name,d.candidate_email,d.position,d.department,d.salary_monthly,d.joining_date,d.work_mode,d.internship_duration,d.working_days,d.office_timings,d.lunch_break,d.notice_period,d.responsibilities,d.template]);const offer=await getOffer(r.insertId,clientId);renderOffer(offer,res)}catch(e){console.error('generate offer',e);if(!res.headersSent)res.status(500).json({success:false,message:e.message})}};

export const downloadClientOffer=async(req,res)=>{try{const offer=await getOffer(req.params.id,clientIdOf(req));if(!offer)return res.status(404).json({success:false,message:'Offer letter not found'});if(isEmployee(req)&&Number(offer.client_employee_id)!==Number(req.employee.employee_id)&&String(offer.candidate_email||'').toLowerCase()!==String(req.employee.email||'').toLowerCase())return res.status(403).json({success:false,message:'You can only download your own offer letter'});renderOffer(offer,res)}catch(e){if(!res.headersSent)res.status(500).json({success:false,message:e.message})}};
