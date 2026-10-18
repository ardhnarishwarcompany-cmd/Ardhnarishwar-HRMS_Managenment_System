import API from "./api";

// CREATE INTERVIEW
export const createInterview = (data) => {
  return API.post("/super-admin/interviews", data);
};

// GET ALL INTERVIEWS (SEARCH WORKING)
export const getAllInterviews = ({
  page = 1,
  limit = 50,
  search = "",
  client = "",
  hr = "",
  status = "",
  joined = "",
  call_status = "",
  job_profile = "",
  language_id = "",
} = {}) => {
  return API.get("/super-admin/interviews", {
    params: {
      page,
      limit,
      search,

      client,
      hr,
      status,
      joined,
      call_status,
      job_profile,
      language_id,
    },
  });
};

// CLIENT DECISIONS (interviews the client accepted / rejected in the client portal)
export const getClientDecisions = ({
  page = 1,
  limit = 50,
  search = "",
  decision = "",
  hr = "",
  client = "",
  joined = "",
} = {}) => {
  return API.get("/super-admin/interviews/client-decisions", {
    params: { page, limit, search, decision, hr, client, joined },
  });
};

export const getClientDecisionSummary = () => {
  return API.get("/super-admin/interviews/client-decisions/summary");
};

// UPDATE JOINED STATUS
export const updateJoinedStatus = (
  id,
  joined,
  joining_date,
  selection_date
) => {
  return API.patch(`/super-admin/interviews/joined/${id}`, {
    joined,
    joining_date,
    selection_date,
  });
};

// DELETE INTERVIEW
export const deleteInterview = (id) => {
  return API.delete(`/super-admin/interviews/${id}`);
};