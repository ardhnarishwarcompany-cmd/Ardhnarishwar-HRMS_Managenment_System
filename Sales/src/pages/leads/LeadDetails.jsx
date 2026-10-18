import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../api/axios";
import toast from "react-hot-toast";
// import HRNavbar from "../../components/hr/HRNavbar";
import PageHeader from "../../components/common/PageHeader";

export default function LeadDetails() {
  const { id } = useParams();
  const [leads, setLeads] = useState([]);
  const [editedLeads, setEditedLeads] = useState({});
  const fetchLeads = async () => {
    try {
      const res = await API.get(`/hr/leads/batch/${id}`); // 🔥 correct API
      setLeads(res.data.data || []);
    } catch (err) {
      console.log(err);
      toast.error("Failed to fetch leads");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [id]);

  const handleChange = (id, field, value) => {
    setEditedLeads((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (id) => {
    try {
      const original = leads.find((l) => l.id === id);
      const updated = editedLeads[id];

      if (!updated) return toast.error("No changes");

      // 🔥 MERGE ORIGINAL + EDITED
      const payload = {
        status: updated.status ?? original.status,
        remarks: updated.remarks ?? original.remarks,
      };

      await API.put(`/hr/leads/update/${id}`, payload);

      // update UI
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...payload } : l)),
      );

      // clear edited state
      setEditedLeads((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      toast.success("Updated");
    } catch (err) {
      console.log(err);
      toast.error("Update failed");
    }
  };

  return (
    <div className="py-1">
      {/* <HRNavbar /> */}
      <PageHeader
        title="Lead Details"
        desc="Full record and activity for this lead"
      />
      <div className="bg-white rounded-2xl shadow border overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          {/* HEADER */}
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3 text-left">No.</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Remarks</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {leads.map((l, index) => {
              const edited = editedLeads[l.id] || {};

              const statusColor =
                (edited.status ?? l.status) === "accepted"
                  ? "bg-green-100 text-green-700"
                  : (edited.status ?? l.status) === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700";

              return (
                <tr key={l.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 font-medium">{index+1}</td>
                  <td className="p-3 font-medium">{l.name}</td>

                  <td className="p-3 text-gray-600">{l.phone}</td>

                  {/* STATUS */}
                  <td className="p-3">
                    <select
                      value={edited.status ?? l.status}
                      onChange={(e) =>
                        handleChange(l.id, "status", e.target.value)
                      }
                      className={`px-2 py-1 rounded-full text-xs font-medium border outline-none ${statusColor}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>

                  {/* REMARK */}
                  <td className="p-3">
                    <input
                      value={edited.remarks ?? l.remarks ?? ""}
                      onChange={(e) =>
                        handleChange(l.id, "remarks", e.target.value)
                      }
                      placeholder="Add remark..."
                      className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </td>

                  {/* ACTION */}
                  <td className="p-3">
                    <button
                      onClick={() => handleSubmit(l.id)}
                      disabled={!editedLeads[l.id]}
                      className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${
                        editedLeads[l.id]
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>

      {!leads.length && (
        <p className="text-gray-400 text-center mt-4">No leads in this batch</p>
      )}
    </div>
  );
}
