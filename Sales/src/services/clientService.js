import API from "../api/axios";

/* =========================================
CREATE CLIENT
========================================= */
export const createClient = async (payload) => {
  const { data } = await API.post("/sales/clients", payload);

  return data;
};

/* =========================================
LIST MY CLIENTS (created by the logged-in rep)
========================================= */
export const getMyClients = async (q = "") => {
  const { data } = await API.get("/sales/clients", {
    params: q ? { q } : undefined,
  });

  return data?.data || [];
};

/* =========================================
UPDATE CLIENT
========================================= */
export const updateClient = async (id, payload) => {
  const { data } = await API.put(`/sales/clients/${id}`, payload);

  return data;
};

/* =========================================
DELETE CLIENT
========================================= */
export const deleteClient = async (id) => {
  const { data } = await API.delete(`/sales/clients/${id}`);

  return data;
};
