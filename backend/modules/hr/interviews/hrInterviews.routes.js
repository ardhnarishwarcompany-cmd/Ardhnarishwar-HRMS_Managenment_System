import express from "express";
import * as ctrl from "./hrInterviews.controller.js";
import { hrAuthMiddleware } from "../../../middleware/hrAuth.middleware.js";
import upload from "../../../middleware/upload.middleware.js";

const router = express.Router();

router.use(hrAuthMiddleware);

router.post("/", upload.single("cv_file"), ctrl.createInterview);

router.get("/", ctrl.listInterviews);

router.put("/:id", upload.single("cv_file"), ctrl.updateInterview);

router.get("/locations", ctrl.getLocations);

router.get("/languages", ctrl.getLanguages);

router.get("/clients", ctrl.getClients);
export default router;
