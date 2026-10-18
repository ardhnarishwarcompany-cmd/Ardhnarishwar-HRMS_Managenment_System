import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../api/axios";
import toast from "react-hot-toast";
import { Users, CalendarPlus, Save } from "lucide-react";
import AddInterviewModal from "../../components/hr/AddInterviewModal";
import PageHeader from "../../components/common/PageHeader";

import { Inbox as HrPageIcon } from "lucide-react";
export default function LeadDetails() {
  const { id } = useParams();
  const [leads, setLeads] = useState([]);
  const [editedLeads, setEditedLeads] = useState({});

  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [scheduledIds, setScheduledIds] = useState(new Set());

  const fetchLeads = async () => {
    try {
      const res = await API.get(`/hr/leads/batch/${id}`);
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

      const payload = {
        status: updated.status ?? original.status,
        remarks: updated.remarks ?? original.remarks,
      };

      await API.put(`/hr/leads/update/${id}`, payload);

      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...payload } : l)),
      );

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

  const thClass =
    "px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-white/40";

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6 dark:bg-[#0b0817]">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
        <PageHeader
          icon={HrPageIcon}
          title="Lead Management"
          subtitle="Review batch leads, update statuses, and schedule interviews."
        />

        {/* LEADS TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-24px_rgba(109,40,217,0.25)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] dark:backdrop-blur-xl">
          {/* gradient hairline */}
          <div
            aria-hidden="true"
            className="h-[3px] w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500"
          />

          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/10">
            <span
              className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500"
              aria-hidden="true"
            />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Batch Leads
            </h3>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-[#100c1e]">
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Phone</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Remarks</th>
                  <th className={thClass}>Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                        <Users size={24} aria-hidden="true" />
                      </span>
                      <p className="text-sm font-semibold text-slate-700 dark:text-white/80">
                        No leads in this batch
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-white/40">
                        Leads added to this batch will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  leads.map((l, index) => {
                    const edited = editedLeads[l.id] || {};

                    const currentStatus = edited.status ?? l.status;
                    const statusColor =
                      currentStatus === "accepted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/30"
                        : currentStatus === "rejected"
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-400/30"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/30";

                    return (
                      <tr
                        key={l.id}
                        className="transition-colors hover:bg-violet-50/60 dark:hover:bg-white/[0.04]"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-xs font-bold text-white shadow-md">
                              {index + 1}
                            </div>
                            <span className="text-sm font-semibold text-slate-800 dark:text-white/90">
                              {l.name || l.full_name || l.fullName || l.candidate_name || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-white/60">
                          {l.phone || l.phone_number || l.mobile || l.mobile_number || "N/A"}
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-4">
                          <select
                            value={currentStatus}
                            onChange={(e) =>
                              handleChange(l.id, "status", e.target.value)
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition-all focus:ring-2 focus:ring-violet-500/25 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-200 ${statusColor}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>

                        {/* REMARK */}
                        <td className="px-4 py-4">
                          <input
                            value={edited.remarks ?? l.remarks ?? ""}
                            onChange={(e) =>
                              handleChange(l.id, "remarks", e.target.value)
                            }
                            placeholder="Add remark..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-fuchsia-500/60 dark:focus:ring-fuchsia-500/20"
                          />
                        </td>

                        {/* ACTION */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSubmit(l.id)}
                              disabled={!editedLeads[l.id]}
                              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                                editedLeads[l.id]
                                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30"
                                  : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-white/30"
                              }`}
                            >
                              <Save size={13} aria-hidden="true" />
                              Save
                            </button>
                            {scheduledIds.has(l.id) || l.interview_scheduled || l.has_interview ? (
                              <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
                                <CalendarPlus size={13} aria-hidden="true" />
                                Interview Scheduled
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedLead(l);
                                  setShowAdd(true);
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/30"
                              >
                                <CalendarPlus size={13} aria-hidden="true" />
                                Add Interview
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {leads.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
              Showing {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <AddInterviewModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => {
          setShowAdd(false);
          if (selectedLead) {
            setScheduledIds((prev) => new Set(prev).add(selectedLead.id));
          }
        }}
        locations={[]}
        defaultData={selectedLead}
      />
    </div>
  );
}
