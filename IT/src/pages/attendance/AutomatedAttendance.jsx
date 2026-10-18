import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import StatCard from "../../components/common/StatCard";
import ITShell from "../it/ITShell";
import AttendanceTable from "../../components/attendance/AttendanceTable";
import AttendanceFilters from "../../components/attendance/AttendanceFilters";
import LocationCapture from "../../components/attendance/LocationCapture";
import OfficeLocation from "../../components/attendance/OfficeLocation";
import ShiftTimings from "../../components/attendance/ShiftTimings";
import { MapPin, Users, Settings, Clock, UserCheck, UserX, AlarmClock, Plane, Fingerprint } from "lucide-react";

const localToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function AutomatedAttendance() {
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
  });

  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("hrms_it_User") || "{}"); } catch { return {}; }
  }, []);
  const role = String(me?.role || "").toUpperCase();
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "HR"].includes(role);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: localToday(),
    scope: isAdmin ? "department" : "me",
    status: "",
  });

  const [activeTab, setActiveTab] = useState("attendance");
  const [officeLocations, setOfficeLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [shiftTimings, setShiftTimings] = useState([]);

  const token = localStorage.getItem("hrms_it_Token");
  const BASE = import.meta.env.VITE_API_BASE_URL;

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.date) params.append("date", filters.date);
      if (filters.status) params.append("status", filters.status);
      params.append("scope", isAdmin ? (filters.scope || "department") : "me");

      const res = await axios.get(`${BASE}/hr/attendance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res?.data?.data || [];

      // Filter rows:
      // 1. If not admin (e.g. Rohan candidate): only show this candidate's own attendance records!
      // 2. If admin: show IT department candidates according to registered name
      const myName = (me?.name || me?.fullName || me?.employee_name || "").toLowerCase().trim();
      const myId = me?.id || me?.employee_id;

      const filtered = data.filter((r) => {
        if (!isAdmin || filters.scope === "me") {
          const rId = r.employeeId || r.employee_id || r.id;
          const rName = String(r.employee || r.name || r.employee_name || "").toLowerCase().trim();
          if (myId && rId && String(rId) === String(myId)) return true;
          if (myName && rName && (rName === myName || rName.includes(myName) || myName.includes(rName))) return true;
          if (!isAdmin && data.length === 1 && !rName) return true;
          return false;
        }

        // Admin view: show IT department candidates
        const dept = String(r.department || "").toLowerCase().trim();
        if (!dept) return true;
        return (
          dept.includes("it") ||
          dept.includes("tech") ||
          dept.includes("dev") ||
          dept.includes("software") ||
          dept.includes("engineer")
        );
      });

      setRows(filtered);

      const present = filtered.filter((r) => r.status === "present").length;
      const absent = filtered.filter((r) => r.status === "absent").length;
      const late = filtered.filter((r) => r.status === "late").length;
      const onLeave = filtered.filter((r) => r.status === "on_leave").length;

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
      toast.error(err?.response?.data?.message || "Failed to save shift timings");
      throw err;
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchShiftTimings();
  }, [filters]);

  const tabs = [
    { id: "attendance", label: "Attendance", icon: Users },
    { id: "shifts", label: "Shift Timings", icon: Clock },
  ];

  return (
    <ITShell
      title="Automated Attendance"
      subtitle="Shift timings and automated attendance tracking"
      icon={Fingerprint}
      action={<div className="text-xs font-bold text-[var(--mute)]">Last updated: {new Date().toLocaleTimeString()}</div>}
    >
      <div className="flex flex-col gap-6">

      <div className="flex items-center gap-2 p-1.5 bg-white border border-[var(--line)] rounded-2xl w-fit shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/25"
                  : "text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--soft)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "attendance" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Present"
              value={stats.present}
              subText="Employees present today"
              gradient="bg-gradient-to-tr from-emerald-500 to-teal-500"
              icon={<UserCheck size={20} />}
            />

            <StatCard
              title="Absent"
              value={stats.absent}
              subText="Employees absent today"
              gradient="bg-gradient-to-tr from-red-500 to-pink-500"
              icon={<UserX size={20} />}
            />

            <StatCard
              title="Late Arrivals"
              value={stats.late}
              subText="Arrived after 10:00 AM"
              gradient="bg-gradient-to-tr from-amber-500 to-orange-500"
              icon={<AlarmClock size={20} />}
            />

            <StatCard
              title="On Leave"
              value={stats.onLeave}
              subText="Approved leave today"
              gradient="bg-gradient-to-tr from-blue-500 to-indigo-500"
              icon={<Plane size={20} />}
            />
          </div>

          <AttendanceFilters filters={filters} onFilterChange={setFilters} isAdmin={isAdmin} />
          <AttendanceTable
            rows={rows}
            loading={loading}
            onRefresh={fetchAttendance}
            shifts={shiftTimings}
          />
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
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Today's Check-In
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p
                      className={`font-medium ${
                        currentLocation.verified
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {currentLocation.verified ? "Verified" : "Not Verified"}
                    </p>
                  </div>
                  {currentLocation.office && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Office</p>
                        <p className="font-medium text-gray-800">
                          {currentLocation.office.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Distance</p>
                        <p className="font-medium text-gray-800">
                          {currentLocation.distance?.toFixed(2)} km
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Coordinates</p>
                    <p className="font-medium text-gray-800">
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
        <div className="max-w-3xl">
          <ShiftTimings
            onSave={saveShiftTimings}
            initialShifts={shiftTimings}
          />
        </div>
      )}
      </div>
    </ITShell>
  );
}
