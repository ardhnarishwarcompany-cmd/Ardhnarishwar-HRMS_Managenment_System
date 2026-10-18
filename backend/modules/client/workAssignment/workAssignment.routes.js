import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  updateStatus,
  listAssignmentDeliverables,
  createAssignmentDeliverable,
  listAssignmentAttachments,
  createAssignmentAttachment,
  deleteAssignmentAttachment,
  ATTACHMENTS_DIR,
  DELIVERABLES_DIR,
} from "./workAssignment.controller.js";
import { clientUnifiedAuthMiddleware } from "../../../middleware/clientUnifiedAuth.middleware.js";
import { clientAuthMiddleware } from "../../../middleware/clientAuth.middleware.js";

const router = express.Router();

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const makeUploader = (dest) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) =>
        cb(
          null,
          `${Date.now()}-${Math.round(Math.random() * 1e9)}${path
            .extname(file.originalname)
            .toLowerCase()}`,
        ),
    }),
    limits: { fileSize: MAX_FILE_SIZE },
  });

const uploadDeliverable = makeUploader(DELIVERABLES_DIR);
const uploadAttachment = makeUploader(ATTACHMENTS_DIR);

router.use(clientUnifiedAuthMiddleware);

router.get("/", getAssignments);
router.post("/", clientAuthMiddleware, createAssignment);
router.put("/:id", clientAuthMiddleware, updateAssignment);
router.delete("/:id", clientAuthMiddleware, deleteAssignment);
router.patch("/status/:id", updateStatus);

// Task files attached by the client (briefs, reference videos, project files)
router.get("/:id/attachments", listAssignmentAttachments);
router.post(
  "/:id/attachments",
  clientAuthMiddleware,
  uploadAttachment.single("file"),
  createAssignmentAttachment,
);
router.delete(
  "/:id/attachments/:attachmentId",
  clientAuthMiddleware,
  deleteAssignmentAttachment,
);

// Deliverables uploaded by the assigned employee
router.get("/:id/deliverables", listAssignmentDeliverables);
router.post(
  "/:id/deliverables",
  uploadDeliverable.single("file"),
  createAssignmentDeliverable,
);

export default router;
