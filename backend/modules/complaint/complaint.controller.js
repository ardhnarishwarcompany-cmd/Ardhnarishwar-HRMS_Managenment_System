import * as service from "./complaint.service.js";

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.employee_id ||
    req.user?.admin_id || // ADMIN
    req.employee?.employee_id || // CLIENT_EMPLOYEE (must win over req.client?.id, which is the tenant id, not this employee's own id)
    req.user?.employeeId || // SALES
    req.client?.id
  );
};
const getRole = (req) => {
  // BUGFIX: was only checking req.user?.role. On some deployments the auth
  // middleware attaches the decoded token to req.employee instead of
  // req.user (getUserId already accounted for this via req.employee?.employee_id,
  // but getRole never did). When that happened, role came back undefined,
  // mapRole(undefined) produced "", and MySQL silently stored created_by_role
  // as blank (invalid ENUM value) even though created_by_id was correct and
  // the JWT itself had the right role — this is why complaints showed up for
  // Super Admin (unrestricted) but never in the raiser's own portal list.
  return (
    req.user?.role ||
    req.employee?.role ||
    req.salesUser?.role ||
    req.client?.role
  );
};

const mapRole = (role) => {
  const normalized = String(role || "").trim().toUpperCase();
  if (normalized === "SUPER_ADMIN" || normalized === "ADMIN") return "admin";
  if (normalized === "MANAGER") return "manager";
  if (normalized === "CLIENT_ADMIN") return "client";
  if (normalized === "CLIENT_EMPLOYEE") return "employee";
  return normalized.toLowerCase();
};

export const createComplaint = async (req, res) => {
  try {
    const role = mapRole(getRole(req));
    const userId = getUserId(req);

    const data = await service.createComplaint({
      ...req.body,
      created_by_id: userId,
      created_by_role: role,
      client_id: (role === "client" || role === "employee") ? (req.client?.id || req.employee?.client_id) : null,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("CREATE COMPLAINT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getComplaints = async (req, res) => {
  try {

    const user = {
      id: getUserId(req),
      role: mapRole(getRole(req)),
      client_id: req.client?.id || req.employee?.client_id || req.user?.client_id,
    };

    const data = await service.getComplaints(user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addReply = async (req, res) => {
  try {
    const data = await service.addReply({
      complaint_id: req.params.id,
      message: req.body.message,
      sender_id: getUserId(req),
      sender_role: mapRole(getRole(req)),
      client_id: req.client?.id || req.employee?.client_id || req.user?.client_id,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("REPLY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getSingleComplaint = async (req, res) => {
  try {
    const user = {
      id: getUserId(req),
      role: mapRole(getRole(req)),
      client_id: req.client?.id || req.employee?.client_id || req.user?.client_id,
    };

    const data = await service.getSingleComplaint(req.params.id, user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    if (req.employee) return res.status(403).json({success:false,message:"Employees cannot change complaint status"});
    const data = await service.updateStatus(req.params.id, req.body.status);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateComplaint = async (req, res) => {
  try {
    const user = { id: getUserId(req), role: mapRole(getRole(req)) };
    const data = await service.updateComplaint(req.params.id, user, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

export const deleteComplaint = async (req, res) => {
  try {
    const user = { id: getUserId(req), role: mapRole(getRole(req)) };
    const data = await service.deleteComplaint(req.params.id, user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
