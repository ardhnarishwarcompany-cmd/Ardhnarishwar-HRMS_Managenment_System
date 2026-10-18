import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, LogIn, LogOut, Loader2, MailCheck, ShieldCheck, Clock3, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import axiosInstance from "../../api/axios";
const SA = "/smart-attendance/api";
const OTP_LEN = 6;

const getPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });

const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function OtpAttendance() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [sentInfo, setSentInfo] = useState(null);
  const [digits, setDigits] = useState(Array(OTP_LEN).fill(""));
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const inputs = useRef([]);

  const load = useCallback(async () => {
    try {
      const [{ data: st }, { data: hist }] = await Promise.all([
        axiosInstance.get(`${SA}/my-status`),
        axiosInstance.get(`${SA}/my-history`),
      ]);
      setStatus(st);
      setHistory(hist);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Could not load attendance status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (cooldown <= 0 && expiresIn <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
      setExpiresIn((e) => Math.max(0, e - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown, expiresIn]);

  const requestOtp = async () => {
    setSending(true);
    try {
      const { data } = await axiosInstance.post(`${SA}/otp/send`, {});
      if (!data.ok) {
        toast.error(data.error || "Could not send OTP");
        if (data.retry_in) setCooldown(data.retry_in);
        return;
      }
      setSentInfo(data);
      setDigits(Array(OTP_LEN).fill(""));
      setCooldown(data.retry_in || 45);
      setExpiresIn(data.expires_in || 300);
      if (data.delivered) toast.success(data.message);
      else toast(data.message, { icon: "!" });
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Could not send OTP");
    } finally {
      setSending(false);
    }
  };

  const verify = async (code) => {
    const otp = (code ?? digits.join("")).trim();
    if (otp.length !== OTP_LEN) return toast.error("Enter the 6-digit code");
    setVerifying(true);
    try {
      const pos = await getPosition();
      const { data } = await axiosInstance.post(`${SA}/otp/verify`, { otp, ...(pos || {}) });
      if (!data.ok) {
        toast.error(data.error || "Verification failed");
        setDigits(Array(OTP_LEN).fill(""));
        inputs.current[0]?.focus();
        return;
      }
      toast.success(data.message);
      setSentInfo(null);
      setExpiresIn(0);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const checkOut = async () => {
    setCheckingOut(true);
    try {
      const { data } = await axiosInstance.post(`${SA}/check-out`, {});
      if (!data.ok) return toast.error(data.error || "Check-out failed");
      toast.success(data.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Check-out failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const onDigit = (i, v) => {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => Object.assign([...d], { [i]: "" }));
      return;
    }
    if (clean.length > 1) {
      const next = Array(OTP_LEN).fill("");
      clean.slice(0, OTP_LEN).split("").forEach((c, k) => (next[k] = c));
      setDigits(next);
      const last = Math.min(clean.length, OTP_LEN) - 1;
      inputs.current[last]?.focus();
      if (clean.length >= OTP_LEN) verify(clean.slice(0, OTP_LEN));
      return;
    }
    const next = Object.assign([...digits], { [i]: clean });
    setDigits(next);
    if (i < OTP_LEN - 1) inputs.current[i + 1]?.focus();
    else if (next.every(Boolean)) verify(next.join(""));
  };

  const onKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "Enter" && !e.nativeEvent.isComposing) verify();
  };

  const rec = status?.record;
  const marked = Boolean(status?.marked);
  const checkedOut = Boolean(rec?.check_out);
  const summary = history?.summary;

  return (
    <div className="w-full space-y-6 pb-12">
      <main className="mx-auto max-w-5xl space-y-6">

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Punch card */}
          <section className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/80 lg:col-span-3" aria-labelledby="otp-title">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <KeyRound size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="otp-title" className="font-bold text-gray-900">OTP check-in</h2>
                    <p className="text-xs text-gray-500">{status?.name} - {status?.emp_id}</p>
                  </div>
                </div>
                <StatusPill loading={loading} marked={marked} checkedOut={checkedOut} status={rec?.status} />
              </div>

              {loading ? (
                <div className="mt-8 flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                  <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Loading today&apos;s status
                </div>
              ) : marked ? (
                <div className="mt-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat label="Checked in" value={rec.time?.slice(0, 5) || "-"} />
                    <Stat label="Checked out" value={rec.check_out?.slice(0, 5) || "-"} />
                    <Stat label="Hours" value={rec.hours != null ? `${rec.hours}h` : "-"} />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
                    <ShieldCheck size={16} aria-hidden="true" />
                    Attendance marked via {rec.method || "OTP"}{rec.approval && rec.approval !== "approved" ? ` - ${rec.approval}` : ""}.
                  </div>
                  {!checkedOut && (
                    <button
                      type="button"
                      onClick={checkOut}
                      disabled={checkingOut}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl text-white px-5 py-3 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.98] disabled:opacity-60 sm:w-auto"
                      style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", boxShadow: "0 8px 18px rgba(244, 63, 94, 0.25)" }}
                    >
                      {checkingOut ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
                      Check out now
                    </button>
                  )}
                </div>
              ) : !sentInfo ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-relaxed text-gray-600">
                    Tap the button to receive a 6-digit code on your registered email. You must be within the office boundary when you verify it.
                  </p>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={sending || cooldown > 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl text-white px-5 py-3 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.98] disabled:opacity-60 sm:w-auto"
                    style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 8px 18px rgba(124, 58, 237, 0.25)" }}
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Send OTP & check in"}
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ring-1 ${sentInfo.delivered ? "bg-indigo-50 text-indigo-800 ring-indigo-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>
                    <MailCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{sentInfo.message}{sentInfo.otp_dev ? ` (dev code: ${sentInfo.otp_dev})` : ""}</span>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="otp-0">Enter code</label>
                    <div className="flex gap-2" role="group" aria-label="One-time code">
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          ref={(el) => (inputs.current[i] = el)}
                          inputMode="numeric"
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          pattern="\d*"
                          maxLength={OTP_LEN}
                          value={d}
                          onChange={(e) => onDigit(i, e.target.value)}
                          onKeyDown={(e) => onKey(i, e)}
                          disabled={verifying}
                          aria-label={`Digit ${i + 1}`}
                          className="h-12 w-full rounded-xl border border-gray-300 bg-white text-center text-lg font-bold text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:h-14"
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} aria-hidden="true" />
                        {expiresIn > 0 ? `Code expires in ${fmtSecs(expiresIn)}` : "Code expired - request a new one"}
                      </span>
                      <button
                        type="button"
                        onClick={requestOtp}
                        disabled={sending || cooldown > 0}
                        className="font-semibold text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => verify()}
                    disabled={verifying || digits.some((d) => !d)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl text-white px-5 py-3 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.98] disabled:opacity-60 sm:w-auto"
                    style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 8px 18px rgba(124, 58, 237, 0.25)" }}
                  >
                    {verifying ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                    Verify & mark attendance
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Month summary */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 lg:col-span-2" aria-labelledby="month-title">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-gray-400" aria-hidden="true" />
              <h2 id="month-title" className="font-bold text-gray-900">This month</h2>
            </div>
            {summary ? (
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Days present" value={summary.days_present} />
                <Stat label="Late days" value={summary.late_days} />
                <Stat label="Half days" value={summary.half_days} />
                <Stat label="Total hours" value={`${summary.total_hours}h`} />
              </dl>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No records yet.</p>
            )}
            <ul className="mt-5 divide-y divide-gray-100 text-sm">
              {(history?.records || []).slice(0, 7).map((r) => (
                <li key={`${r.date}-${r.time}`} className="flex items-center justify-between py-2">
                  <span className="text-gray-700">{r.date}</span>
                  <span className="text-gray-500">{r.time?.slice(0, 5)}{r.check_out ? ` - ${r.check_out.slice(0, 5)}` : ""}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "Late" ? "bg-amber-50 text-amber-700" : r.status === "Half Day" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-lg font-bold text-gray-900">{value ?? "-"}</dd>
    </div>
  );
}

function StatusPill({ loading, marked, checkedOut, status }) {
  if (loading) return null;
  const cls = !marked
    ? "bg-gray-100 text-gray-600"
    : checkedOut
      ? "bg-gray-900 text-white"
      : status === "Late"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {!marked ? "Not marked" : checkedOut ? "Day complete" : status || "Present"}
    </span>
  );
}
