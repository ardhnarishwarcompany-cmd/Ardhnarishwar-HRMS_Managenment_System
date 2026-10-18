import { useEffect, useState, useCallback } from "react";
import { MapPin, LogIn, LogOut, CheckCircle2, Loader2 } from "lucide-react";
import axiosInstance from "../api/axios";

const format12h = (timeStr) => {
  if (!timeStr || timeStr === "--:--") return "--:--";
  if (/am|pm/i.test(timeStr)) return timeStr;
  const parts = String(timeStr).trim().split(":");
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return timeStr;
  const m = parts[1] ? parts[1].padStart(2, "0") : "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  const hPad = String(h).padStart(2, "0");
  return `${hPad}:${m} ${ampm}`;
};

export default function GeoPunchCard() {
  const [today, setToday] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/geo-attendance/today");
      setToday(data?.today || null);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const punch = () => {
    if (!navigator.geolocation) {
      setMsg({ type: "error", text: "Geolocation not supported on this device" });
      return;
    }
    setBusy(true);
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await axiosInstance.post("/geo-attendance/punch", {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setMsg({ type: "success", text: data?.message || "Punch recorded" });
          load();
        } catch (err) {
          setMsg({
            type: "error",
            text: err?.response?.data?.message || "Punch failed",
          });
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        setMsg({
          type: "error",
          text:
            err.code === 1
              ? "Location permission denied. Allow location access to punch."
              : "Could not get your location",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const checkedIn = !!today?.check_in;
  const checkedOut = !!today?.check_out;

  // Calculate duration if check-in and check-out exist
  let durationStr = today?.total_hours;
  if (!durationStr && today?.check_in && today?.check_out) {
    const [h1, m1] = today.check_in.split(":").map(Number);
    const [h2, m2] = today.check_out.split(":").map(Number);
    if (!isNaN(h1) && !isNaN(h2)) {
      const diffMins = h2 * 60 + (m2 || 0) - (h1 * 60 + (m1 || 0));
      if (diffMins > 0) {
        const dh = Math.floor(diffMins / 60);
        const dm = diffMins % 60;
        durationStr = `${dh}h ${dm.toString().padStart(2, "0")}m`;
      }
    }
  }

  const isCheckOutMode = checkedIn && !checkedOut;

  return (
    <div className="card geo">
      <div className="gh">
        <div className="gi">
          <MapPin size={24} />
        </div>
        <div>
          <b>Geo Attendance</b>
          <small>GPS-verified check-in &amp; out</small>
        </div>
      </div>

      <div className="gm">
        <div>
          <small>CHECK-IN</small>
          <b>{format12h(today?.check_in)}</b>
        </div>
        <div>
          <small>CHECK-OUT</small>
          <b>{format12h(today?.check_out)}</b>
        </div>
        <div>
          <small>STATUS</small>
          <b className={checkedIn ? "pr" : ""}>
            {today?.status || (checkedIn ? "PRESENT" : "-")}
          </b>
        </div>
      </div>

      {checkedOut && (
        <div className="done mt-3">
          <CheckCircle2 size={18} />
          <span>Attendance complete for today {durationStr ? `· ${durationStr}` : ""}</span>
        </div>
      )}

      {/* Action button: Check Out if currently checked in, otherwise Check In (GPS) */}
      <div className="geo-actions">
        {isCheckOutMode ? (
          <button
            onClick={punch}
            disabled={busy}
            className="geo-checkout-btn"
            type="button"
          >
            {busy ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                <span>Getting location...</span>
              </>
            ) : (
              <>
                <LogOut size={19} strokeWidth={2.4} />
                <span>Check Out (GPS)</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={punch}
            disabled={busy}
            className="geo-checkin-btn"
            type="button"
          >
            {busy ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                <span>Getting location...</span>
              </>
            ) : (
              <>
                <LogIn size={20} strokeWidth={2.4} />
                <span>Check In (GPS)</span>
              </>
            )}
          </button>
        )}
      </div>

      {msg && (
        <p
          className={`text-xs font-semibold mt-2.5 ${
            msg.type === "success" ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
