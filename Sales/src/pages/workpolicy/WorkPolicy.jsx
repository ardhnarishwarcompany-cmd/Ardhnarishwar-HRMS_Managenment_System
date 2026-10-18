import API from "../../api/axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import PolicyFilters from "../../components/workpolicy/PolicyFilters";
import PolicyTable from "../../components/workpolicy/PolicyTable";
import { ShieldCheck, FileEdit, SearchCheck, Archive } from "lucide-react";

export default function WorkPolicy() {
  const [stats, setStats] = useState({
    active: 0,
    draft: 0,
    underReview: 0,
    archived: 0,
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    department: "",
  });

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      if (filters.department) params.append("department", filters.department);

      const res = await API.get(`/sales/work-policies?${params}`);

      const data = res?.data?.data || [];
      setRows(data);
      calculateStats(data);
    } catch (err) {
      toast.error(`Work policies fetch error: ${err}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const active = data.filter((r) => r.status === "active").length;
    const draft = data.filter((r) => r.status === "draft").length;
    const underReview = data.filter((r) => r.status === "under_review").length;
    const archived = data.filter((r) => r.status === "archived").length;

    setStats({ active, draft, underReview, archived });
  };

  useEffect(() => {
    fetchPolicies();
  }, [filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Policy Sheet"
        desc="Company work guidelines & policies"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Policies"
          value={stats.active}
          subText="Currently in effect"
          gradient="bg-gradient-to-tr from-emerald-500 to-teal-500"
          icon={<ShieldCheck aria-hidden="true" />}
        />

        <StatCard
          title="Draft"
          value={stats.draft}
          subText="Under preparation"
          gradient="bg-gradient-to-tr from-slate-500 to-slate-600"
          icon={<FileEdit aria-hidden="true" />}
        />

        <StatCard
          title="Under Review"
          value={stats.underReview}
          subText="Pending approval"
          gradient="bg-gradient-to-tr from-amber-500 to-orange-500"
          icon={<SearchCheck aria-hidden="true" />}
        />

        <StatCard
          title="Archived"
          value={stats.archived}
          subText="Previous versions"
          gradient="bg-gradient-to-tr from-rose-500 to-pink-500"
          icon={<Archive aria-hidden="true" />}
        />
      </div>

      <PolicyFilters filters={filters} onFilterChange={setFilters} />

      <PolicyTable rows={rows} loading={loading} onRefresh={fetchPolicies} />
    </div>
  );
}
