import { db } from "./db.js";
import { ENV } from "./env.js";
import { initSmartAttendanceDb } from "./initSmartAttendanceDb.js";

export const initDb = async () => {
  const dbName = process.env.DB_NAME || ENV.DB_NAME;

  await db.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await db.query(`USE \`${dbName}\``);

  // ================================
  // SUPER ADMINS
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status ENUM('ACTIVE','BLOCKED') DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // MANAGER
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS managers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(20) DEFAULT 'manager',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

// ================================
// TEAM LEADERS
// ================================
await db.query(`
  CREATE TABLE IF NOT EXISTS team_leaders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'TL',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);


  // ================================
  // CLIENTS (MAIN TENANT TABLE)
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(150) NOT NULL,
    client_name VARCHAR(120),

    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    gst_number VARCHAR(50) UNIQUE,

    business_address TEXT,
    website VARCHAR(255),
    company_description TEXT,

    password_hash VARCHAR(255) NOT NULL,

    status ENUM('ACTIVE','INACTIVE','SUSPENDED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

  // ================================
  // DEPARTMENTS
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // EMPLOYEE STATUSES
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS employee_statuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // CANDIDATE STATUSES
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS candidate_statuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // DESIGNATIONS
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS designations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      departmentId INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE (departmentId, name),
      FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  // ================================
  // EMPLOYEES (SUPER ADMIN SIDE)
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employeeCode VARCHAR(50) UNIQUE,
      joiningId varchar(50) UNIQUE,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NULL,
      phone VARCHAR(20),
      departmentId INT NOT NULL,
      designationId INT NOT NULL,
      statusId INT DEFAULT 1,
      joiningDate DATE NOT NULL,
      salary INT DEFAULT 0,
      isActive TINYINT DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (departmentId) REFERENCES departments(id),
      FOREIGN KEY (designationId) REFERENCES designations(id),
      FOREIGN KEY (statusId) REFERENCES employee_statuses(id)
    )
  `);

  // ================================
  // CLIENT FEATURES (TOGGLE ENGINE)
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS client_features (
      id INT PRIMARY KEY AUTO_INCREMENT,
      client_id INT NOT NULL,
      feature_key VARCHAR(100) NOT NULL,
      is_enabled TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_client_feature (client_id, feature_key),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // ================================
  // CLIENT HR ASSIGNMENT (MULTIPLE HR)
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS client_hr_assignments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      client_id INT NOT NULL,
      hr_employee_id INT NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_client_hr (client_id, hr_employee_id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (hr_employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // ================================
  // CLIENT EMPLOYEES (TENANT SIDE)
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS client_employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,

    employeeCode VARCHAR(50),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NULL,
    phone VARCHAR(20),

    departmentId INT NOT NULL,
    designationId INT NOT NULL,
    statusId INT DEFAULT 1,

    joiningDate DATE NOT NULL,
    salary INT DEFAULT 0,
    isActive TINYINT DEFAULT 1,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_client_email (client_id, email),
    UNIQUE KEY unique_client_empcode (client_id, employeeCode),
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (departmentId) REFERENCES departments(id),
    FOREIGN KEY (designationId) REFERENCES designations(id),
    FOREIGN KEY (statusId) REFERENCES employee_statuses(id)
  )
`);

  // ================================
  // CLIENT EMPLOYEES DELETED (ARCHIVE)
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS client_employee_deleted (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_employee_id INT,
    client_id INT,
    employeeCode VARCHAR(50),
    name VARCHAR(120),
    email VARCHAR(150),
    phone VARCHAR(20),
    departmentId INT,
    designationId INT,
    statusId INT,
    joiningDate DATE,
    salary INT,
    isActive TINYINT,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

  // ================================
  // CLIENT ATTENDANCE
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS client_attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in DATETIME NULL,
    check_out DATETIME NULL,
    status ENUM('PRESENT','ABSENT','HALF_DAY','LEAVE') DEFAULT 'PRESENT',
    remarks TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_emp_day (client_id, employee_id, attendance_date),

    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES client_employees(id) ON DELETE CASCADE
  )
`);

  // ================================
  // CANDIDATES
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidateId VARCHAR(50) UNIQUE,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      phone VARCHAR(20),
      jobTitle VARCHAR(150) NOT NULL,
      statusId INT DEFAULT 1,
      note TEXT,
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (statusId) REFERENCES candidate_statuses(id)
    )
  `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS languages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE
  );
`);

  // ================================
  // INTERVIEW TRACKER
  // ================================
  await db.query(`
CREATE TABLE IF NOT EXISTS client_interviews (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Candidate basic
  candidate_name VARCHAR(150) NOT NULL,
  candidate_phone VARCHAR(20) NOT NULL,
  location VARCHAR(150) NULL,
  job_profile VARCHAR(150) NULL,
  experience VARCHAR(50) NULL,
  current_ctc DECIMAL(10,2) NULL,
  expected_ctc DECIMAL(10,2) NULL,
  notice_period VARCHAR(50) NULL,

  -- Ownership (auto from token)
  hr_employee_id INT NOT NULL,

  -- Client mapping
  client_id INT NOT NULL,

  -- Call
  call_status_id INT NULL,

  -- Interview schedule
  interview_date DATE NULL,
  interview_time TIME NULL,
  
  -- Selection / Joining
  selection_date DATE NULL,
  joining_date DATE NULL,

  -- Client action
  client_status ENUM('pending','accepted','rejected') DEFAULT 'pending',
  client_remarks TEXT NULL,

  -- HR field
  hr_remarks TEXT NULL,

  -- Address
  address TEXT NULL,

  -- New fields
  joined ENUM('Yes','No') DEFAULT 'No',
  language_id INT NULL,

  -- Files
  cv_file VARCHAR(255) NULL,

  -- System
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_client (client_id),
  INDEX idx_hr (hr_employee_id),
  INDEX idx_call_status (call_status_id),
  INDEX idx_language (language_id),

  -- Foreign keys
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE SET NULL
);
`);

  // Older databases pre-date the Leads link and the client decision timestamp.
  // Self-heal on boot so HR "Add Interview" and the Super Admin "Client
  // Decisions" page never fail with "unknown column".
  const interviewExtraColumns = [
    ["lead_id", "INT NULL"],
    ["client_decided_at", "DATETIME NULL"],
  ];
  for (const [column, definition] of interviewExtraColumns) {
    const [[exists]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_interviews' AND COLUMN_NAME = ?`,
      [column],
    );
    if (!Number(exists.count)) {
      await db.query(`ALTER TABLE client_interviews ADD COLUMN ${column} ${definition}`);
    }
  }
  const [[leadIndex]] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_interviews' AND INDEX_NAME = 'idx_ci_lead'`,
  );
  if (!Number(leadIndex.count)) {
    await db.query(`ALTER TABLE client_interviews ADD INDEX idx_ci_lead (lead_id)`);
  }
  // Rows decided before the column existed: fall back to their last update time.
  await db.query(
    `UPDATE client_interviews SET client_decided_at = updated_at WHERE client_status <> 'pending' AND client_decided_at IS NULL`,
  );

  // ================================
  // CLIENT EMPLOYEE PAYROLL
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS client_payroll (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      employee_id INT NOT NULL,

      payroll_month VARCHAR(7) NOT NULL, -- YYYY-MM

      basic_salary DECIMAL(10,2) DEFAULT 0,
      hra DECIMAL(10,2) DEFAULT 0,
      ta DECIMAL(10,2) DEFAULT 0,
      da DECIMAL(10,2) DEFAULT 0,

      attendance_days INT DEFAULT 0,
      overtime_amount DECIMAL(10,2) DEFAULT 0,

      gross_salary DECIMAL(10,2) DEFAULT 0,
      pf DECIMAL(10,2) DEFAULT 0,
      esic DECIMAL(10,2) DEFAULT 0,
      net_salary DECIMAL(10,2) DEFAULT 0,

      status ENUM('draft','final') DEFAULT 'draft',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_client (client_id),
      INDEX idx_employee (employee_id),
      UNIQUE KEY uniq_payroll (client_id, employee_id, payroll_month)
    )
  `);

  // ================================
  // CLIENT EMPLOYEE SALES
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS client_sales_calls (
      id INT AUTO_INCREMENT PRIMARY KEY,

      client_id INT NOT NULL,
      employee_id INT NOT NULL,

      call_id VARCHAR(50) NOT NULL,

      customer_name VARCHAR(120),
      phone VARCHAR(20),
      email VARCHAR(150),

      call_time TIME,
      call_date DATE,

      status ENUM('hold','accepted','rejected') DEFAULT 'hold',

      follow_up_datetime DATETIME NULL,
      remarks TEXT,
      sold_date DATE NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_client (client_id),
      INDEX idx_employee (employee_id),
      INDEX idx_status (status),
      INDEX idx_followup (follow_up_datetime)
    )
  `);

  // ================================
  // SALES REPORT
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS sales_report (
    id INT PRIMARY KEY AUTO_INCREMENT,

    -- client reference
    client_id INT NOT NULL,
    employee_id INT NULL,

    -- plan details
    plan_name VARCHAR(150) NOT NULL,
    billing_months INT NOT NULL COMMENT '1-12 months',

    -- financials
    amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_status ENUM('paid','partial','unpaid') DEFAULT 'unpaid',
    payment_method ENUM('cash','online') DEFAULT 'online',

    -- dates
    purchase_date DATE NOT NULL,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- subscription state
    subscription_status ENUM('active','expired','cancelled') DEFAULT 'active',

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_client_id (client_id),
    INDEX idx_employee_id (employee_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_due_date (due_date)
  );
`);

  // ================================
  // SALES PORTAL CALLS (EMPLOYEE)
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS SuperAdmin_sales_calls (
    id INT AUTO_INCREMENT PRIMARY KEY,

    client_id INT NULL,
    employee_id INT NOT NULL,

    call_id VARCHAR(50) NOT NULL,

    customer_name VARCHAR(120),
    phone VARCHAR(20),
    email VARCHAR(150),

    call_time TIME,
    call_date DATE,

    status ENUM('hold','accepted','rejected') DEFAULT 'hold',

    follow_up_datetime DATETIME NULL,
    remarks TEXT,
    sold_date DATE NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_client (client_id),
    INDEX idx_employee (employee_id),
    INDEX idx_status (status),
    INDEX idx_followup (follow_up_datetime)
  )
`);

  // ================================
  // PORTAL SETTING (EMPLOYEE)
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS portal_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      portal_name VARCHAR(50) UNIQUE NOT NULL,
      is_enabled BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NULL,
        invoice_no VARCHAR(50) UNIQUE,
        client_name VARCHAR(255),
        client_address TEXT,
        client_gstin VARCHAR(50),
        state VARCHAR(100),
        state_code VARCHAR(10),

        invoice_date DATE,
        reference_no VARCHAR(100),
        terms_of_payment VARCHAR(100),
        buyers_order_no VARCHAR(100),
        terms_of_delivery VARCHAR(100),

        taxable_amount DECIMAL(10,2),
        cgst DECIMAL(10,2),
        sgst DECIMAL(10,2),
        total_amount DECIMAL(10,2),

        amount_in_words TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT,
      description TEXT,
      hsn_sac VARCHAR(50),
      gst_rate DECIMAL(5,2),
      quantity INT,
      rate DECIMAL(10,2),
      amount DECIMAL(10,2),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_name VARCHAR(255),
      company_address TEXT,
      gstin VARCHAR(50),
      state VARCHAR(100),
      state_code VARCHAR(10),
      phone VARCHAR(50),
      email VARCHAR(100),
      bank_name VARCHAR(100),
      account_number VARCHAR(50),
      ifsc VARCHAR(20),
      branch VARCHAR(100)
    );
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_payroll (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      payroll_month VARCHAR(7) NOT NULL,

      basic_salary DECIMAL(10,2) DEFAULT 0,
      hra DECIMAL(10,2) DEFAULT 0,
      ta DECIMAL(10,2) DEFAULT 0,
      da DECIMAL(10,2) DEFAULT 0,
      overtime_amount DECIMAL(10,2) DEFAULT 0,

      gross_salary DECIMAL(10,2) DEFAULT 0,
      pf DECIMAL(10,2) DEFAULT 0,
      esic DECIMAL(10,2) DEFAULT 0,
      net_salary DECIMAL(10,2) DEFAULT 0,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS joining_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,

  hr_id INT NOT NULL,

  full_name VARCHAR(255),
  father_name VARCHAR(255),
  dob DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(20),
  blood_group VARCHAR(10),
  nationality VARCHAR(50),

  mobile VARCHAR(20),
  alt_mobile VARCHAR(20),
  email VARCHAR(255),

  present_address TEXT,
  present_city VARCHAR(100),
  present_state VARCHAR(100),
  present_pincode VARCHAR(10),

  qualification10 VARCHAR(100),
  board10 VARCHAR(100),
  year10 VARCHAR(10),
  percent10 VARCHAR(10),

  experience_type VARCHAR(20),
  total_experience VARCHAR(50),
  last_company VARCHAR(255),
  last_designation VARCHAR(255),
  last_salary VARCHAR(50),

  account_holder VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  ifsc VARCHAR(20),
  branch VARCHAR(100),

  emergency_name VARCHAR(255),
  emergency_relation VARCHAR(100),
  emergency_mobile VARCHAR(20),

  father_occupation VARCHAR(255),
  father_mobile VARCHAR(20),
  mother_name VARCHAR(255),
  mother_occupation VARCHAR(255),
  mother_mobile VARCHAR(20),

  photo VARCHAR(255),
  signature VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

 );
   `);

  // Existing installations may have the older joining schema. Keep the
  // startup self-healing so the HR form never fails with "unknown column".
  const joiningExtraColumns = [
    ["qualification12", "VARCHAR(120) NULL"], ["board12", "VARCHAR(120) NULL"],
    ["year12", "VARCHAR(10) NULL"], ["percent12", "VARCHAR(20) NULL"], ["marksheet10", "VARCHAR(255) NULL"], ["marksheet12", "VARCHAR(255) NULL"],
    ["qualification_grad", "VARCHAR(120) NULL"], ["university_grad", "VARCHAR(160) NULL"], ["college_grad", "VARCHAR(160) NULL"],
    ["specialization_grad", "VARCHAR(160) NULL"], ["course_type_grad", "VARCHAR(80) NULL"], ["start_year_grad", "VARCHAR(10) NULL"], ["year_grad", "VARCHAR(10) NULL"], ["passing_year_grad", "VARCHAR(10) NULL"], ["percent_grad", "VARCHAR(20) NULL"], ["marksheet_grad", "VARCHAR(255) NULL"],
    ["qualification_pg", "VARCHAR(120) NULL"], ["university_pg", "VARCHAR(160) NULL"], ["college_pg", "VARCHAR(160) NULL"],
    ["specialization_pg", "VARCHAR(160) NULL"], ["course_type_pg", "VARCHAR(80) NULL"], ["start_year_pg", "VARCHAR(10) NULL"], ["year_pg", "VARCHAR(10) NULL"], ["passing_year_pg", "VARCHAR(10) NULL"], ["percent_pg", "VARCHAR(20) NULL"], ["marksheet_pg", "VARCHAR(255) NULL"],
  ];
  for (const [column, definition] of joiningExtraColumns) {
    const [[exists]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'joining_forms' AND COLUMN_NAME = ?`,
      [column],
    );
    if (!Number(exists.count)) {
      await db.query(`ALTER TABLE joining_forms ADD COLUMN ${column} ${definition}`);
    }
  }

  await db.query(`
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  hr_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (hr_id) REFERENCES employees(id) ON DELETE CASCADE
);
`);

  // mysql2 does not allow multiple CREATE statements in one query unless
  // `multipleStatements` is enabled. Keep each DDL statement separate so
  // database startup works with the existing connection configuration.
  await db.query(`
CREATE TABLE IF NOT EXISTS client_employee_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  employee_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_client_employee_chat (client_id, employee_id),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES client_employees(id) ON DELETE CASCADE
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS client_employee_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_type ENUM('employee','client') NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES client_employee_conversations(id) ON DELETE CASCADE
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_type ENUM('client','hr','ai','it') NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
`);

  await db.query(`
ALTER TABLE messages
MODIFY sender_type ENUM('client','hr','ai','it') NOT NULL;
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS internal_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room VARCHAR(64) NOT NULL,
  sender_type ENUM('hr','it','superadmin') NOT NULL,
  sender_id INT NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room (room)
);
`);

  // Existing databases may have been created before direct HR chat support.
  // Add recipient_id and enlarge room safely without dropping any messages.
  const [internalMessageColumns] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'internal_messages'
  `);
  const internalColumnNames = new Set(internalMessageColumns.map((c) => c.COLUMN_NAME));

  if (!internalColumnNames.has('recipient_id')) {
    await db.query(`ALTER TABLE internal_messages ADD COLUMN recipient_id INT NULL AFTER sender_id`);
  }
  // Unread tracking (HR chat IT-contacts list + mark-as-read) depends on read_at.
  if (!internalColumnNames.has('read_at')) {
    await db.query(`ALTER TABLE internal_messages ADD COLUMN read_at DATETIME NULL AFTER created_at`);
  }
  const [[internalRecipientIndex]] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'internal_messages' AND INDEX_NAME = 'idx_recipient_unread'`,
  );
  if (!Number(internalRecipientIndex.count)) {
    await db.query(`ALTER TABLE internal_messages ADD INDEX idx_recipient_unread (recipient_id, read_at)`);
  }

  await db.query(`ALTER TABLE internal_messages MODIFY room VARCHAR(64) NOT NULL`);

  await db.query(`
CREATE TABLE IF NOT EXISTS shift_timings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  check_in_start TIME NOT NULL DEFAULT '09:00:00',
  check_in_end TIME NOT NULL DEFAULT '10:00:00',
  check_out_start TIME NOT NULL DEFAULT '17:00:00',
  check_out_end TIME NOT NULL DEFAULT '18:00:00',
  grace_minutes INT NOT NULL DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type VARCHAR(50) NOT NULL,
  user_id INT,
  session_id VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  is_ai_response TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS exit_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,

  employee_id INT NOT NULL,
  employee_name VARCHAR(120),

  resignation_date DATE NOT NULL,
  notice_period_days INT NOT NULL,

  exit_date DATE,
  exit_type VARCHAR(50) DEFAULT 'voluntary',

  reason TEXT,

  status ENUM('pending','approved','processing','completed','rejected') DEFAULT 'pending',

  hr_remarks TEXT,
  exit_interview_date DATE,
  final_settlement_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_employee_id (employee_id),

  CONSTRAINT fk_exit_employee
  FOREIGN KEY (employee_id) REFERENCES employees(id)
  ON DELETE CASCADE
);
`);

  await db.query(`
   CREATE TABLE IF NOT EXISTS revenue_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS revenues (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      category_id INT,
      source VARCHAR(50),
      reference_id BIGINT,
      amount DECIMAL(12,2) NOT NULL,
      revenue_date DATE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES revenue_categories(id)
    );
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS expense_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    source VARCHAR(50),
    reference_id BIGINT,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
  );
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS profit_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    month INT NOT NULL,
    year INT NOT NULL,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    net_profit DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_month_year (month, year)
  );
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS features (
      id INT AUTO_INCREMENT PRIMARY KEY,
      feature_key VARCHAR(100) UNIQUE NOT NULL,
      feature_name VARCHAR(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ================================
  // SEED MASTER FEATURES (Client portal modules)
  // Without these rows, new clients get ZERO features seeded
  // and the client sidebar shows only always-on items.
  // ================================
  const MASTER_FEATURES = [
    ["EMPLOYEE_MANAGEMENT", "Employee Management"],
    ["ATTENDANCE_TRACKER", "Attendance Tracker"],
    ["INTERVIEW_TRACKER", "Interview Tracker"],
    ["PAYROLL", "Payroll"],
    ["SALES_REPORT", "Sales Report"],
    ["LIVE_CHAT", "Live Chat"],
    ["PERFORMANCE_TRACKER", "Performance"],
    ["PERFORMANCE_REPORT", "Performance Report"],
    ["WORK_POLICY", "Work Policy"],
    ["WORK_ASSIGNMENT", "Work Assignment"],
    ["FINANCE_DASHBOARD", "Finance Dashboard"],
    ["INVENTORY", "Inventory"],
    ["ASSETS", "Assets"],
    ["PURCHASE_ORDERS", "Purchase Orders"],
    ["TAX", "GST & TDS"],
    ["AUDIT_LOGS", "Audit Logs"],
    ["COMPLAINT", "Complaint Box"],
    ["LEADS", "Leads Assigner"],
  ];

  await db.query(
    `INSERT IGNORE INTO features (feature_key, feature_name) VALUES ?`,
    [MASTER_FEATURES],
  );

  // Backfill: give every existing client any missing feature rows (enabled),
  // so clients created while the features table was empty get fixed too.
  await db.query(`
    INSERT IGNORE INTO client_features (client_id, feature_key, is_enabled)
    SELECT c.id, f.feature_key, 1
    FROM clients c
    CROSS JOIN features f
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cash_reserves (
      id INT AUTO_INCREMENT PRIMARY KEY,
      amount DECIMAL(12,2) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cash_flow (
      id INT AUTO_INCREMENT PRIMARY KEY,
      backup DECIMAL(12,2),
      monthly_expense DECIMAL(12,2)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS job_positions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS emergency_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  click_count INT DEFAULT 1,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  role VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100)
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS client_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  category_id INT,
  amount DECIMAL(10,2),
  expense_date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS client_revenue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  category_id INT,
  amount DECIMAL(10,2),
  revenue_date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    INSERT IGNORE INTO locations (name) VALUES
    ('Delhi'), ('Mumbai'), ('Bengaluru'), ('Hyderabad'), ('Chennai'),
    ('Pune'), ('Kolkata'), ('Ahmedabad'), ('Jaipur'), ('Noida'),
    ('Gurugram'), ('Indore'), ('Lucknow'), ('Chandigarh'), ('Remote')
  `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS super_admin_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    employee_name VARCHAR(150),
    date DATE,
    check_in TIME,
    check_out TIME,
    status ENUM('PRESENT','ABSENT','LATE','HALF_DAY','WFH','LEAVE') DEFAULT 'PRESENT',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

  // Older databases pre-date the GEO / client-sync / audit / shift columns that
  // the HR, IT, Client and Super Admin attendance queries select. Self-heal on
  // boot so none of them fail with "Unknown column 'a.marked_by_id'".
  const attendanceExtraColumns = [
    ["method", "ENUM('MANUAL','OTP','WIFI','GEO') DEFAULT 'MANUAL'"],
    ["check_in_lat", "DECIMAL(10,7) NULL"],
    ["check_in_lng", "DECIMAL(10,7) NULL"],
    ["check_out_lat", "DECIMAL(10,7) NULL"],
    ["check_out_lng", "DECIMAL(10,7) NULL"],
    ["geo_status", "ENUM('INSIDE','OUTSIDE') NULL"],
    ["office_id", "INT NULL"],
    ["source", "VARCHAR(20) NULL"],
    ["client_id", "INT NULL"],
    ["marked_by_id", "INT NULL"],
    ["marked_by_name", "VARCHAR(150) NULL"],
    ["marked_by_role", "VARCHAR(50) NULL"],
    ["marked_by_at", "TIMESTAMP NULL DEFAULT NULL"],
    // Shift chosen by the Super Admin when marking, snapshotted so later edits
    // to the shift definitions never change what was recorded.
    ["shift_id", "INT NULL"],
    ["shift_name", "VARCHAR(100) NULL"],
    ["shift_start", "TIME NULL"],
    ["shift_end", "TIME NULL"],
  ];
  for (const [column, definition] of attendanceExtraColumns) {
    const [[exists]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'super_admin_attendance' AND COLUMN_NAME = ?`,
      [column],
    );
    if (!Number(exists.count)) {
      await db.query(`ALTER TABLE super_admin_attendance ADD COLUMN ${column} ${definition}`);
    }
  }
  const [[attendanceDayIndex]] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'super_admin_attendance' AND INDEX_NAME = 'idx_saa_employee_date'`,
  );
  if (!Number(attendanceDayIndex.count)) {
    await db.query(`ALTER TABLE super_admin_attendance ADD INDEX idx_saa_employee_date (employee_id, date)`);
  }

  // ================================
  // LOGIN TIME SETTINGS (GLOBAL)
  // ================================
  await db.query(`
  CREATE TABLE IF NOT EXISTS login_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,

    default_login_time TIME,
    default_logout_time TIME,

    grace_period INT DEFAULT 10,
    late_threshold INT DEFAULT 15,

    allow_late_login BOOLEAN DEFAULT TRUE,
    allow_early_logout BOOLEAN DEFAULT FALSE,
    overtime_approval_required BOOLEAN DEFAULT TRUE,

    flexi_hours_enabled BOOLEAN DEFAULT FALSE,
    flexi_start_time TIME,
    flexi_end_time TIME,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

  // Office default timing (IST): 09:00 AM – 06:30 PM. Seeded only when the
  // table is empty so an admin-edited value is never overwritten on boot.
  const [[loginSettingsCount]] = await db.query(
    `SELECT COUNT(*) AS total FROM login_settings`
  );
  if (!Number(loginSettingsCount?.total)) {
    await db.query(`
      INSERT INTO login_settings (default_login_time, default_logout_time, grace_period, late_threshold)
      VALUES ('09:00:00', '18:30:00', 15, 15)
    `);
  }

  // ================================
  // EMPLOYEE CUSTOM LOGIN SETTINGS
  // ================================
  await db.query(`
CREATE TABLE IF NOT EXISTS employee_login_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,

  employee_id INT NOT NULL,

  login_time TIME,
  logout_time TIME,

  is_custom BOOLEAN DEFAULT FALSE,
  is_flexible BOOLEAN DEFAULT FALSE,

  flexi_start_time TIME,
  flexi_end_time TIME,

  notes TEXT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_employee (employee_id),

  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
)
`);

  // ================================
  // COMPANY POLICIES
  // ================================
  await db.query(`
CREATE TABLE IF NOT EXISTS policies (
  id INT AUTO_INCREMENT PRIMARY KEY,

  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,

  priority ENUM('high','medium','low') DEFAULT 'medium',
  description TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  auto_apply BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_policy (title, category)
)
`);

  // ================================
  // POLICY RULES (SEPARATE TABLE 🔥)
  // ================================
  await db.query(`
CREATE TABLE IF NOT EXISTS policy_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_id INT,
  policy_type ENUM('client','candidate'),
  label VARCHAR(255),
  value VARCHAR(255),
  type VARCHAR(50),
  FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
)
`);

  // ================================
  // POLICY LOGS
  // ================================
  await db.query(`
CREATE TABLE IF NOT EXISTS policy_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(100),
  policy_title VARCHAR(255),
  user VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS super_admin_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,

  title VARCHAR(255) NOT NULL,

  employee_id INT NOT NULL,
  assigned_by INT NULL,
  quarter ENUM('Q1','Q2','Q3','Q4'),
  year INT,
  metrics JSON,

  target_value INT,
  current_value INT DEFAULT 0,
  unit VARCHAR(50),

  deadline DATE,

  status ENUM('pending','in_progress','completed','overdue') DEFAULT 'pending',
  priority ENUM('high','medium','low') DEFAULT 'medium',

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
)
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS work_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type ENUM('attendance','leave','behavior','meal_management','general') DEFAULT 'general',
    departmentId INT DEFAULT 0,
    description TEXT,
    category VARCHAR(100),
    status ENUM('active','draft','under_review','archived') DEFAULT 'draft',
    effective_date DATE,
    policy_code VARCHAR(20),
    isActive TINYINT(1) DEFAULT 1,
    isAutomated TINYINT(1) DEFAULT 1,
    autoDeduction TEXT,
    autoApply TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS performances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    employeeId INT NOT NULL,
    score INT DEFAULT 0,
    review TEXT,
    reviewDate DATE,
    month VARCHAR(20),
    year INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS general_ledger (
      id INT AUTO_INCREMENT PRIMARY KEY,
      clientId INT,
      date DATE,
      account VARCHAR(100),
      type ENUM('DEBIT','CREDIT'),
      amount DECIMAL(10,2),
      description TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  
    )
  `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    category VARCHAR(100),
    mrp DECIMAL(10,2) DEFAULT 0,
    discount_price DECIMAL(10,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    value DECIMAL(10,2) DEFAULT 0,
    purchase_date DATE,
    status ENUM('ACTIVE','SOLD','MAINTENANCE') DEFAULT 'ACTIVE',
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    vendor_name VARCHAR(255),
    total_amount DECIMAL(10,2),
    order_date DATE,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    items JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS tax_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT,
  type ENUM('GST','TDS'),
  amount DECIMAL(10,2),
  date DATE,
  description TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
  )
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    user_name VARCHAR(255),
    action VARCHAR(100),
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS performance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,

  employee_id VARCHAR(50),
  employee_name VARCHAR(100),

  department VARCHAR(100),
  department_id INT,

  period VARCHAR(7),

  quality INT,
  productivity INT,
  communication INT,
  teamwork INT,
  attendance INT,
  initiative INT,
  deadline INT,
  adaptability INT,

  avg_score DECIMAL(5,2),
  status ENUM('excellent','good','needs_improvement'),

  remarks TEXT,

  reviewed_by VARCHAR(100),
  reviewed_at DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS work_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,

  title VARCHAR(255),
  description TEXT,

  assigned_to VARCHAR(50),
  assigned_to_name VARCHAR(100),
  department VARCHAR(100),
  department_id INT,
  
  priority ENUM('low','medium','high'),
  status ENUM('pending','in_progress','completed','overdue'),

  due_date DATE,
  progress INT DEFAULT 0,

  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
  `);

  await db.query(`
CREATE TABLE IF NOT EXISTS eod_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,

  employee_id INT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department VARCHAR(150),
  department_id INT,

  report_date DATE NOT NULL,

  tasks_completed TEXT NOT NULL,
  tasks_in_progress TEXT,
  blockers TEXT,
  tomorrow_plan TEXT,
  notes TEXT,

  status ENUM('pending','submitted','approved','rejected') DEFAULT 'submitted',

  hours_worked DECIMAL(5,2) DEFAULT 8.0,

  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  approved_by VARCHAR(150),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS client_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority ENUM('high','medium','low') DEFAULT 'medium',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
  `);

  await db.query(`
CREATE TABLE IF NOT EXISTS candidate_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority ENUM('high','medium','low') DEFAULT 'medium',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
  `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS sales_eod_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,

  employee_id INT NOT NULL,
  employee_name VARCHAR(150),

  date DATE NOT NULL,

  tasks_completed INT DEFAULT 0,
  tasks_in_progress INT DEFAULT 0,
  hours_worked DECIMAL(5,2),

  summary TEXT,

  status ENUM('submitted','pending','approved','rejected') DEFAULT 'submitted',

  submitted_at TIME,

  feedback TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
)
    `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS client_work_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,

  client_id INT NOT NULL,
  employee_id INT NOT NULL,

  title VARCHAR(255),
  description TEXT,

  target_value INT DEFAULT 0,
  current_value INT DEFAULT 0,
  unit VARCHAR(50),

  deadline DATE,
  priority ENUM('low','medium','high') DEFAULT 'medium',

  status ENUM('assigned','in_progress','completed','overdue') DEFAULT 'assigned',

  created_by INT, -- admin id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    category ENUM(
        'technical',
        'salary',
        'attendance',
        'management',
        'other'
    ) DEFAULT 'other',

    priority ENUM('low', 'medium', 'high') DEFAULT 'low',

    status ENUM(
        'open',
        'in_progress',
        'resolved',
        'rejected'
    ) DEFAULT 'open',

    -- WHO CREATED (IMPORTANT)
    created_by_id INT NOT NULL,
    created_by_role ENUM(
        'employee',
        'hr',
        'client',
        'sales',
        'admin',
        'it',
        'manager'
    ) NOT NULL,

    -- OPTIONAL: who it is assigned to
    assigned_to_id INT NULL,
    assigned_to_role ENUM(
        'hr',
        'admin',
        'manager'
    ) NULL,

    -- OPTIONAL: company/client mapping
    client_id INT NULL,

    -- TRACKING
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS complaint_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,

    complaint_id INT NOT NULL,

    message TEXT NOT NULL,

    sender_id INT NOT NULL,
    sender_role ENUM(
        'employee',
        'hr',
        'client',
        'sales',
        'admin',
        'it',
        'manager'
    ) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
)
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS lead_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255),
  total_records INT,
  assigned_to INT,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
  `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(150),
  phone VARCHAR(20),

  batch_id INT,

  assigned_to INT NULL,
  assigned_by INT NULL,
  assigned_date DATETIME NULL,

  response_date DATETIME NULL,
  remarks TEXT,

  status ENUM('pending','accepted','rejected') DEFAULT 'pending',

  is_active TINYINT(1) DEFAULT 1,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (batch_id) REFERENCES lead_batches(id),
  FOREIGN KEY (assigned_to) REFERENCES employees(id)
)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS client_lead_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,

      client_id INT NOT NULL,
      file_name VARCHAR(255),
      total_records INT,

      assigned_to INT NULL, -- client_employee_id
      uploaded_by INT, -- client admin id

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES client_employees(id)
    )
  `);

  await db.query(`
      CREATE TABLE IF NOT EXISTS client_leads (
        id INT AUTO_INCREMENT PRIMARY KEY,

        client_id INT NOT NULL,

        name VARCHAR(150),
        phone VARCHAR(20),

        batch_id INT,

        assigned_to INT NULL, -- client_employee_id
        assigned_date DATETIME NULL,

        status ENUM('pending','accepted','rejected') DEFAULT 'pending',
        remarks TEXT,

        response_date DATETIME NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES client_lead_batches(id),
        FOREIGN KEY (assigned_to) REFERENCES client_employees(id)
      )
  `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS birthday_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,

    employee_id INT NOT NULL,
    message VARCHAR(255),

    is_read BOOLEAN DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS client_sales_report (
  id INT AUTO_INCREMENT PRIMARY KEY,

  client_id INT NOT NULL,
  employee_id INT NULL,

  plan_name VARCHAR(150) NOT NULL,
  billing_months INT NOT NULL,

  amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,

  payment_status ENUM('paid','partial','unpaid') DEFAULT 'unpaid',
  payment_method ENUM('cash','online') DEFAULT 'online',

  purchase_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  due_date DATE NOT NULL,

  subscription_status ENUM('active','expired','cancelled') DEFAULT 'active',

  remarks TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_client (client_id),
  INDEX idx_employee (employee_id),
  INDEX idx_status (payment_status)
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS client_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,

  client_id INT NOT NULL,
  employee_id INT NULL,

  invoice_no VARCHAR(50) UNIQUE,

  client_name VARCHAR(255),
  client_address TEXT,
  client_gstin VARCHAR(50),

  state VARCHAR(100),
  state_code VARCHAR(10),

  invoice_date DATE,

  taxable_amount DECIMAL(10,2),
  cgst DECIMAL(10,2),
  sgst DECIMAL(10,2),
  total_amount DECIMAL(10,2),

  amount_in_words TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_client (client_id),
  INDEX idx_employee (employee_id)
);
`);

  await db.query(`
CREATE TABLE IF NOT EXISTS client_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  invoice_id INT,
  description TEXT,
  hsn_sac VARCHAR(50),
  gst_rate DECIMAL(5,2),
  quantity INT,
  rate DECIMAL(10,2),
  amount DECIMAL(10,2),

  FOREIGN KEY (invoice_id) REFERENCES client_invoices(id) ON DELETE CASCADE
);
`);

  await db.query(`
 CREATE TABLE IF NOT EXISTS field_sales_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,

  created_by INT NOT NULL,

  company_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20),
  email VARCHAR(255),

  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),

  business_type VARCHAR(100),
  requirement TEXT,

  status ENUM('new','contacted','interested','not_interested','closed') DEFAULT 'new',
  remarks TEXT,
  next_followup_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS client_services (
    id INT AUTO_INCREMENT PRIMARY KEY,

    client_id INT NOT NULL,
    employee_id INT NULL, -- future: employee-wise services

    service_name VARCHAR(255) NOT NULL, -- e.g. Recruitment
    plan_name VARCHAR(255) NOT NULL,    -- Plan A / B / C

    mrp DECIMAL(10,2) DEFAULT 0,

    -- 🧠 PRICING TYPE (IMPORTANT)
    pricing_type ENUM('CTC_PERCENT', 'DAYS_SALARY', 'FIXED') NOT NULL,

    pricing_value DECIMAL(10,2) NOT NULL,
    -- examples:
    -- 8.33 (means 8.33% of annual CTC)
    -- 20 (means 20 days salary)
    -- 5000 (fixed)

    replacement_months INT DEFAULT 0,

    token_amount DECIMAL(10,2) DEFAULT 0,

    payment_terms VARCHAR(255), 
    -- e.g. "Within 7 days"

    description TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
`)

await db.query(`
CREATE TABLE IF NOT EXISTS admin_services (
  id INT AUTO_INCREMENT PRIMARY KEY,

  service_name VARCHAR(255) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,

  pricing_type ENUM('CTC_PERCENT', 'DAYS_SALARY', 'FIXED') NOT NULL,
  pricing_value DECIMAL(10,2) NOT NULL,

  mrp DECIMAL(10,2) DEFAULT 0,

  replacement_months INT DEFAULT 0,
  token_amount DECIMAL(10,2) DEFAULT 0,
  payment_terms VARCHAR(255),

  description TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`)


// ==========================================
// CLIENT AGREEMENTS
// ==========================================
await db.query(`
CREATE TABLE IF NOT EXISTS client_agreements (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Relations
  client_id INT NULL,

  -- Agreement Details
  agreement_title VARCHAR(255) NOT NULL,
  agreement_type VARCHAR(100) NULL,
  agreement_number VARCHAR(100) NULL,

  -- Dates
  start_date DATE NULL,
  expiry_date DATE NULL,

  -- File
  agreement_pdf VARCHAR(255) NOT NULL,

  -- Status
  status ENUM(
    'active',
    'expired',
    'terminated'
  ) DEFAULT 'active',

  -- Notes
  remarks TEXT NULL,

  -- System
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ON UPDATE CURRENT_TIMESTAMP,

  -- Index
  INDEX idx_client (client_id),

  -- Foreign Key
  CONSTRAINT fk_agreement_client
    FOREIGN KEY (client_id)
    REFERENCES clients(id)
    ON DELETE CASCADE
);
`);

  // ================================
  // FORMS (CLIENT & CANDIDATE)
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS forms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_type ENUM('client', 'candidate') NOT NULL,
      full_name VARCHAR(255),
      company_name VARCHAR(255),
      hr_name VARCHAR(255),
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      job_role VARCHAR(255),
      openings VARCHAR(50),
      salary VARCHAR(100),
      experience VARCHAR(100),
      location VARCHAR(255),
      employment_type VARCHAR(100),
      skills_required TEXT,
      joining_timeline VARCHAR(100),
      job_description TEXT,
      city VARCHAR(100),
      qualification VARCHAR(255),
      skills TEXT,
      expected_salary VARCHAR(100),
      preferred_location VARCHAR(255),
      current_company VARCHAR(255),
      resume_path VARCHAR(500),
      job_profile VARCHAR(255),
      language_name VARCHAR(255),
      notice_period VARCHAR(100),
      current_ctc VARCHAR(100),
      call_status_id INT,
      interview_date DATETIME,
      interview_time VARCHAR(10),
      selection_date DATETIME,
      joining_date DATETIME,
      client_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      client_remarks TEXT,
      cv_file VARCHAR(500),
      joined ENUM('Yes', 'No') DEFAULT 'No',
      status ENUM('PENDING', 'REVIEWED', 'REJECTED') DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      INDEX idx_form_type (form_type),
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    );
  `);

  // ================================
  // EMAIL TEMPLATES + LOGS (super admin email feature)
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      template_name VARCHAR(200) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      category VARCHAR(100) DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // AI CHATBOT SETTINGS + TEMPLATES (AI Chat Hub)
  // ================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS chatbot_settings (
      id INT PRIMARY KEY,
      settings JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chatbot_templates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      category VARCHAR(50) NOT NULL,
      keyword VARCHAR(200) NOT NULL,
      response TEXT NOT NULL,
      intent VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tpl_category (category)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      recipient_email VARCHAR(255) NOT NULL,
      recipient_name VARCHAR(200),
      subject VARCHAR(500),
      body TEXT,
      template_id INT NULL,
      status ENUM('sent','failed') DEFAULT 'sent',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_status (status),
      INDEX idx_email_created (created_at)
    )
  `);

  /* Website forms: make sure tables exist and status supports Hold / Solved */
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_form_submissions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      form_type VARCHAR(40) NOT NULL DEFAULT 'contact',
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NULL,
      phone VARCHAR(30) NULL,
      subject VARCHAR(200) NULL,
      message TEXT NULL,
      payload JSON NULL,
      source VARCHAR(150) NULL,
      status VARCHAR(20) DEFAULT 'New',
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    // ENUM -> VARCHAR so new statuses (Hold, Solved) can be stored; old 'Converted' becomes 'Read'
    await db.query("ALTER TABLE web_form_submissions MODIFY status VARCHAR(20) DEFAULT 'New'");
    await db.query("UPDATE web_form_submissions SET status = 'Read' WHERE status = 'Converted'");
  } catch (e) {
    console.error("[initDb] web_form_submissions status migration:", e.message);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS web_form_replies (
      id INT PRIMARY KEY AUTO_INCREMENT,
      submission_id INT NOT NULL,
      message TEXT NOT NULL,
      sent_by_id VARCHAR(50) NULL,
      sent_by_name VARCHAR(150) NULL,
      sent_by_role VARCHAR(30) NULL,
      to_email VARCHAR(150) NULL,
      email_status ENUM('sent','failed','skipped') DEFAULT 'sent',
      email_error TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wfr_submission (submission_id)
    )
  `);

  await initSmartAttendanceDb();

  console.log("✅ Database initialized successfully");
};
