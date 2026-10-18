import { useMemo, useState } from "react";
import CityAutocomplete from "./CityAutocomplete";
import StateAutocomplete from "./StateAutocomplete";
import BoardAutocomplete from "./BoardAutocomplete";
import SuggestField from "./SuggestField";
import DegreeField from "./DegreeField";
import { UNIVERSITIES, COLLEGES, SPECIALIZATIONS } from "./suggestData";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import {
  User,
  Phone,
  GraduationCap,
  Briefcase,
  Landmark,
  Siren,
  UsersRound,
  ImagePlus,
  PenLine,
  Loader2,
  Send,
  FileText,
  Upload,
  X,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

const createDefaultForm = () => ({
  fullName: "",
  fatherName: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  nationality: "Indian",

  mobile: "",
  altMobile: "",
  email: "",
  presentAddress: "",
  presentCity: "",
  presentState: "",
  presentPincode: "",

  qualification10: "",
  board10: "",
  year10: "",
  percent10: "",
  marksheet10: null,

  qualification12: "",
  board12: "",
  year12: "",
  percent12: "",
  marksheet12: null,

  degree_grad: "",
  university_grad: "",
  college_grad: "",
  specialization_grad: "",
  courseType_grad: "",
  startYear_grad: "",
  passingYear_grad: "",
  percent_grad: "",
  marksheet_grad: null,

  degree_pg: "",
  university_pg: "",
  college_pg: "",
  specialization_pg: "",
  courseType_pg: "",
  startYear_pg: "",
  passingYear_pg: "",
  percent_pg: "",
  marksheet_pg: null,

  experienceType: "",
  totalExperience: "",
  lastCompany: "",
  lastDesignation: "",
  lastSalary: "",

  accountHolder: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  branch: "",

  emergencyName: "",
  emergencyRelation: "",
  emergencyMobile: "",

  fatherOccupation: "",
  fatherMobile: "",
  motherName: "",
  motherOccupation: "",
  motherMobile: "",

  photo: null,
  signature: null,
});

const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  maxLength,
  inputMode,
  pattern,
}) => (
  <div className="flex flex-col">
    <label
      htmlFor={`nj-${name}`}
      className="mb-1.5 text-sm font-medium text-slate-600"
    >
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <input autoComplete="off"
      id={`nj-${name}`}
      name={name}
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={inputCls}
      maxLength={maxLength}
      inputMode={inputMode}
      pattern={pattern}
    />
  </div>
);

const Select = ({
  label,
  name,
  value,
  onChange,
  children,
  required = false,
}) => (
  <div className="flex flex-col">
    <label
      htmlFor={`nj-${name}`}
      className="mb-1.5 text-sm font-medium text-slate-600"
    >
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <select
      id={`nj-${name}`}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      className={inputCls}
    >
      {children}
    </select>
  </div>
);

const Textarea = ({ label, name, value, onChange, placeholder = "" }) => (
  <div className="flex flex-col md:col-span-2">
    <label
      htmlFor={`nj-${name}`}
      className="mb-1.5 text-sm font-medium text-slate-600"
    >
      {label}
    </label>
    <textarea autoComplete="off"
      id={`nj-${name}`}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      rows={3}
      className={`${inputCls} resize-y`}
    />
  </div>
);

const Card = ({
  step,
  title,
  subtitle,
  icon: Icon,
  accent = "violet",
  children,
}) => {
  const accentClasses = {
    violet: "from-violet-600 to-indigo-600",
    blue: "from-blue-600 to-cyan-600",
    emerald: "from-emerald-600 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
    slate: "from-slate-700 to-slate-900",
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 md:px-6">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
            accentClasses[accent] || accentClasses.violet
          } text-white shadow-lg`}
        >
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            Step {step}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
};

const PdfUpload = ({ label, name, value, onChange, required = false }) => (
  <div className="flex flex-col">
    <label className="mb-1.5 text-sm font-medium text-slate-600">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>

    <label
      htmlFor={`nj-${name}`}
      className="group flex min-h-[108px] cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-violet-300 hover:bg-violet-50/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <FileText size={22} />
      </div>

      <div className="min-w-0 flex-1">
        {value ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-800">
              {value.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {(value.size / 1024 / 1024).toFixed(2)} MB · PDF selected
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600">
              <Upload size={13} />
              Replace PDF
            </span>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">
              Upload PDF document
            </p>
            <p className="mt-1 text-xs text-slate-500">
              PDF only · Maximum 5 MB
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600">
              <Upload size={13} />
              Choose PDF
            </span>
          </>
        )}
      </div>
    </label>

    <input autoComplete="off"
      id={`nj-${name}`}
      name={name}
      type="file"
      accept="application/pdf,.pdf"
      className="hidden"
      onChange={onChange}
    />
  </div>
);

const ImageUpload = ({
  label,
  preview,
  onChange,
  accept = "image/*",
  signature = false,
}) => (
  <div className="flex flex-col">
    <label className="mb-1.5 text-sm font-medium text-slate-600">
      {label}
    </label>

    <label className="group relative flex min-h-[170px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-violet-300 hover:bg-violet-50/40">
      {preview ? (
        <img
          src={preview}
          alt={label}
          className={`max-h-40 max-w-full object-contain ${
            signature ? "p-4" : ""
          }`}
        />
      ) : (
        <div className="flex flex-col items-center text-center">
          {signature ? (
            <PenLine className="mb-2 text-violet-500" size={30} />
          ) : (
            <ImagePlus className="mb-2 text-violet-500" size={30} />
          )}
          <p className="text-sm font-semibold text-slate-700">
            Upload {label}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG or WEBP · Maximum 5 MB
          </p>
        </div>
      )}
      <input autoComplete="off"
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
    </label>
  </div>
);

export default function NewJoining() {
  const [form, setForm] = useState(createDefaultForm);
  const [imagePreview, setImagePreview] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPdfCount = useMemo(
    () =>
      [
        form.marksheet10,
        form.marksheet12,
        form.marksheet_grad,
        form.marksheet_pg,
      ].filter(Boolean).length,
    [form]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDecimalChange = (e) => {
    const { name } = e.target;
    let v = e.target.value.replace(/[^0-9.]/g, "");
    const i = v.indexOf(".");
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 2);
    if (v !== "" && v !== "." && parseFloat(v) > 100) v = v.slice(0, -1);
    setForm((f) => ({ ...f, [name]: v }));
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({
      ...prev,
      [name]: digitsOnly,
    }));
  };

  const handlePdfChange = (field) => (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      toast.error("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("PDF size must be 5 MB or less.");
      e.target.value = "";
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be 5 MB or less.");
      e.target.value = "";
      return;
    }

    setForm((prev) => ({
      ...prev,
      photo: file,
    }));

    setImagePreview(URL.createObjectURL(file));
  };

  const handleSignature = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file for signature.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Signature size must be 5 MB or less.");
      e.target.value = "";
      return;
    }

    setForm((prev) => ({
      ...prev,
      signature: file,
    }));

    setSignaturePreview(URL.createObjectURL(file));
  };

  const validateForm = () => {
    if (!form.fullName.trim()) {
      toast.error("Full name is required.");
      return false;
    }

    if (!form.mobile.trim()) {
      toast.error("Mobile number is required.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (form.mobile.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const token = localStorage.getItem("hrms_hr_Token");
      const BASE = import.meta.env.VITE_API_BASE_URL;

      if (!BASE) {
        toast.error("VITE_API_BASE_URL is not configured.");
        return;
      }

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          formData.append(key, value);
        }
      });

      await axios.post("/hr/joining/create", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Joining form submitted successfully.");

      setForm(createDefaultForm());
      setImagePreview("");
      setSignaturePreview("");
    } catch (error) {
      console.error("New joining submission error:", error);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to submit joining form.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(createDefaultForm());
    setImagePreview("");
    setSignaturePreview("");
    toast.success("Form cleared.");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          icon={GraduationCap}
          title="New Joining Form"
          subtitle="Complete employee onboarding details including personal, education, employment, bank, emergency and family information."
        >
          <span className="hr-chip">Education PDFs: {selectedPdfCount}/4</span>
          <span className="hr-chip">Secure multipart upload</span>
        </PageHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
          <Card
            step="01"
            title="Basic Details"
            subtitle="Employee personal information"
            icon={User}
            accent="violet"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Full Name"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
              <Input
                label="Father Name"
                name="fatherName"
                value={form.fatherName}
                onChange={handleChange}
              />
              <Input
                label="Date of Birth"
                name="dob"
                type="date"
                value={form.dob}
                onChange={handleChange}
              />

              <Select
                label="Gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>

              <Select
                label="Marital Status"
                name="maritalStatus"
                value={form.maritalStatus}
                onChange={handleChange}
              >
                <option value="">Select Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </Select>

              <Select
                label="Blood Group"
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleChange}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </Select>

              <Input
                label="Nationality"
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
              />
            </div>
          </Card>

          <Card
            step="02"
            title="Contact Details"
            subtitle="Contact and present address"
            icon={Phone}
            accent="blue"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Mobile Number"
                name="mobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={form.mobile}
                onChange={handlePhoneChange}
                required
              />
              <Input
                label="Alternate Mobile"
                name="altMobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={form.altMobile}
                onChange={handlePhoneChange}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />

              <Textarea
                label="Present Address"
                name="presentAddress"
                value={form.presentAddress}
                onChange={handleChange}
              />

              <CityAutocomplete
                label="City"
                name="presentCity"
                value={form.presentCity}
                inputClassName={inputCls}
                onTextChange={(v) => setForm((f) => ({ ...f, presentCity: v }))}
                onSelect={(city, state) => setForm((f) => ({ ...f, presentCity: city, presentState: state }))}
              />
              <StateAutocomplete
                label="State"
                name="presentState"
                value={form.presentState}
                inputClassName={inputCls}
                onTextChange={(v) => setForm((f) => ({ ...f, presentState: v }))}
                onSelect={(st) => setForm((f) => ({ ...f, presentState: st }))}
              />
              <Input
                label="Pincode"
                name="presentPincode"
                value={form.presentPincode}
                onChange={handleChange}
              />
            </div>
          </Card>

          <Card
            step="03"
            title="Education Details"
            subtitle="10th, 12th, Graduation and Post-Graduation"
            icon={GraduationCap}
            accent="emerald"
          >
            <div className="space-y-7">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <span className="text-sm font-bold">10</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      10th / Secondary
                    </h3>
                    <p className="text-xs text-slate-500">
                      School and board details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="School Name"
                    name="qualification10"
                    value={form.qualification10}
                    onChange={handleChange}
                  />
                  <BoardAutocomplete
                    label="Board"
                    name="board10"
                    value={form.board10}
                    inputClassName={inputCls}
                    onTextChange={(v) => setForm((f) => ({ ...f, board10: v }))}
                    onSelect={(b) => setForm((f) => ({ ...f, board10: b }))}
                  />
                  <Input
                    label="Passing Year"
                    name="year10"
                    type="number"
                    value={form.year10}
                    onChange={handleChange}
                  />
                  <Input
                    label="Percentage / CGPA"
                    name="percent10"
                    value={form.percent10}
                    onChange={handleDecimalChange}
                    inputMode="decimal"
                  />
                  <div className="md:col-span-2 lg:col-span-4">
                    <PdfUpload
                      label="10th Marksheet / Certificate"
                      name="marksheet10"
                      value={form.marksheet10}
                      onChange={handlePdfChange("marksheet10")}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <span className="text-sm font-bold">12</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      12th / Senior Secondary
                    </h3>
                    <p className="text-xs text-slate-500">
                      School and board details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="School Name"
                    name="qualification12"
                    value={form.qualification12}
                    onChange={handleChange}
                  />
                  <BoardAutocomplete
                    label="Board"
                    name="board12"
                    value={form.board12}
                    inputClassName={inputCls}
                    onTextChange={(v) => setForm((f) => ({ ...f, board12: v }))}
                    onSelect={(b) => setForm((f) => ({ ...f, board12: b }))}
                  />
                  <Input
                    label="Passing Year"
                    name="year12"
                    type="number"
                    value={form.year12}
                    onChange={handleChange}
                  />
                  <Input
                    label="Percentage / CGPA"
                    name="percent12"
                    value={form.percent12}
                    onChange={handleDecimalChange}
                    inputMode="decimal"
                  />
                  <div className="md:col-span-2 lg:col-span-4">
                    <PdfUpload
                      label="12th Marksheet / Certificate"
                      name="marksheet12"
                      value={form.marksheet12}
                      onChange={handlePdfChange("marksheet12")}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Graduation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bachelor degree details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <DegreeField
                    Select={Select}
                    label="Degree"
                    name="degree_grad"
                    value={form.degree_grad}
                    level="ug"
                    inputClassName={inputCls}
                    onSelect={(v) => setForm((f) => ({ ...f, degree_grad: v }))}
                  />

                  <SuggestField
                    label="University / Institution Name"
                    name="university_grad"
                    value={form.university_grad}
                    baseOptions={UNIVERSITIES}
                    extraType="university"
                    placeholder="Type university name"
                    inputClassName={inputCls}
                    onChange={(v) => setForm((f) => ({ ...f, university_grad: v }))}
                  />

                  <SuggestField
                    label="College Name"
                    name="college_grad"
                    value={form.college_grad}
                    baseOptions={COLLEGES}
                    extraType="college"
                    placeholder="Type college name"
                    inputClassName={inputCls}
                    onChange={(v) => setForm((f) => ({ ...f, college_grad: v }))}
                  />

                  <SuggestField
                    label="Specialization / Branch"
                    name="specialization_grad"
                    value={form.specialization_grad}
                    baseOptions={SPECIALIZATIONS}
                    extraType="specialization"
                    placeholder="Type specialization"
                    inputClassName={inputCls}
                    onChange={(v) => setForm((f) => ({ ...f, specialization_grad: v }))}
                  />

                  <Select
                    label="Course Type"
                    name="courseType_grad"
                    value={form.courseType_grad}
                    onChange={handleChange}
                  >
                    <option value="">Select Course Type</option>
                    <option value="Regular">Regular</option>
                    <option value="Distance">Distance</option>
                    <option value="Online">Online</option>
                  </Select>

                  <Input
                    label="Start Year"
                    name="startYear_grad"
                    type="number"
                    value={form.startYear_grad}
                    onChange={handleChange}
                  />

                  <Input
                    label="Passing Year"
                    name="passingYear_grad"
                    type="number"
                    value={form.passingYear_grad}
                    onChange={handleChange}
                  />

                  <Input
                    label="Percentage / CGPA"
                    name="percent_grad"
                    value={form.percent_grad}
                    onChange={handleDecimalChange}
                    inputMode="decimal"
                  />

                  <div className="md:col-span-2 lg:col-span-4">
                    <PdfUpload
                      label="Graduation Marksheet / Certificate"
                      name="marksheet_grad"
                      value={form.marksheet_grad}
                      onChange={handlePdfChange("marksheet_grad")}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Post-Graduation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Master degree details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <DegreeField
                    Select={Select}
                    label="Degree"
                    name="degree_pg"
                    value={form.degree_pg}
                    level="pg"
                    inputClassName={inputCls}
                    onSelect={(v) => setForm((f) => ({ ...f, degree_pg: v }))}
                  />

                  <SuggestField
                    label="University / Institution Name"
                    name="university_pg"
                    value={form.university_pg}
                    baseOptions={UNIVERSITIES}
                    extraType="university"
                    placeholder="Type university name"
                    inputClassName={inputCls}
                    onChange={(v) => setForm((f) => ({ ...f, university_pg: v }))}
                  />

                  <SuggestField
                    label="College Name"
                    name="college_pg"
                    value={form.college_pg}
                    baseOptions={COLLEGES}
                    extraType="college"
                    placeholder="Type college name"
                    inputClassName={inputCls}
                    onChange={(v) => setForm((f) => ({ ...f, college_pg: v }))}
                  />

                  <SuggestField
                    label="Specialization"
                    name="specialization_pg"
                    value={form.specialization_pg}
                    baseOptions={SPECIALIZATIONS}
                    extraType="specialization"
                    placeholder="Type specialization"
                    inputClassName={inputCls}
                    onChange={(v) => setForm((f) => ({ ...f, specialization_pg: v }))}
                  />

                  <Select
                    label="Course Type"
                    name="courseType_pg"
                    value={form.courseType_pg}
                    onChange={handleChange}
                  >
                    <option value="">Select Course Type</option>
                    <option value="Regular">Regular</option>
                    <option value="Distance">Distance</option>
                    <option value="Online">Online</option>
                  </Select>

                  <Input
                    label="Start Year"
                    name="startYear_pg"
                    type="number"
                    value={form.startYear_pg}
                    onChange={handleChange}
                  />

                  <Input
                    label="Passing Year"
                    name="passingYear_pg"
                    type="number"
                    value={form.passingYear_pg}
                    onChange={handleChange}
                  />

                  <Input
                    label="Percentage / CGPA"
                    name="percent_pg"
                    value={form.percent_pg}
                    onChange={handleDecimalChange}
                    inputMode="decimal"
                  />

                  <div className="md:col-span-2 lg:col-span-4">
                    <PdfUpload
                      label="Post-Graduation Marksheet / Certificate"
                      name="marksheet_pg"
                      value={form.marksheet_pg}
                      onChange={handlePdfChange("marksheet_pg")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            step="04"
            title="Employment Details"
            subtitle="Previous employment information"
            icon={Briefcase}
            accent="amber"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Experience Type"
                name="experienceType"
                value={form.experienceType}
                onChange={handleChange}
              >
                <option value="">Select Experience</option>
                <option value="Fresher">Fresher</option>
                <option value="Experienced">Experienced</option>
              </Select>

              <Input
                label="Total Experience"
                name="totalExperience"
                value={form.totalExperience}
                onChange={handleChange}
                placeholder="e.g. 2 Years 6 Months"
              />

              <Input
                label="Last Company"
                name="lastCompany"
                value={form.lastCompany}
                onChange={handleChange}
              />

              <Input
                label="Last Designation"
                name="lastDesignation"
                value={form.lastDesignation}
                onChange={handleChange}
              />

              <Input
                label="Last Salary"
                name="lastSalary"
                value={form.lastSalary}
                inputMode="decimal"
                placeholder="e.g. 25000"
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = v.split(".");
                  let intPart = parts[0].replace(/^0+(?=\d)/, "").slice(0, 7);
                  let out = intPart;
                  if (parts.length > 1) {
                    out += "." + parts.slice(1).join("").slice(0, 2);
                  }
                  handleChange({ target: { name: "lastSalary", value: out } });
                }}
              />
            </div>
          </Card>

          <Card
            step="05"
            title="Bank Details"
            subtitle="Salary account information"
            icon={Landmark}
            accent="blue"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Account Holder Name"
                name="accountHolder"
                value={form.accountHolder}
                onChange={handleChange}
              />
              <Input
                label="Bank Name"
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
              />
              <Input
                label="Account Number"
                name="accountNumber"
                value={form.accountNumber}
                inputMode="numeric"
                placeholder="9 to 18 digits"
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 18);
                  handleChange({ target: { name: "accountNumber", value: v } });
                }}
              />
              <Input
                label="IFSC Code"
                name="ifsc"
                value={form.ifsc}
                placeholder="e.g. SBIN0001234"
                onChange={async (e) => {
                  const v = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 11);
                  handleChange({ target: { name: "ifsc", value: v } });
                  if (v.length === 11) {
                    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) {
                      window.alert("Invalid IFSC format. Example: SBIN0001234");
                      return;
                    }
                    try {
                      const r = await fetch("https://ifsc.razorpay.com/" + v);
                      if (!r.ok) {
                        window.alert("IFSC code not found. Please check it.");
                        return;
                      }
                      const d = await r.json();
                      setForm((prev) => ({
                        ...prev,
                        bankName: d.BANK || prev.bankName,
                        branch: d.BRANCH || prev.branch,
                      }));
                    } catch (err) {
                      console.error("IFSC lookup failed", err);
                    }
                  }
                }}
              />
              <Input
                label="Branch"
                name="branch"
                value={form.branch}
                onChange={handleChange}
              />
            </div>
          </Card>

          <Card
            step="06"
            title="Emergency Contact"
            subtitle="Emergency contact person"
            icon={Siren}
            accent="rose"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Emergency Contact Name"
                name="emergencyName"
                value={form.emergencyName}
                onChange={handleChange}
              />
              <Input
                label="Relationship"
                name="emergencyRelation"
                value={form.emergencyRelation}
                onChange={handleChange}
              />
              <Input
                label="Mobile Number"
                name="emergencyMobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={form.emergencyMobile}
                onChange={handlePhoneChange}
              />
            </div>
          </Card>

          <Card
            step="07"
            title="Family Details"
            subtitle="Parent and family information"
            icon={UsersRound}
            accent="violet"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Father Occupation"
                name="fatherOccupation"
                value={form.fatherOccupation}
                onChange={handleChange}
              />
              <Input
                label="Father Mobile"
                name="fatherMobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={form.fatherMobile}
                onChange={handlePhoneChange}
              />
              <Input
                label="Mother Name"
                name="motherName"
                value={form.motherName}
                onChange={handleChange}
              />
              <Input
                label="Mother Occupation"
                name="motherOccupation"
                value={form.motherOccupation}
                onChange={handleChange}
              />
              <Input
                label="Mother Mobile"
                name="motherMobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={form.motherMobile}
                onChange={handlePhoneChange}
              />
            </div>
          </Card>

          <Card
            step="08"
            title="Photo & Signature"
            subtitle="Employee identification documents"
            icon={ImagePlus}
            accent="slate"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <ImageUpload
                label="Employee Photo"
                preview={imagePreview}
                onChange={handleImage}
              />
              <ImageUpload
                label="Employee Signature"
                preview={signaturePreview}
                onChange={handleSignature}
                signature
              />
            </div>
          </Card>

          <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="px-2 text-xs text-slate-500">
              Please verify all details and uploaded documents before
              submitting.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={17} />
                Clear
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Submit Joining
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
