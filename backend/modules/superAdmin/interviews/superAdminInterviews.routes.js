import express from "express";
import { protect } from "../../../middleware/auth.middleware.js";
import {
  getAllInterviews,
  getAllScheduledInterviews,
  getInterviewById,
  createInterview,
  updateInterview,
  deleteInterview,
  getAllHRNames,
  updateJoinedStatus,
  getClientDecisions,
  getClientDecisionSummary,
} from "./superAdminInterviews.controller.js";

const router = express.Router();

router.use(protect(["SUPER_ADMIN", "TL", "MANAGER"]));

router.get("/hr-list", getAllHRNames);

// Client Decisions must be registered before "/:id" so the literal path wins.
router.get("/client-decisions/summary", getClientDecisionSummary);
router.get("/client-decisions", getClientDecisions);

router.post("/", createInterview);
router.get("/", getAllInterviews);
router.get("/scheduled", getAllScheduledInterviews);
router.get("/:id", getInterviewById);
router.put("/:id", updateInterview);
router.delete("/:id", deleteInterview);
router.patch("/joined/:id", updateJoinedStatus);

export default router;