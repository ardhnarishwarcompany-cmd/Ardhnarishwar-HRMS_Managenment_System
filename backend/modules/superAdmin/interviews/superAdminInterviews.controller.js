import * as service from "./superAdminInterviews.service.js";

// ================= GET ALL =================
export const getAllInterviews = async (req, res) => {
  try {
    const data = await service.getAllInterviews(req.query);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= GET BY ID =================
export const getInterviewById = async (req, res) => {
  try {
    const data = await service.getInterviewById(req.params.id);

    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// ================= CREATE =================
export const createInterview = async (req, res) => {
  try {
    const data = await service.createCandidate(req.body);

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ================= UPDATE =================
export const updateInterview = async (req, res) => {
  try {
    const data = await service.updateCandidate(req.params.id, req.body);

    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ================= DELETE =================
export const deleteInterview = async (req, res) => {
  try {
    await service.deleteCandidate(req.params.id);

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ================= HR LIST (FIX MISSING ROUTE) =================
export const getAllHRNames = async (req, res) => {
  try {
    const data = await service.getUniqueHRList();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
    console.log("GetAllHRName : " , err);
  }

};

// ================= JOINED STATUS =================
export const updateJoinedStatus = async (req, res) => {
  try {
    const { joined, joining_date, selection_date } = req.body || {};

    const data = await service.updateJoinedStatus(req.params.id, {
      joined,
      joining_date,
      selection_date,
    });

    res.json({ success: true, data });
  } catch (err) {
    const status = err.message === "Interview not found" ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

// ================= CLIENT DECISIONS =================
export const getClientDecisions = async (req, res) => {
  try {
    const data = await service.getClientDecisions(req.query);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Client decisions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getClientDecisionSummary = async (req, res) => {
  try {
    const data = await service.getClientDecisionSummary();
    res.json({ success: true, data });
  } catch (err) {
    console.error("Client decision summary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= SCHEDULED INTERVIEWS (LEGACY) =================
export const getAllScheduledInterviews = async (req, res) => {
  try {
    const {
      page = 1, limit = 50, search = "", client = "",
      hr = "", status = "", joined = "", call_status = "",
      job_profile = "", language_id = "",
    } = req.query;

    const data = await service.getScheduledInterviews({
      page, limit, search, client, hr, status,
      joined, call_status, job_profile, language_id,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Admin Interviews Error:", err);
    res.status(500).json({ success: false, message: "server error" });
  }
};