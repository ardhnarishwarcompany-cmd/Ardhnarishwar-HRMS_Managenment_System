import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { X } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export default function AddInterviewModal({
  open,
  onClose,
  onSuccess,
  locations = [],
  defaultData,
}) {
  const [form, setForm] = useState({
    lead_id: "",
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
  const token = localStorage.getItem("hrms_hr_Token");
  const [languages, setLanguages] = useState([]);
  const [fetchedLocations, setFetchedLocations] = useState([]);
  const [clients, setClients] = useState([]);
  const BASE = import.meta.env.VITE_API_BASE_URL;

  // Use locations from props if provided, otherwise fall back to self-fetched
  const locationOptions = locations?.length ? locations : fetchedLocations;

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

  const fetchLanguages = async () => {
    const res = await axios.get(`${BASE}/hr/interviews/languages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setLanguages(res.data.data);
  };

  useEffect(() => {
    fetchLanguages();
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

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${BASE}/hr/interviews/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFetchedLocations(res?.data?.data || []);
    } catch (err) {
      console.log("Location fetch error:", err);
    }
  };

  useEffect(() => {
    // Self-fetch locations when the parent didn't pass any
    if (!locations?.length) {
      fetchLocations();
    }
  }, [locations]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setForm((p) => ({ ...p, [name]: digitsOnly }));
  };

  useEffect(() => {
    if (defaultData) {
      setForm((prev) => ({
        ...prev,
        lead_id: defaultData.id || "",
        candidate_name: defaultData.name || "",
        candidate_phone: defaultData.phone || "",
      }));
    }
  }, [defaultData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.candidate_name ||
      !form.candidate_phone ||
      !form.client_code ||
      !form.job_profile
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        if (form[key] !== null) {
          formData.append(key, form[key]);
        }
      });

      await axios.post(`${BASE}/hr/interviews`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Interview created successfully");

      onClose();
      onSuccess?.();

      setForm({
        lead_id: "",
        candidate_name: "",
        candidate_phone: "",
        location: "",
        client_code: "",
        call_status_id: "",
        interview_date: "",
        interview_time: "",
        cv_file: null,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
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

  const fetchJobPositions = async () => {
    try {
      const res = await axios.get(`${BASE}/super-admin/job-positions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setJobPositions(res.data.data); // [{id, title}]
    } catch (err) {
      console.error("Job positions fetch error:", err);
    }
  };

  useEffect(() => {
    fetchJobPositions();
  }, []);

  if (!open) return null;

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
                Add Interview
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-6">
          {/* Candidate Name */}
          <div>
            <label className={labelCls}>
              Candidate Name <span className="text-rose-500">*</span>
            </label>
            <input
              name="candidate_name"
              value={form.candidate_name}
              onChange={handleChange}
              placeholder="Enter candidate name"
              className={inputCls}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              name="candidate_phone"
              type="tel"
              value={form.candidate_phone}
              onChange={handlePhoneChange}
              placeholder="Enter phone number"
              className={inputCls}
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelCls}>
              Location <span className="text-rose-500">*</span>
            </label>

            <select
              name="location"
              value={form.location}
              onChange={handleChange}
              className={inputCls}
              required
            >
              <option value="">Select Location</option>

              {locationOptions.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Address <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              className={inputCls}
              placeholder="Enter address"
              required
            />
          </div>

          {/* Client */}
          <div>
            <label className={labelCls}>
              Client <span className="text-rose-500">*</span>
            </label>
            {clients.length ? (
              <select
                name="client_code"
                value={form.client_code}
                onChange={handleChange}
                className={inputCls}
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
                placeholder="Enter client code (e.g. C1001)"
                className={inputCls}
                required
              />
            )}
            <p className="mt-1 text-xs text-slate-400">
              The interview appears in this client&apos;s Interview Tracker once the
              call status is set to INTERVIEW SCHEDULED.
            </p>
          </div>

          <div>
            <label className={labelCls}>
              Call Status <span className="text-rose-500">*</span>
            </label>

            <select
              name="call_status_id"
              value={form.call_status_id}
              onChange={handleChange}
              className={inputCls}
              required
            >
              <option value="">Select status</option>
              {callStatusList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Job Profile <span className="text-rose-500">*</span>
            </label>
            <select
              name="job_profile"
              value={form.job_profile}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="">Select Job Profile</option>

              {jobPositions.map((job) => (
                <option key={job.id} value={job.title}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Language</label>
            <select
              name="language_id"
              value={form.language_id}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="">Select Language</option>

              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Experience</label>
            <input
              name="experience"
              placeholder="eg 2 Years"
              value={form.experience}
              onChange={handleChange}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Current Salary <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="current_ctc"
                placeholder="Current CTC"
                value={form.current_ctc}
                onChange={handleChange}
                className={inputCls}
                required
              />

              <input
                name="expected_ctc"
                placeholder="Expected CTC"
                value={form.expected_ctc}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notice Period</label>
            <input
              name="notice_period"
              placeholder="Notice Period"
              value={form.notice_period}
              onChange={handleChange}
              className={inputCls}
            />
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Interview Date</label>
              <input
                type="date"
                name="interview_date"
                value={form.interview_date}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Interview Time</label>
              <input
                type="time"
                name="interview_time"
                value={form.interview_time}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Upload CV</label>

            <input
              type="file"
              name="cv_file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={handleFile}
              className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-indigo-600`}
            />

            {form.cv_file && (
              <p className="mt-1 text-xs text-emerald-600">
                Selected: {form.cv_file.name}
              </p>
            )}

            <p className="mt-1 text-xs text-slate-400">
              Allowed: PDF, DOC, DOCX, Image (Max 5MB)
            </p>
          </div>
          <div>
            <label className={labelCls}>Add Remarks</label>
            <textarea
              name="hr_remarks"
              value={form.hr_remarks}
              onChange={handleChange}
              className={inputCls}
              placeholder="Enter remarks"
            />
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
