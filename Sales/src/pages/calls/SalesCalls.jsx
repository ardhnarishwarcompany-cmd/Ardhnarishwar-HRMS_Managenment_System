import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import CallsFilterBar from "../../components/calls/CallsFilterBar";
import CallsTable from "../../components/calls/CallsTable";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import AddEditCallModal from "../../components/calls/AddEditCallModal";
import {
  Phone,
  CheckCircle,
  PauseCircle,
  Clock,
  CalendarClock,
  AlertTriangle,
  Plus,
  RefreshCw,
} from "lucide-react";

export default function SalesCalls() {
  const { auth } = useAuth();
  const token = auth?.token;

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // modal state
  const [editingCall, setEditingCall] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  // =========================
  // FETCH CALLS
  // =========================
  const fetchCalls = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(`${BASE_URL}/sales/calls`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCalls(data || []);
    } catch (err) {
      toast.error(`Fetch calls error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCalls();
  }, [token]);

  // =========================
  // FILTERED CALLS
  // =========================
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const matchSearch =
        !search ||
        c.call_id?.toLowerCase().includes(search.toLowerCase()) ||
        c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search);

      const matchStatus = !status || c.status === status;

      return matchSearch && matchStatus;
    });
  }, [calls, search, status]);

  // =========================
  // STATS
  // =========================
  const stats = useMemo(() => {
    const now = new Date();

    const total = calls.length;
    const accepted = calls.filter((c) => c.status === "accepted").length;
    const hold = calls.filter((c) => c.status === "hold").length;

    // SALES DONE (based on sold_date)
    const salesDone = calls.filter((c) => c.sold_date).length;

    // only non-rejected calls should count for follow-ups
    const validFollowupCalls = calls.filter(
      (c) => c.status !== "rejected" && c.follow_up_datetime,
    );

    const totalFollowUps = validFollowupCalls.length;

    const upcomingFollowUps = validFollowupCalls.filter(
      (c) => new Date(c.follow_up_datetime) >= now,
    ).length;

    const overdueFollowUps = validFollowupCalls.filter(
      (c) => new Date(c.follow_up_datetime) < now,
    ).length;

    return {
      total,
      accepted,
      hold,
      salesDone,
      totalFollowUps,
      upcomingFollowUps,
      overdueFollowUps,
    };
  }, [calls]);

  // =========================
  // HANDLERS
  // =========================
  const handleEdit = (call) => {
    setEditingCall(call);
    setOpenModal(true);
  };

  const openCreate = () => {
    setEditingCall(null);
    setOpenModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Calls"
        desc="Manage and track your customer calls"
        actions={
          <>
            <button
              type="button"
              onClick={fetchCalls}
              disabled={loading}
              className="btn-on-brand-ghost"
            >
              <RefreshCw size={16} aria-hidden="true" className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button type="button" onClick={openCreate} className="btn-on-brand">
              <Plus size={16} aria-hidden="true" />
              Add Call
            </button>
          </>
        }
      />

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-7">
        <StatCard
          title="Total Calls"
          value={stats.total}
          subText="All call records"
          icon={<Phone />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
        />

        <StatCard
          title="Lead Generated"
          value={stats.accepted}
          subText="Successful conversions"
          icon={<CheckCircle />}
          gradient="bg-gradient-to-br from-teal-500 to-teal-700"
        />

        <StatCard
          title="Sales Done"
          value={stats.salesDone}
          subText="Successful conversions"
          icon={<CheckCircle />}
          gradient="bg-gradient-to-br from-emerald-500 to-green-700"
        />

        <StatCard
          title="On Hold"
          value={stats.hold}
          subText="Pending decisions"
          icon={<PauseCircle />}
          gradient="bg-gradient-to-br from-orange-500 to-amber-700"
        />

        <StatCard
          title="Need Follow-ups"
          value={stats.upcomingFollowUps}
          subText="Upcoming follow-ups"
          icon={<CalendarClock />}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
        />

        <StatCard
          title="Total Follow-ups"
          value={stats.totalFollowUps}
          subText="All scheduled"
          icon={<Clock />}
          gradient="bg-gradient-to-br from-violet-500 to-purple-700"
        />

        <StatCard
          title="Pending Follow-ups"
          value={stats.overdueFollowUps}
          subText="Overdue tasks"
          icon={<AlertTriangle />}
          gradient="bg-gradient-to-br from-rose-500 to-red-700"
        />
      </div>

      {/* ================= FILTERS + TABLE ================= */}
      <section className="sp-card overflow-hidden" aria-label="Call records">
        <CallsFilterBar
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
          count={filteredCalls.length}
        />
        <CallsTable calls={filteredCalls} loading={loading} onEdit={handleEdit} />
      </section>

      {/* ================= ADD / EDIT CALL ================= */}
      <AddEditCallModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        editingCall={editingCall}
        refresh={fetchCalls}
        BASE_URL={BASE_URL}
        token={token}
      />
    </div>
  );
}
