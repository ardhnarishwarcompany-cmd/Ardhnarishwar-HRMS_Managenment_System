import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, TrendingUp, Search } from "lucide-react";
import { revenueService } from "../../services/financeService";
import toast from "react-hot-toast";

export default function RevenueManagement() {
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    source: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      const response = await revenueService.getAll();
      setRevenue(response.data);
    } catch (error) {
      console.error("Error fetching revenue:", error);
      toast.error("Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        client_id: 1,
        amount: parseFloat(formData.amount),
        source: formData.source,
        date: formData.date,
      };

      if (editingId) {
        await revenueService.update(editingId, data);
        toast.success("Revenue updated successfully");
      } else {
        await revenueService.add(data);
        toast.success("Revenue added successfully");
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({ amount: "", source: "", date: new Date().toISOString().split("T")[0] });
      fetchRevenue();
    } catch (error) {
      console.error("Error saving revenue:", error);
      toast.error("Failed to save revenue");
    }
  };

  const handleEdit = (item) => {
    setFormData({
      amount: item.amount.toString(),
      source: item.source,
      date: item.date,
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this revenue?")) return;
    try {
      await revenueService.delete(id);
      toast.success("Revenue deleted successfully");
      fetchRevenue();
    } catch (error) {
      console.error("Error deleting revenue:", error);
      toast.error("Failed to delete revenue");
    }
  };

  const filteredRevenue = revenue.filter(
    (item) =>
      item.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.amount.toString().includes(searchTerm)
  );

  const totalRevenue = revenue.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header-main">
          <span className="page-header-icon">
            <TrendingUp size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="page-header-title">Revenue Management</h1>
            <p className="page-header-subtitle">Track and manage your income sources</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setEditingId(null);
            setFormData({ amount: "", source: "", date: new Date().toISOString().split("T")[0] });
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Revenue
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search revenue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-semibold">
              Total: ₹{totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRevenue.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No revenue records found
                  </td>
                </tr>
              ) : (
                filteredRevenue.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{item.source}</td>
                    <td className="py-3 px-4 text-green-600 font-semibold">
                      ₹{parseFloat(item.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Edit Revenue" : "Add New Revenue"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input
                  type="text"
                  required
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sales, Services"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? "Update" : "Add"} Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
