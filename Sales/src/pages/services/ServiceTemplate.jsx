import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api/axios";
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
  Check,
} from "lucide-react";

const toNumber = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value) =>
  `\u20B9${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* Mirrors the admin portal: a value >= 100 on a percentage plan is a legacy
   fixed rupee fee, so rows like "CTC_PERCENT / 5000" never render as "5000%". */
const resolvePricingModel = (service) => {
  const type = (service.pricing_type || "").toUpperCase();
  const value = toNumber(service.pricing_value);
  if (type === "FIXED" || value >= 100) return "FIXED";
  if (type === "CTC_PERCENT" || type === "DAYS_SALARY") return type;
  return "FIXED";
};

const MODEL_LABELS = {
  FIXED: "Fixed Package",
  CTC_PERCENT: "CTC Percentage",
  DAYS_SALARY: "Days of Salary",
};

const formatPrice = (value, rawType) => {
  if (value === null || value === undefined || value === "") return "\u2014";
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return String(value);
  const type = (rawType || "").toUpperCase();
  if (type === "CTC_PERCENT" && num < 100) return `${num}% of CTC`;
  if (type === "DAYS_SALARY" && num <= 90) return `${num} Days Salary`;
  return formatMoney(num);
};

/* payment_terms is free text in the DB: "7" -> "7 Days", "Net 30" stays as-is */
const formatPaymentTerms = (terms) => {
  if (terms === null || terms === undefined) return "\u2014";
  const text = String(terms).trim();
  if (!text) return "\u2014";
  return /^\d+(\.\d+)?$/.test(text) ? `${parseFloat(text)} Days` : text;
};

const formatReplacement = (months) => {
  const n = toNumber(months);
  if (!n) return "None";
  return `${n} ${n === 1 ? "Month" : "Months"}`;
};

const JUNK_DESCRIPTIONS = new Set([
  "no",
  "none",
  "n/a",
  "na",
  "null",
  "undefined",
  "false",
  "-",
  "0",
]);

export default function ServiceTemplate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const gst = 18;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await API.get("/sales/services");
        const data = res.data.find((s) => String(s.id) === String(id));
        if (!cancelled) setService(data || null);
      } catch (err) {
        console.error("Failed to fetch service:", err);
        if (!cancelled) toast.error("Failed to load service plan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const downloadPDF = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      toast.success("Preparing PDF proposal...");
      const res = await API.get(`/sales/services/pdf/${id}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${(service?.service_name || "service")
          .toLowerCase()
          .replace(/\s+/g, "-")}-plan-${service?.plan_name || id}.pdf`,
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 size={36} aria-hidden="true" className="animate-spin text-violet-600" />
        <p className="text-sm font-medium">Loading service plan details...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-gray-500">
          This service plan could not be found.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Services
        </button>
      </div>
    );
  }

  const rawType = (service.pricing_type || "").toUpperCase();
  const model = resolvePricingModel(service);
  const isFixed = model === "FIXED";
  const pricingValue = toNumber(service.pricing_value);
  const amount = toNumber(inputValue);

  let base = pricingValue;
  if (model === "CTC_PERCENT") base = (amount * pricingValue) / 100;
  if (model === "DAYS_SALARY") base = (amount / 30) * pricingValue;
  const gstAmount = (base * gst) / 100;
  const total = base + gstAmount;

  const mrp = toNumber(service.mrp);
  const hasMrp = mrp > 0;
  const hasDiscount = hasMrp && mrp > pricingValue;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - pricingValue) / mrp) * 100)
    : 0;

  const description = (service.description || "").trim();
  const hasDescription =
    description && !JUNK_DESCRIPTIONS.has(description.toLowerCase());

  const proposalDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-14">
      {/* TOP BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Services
        </button>

        <button
          type="button"
          onClick={downloadPDF}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          {downloading ? "Downloading..." : "Download PDF"}
        </button>
      </div>

      {/* 1. LIVE FEE ESTIMATOR */}
      <section
        aria-labelledby="plan-title"
        className="flex flex-col gap-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 id="plan-title" className="text-2xl font-bold text-gray-900">
                {service.service_name}
              </h1>
              <span className="rounded-lg bg-violet-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-violet-800">
                Plan {service.plan_name}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Pricing Model:{" "}
              <strong className="font-semibold text-gray-800">
                {MODEL_LABELS[model]}
              </strong>
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <Sparkles size={13} aria-hidden="true" />
            Live Fee Estimator
          </span>
        </div>

        {isFixed ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-xs font-medium text-slate-600">
            <Check size={14} aria-hidden="true" className="shrink-0 text-emerald-600" />
            <span>
              Fixed price package automatically calculated. No variable
              candidate inputs required.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
            <label
              htmlFor="fee-input"
              className="block text-xs font-bold uppercase tracking-wider text-violet-900"
            >
              {model === "CTC_PERCENT"
                ? "Candidate Annual CTC (\u20B9)"
                : "Candidate Monthly Salary (\u20B9)"}
            </label>
            <div className="relative">
              <IndianRupee
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500"
              />
              <input
                id="fee-input"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder={
                  model === "CTC_PERCENT"
                    ? "e.g. 600000 (Annual CTC)"
                    : "e.g. 40000 (Monthly Salary)"
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                aria-describedby="fee-hint"
                className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-4 text-sm font-medium text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <p id="fee-hint" className="text-[11px] font-medium text-violet-600">
              {model === "CTC_PERCENT"
                ? `Calculated at ${pricingValue}% of annual CTC.`
                : `Calculated as (${amount || 0} / 30) \u00D7 ${pricingValue} days of salary.`}
            </p>
          </div>
        )}

        <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Base Service Fee
            </dt>
            <dd className="mt-1 tabular-nums text-xl font-bold text-slate-900">
              {formatMoney(base)}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              GST ({gst}%)
            </dt>
            <dd className="mt-1 tabular-nums text-xl font-bold text-slate-900">
              {formatMoney(gstAmount)}
            </dd>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Grand Total
            </dt>
            <dd className="mt-1 tabular-nums text-2xl font-black text-emerald-700">
              {formatMoney(total)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 font-medium">
            <RotateCcw size={13} aria-hidden="true" className="text-violet-600" />
            Replacement:{" "}
            <strong className="text-gray-900">
              {formatReplacement(service.replacement_months)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 font-medium">
            <CreditCard size={13} aria-hidden="true" className="text-emerald-600" />
            Booking Token:{" "}
            <strong className="tabular-nums text-gray-900">
              {formatMoney(service.token_amount)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 font-medium">
            <Calendar size={13} aria-hidden="true" className="text-blue-600" />
            Payment Terms:{" "}
            <strong className="text-gray-900">
              {formatPaymentTerms(service.payment_terms)}
            </strong>
          </span>
        </div>
      </section>

      {/* 2. SHAREABLE CLIENT PROPOSAL */}
      <section
        id="static-template"
        aria-label="Client proposal"
        className="flex flex-col gap-6 rounded-[32px] border border-white/80 bg-gradient-to-br from-amber-50/70 via-emerald-50/60 to-violet-50/60 p-8 shadow-[0_16px_48px_rgba(91,33,182,0.08)] backdrop-blur-md sm:p-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200/50 pb-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/logo.jpeg"
              alt="Ardhnarishwar logo"
              className="h-12 w-12 rounded-2xl object-cover shadow-sm ring-2 ring-violet-500/20"
            />
            <div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-gray-900">
                ARDHNARISHWAR
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Premium HR &amp; Talent Solutions
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Proposal Date
            </span>
            <span className="tabular-nums text-sm font-semibold text-gray-700">
              {proposalDate}
            </span>
          </div>
        </div>

        <div>
          <span className="mb-1.5 inline-block rounded-md bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-800">
            Service Package
          </span>
          <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            {service.service_name} &mdash; Plan {service.plan_name}
          </h3>
        </div>

        <div className="rounded-2xl border border-gray-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-7">
          {hasMrp && (
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Standard MRP
              </span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-base font-semibold text-gray-400 line-through">
                  {formatPrice(service.mrp, rawType)}
                </span>
                {hasDiscount && (
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    Save {discountPercent}%
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
              <span className="block text-base font-bold text-gray-800">
                Exclusive Offer Price
              </span>
              <span className="text-xs font-medium text-gray-500">
                {isFixed
                  ? `Fixed package fee (exclusive of ${gst}% GST)`
                  : `Pricing model: ${MODEL_LABELS[model]}`}
              </span>
            </div>
            <span className="tabular-nums text-3xl font-black tracking-tight text-emerald-700 sm:text-4xl">
              {formatPrice(service.pricing_value, rawType)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-gray-200/50 bg-white/80 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <RotateCcw size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Replacement
              </span>
              <span className="mt-0.5 block text-sm font-bold text-gray-900">
                {formatReplacement(service.replacement_months)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200/50 bg-white/80 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CreditCard size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Booking Token
              </span>
              <span className="mt-0.5 block tabular-nums text-sm font-bold text-gray-900">
                {formatMoney(service.token_amount)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200/50 bg-white/80 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Calendar size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Payment Timeline
              </span>
              <span className="mt-0.5 block text-sm font-bold text-gray-900">
                {formatPaymentTerms(service.payment_terms)}
              </span>
            </div>
          </div>
        </div>

        {hasDescription && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-gray-200/60 bg-white/80 p-4 text-xs leading-relaxed text-gray-700 sm:p-5 sm:text-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-800">
              <FileCheck size={16} aria-hidden="true" className="text-violet-600" />
              Scope of Service &amp; Terms
            </div>
            <p className="pl-6 text-gray-600">{description}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200/60 pt-4 text-[11px] font-medium text-gray-500">
          <span>Official Service Proposal &middot; Ardhnarishwar HRMS</span>
          <span>Designed for premium client experience</span>
        </div>
      </section>
    </div>
  );
}
