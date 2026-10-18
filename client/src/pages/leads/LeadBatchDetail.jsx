import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../services/api.js";
import { Users } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import toast from "react-hot-toast";
import { useClientAuth } from "../../context/ClientAuthContext";

export default function LeadBatchDetail() {
  const { id } = useParams();

  const [leads, setLeads] = useState([]);
  const [localLeads, setLocalLeads] = useState([]);

  const { client } = useClientAuth();
  const isEmployee = client?.role === "CLIENT_EMPLOYEE";

  // 🔥 FETCH
  const fetchLeads = async () => {
    try {
      let res;
      
      if (isEmployee) {
        res = await API.get(`/client/leads/my`);
      } else {
        res = await API.get(`/client/leads/batch/${id}`);
      }

      setLeads(res.data.data);
      setLocalLeads(res.data.data);
    } catch {
      toast.error("Failed to load leads");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [id]);

  // 🔥 CHANGE HANDLER
  const handleChange = (leadId, field, value) => {
    setLocalLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, [field]: value } : l
      )
    );
  };

  // 🔥 UPDATE API
  const handleUpdate = async (leadId) => {
    try {
      const lead = localLeads.find((l) => l.id === leadId);

      await API.put(`/client/leads/update/${leadId}`, {
        status: lead.status,
        remarks: lead.remarks,
      });

      toast.success("Updated successfully");
      fetchLeads();
    } catch (err) {
      console.log(err);
      toast.error("Update failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* HEADER */}
      <PageHeader
        icon={Users}
        title="Lead Details"
        subtitle="Leads in this batch and their current status."
        actions={<span className="badge badge-info">Total: {localLeads.length}</span>}
      />

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-2xl shadow border overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">

          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3 text-left">No.</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Remarks</th>
              {isEmployee && <th className="p-3 text-left">Action</th>}
            </tr>
          </thead>

          <tbody>
            {localLeads.map((l, idx) => {
              const statusColor =
                l.status === "accepted"
                  ? "bg-green-100 text-green-700"
                  : l.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700";

              return (
                <tr key={l.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3 font-medium">{idx+1}</td>
                  <td className="p-3 font-medium">{l.name}</td>
                  <td className="p-3 text-gray-600">{l.phone}</td>

                  {/* STATUS */}
                  <td className="p-3">
                    {isEmployee ? (
                      <select
                        value={l.status}
                        onChange={(e) =>
                          handleChange(l.id, "status", e.target.value)
                        }
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
                        {l.status}
                      </span>
                    )}
                  </td>

                  {/* REMARKS */}
                  <td className="p-3 text-gray-600">
                    {isEmployee ? (
                      <input
                        type="text"
                        value={l.remarks || ""}
                        onChange={(e) =>
                          handleChange(l.id, "remarks", e.target.value)
                        }
                        className="border rounded px-2 py-1 text-sm w-full"
                        placeholder="Enter remarks"
                      />
                    ) : (
                      l.remarks || "—"
                    )}
                  </td>

                  {/* ACTION */}
                  {isEmployee && (
                    <td className="p-3">
                      <button
                        onClick={() => handleUpdate(l.id)}
                        className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden space-y-4">
        {localLeads.map((l) => (
          <div key={l.id} className="bg-white p-4 rounded-xl shadow border space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">{l.name}</h2>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {l.status}
              </span>
            </div>

            <p className="text-sm text-gray-600">📞 {l.phone}</p>

            {isEmployee ? (
              <>
                <select
                  value={l.status}
                  onChange={(e) =>
                    handleChange(l.id, "status", e.target.value)
                  }
                  className="border rounded px-2 py-1 text-sm w-full"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>

                <input
                  type="text"
                  value={l.remarks || ""}
                  onChange={(e) =>
                    handleChange(l.id, "remarks", e.target.value)
                  }
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="Enter remarks"
                />

                <button
                  onClick={() => handleUpdate(l.id)}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm w-full"
                >
                  Save
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {l.remarks || "No remarks"}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* EMPTY */}
      {!localLeads.length && (
        <div className="text-center text-gray-400 py-10">
          No leads found
        </div>
      )}
    </div>
  );
}