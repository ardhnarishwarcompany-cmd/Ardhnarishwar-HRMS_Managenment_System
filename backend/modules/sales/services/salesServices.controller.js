import {
  fetchAdminServices,
  createAdminServiceItem,
  updateAdminServiceItem,
  deleteAdminServiceItem,
} from "./salesServices.service.js";

// Sales and admin read the same admin_services row, so the Sales download
// reuses the admin's Ardhnarishwar-branded proposal PDF instead of a second template.
export { generateServicePDF } from "../../superAdmin/services/admin.services.controller.js";

// GET
export const getAllAdminServices = async (req, res) => {
  const data = await fetchAdminServices();
  res.json(data);
};

// CREATE
export const createAdminService = async (req, res) => {
  const newItem = await createAdminServiceItem(req.body);
  res.json(newItem);
};

// UPDATE
export const updateAdminService = async (req, res) => {
  const { id } = req.params;
  const updated = await updateAdminServiceItem(id, req.body);
  res.json(updated);
};

// DELETE
export const deleteAdminService = async (req, res) => {
  const { id } = req.params;
  await deleteAdminServiceItem(id);
  res.json({ message: "Deleted" });
};
