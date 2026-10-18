import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import toast from "react-hot-toast";
import { 
  ArrowLeft, 
  Download, 
  Loader2, 
  IndianRupee, 
  Calendar, 
  RotateCcw, 
  CreditCard, 
  Sparkles,
  FileCheck,
  Edit3,
  X,
  Check,
  Percent,
  Clock
} from "lucide-react";

export default function ServiceTemplate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [service, setService] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gst] = useState(18);

  const [result, setResult] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    service_name: "",
    plan_name: "",
    pricing_type: "FIXED",
    pricing_value: "",
    mrp: "",
    replacement_months: "",
    token_amount: "",
    payment_terms: "",
    description: "",
  });

  const fetchService = async () => {
    try {
      const res = await API.get("/super-admin/services");
      const data = res.data.find((s) => String(s.id) === String(id));
      if (data) {
        setService(data);
        setEditForm({
          service_name: data.service_name || "",
          plan_name: data.plan_name || "",
          pricing_type: (data.pricing_type || "FIXED").toUpperCase(),
          pricing_value: data.pricing_value ?? "",
          mrp: data.mrp ?? "",
          replacement_months: data.replacement_months ?? "",
          token_amount: data.token_amount ?? "",
          payment_terms: data.payment_terms ?? "",
          description: data.description || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch service:", err);
      toast.error("Failed to load service details");
    }
  };

  useEffect(() => {
    fetchService();
  }, [id]);

  useEffect(() => {
    if (!service) return;

    let value = 0;
    const type = (service.pricing_type || "").toUpperCase();
    const pVal = parseFloat(service.pricing_value) || 0;

    // If it's a fixed plan or value is an absolute rupee amount (>= 100)
    if (type === "FIXED" || pVal >= 100) {
      value = pVal;
    } else if (type === "CTC_PERCENT") {
      const numInput = parseFloat(inputValue) || 0;
      value = (numInput * pVal) / 100;
    } else if (type === "DAYS_SALARY") {
      const numInput = parseFloat(inputValue) || 0;
      value = (numInput / 30) * pVal;
    } else {
      value = pVal;
    }

    setResult(value);
    setFinalAmount(value + (value * gst) / 100);
  }, [inputValue, service, gst]);

  const downloadPDF = async () => {
    if (downloading) return;

    try {
      setDownloading(true);
      toast.success("Preparing PDF proposal...");
      const res = await API.get(`/super-admin/services/pdf/${id}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${(service?.service_name || "service").toLowerCase().replace(/\s+/g, "-")}-plan-${service?.plan_name || id}.pdf`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download complete");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download PDF proposal");
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (savingEdit) return;

    try {
      setSavingEdit(true);
      await API.put(`/super-admin/services/${id}`, {
        ...editForm,
        pricing_value: parseFloat(editForm.pricing_value) || 0,
        mrp: parseFloat(editForm.mrp) || 0,
        replacement_months: parseInt(editForm.replacement_months) || 0,
        token_amount: parseFloat(editForm.token_amount) || 0,
      });

      toast.success("Service plan updated successfully");
      setIsEditOpen(false);
      await fetchService();
    } catch (err) {
      console.error("Failed to update service:", err);
      toast.error(err?.response?.data?.message || "Failed to update service");
    } finally {
      setSavingEdit(false);
    }
  };

  // Robust price formatting helper
  const formatPrice = (val, pricingType) => {
    if (val === null || val === undefined || val === "") return "—";
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);

    const type = (pricingType || "").toUpperCase();

    // Only display percentage if model is CTC_PERCENT and value is a realistic percent (< 100)
    if (type === "CTC_PERCENT" && num < 100) {
      return `${num}% of CTC`;
    }

    // Only display days salary if model is DAYS_SALARY and value is reasonable (< 90)
    if (type === "DAYS_SALARY" && num <= 90) {
      return `${num} Days Salary`;
    }

    // Standard INR Currency format
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-sm font-medium">Loading service plan details...</p>
      </div>
    );
  }

  const rawPricingType = (service.pricing_type || "").toUpperCase();
  const pricingValNum = parseFloat(service.pricing_value) || 0;
  const isFixed = rawPricingType === "FIXED" || pricingValNum >= 100;
  const mrpNum = parseFloat(service.mrp) || 0;
  const hasMrp = mrpNum > 0;
  const hasDiscount = hasMrp && mrpNum > pricingValNum;
  const discountAmount = hasDiscount ? mrpNum - pricingValNum : 0;
  const discountPercent = hasDiscount ? Math.round((discountAmount / mrpNum) * 100) : 0;

  const desc = (service.description || "").trim();
  const hasValidDescription =
    desc &&
    !["no", "none", "n/a", "na", "null", "undefined", "false", "-", "0"].includes(
      desc.toLowerCase()
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-14">
      {/* TOP NAVIGATION & ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm font-semibold shadow-sm transition"
        >
          <ArrowLeft size={16} />
          Back to Services
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 text-sm font-semibold shadow-sm transition"
          >
            <Edit3 size={15} />
            Edit Plan
          </button>

          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold shadow-sm transition hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? "Downloading..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* 1. INTERACTIVE FEE CALCULATOR CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900">
                {service.service_name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-violet-100 text-violet-800">
                Plan {service.plan_name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pricing Model: <strong className="text-gray-800 font-semibold">{isFixed ? "Fixed Package" : rawPricingType.replace("_", " ")}</strong>
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <Sparkles size={13} />
            Live Fee Estimator
          </span>
        </div>

        {/* INPUT SECTION FOR DYNAMIC VARIABLE PRICING */}
        {!isFixed ? (
          <div className="bg-violet-50/50 p-4 sm:p-5 rounded-2xl border border-violet-100 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-violet-900">
              {rawPricingType === "CTC_PERCENT"
                ? "Candidate Annual CTC (₹)"
                : "Candidate Monthly Salary (₹)"}
            </label>
            <div className="relative">
              <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500" />
              <input
                type="number"
                min="0"
                placeholder={
                  rawPricingType === "CTC_PERCENT"
                    ? "e.g. 600000 (Annual CTC)"
                    : "e.g. 40000 (Monthly Salary)"
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-violet-200 bg-white rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition shadow-sm"
              />
            </div>
            <p className="text-[11px] text-violet-600 font-medium">
              {rawPricingType === "CTC_PERCENT"
                ? `Calculated at ${service.pricing_value}% of annual CTC.`
                : `Calculated as (${inputValue || 0} / 30) × ${service.pricing_value} Days Salary.`}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-600 font-medium">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <span>Fixed price package automatically calculated. No variable candidate inputs required.</span>
          </div>
        )}

        {/* BREAKDOWN KPI TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Base Service Fee
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
              ₹{result.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              GST ({gst}%)
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
              ₹{((result * gst) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 block">
              Grand Total
            </span>
            <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">
              ₹{finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* PLAN PARAMETERS PILLS */}
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 font-medium">
            <RotateCcw size={13} className="text-violet-600" />
            Replacement: <strong className="text-gray-900">{service.replacement_months} months</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 font-medium">
            <CreditCard size={13} className="text-emerald-600" />
            Booking Token: <strong className="text-gray-900 font-mono">₹{Number(service.token_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 font-medium">
            <Calendar size={13} className="text-blue-600" />
            Payment Terms: <strong className="text-gray-900">{service.payment_terms} {/^\d+$/.test(String(service.payment_terms).trim()) ? "days" : ""}</strong>
          </span>
        </div>
      </div>

      {/* 2. OFFICIAL SHAREABLE CLIENT PROPOSAL CARD */}
      <div
        id="static-template"
        className="rounded-[32px] p-8 sm:p-10 bg-gradient-to-br from-amber-50/70 via-emerald-50/60 to-violet-50/60 shadow-[0_16px_48px_rgba(91,33,182,0.08)] border border-white/80 backdrop-blur-md space-y-6"
      >
        {/* BRAND HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-200/50">
          <div className="flex items-center gap-3.5">
            <img
              src="/ardhnarishwar-logo.jpg"
              alt="Ardhnarishwar Logo"
              className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-violet-500/20"
            />
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                ARDHNARISHWAR
              </h2>
              <p className="text-xs font-semibold text-violet-700 tracking-wide uppercase">
                Premium HR & Talent Solutions
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Proposal Date</span>
            <span className="text-sm font-semibold text-gray-700 font-mono">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* PLAN TITLE */}
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            Service Package
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {service.service_name} — Plan {service.plan_name}
          </h3>
        </div>

        {/* CLEAN PRICE BLOCK (ACCURATE CURRENCY FORMAT, NO 50000% BUG) */}
        <div className="bg-white/90 backdrop-blur-md p-6 sm:p-7 rounded-2xl shadow-sm border border-gray-200/60">
          {/* MRP ROW WITH SAVINGS BADGE */}
          {hasMrp && (
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                Standard MRP
              </span>
              <div className="flex items-center gap-2">
                <span className="line-through text-gray-400 font-semibold font-mono text-base">
                  {formatPrice(service.mrp, rawPricingType)}
                </span>
                {hasDiscount && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    Save {discountPercent}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* EXCLUSIVE OFFER PRICE */}
          <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
            <div>
              <span className="text-gray-800 font-bold text-base block">
                Exclusive Offer Price
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {isFixed ? "Fixed package fee (exclusive of 18% GST)" : `Pricing model: ${rawPricingType.replace("_", " ")}`}
              </span>
            </div>
            <span className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tracking-tight">
              {formatPrice(service.pricing_value, rawPricingType)}
            </span>
          </div>
        </div>

        {/* POLICY TERMS TILES WITH CRISP LUCIDE ICONS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-sm">
          <div className="p-4 bg-white/80 rounded-2xl border border-gray-200/50 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 text-violet-700">
              <RotateCcw size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Replacement</span>
              <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                {service.replacement_months} {Number(service.replacement_months) === 1 ? "Month" : "Months"}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-2xl border border-gray-200/50 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
              <CreditCard size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Booking Token</span>
              <span className="text-sm font-bold text-gray-900 font-mono mt-0.5 block">
                ₹{Number(service.token_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-2xl border border-gray-200/50 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-700">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Payment Timeline</span>
              <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                {service.payment_terms} {/^\d+$/.test(String(service.payment_terms).trim()) ? "Days" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* VALID DESCRIPTION BOX */}
        {hasValidDescription && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-gray-200/60 text-gray-700 text-xs sm:text-sm leading-relaxed space-y-1.5">
            <div className="font-bold text-gray-900 uppercase tracking-wider text-xs flex items-center gap-2 text-violet-800">
              <FileCheck size={16} className="text-violet-600" />
              Scope of Service & Terms
            </div>
            <p className="text-gray-600 pl-6">
              {desc}
            </p>
          </div>
        )}

        {/* FOOTER */}
        <div className="pt-4 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 font-medium">
          <span>Official Service Proposal · Ardhnarishwar HRMS</span>
          <span>Designed for premium client experience</span>
        </div>
      </div>

      {/* 3. EDIT PLAN MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Service Plan</h3>
                <p className="text-xs text-gray-500">Update pricing, model, and proposal terms</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Service Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.service_name}
                    onChange={(e) => setEditForm({ ...editForm, service_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.plan_name}
                    onChange={(e) => setEditForm({ ...editForm, plan_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Pricing Model
                  </label>
                  <select
                    value={editForm.pricing_type}
                    onChange={(e) => setEditForm({ ...editForm, pricing_type: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none bg-white"
                  >
                    <option value="FIXED">Fixed Price (₹)</option>
                    <option value="CTC_PERCENT">CTC %</option>
                    <option value="DAYS_SALARY">Days Salary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Offer Price / Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editForm.pricing_value}
                    onChange={(e) => setEditForm({ ...editForm, pricing_value: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Standard MRP
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.mrp}
                    onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Replacement
                  </label>
                  <input
                    type="number"
                    value={editForm.replacement_months}
                    onChange={(e) => setEditForm({ ...editForm, replacement_months: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Token (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.token_amount}
                    onChange={(e) => setEditForm({ ...editForm, token_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Payment Timeline (e.g. 7 days)
                </label>
                <input
                  type="text"
                  value={editForm.payment_terms}
                  onChange={(e) => setEditForm({ ...editForm, payment_terms: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Plan Description & Scope
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
