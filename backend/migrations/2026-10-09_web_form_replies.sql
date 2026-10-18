-- Reply thread for website-form inquiries (also auto-created by initDb on server start)
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
);

-- Remove the dummy/seed inquiries that shipped in the original dump
DELETE FROM web_form_submissions
 WHERE email IN ('priya@web.test','vendor@acme.test','joiner@test.dev',
                 'rahul.sharma@example.com','priya.verma@example.com','amit.patel@example.com')
    OR (name = 'Sneha Iyer' AND phone = '9900112233');


-- ===== Website forms v2: Hold / Solved statuses (also auto-applied by initDb) =====
ALTER TABLE web_form_submissions MODIFY status VARCHAR(20) DEFAULT 'New';
UPDATE web_form_submissions SET status = 'Read' WHERE status = 'Converted';
