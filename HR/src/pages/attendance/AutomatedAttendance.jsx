import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import AttendanceTable from "../../components/attendance/AttendanceTable";
import AttendanceFilters from "../../components/attendance/AttendanceFilters";
import LocationCapture from "../../components/attendance/LocationCapture";
import OfficeLocation from "../../components/attendance/OfficeLocation";
import ShiftTimings from "../../components/attendance/ShiftTimings";
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  AlarmClock,
  Palmtree,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

import { ClipboardCheck as HrPageIcon } from "lucide-react";
/* ═══════════════ keyframes ═══════════════ */
const styles = `
@keyframes axRise {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes axMesh1 {
  0%, 100% { transform: translate(-8%, -8%) scale(1); }
  50%      { transform: translate(10%, 6%) scale(1.2); }
}
@keyframes axMesh2 {
  0%, 100% { transform: translate(8%, 8%) scale(1.05); }
  50%      { transform: translate(-12%, -6%) scale(0.9); }
}
@keyframes axGridPan {
  from { background-position: 0 0; }
  to   { background-position: 52px 52px; }
}
@keyframes axSheen {
  0%, 60%   { transform: translateX(-140%) skewX(-20deg); }
  90%, 100% { transform: translateX(280%) skewX(-20deg); }
}
@keyframes axBar {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes axPulseRing {
  0%   { transform: scale(1); opacity: 0.45; }
  100% { transform: scale(1.9); opacity: 0; }
}
.ax-rise { animation: axRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .ax-anim, .ax-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

function StatTile({ title, value, subText, icon: Icon, glow, iconBg, bar, delay }) {
  return (
    <div
      className="ax-rise group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(109,40,217,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] dark:backdrop-blur-xl dark:hover:border-white/20"
      style={{ animationDelay: delay }}
    >
      {/* animated accent hairline */}
      <span
        className={`ax-anim absolute inset-x-0 top-0 h-[3px] origin-left ${bar}`}
        style={{ animation: "axBar 1s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
        aria-hidden="true"
      />
      {/* corner glow */}
      <span
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-15 transition-opacity duration-300 group-hover:opacity-30 dark:opacity-40 dark:group-hover:opacity-70 ${glow}`}
        aria-hidden="true"
      />
      {/* sheen sweep */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
        <span className="ax-anim absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-violet-500/[0.04] to-transparent dark:via-white/[0.05]" style={{ animation: "axSheen 7s ease-in-out infinite" }} />
      </span>

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/40">
            {title}
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1.5 text-xs font-medium text-slate-400 dark:text-white/40">{subText}</p>
        </div>
        <span className={`relative flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg ${iconBg}`}>
          <Icon size={20} aria-hidden="true" />
          <span
            className="ax-anim absolute inset-0 rounded-xl border border-white/30"
            style={{ animation: "axPulseRing 2.8s ease-out infinite" }}
            aria-hidden="true"
          />
        </span>
      </div>
    </div>
  );
}

export default function AutomatedAttendance() {
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    status: "",
  });

  // HR sees the whole company by default; "me" narrows to personal records.
  const [scope, setScope] = useState("all");

  const [activeTab, setActiveTab] = useState("attendance");
  const [officeLocations, setOfficeLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [shiftTimings, setShiftTimings] = useState([]);

  const token = localStorage.getItem("hrms_hr_Token");
  const BASE = import.meta.env.VITE_API_BASE_URL;

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate) params.append("toDate", filters.toDate);
      if (filters.status) params.append("status", filters.status);
      params.append("scope", scope);

      const res = await axios.get(`${BASE}/hr/attendance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res?.data?.data || [];
      setRows(data);

      const present = data.filter((r) => r.status === "present").length;
      const absent = data.filter((r) => r.status === "absent").length;
      const late = data.filter((r) => r.status === "late").length;
      const onLeave = data.filter((r) => r.status === "on_leave").length;

      setStats({ present, absent, late, onLeave });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Fetch failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const saveOfficeLocations = async (locations) => {
    try {
      await axios.post(`${BASE}/hr/office-locations`, locations, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      toast.error("Failed to save office locations");
    }
  };

  const handleLocationVerified = (locationData) => {
    setCurrentLocation(locationData);
  };

  const fetchShiftTimings = async () => {
    try {
      const res = await axios.get(`${BASE}/hr/attendance/shift-timings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShiftTimings(res?.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to fetch shifts");
      setShiftTimings([]);
    }
  };

  const saveShiftTimings = async (shifts) => {
    try {
      await axios.post(`${BASE}/hr/attendance/shift-timings`, shifts, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Shift updated");
      fetchShiftTimings();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save shift timings",
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchShiftTimings();
  }, [filters, scope]);

  const tabs = [
    { id: "attendance", label: "Attendance", icon: Users },
    { id: "shifts", label: "Shift Timings", icon: Clock },
  ];

  const scopeOptions = [
    { id: "all", label: "All employees" },
    { id: "me", label: "My records" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 p-3 sm:p-4 lg:p-6 dark:bg-[#07050e]">
      <style>{styles}</style>

      {/* ═══ ambient background ═══ */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div
          className="ax-anim absolute left-[-12%] top-[-18%] h-[60vh] w-[55vw] rounded-full opacity-30 blur-[130px] dark:opacity-100"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,0.28), transparent 65%)",
            animation: "axMesh1 26s ease-in-out infinite",
          }}
        />
        <div
          className="ax-anim absolute bottom-[-22%] right-[-10%] h-[65vh] w-[50vw] rounded-full opacity-30 blur-[130px] dark:opacity-100"
          style={{
            background: "radial-gradient(circle, rgba(217,70,239,0.2), transparent 65%)",
            animation: "axMesh2 30s ease-in-out infinite",
          }}
        />
        <div
          className="ax-anim absolute inset-0 opacity-[0.04] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124,58,237,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.6) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            animation: "axGridPan 10s linear infinite",
            maskImage: "radial-gradient(ellipse 85% 75% at 50% 35%, black 25%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
          <PageHeader
            icon={HrPageIcon}
            title="Automated Attendance"
            subtitle={"Daily presence, late arrivals, and shift schedules \u2014 tracked automatically for the whole team."}
          >
            <span className="hr-ph-pill">Last updated: {new Date().toLocaleString()}</span>
          </PageHeader>

          {/* ── TABS ──────────────────────────────────────────── */}
          <div className="ax-rise inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:backdrop-blur-xl" style={{ animationDelay: "0.1s" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-600 text-white shadow-[0_8px_24px_-8px_rgba(217,70,239,0.7)]"
                    : "text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"
                }`}
              >
                <tab.icon size={15} aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "attendance" && (
            <>
              <div
                className="ax-rise inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:backdrop-blur-xl"
                role="group"
                aria-label="Attendance scope"
              >
                {scopeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setScope(option.id)}
                    aria-pressed={scope === option.id}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                      scope === option.id
                        ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                        : "text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  title="Present"
                  value={stats.present}
                  subText="Records in selected range"
                  icon={UserCheck}
                  glow="bg-emerald-500"
                  iconBg="bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/40"
                  bar="bg-gradient-to-r from-emerald-400 to-teal-500"
                  delay="0.15s"
                />
                <StatTile
                  title="Absent"
                  value={stats.absent}
                  subText="Records in selected range"
                  icon={UserX}
                  glow="bg-rose-500"
                  iconBg="bg-gradient-to-br from-rose-400 to-pink-600 shadow-rose-500/40"
                  bar="bg-gradient-to-r from-rose-400 to-pink-500"
                  delay="0.22s"
                />
                <StatTile
                  title="Late Arrivals"
                  value={stats.late}
                  subText="Late records in selected range"
                  icon={AlarmClock}
                  glow="bg-amber-500"
                  iconBg="bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/40"
                  bar="bg-gradient-to-r from-amber-400 to-orange-500"
                  delay="0.29s"
                />
                <StatTile
                  title="On Leave"
                  value={stats.onLeave}
                  subText="Leave records in selected range"
                  icon={Palmtree}
                  glow="bg-sky-500"
                  iconBg="bg-gradient-to-br from-sky-400 to-indigo-600 shadow-sky-500/40"
                  bar="bg-gradient-to-r from-sky-400 to-indigo-500"
                  delay="0.36s"
                />
              </div>

              <div className="ax-rise" style={{ animationDelay: "0.4s" }}>
                <AttendanceFilters filters={filters} onFilterChange={setFilters} rows={rows} />
              </div>
              <div className="ax-rise" style={{ animationDelay: "0.48s" }}>
                <AttendanceTable
                  rows={rows}
                  loading={loading}
                  onRefresh={fetchAttendance}
                  shifts={shiftTimings}
                  scope={scope}
                />
              </div>
            </>
          )}

          {activeTab === "check-in" && (
            <div className="max-w-2xl">
              <div className="grid gap-6">
                <LocationCapture
                  onLocationVerified={handleLocationVerified}
                  officeLocations={officeLocations}
                />

                {currentLocation && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:backdrop-blur-xl">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                      Today&apos;s Check-In
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-400 dark:text-white/40">Status</p>
                        <p
                          className={`font-medium ${
                            currentLocation.verified
                              ? "text-emerald-600 dark:text-emerald-300"
                              : "text-rose-600 dark:text-rose-300"
                          }`}
                        >
                          {currentLocation.verified ? "Verified" : "Not Verified"}
                        </p>
                      </div>
                      {currentLocation.office && (
                        <>
                          <div>
                            <p className="text-sm text-slate-400 dark:text-white/40">Office</p>
                            <p className="font-medium text-slate-700 dark:text-white/80">
                              {currentLocation.office.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400 dark:text-white/40">Distance</p>
                            <p className="font-medium text-slate-700 dark:text-white/80">
                              {currentLocation.distance?.toFixed(2)} km
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-sm text-slate-400 dark:text-white/40">Coordinates</p>
                        <p className="font-medium text-slate-700 dark:text-white/80">
                          {currentLocation.latitude?.toFixed(6)},{" "}
                          {currentLocation.longitude?.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "locations" && (
            <div className="max-w-3xl">
              <OfficeLocation
                onSave={saveOfficeLocations}
                initialLocations={officeLocations}
              />
            </div>
          )}

          {activeTab === "shifts" && (
            <div className="w-full">
              <ShiftTimings
                onSave={saveShiftTimings}
                initialShifts={shiftTimings}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
