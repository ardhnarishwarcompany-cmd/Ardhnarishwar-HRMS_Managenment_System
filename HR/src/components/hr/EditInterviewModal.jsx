import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const callStatusList = [
  { id: 1, name: "NOT PICKED" },
  { id: 2, name: "SWITCHED OFF" },
  { id: 3, name: "CALL BACK" },
  { id: 4, name: "INTERESTED" },
  { id: 5, name: "NOT INTERESTED" },
  { id: 6, name: "INTERVIEW SCHEDULED" },
  { id: 7, name: "SELECTED" },
  { id: 8, name: "REJECTED" },
  { id: 9, name: "NOT REACHABLE" },
];

export default function EditInterviewModal({
  open,
  onClose,
  onSuccess,
  data,
  locations = [],
}) {
  const [form, setForm] = useState({
    candidate_name: "",
    candidate_phone: "",
    location: "",
    job_profile: "",
    experience: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period: "",
    client_code: "",
    call_status_id: "",
    interview_date: "",
    interview_time: "",
    hr_remarks: "",
    language_id: "",
    address: "",
    cv_file: null,
  });

  const [loading, setLoading] = useState(false);
  const [jobPositions, setJobPositions] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [clients, setClients] = useState([]);

  const token = localStorage.getItem("hrms_hr_Token");
  const BASE = import.meta.env.VITE_API_BASE_URL;

  // 🔥 prefill
  useEffect(() => {
    if (data) {
      setForm({
        candidate_name: data.candidate_name || "",
        candidate_phone: data.candidate_phone || "",
        location: data.location || "",
        client_code: data.client_code || "",
        call_status_id: data.call_status_id || "",
        interview_date: data.interview_date?.slice(0, 10) || "",
        interview_time: data.interview_time || "",
        job_profile: data.job_profile || "",
        experience: data.experience || "",
        current_ctc: data.current_ctc || "",
        expected_ctc: data.expected_ctc || "",
        notice_period: data.notice_period || "",
        hr_remarks: data.hr_remarks || "",
        language_id: data.language_id || "",
        address: data.address || "",
      });
    }
  }, [data]);

  const fetchLanguages = async () => {
    try {
      const res = await axios.get(`${BASE}/hr/interviews/languages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLanguages(res.data.data);
    } catch (err) {
      console.error("Language fetch error:", err);
    }
  };

  useEffect(() => {
    fetchJobPositions();
    fetchLanguages();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${BASE}/hr/interviews/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Clients fetch error:", err);
    }
  };

  const fetchJobPositions = async () => {
    try {
      const res = await axios.get(`${BASE}/super-admin/job-positions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setJobPositions(res.data.data);
    } catch (err) {
      console.error("Job fetch error:", err);
    }
  };

  if (!open) return null;

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setForm((p) => ({ ...p, [name]: digitsOnly }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        if (form[key] !== null) {
          formData.append(key, form[key]);
        }
      });

      await axios.put(`${BASE}/hr/interviews/${data.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Interview updated");

      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    setForm((p) => ({
      ...p,
      cv_file: e.target.files[0],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="relative z-10 shrink-0 overflow-hidden bg-slate-900 px-6 py-5">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                Recruitment
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-white">
                Edit Interview
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              ✕
            </button>
          </div>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Candidate Name
            </label>
            <input
              name="candidate_name"
              value={form.candidate_name}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              name="candidate_phone"
              value={form.candidate_phone}
              onChange={handlePhoneChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              required
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Location
            </label>

            <select
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" className="text-black">
                Select Location
              </option>

              {locations.map((loc) => (
                <option key={loc.id} value={loc.name} className="text-black">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Add Address
            </label>
            <input
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Profile
            </label>
            <select
              name="job_profile"
              value={form.job_profile}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" className="text-black">
                Select Job Profile
              </option>

              {form.job_profile &&
                !jobPositions.find((j) => j.title === form.job_profile) && (
                  <option value={form.job_profile}>
                    {form.job_profile} (Old)
                  </option>
                )}

              {jobPositions.map((job) => (
                <option key={job.id} value={job.title} className="text-black">
                  {job.title}
                </option>
              ))}
            </select>
          </div>
          <div>
  <label className="mb-1 block text-sm font-medium text-slate-700">
    Language
  </label>

  <select
    name="language_id"
    value={form.language_id}
    onChange={handleChange}
    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
  >
    <option value="" className="text-black">
      Select Language
    </option>

    {languages.map((lang) => (
      <option key={lang.id} value={lang.id} className="text-black">
        {lang.name}
      </option>
    ))}
  </select>
</div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Experience
            </label>
            <input
              name="experience"
              placeholder="eg 2 Years"
              value={form.experience}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <label className="mb-1 block text-sm font-medium text-slate-700">
            Current CTC
          </label>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="current_ctc"
              placeholder="Current CTC"
              value={form.current_ctc}
              onChange={handleChange}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <input
              name="expected_ctc"
              placeholder="Expected CTC"
              value={form.expected_ctc}
              onChange={handleChange}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notice Period
            </label>
            <input
              name="notice_period"
              placeholder="Notice Period"
              value={form.notice_period}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Client */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Client
            </label>
            {clients.length ? (
              <select
                name="client_code"
                value={form.client_code}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.client_code}>
                    {c.client_code} — {c.company_name || "Unnamed client"}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="client_code"
                value={form.client_code}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              />
            )}
          </div>

          {/* Call Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Call Status
            </label>
            <select
              name="call_status_id"
              value={form.call_status_id}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" className="text-black">
                Select status
              </option>
              {callStatusList.map((s) => (
                <option key={s.id} value={s.id} className="text-black">
                  {s.id} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              name="interview_date"
              value={form.interview_date}
              onChange={handleChange}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <input
              type="time"
              name="interview_time"
              value={form.interview_time}
              onChange={handleChange}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Replace CV
            </label>

            {data?.cv_file && (
              <a
                href={`${BASE}${data.cv_file}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 text-sm underline block mb-2"
              >
                View Current CV
              </a>
            )}

            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={handleFile}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            {form.cv_file && (
              <p className="mt-1 text-xs text-emerald-600">
                Selected: {form.cv_file.name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Add Remarks
            </label>
            <input
              name="hr_remarks"
              placeholder="Remarks"
              value={form.hr_remarks}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              {loading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
