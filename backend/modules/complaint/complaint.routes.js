import express from "express";
import {
  createComplaint,
  getComplaints,
  addReply,
  getSingleComplaint, updateStatus,
  updateComplaint,
  deleteComplaint,
} from "./complaint.controller.js";

// import { complaintAuth } from "../../middleware/complaintAuth.middleware.js";
import { complaintPortalAuth } from "../../middleware/complaintPortalAuth.middleware.js";


const router = express.Router();

// router.use(complaintAuth);
// allow all roles
router.use(complaintPortalAuth);

router.get("/", getComplaints);
router.post("/", createComplaint);
router.post("/:id/reply", addReply);
router.get("/:id", getSingleComplaint);
router.put("/:id/status", updateStatus);
router.put("/:id", updateComplaint);
router.delete("/:id", deleteComplaint);

export default router;

