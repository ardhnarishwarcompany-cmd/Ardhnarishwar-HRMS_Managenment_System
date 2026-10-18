// Recruweb website: contact form submit handler (recruweb.com/#/contact)
// Isse apne Contact page ke "Send Message" button ke onSubmit me use karo.
//
// HRMS_API  = live HRMS backend (ardhnarishwar-hrms-backend.recruweb.com) — do NOT point this at localhost.
// HRMS_KEY  = Super Admin > Website Forms > API Keys (label: "Company Website"); the same key exists in the live DB.
const HRMS_API = "https://ardhnarishwar-hrms-backend.recruweb.com/api";
const HRMS_KEY = "0de36df991d4b4bafc10b482bc8202c67e2957cf70aeb4668661ea17cd97d6f5";

const MESSAGE_MAX = 5000;

export async function submitContactForm({ fullName, email, phone, subject, message }) {
  const name = String(fullName || "").trim();
  const mail = String(email || "").trim();
  const tel = String(phone || "").trim();
  if (!name) throw new Error("Please enter your name");
  if (!mail && !tel) throw new Error("Please enter an email address or phone number");

  let res;
  try {
    res = await fetch(`${HRMS_API}/web-forms/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": HRMS_KEY },
      body: JSON.stringify({
        form_type: "contact",
        name,
        email: mail || undefined,
        phone: tel || undefined,
        subject: String(subject || "").trim().slice(0, 200),
        message: String(message || "").trim().slice(0, MESSAGE_MAX),
      }),
    });
  } catch {
    // network / CORS failure (CORS_ORIGINS on the HRMS backend must include https://recruweb.com and https://www.recruweb.com)
    throw new Error("Could not reach the server. Please try again in a moment.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.message || "Could not send message");
  return data; // { success: true, id, message: "Submission received" }
}
