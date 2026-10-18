import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import {
  submitForm,
  listSubmissions,
  updateStatus,
  updateSubmission,
  deleteSubmission,
  getReplies,
  sendReply,
  listKeys,
  createKey,
  revokeKey,
} from "./webForms.controller.js";
import { inboxAuth, forwardToLive } from "./webForms.access.js";

const router = express.Router();
const ROLES = ["SUPER_ADMIN", "MANAGER", "hr"];
const inbox = [inboxAuth(ROLES), forwardToLive];

/* Public: external websites POST here with X-API-Key */
router.post("/submit", submitForm);

/* Inbox (local dev forwards these to the live server when WEBFORMS_UPSTREAM_URL is set) */
router.get("/submissions", ...inbox, listSubmissions);
router.patch("/submissions/:id/status", ...inbox, updateStatus);
router.put("/submissions/:id", ...inbox, updateSubmission);
router.delete("/submissions/:id", ...inbox, deleteSubmission);
router.get("/submissions/:id/replies", ...inbox, getReplies);
router.post("/submissions/:id/reply", ...inbox, sendReply);

/* API key management (always on this server) */
router.get("/keys", protect(["SUPER_ADMIN"]), listKeys);
router.post("/keys", protect(["SUPER_ADMIN"]), createKey);
router.delete("/keys/:id", protect(["SUPER_ADMIN"]), revokeKey);

export default router;
