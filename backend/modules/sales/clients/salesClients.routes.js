import express from "express";

import {
  createSalesClient,
  getMySalesClients,
  updateSalesClient,
  deleteSalesClient,
} from "./salesClients.controller.js";

import {
  requireSalesAuth,
} from "../../../middleware/salesAuth.middleware.js";

const router = express.Router();

router.use(requireSalesAuth);

/* =========================================
LIST MY CLIENTS
========================================= */
router.get("/", getMySalesClients);

/* =========================================
CREATE CLIENT
========================================= */
router.post("/", createSalesClient);
router.put("/:id", updateSalesClient);
router.delete("/:id", deleteSalesClient);

export default router;
