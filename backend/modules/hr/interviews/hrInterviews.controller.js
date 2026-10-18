import * as service from "./hrInterviews.service.js";

// ================= CREATE
export const createInterview = async (req, res) => {
  try {

    console.log("FILE:", req.file);   // DEBUG

const cv_file = req.file
  ? `/uploads/cv/${req.file.filename}`
  : null;
    const data = await service.createInterviewService(
      req.employee.id,
      { ...req.body, cv_file }
    );

    res.json({ success: true, ...data });

  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false, message: e.message });
  }
};

// ================= LIST
export const listInterviews = async (req, res) => {
  try {
    const data = await service.listInterviewsService(req.employee.id);
    res.json({ success: true, data });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false, message: e.message });
  }
};

// ================= UPDATE
export const updateInterview = async (req, res) => {
  try {

const cv_file = req.file
  ? `/uploads/cv/${req.file.filename}`
  : null;
    await service.updateInterviewService(
      req.employee.id,
      req.params.id,
      { ...req.body, cv_file }
    );

    res.json({ success: true });

  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ================= GET LOCATIONS
export const getLocations = async (req, res) => {
  try {
    const data = await service.getLocationsService();
    res.json({ success: true, data });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false, message: e.message });
  }
};

// ================= GET LANGUAGES

export const getLanguages = async (req, res) => {
  try {
    const data = await service.getLanguagesService();
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ================= GET CLIENTS
export const getClients = async (req, res) => {
  try {
    const data = await service.getClientsService();
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
