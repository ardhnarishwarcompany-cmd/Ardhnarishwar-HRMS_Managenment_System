import {
  Users,
  IndianRupee,
  BadgeCheck,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import StatCard from "../common/StatCard";

const SalesStats = ({ sales = [] }) => {
  // ===== aggregation =====
  const totalRevenue = sales.reduce(
    (sum, s) => sum + Number(s.amount_paid || 0),
    0,
  );

  const activeSubscriptions = sales.filter(
    (s) => s.subscription_status === "active",
  ).length;

  const overduePayments = sales.filter((s) => {
    const due = new Date(s.due_date);
    const today = new Date();
    return s.payment_status !== "paid" && due < today;
  }).length;

  const totalClients = new Set(sales.map((s) => s.client_id)).size;

  const outstandingAmount = sales.reduce((sum, s) => {
    const remaining = Number(s.amount || 0) - Number(s.amount_paid || 0);
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const stats = [
    {
      title: "Outstanding Amount",
      value: `\u20B9${outstandingAmount.toLocaleString("en-IN")}`,
      subText: "Yet to be received",
      icon: Wallet,
      gradient: "bg-gradient-to-br from-orange-500 to-amber-700",
    },
    {
      title: "Total Clients",
      value: totalClients,
      subText: "Unique purchasing clients",
      icon: Users,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    {
      title: "Revenue Received",
      value: `\u20B9${totalRevenue.toLocaleString("en-IN")}`,
      subText: "Total amount collected",
      icon: IndianRupee,
      gradient: "bg-gradient-to-br from-emerald-500 to-green-700",
    },
    {
      title: "Active Plans",
      value: activeSubscriptions,
      subText: "Currently running subscriptions",
      icon: BadgeCheck,
      gradient: "bg-gradient-to-br from-violet-500 to-purple-700",
    },
    {
      title: "Due Date Over",
      value: overduePayments,
      subText: "Payment pending after due date",
      icon: AlertTriangle,
      gradient: "bg-gradient-to-br from-rose-500 to-red-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            subText={stat.subText}
            icon={<Icon aria-hidden="true" />}
            gradient={stat.gradient}
          />
        );
      })}
    </div>
  );
};

export default SalesStats;
