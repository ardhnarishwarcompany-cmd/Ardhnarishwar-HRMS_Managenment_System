import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, ArrowRight,
  LayoutGrid, AlertTriangle, Layers, Award
} from "lucide-react";
import { IT_MODULES } from "./ITShell";
import { getTodayBirthdays } from "../../services/notificationService";
import { useHrAuth } from "../../context/HrAuthContext";

const CATEGORIES = ["All", "Work", "Quality", "Delivery", "Insights", "Knowledge"];

export default function ITDashboard() {
  const navigate = useNavigate();
  const { employee } = useHrAuth();
  const [selectedCat, setSelectedCat] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);

  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("hrms_it_User") || "{}"); } catch { return {}; }
  }, []);
  const user = employee || stored || {};
  const displayName = user.name || user.fullName || user.employee_name || user.first_name || (user.email ? user.email.split("@")[0] : "") || "User";

  useEffect(() => {
    getTodayBirthdays()
      .then((res) => setNotifications(res?.data?.data || []))
      .catch(() => {});
  }, []);

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return IT_MODULES.filter((m) => {
      const matchesCat = selectedCat === "All" || m.category === selectedCat;
      const matchesQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [selectedCat, searchQuery]);

  const todayStr = useMemo(() => {
    return new Date()
      .toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      .toUpperCase();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Hero */}
      <section className="welcome">
        <div>
          <div className="date">{todayStr}</div>
          <h1>
            Welcome back, <span>{displayName}</span>
          </h1>
          <p>Here&apos;s what&apos;s happening in your IT workspace today.</p>
        </div>
        <button
          className="pbtn"
          onClick={() => navigate("/it/performance-report")}
        >
          <TrendingUp size={18} />
          <span>Performance</span>
        </button>
      </section>

      {/* IT Features Section */}
      <div className="sech">
        <div>
          <h2>IT Features</h2>
          <p>Manage your IT workspace from the available modules.</p>
        </div>
        <span className="cnt">
          {filteredModules.length} of {IT_MODULES.length}
        </span>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={cat === selectedCat}
            className={cat === selectedCat ? "on" : ""}
            onClick={() => setSelectedCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* All Filtered Modules */}
      {filteredModules.length === 0 ? (
        <div className="empty">
          No modules match &ldquo;{searchQuery}&rdquo;. Try a different keyword or category.
        </div>
      ) : (
        <div className="it-mod-grid">
          {filteredModules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.path}
                className="mc"
                tabIndex={0}
                role="button"
                onClick={() => navigate(m.path)}
              >
                <div className="t">
                  <div className="ic">
                    <Icon size={24} />
                  </div>
                  <h3>{m.title}</h3>
                </div>
                <p>{m.desc}</p>
                <div className="ft">
                  <span className="tag">{m.category}</span>
                  <span className="go">
                    Open <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
