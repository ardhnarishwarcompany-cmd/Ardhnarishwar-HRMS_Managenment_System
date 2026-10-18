import * as query from "./work.query.js";

export const getMyAssignments = (
  employeeCode
) => {
  return query.getMyAssignments(
    employeeCode
  );
};

export const updateMyAssignment = async (
  id,
  data,
  employeeCode
) => {
  const existing =
    await query.getAssignmentById(id, employeeCode);

  if (!existing) {
    throw new Error(
      "Assignment not found"
    );
  }

  // SECURITY CHECK
  if (
    existing.assigned_to !== employeeCode
  ) {
    throw new Error("Access denied");
  }

  const payload = {
    status:
      data.status || existing.status,

    progress:
      data.progress ??
      existing.progress,
  };

  return query.updateAssignment(
    id,
    payload,
    employeeCode
  );
};