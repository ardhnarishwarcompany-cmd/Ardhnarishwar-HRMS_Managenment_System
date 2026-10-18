import { useState, useEffect } from "react";
import { getJobPositions } from "../../services/jobPositionService";
import AddJobPositionModal from "../../components/Interview/AddJobPositionModal";
import AddLanguageModal from "../../components/Interview/AddLanguageModal";
import AddLocationModal from "../../components/Interview/AddLocationModal";
import {
  updateJoinedStatus,
  createInterview,
  deleteInterview,
} from "../../services/interviewService";
import { deleteForm } from "../../services/formService";
import toast from "react-hot-toast";

export default function AdminInterviewTable({
  rows = [],
  table,
  loading,
  hideButtons = false,
}) {
  const [openModal, setOpenModal] = useState(false);
  const [openLangModal, setOpenLangModal] = useState(false);
  const [openLocModal, setOpenLocModal] = useState(false);

  const [jobProfiles, setJobProfiles] = useState([]);
  const [localRows, setLocalRows] = useState(rows);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const callStatusMap = {
    1: "NOT PICKED",
    2: "SWITCHED OFF",
    3: "CALL BACK",
    4: "INTERESTED",
    5: "NOT INTERESTED",
    6: "INTERVIEW SCHEDULED",
    7: "SELECTED",
    8: "REJECTED",
    9: "NOT REACHABLE",
  };

  const clientStatusBadge = {
    accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rejected: "bg-rose-50 text-rose-700 ring-rose-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
  };

  useEffect(() => {
    const fetchJobProfiles = async () => {
      try {
        const res = await getJobPositions();
        setJobProfiles(res.data?.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchJobProfiles();
  }, []);


// Rows merged in from the public candidate form (id "form_<n>") live in the
// `forms` table, which has no joined/joining_date columns to save into.
const isFormRow = (id) => String(id).startsWith("form_");

const handleJoinedChange = async (id, joined, joining_date, selection_date) => {
  if (isFormRow(id)) return;
  try {
    await updateJoinedStatus(id, joined, joining_date, selection_date);

    // UI update — also keep the dates so the inputs don't visually reset
    setLocalRows((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              joined,
              joining_date: joining_date || item.joining_date,
              selection_date: selection_date || item.selection_date,
            }
          : item
      )
    );
  } catch (err) {
    console.error("Joined update failed:", err);
    const serverMsg =
      err?.response?.data?.message || err?.message || "Unknown error";
    toast.error(
      "Failed to save Joined status.\n\nServer says: " +
        serverMsg +
        "\n\nCheck that you are logged in and the backend is reachable."
    );
  }
};

  // ✓ DELETE (NO PAGE RELOAD)
  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this interview?");
    if (!ok) return;

    try {
      if (isFormRow(id)) {
        await deleteForm(String(id).replace("form_", ""));
      } else {
        await deleteInterview(id);
      }

      // remove from UI instantly
      setLocalRows((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) {
    return <div className="p-10 text-center font-semibold">Loading...</div>;
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-sm">

      {/* HEADER */}
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">{table}</h2>

        {!hideButtons && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOpenLangModal(true)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
            >
              + Language
            </button>

            <button
              onClick={() => setOpenLocModal(true)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
            >
              + Location
            </button>

            <button
              onClick={() => setOpenModal(true)}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              + Schedule Interview
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
     <div className="overflow-auto max-h-[60vh] overflow-y-auto max-h-[60vh] w-full">
  <table className="w-full min-w-[1400px] text-sm whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="p-3 text-left">Candidate</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Job</th>
              {/* <th className="p-3 text-left">Language</th> */}
              <th className="p-3 text-left">Exp</th>
              <th className="p-3 text-left">CTC</th>
              <th className="p-3 text-left">Notice</th>
              <th className="p-3 text-left">HR</th>
              {/* <th className="p-3 text-left">Company </th> */}
              <th className="p-3 text-left">Call Status</th>
              <th className="p-3 text-left">Interview Date</th>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Joining Date</th>
              {/* <th className="p-3 text-left">CV</th> */}
              <th className="p-3 text-left">Client Status</th>
              <th className="p-3 text-left">Joined</th>
              <th className="p-3 text-left">Delete</th>
            </tr>
          </thead>

          <tbody>
            {localRows.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">

                <td className="p-3">{item.candidate_name}</td>
                <td className="p-3">{item.candidate_phone}</td>
                <td className="p-3">{item.job_profile || "-"}</td>
                {/* <td className="p-3">{item.language_name || "-"}</td> */}
                <td className="p-3">{item.experience || "-"}</td>

                <td className="p-3">
                  {item.current_ctc || "-"} → {item.expected_ctc || "-"}
                </td>

                <td className="p-3">{item.notice_period || "-"}</td>
                <td className="p-3">{item.hr_name || "-"}</td>
                {/* <td className="p-3">{item.company_name || "-"}</td> */}

                <td className="p-3">
                  {callStatusMap[item.call_status_id] || "-"}
                </td>

                <td className="p-3">
                  {item.interview_date
                    ? new Date(item.interview_date).toLocaleDateString()
                    : "-"}
                </td>

                <td className="p-3">{item.interview_time || "-"}</td>

                <td className="p-3">
                  <input
                    type="date"
                    value={
                      item.joining_date?.split("T")[0] ||
                      item.selection_date?.split("T")[0] ||
                      ""
                    }
                    onChange={(e) =>
                      handleJoinedChange(
                        item.id,
                        e.target.value ? "Yes" : item.joined || "No",
                        e.target.value,
                        item.selection_date?.split("T")[0] || e.target.value
                      )
                    }
                    disabled={isFormRow(item.id)}
                    title={isFormRow(item.id) ? "Web-form submission: schedule an interview first" : undefined}
                    className="border px-2 py-1 rounded disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>

                {/* <td className="p-3">
                  {item.cv_file ? (
                    <a
                      href={`${import.meta.env.VITE_API_BASE_URL}/uploads/cv/${item.cv_file}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600"
                    >
                      View
                    </a>
                  ) : (
                    "-"
                  )}
                </td> */}

                <td className="p-3">
                  {isFormRow(item.id) ? (
                    <span className="text-gray-400">-</span>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${
                        clientStatusBadge[item.client_status] || clientStatusBadge.pending
                      }`}
                      title={item.client_remarks ? `Client remarks: ${item.client_remarks}` : undefined}
                    >
                      {item.client_status || "pending"}
                    </span>
                  )}
                </td>

                <td className="p-3">
                  <select
                    value={item.joined ?? "No"}
                    onChange={(e) =>
                      handleJoinedChange(
                        item.id,
                        e.target.value,
                        item.joining_date?.split("T")[0] || "",
                        item.selection_date?.split("T")[0] || ""
                      )
                    }
                    disabled={isFormRow(item.id)}
                    title={isFormRow(item.id) ? "Web-form submission: schedule an interview first" : undefined}
                    className="border px-2 py-1 rounded disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </td>

                {/* DELETE BUTTON */}
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>

              </tr>
            ))}

            {!localRows.length && (
              <tr>
                <td colSpan="17" className="px-6 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      No interviews yet
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Scheduled interviews will appear here.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      <AddJobPositionModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={createInterview}
        jobProfiles={jobProfiles}
      />

      <AddLanguageModal
        open={openLangModal}
        onClose={() => setOpenLangModal(false)}
      />

      <AddLocationModal
        open={openLocModal}
        onClose={() => setOpenLocModal(false)}
      />
    </div>
  );
}