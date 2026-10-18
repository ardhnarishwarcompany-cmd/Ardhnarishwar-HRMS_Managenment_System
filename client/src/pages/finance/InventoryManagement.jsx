import { useState, useEffect } from "react";
import { Boxes as PageIcon } from "lucide-react";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Boxes,
  AlertTriangle,
  Wrench,
  X,
} from "lucide-react";
import { inventoryService } from "../../services/financeService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const EMPTY_FORM = {
  item_name: "",
  quantity: "",
  price: "",
  category: "",
  mrp: "",
  discount_price: "",
  gst_percent: "",
};

const inputClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-colors placeholder:text-slate-400";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, valueRes] = await Promise.all([
        inventoryService.getAll(),
        inventoryService.getTotalValue(),
      ]);
      setInventory(Array.isArray(invRes.data) ? invRes.data : []);
      setTotalValue(Number(valueRes.data?.total_value) || 0);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const data = {
        item_name: formData.item_name.trim(),
        quantity: parseInt(formData.quantity, 10),
        price: parseFloat(formData.price),
        category: formData.category.trim(),
        mrp: formData.mrp !== "" ? parseFloat(formData.mrp) : null,
        discount_price:
          formData.discount_price !== ""
            ? parseFloat(formData.discount_price)
            : null,
        gst_percent:
          formData.gst_percent !== "" ? parseFloat(formData.gst_percent) : null,
      };

      if (editingId) {
        await inventoryService.update(editingId, data);
        toast.success("Item updated successfully");
      } else {
        await inventoryService.add(data);
        toast.success("Item added successfully");
      }

      setShowModal(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      fetchData();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(
        error.response?.data?.message || "Failed to save item",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      item_name: item.item_name || "",
      quantity: item.quantity?.toString() || "",
      price: item.price?.toString() || "",
      category: item.category || "",
      mrp: item.mrp?.toString() || "",
      discount_price: item.discount_price?.toString() || "",
      gst_percent: item.gst_percent?.toString() || "",
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await inventoryService.delete(id);
      toast.success("Item deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const lowStockCount = inventory.filter((i) => i.quantity < 10).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="page-header-main">
          <span className="page-header-icon">
            <PageIcon size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="page-header-title text-balance">Inventory Management</h1>
            <p className="page-header-subtitle">Manage stock and inventory items</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/finance/services")}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-colors"
          >
            <Wrench className="w-4 h-4 text-slate-500" />
            Service Section
          </button>
          <button
            onClick={() => {
              setShowModal(true);
              setEditingId(null);
              setFormData(EMPTY_FORM);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card-premium relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Inventory Value
              </p>
              <p className="text-3xl font-bold tracking-tight text-slate-900 mt-2">
                ₹{(Number(totalValue) || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 ring-1 ring-indigo-100">
              <Package className="w-7 h-7 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="card-premium relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Items
              </p>
              <p className="text-3xl font-bold tracking-tight text-slate-900 mt-2">
                {inventory.length}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-100 ring-1 ring-sky-100">
              <Boxes className="w-7 h-7 text-sky-600" />
            </div>
          </div>
        </div>

        <div className="card-premium relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Low Stock Items
              </p>
              <p className="text-3xl font-bold tracking-tight text-slate-900 mt-2">
                {lowStockCount}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 ring-1 ring-amber-100">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Stock table */}
      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Stock Items
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {inventory.length} item{inventory.length === 1 ? "" : "s"} in
              stock
            </p>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh] scrollbar-thin-premium rounded-xl border border-slate-100">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-200">
                {[
                  "Item Name",
                  "Category",
                  "Quantity",
                  "Purchase Price",
                  "Selling Price",
                  "Total Value",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-14">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                        <Package className="w-8 h-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">
                          No inventory items yet
                        </p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          Click &quot;Add Item&quot; to add your first stock
                          item
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.item_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                        {item.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          item.quantity < 10
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}
                      >
                        {item.quantity}
                        {item.quantity < 10 && (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      ₹{(Number(item.price) || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-2">
                        {item.mrp ? (
                          <span className="line-through text-slate-400 text-sm">
                            ₹{(Number(item.mrp) || 0).toLocaleString("en-IN")}
                          </span>
                        ) : null}
                        <span className="text-emerald-600 font-semibold">
                          {item.discount_price
                            ? `₹${(Number(item.discount_price) || 0).toLocaleString("en-IN")}`
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹
                      {(
                        (Number(item.quantity) || 0) *
                        (Number(item.price) || 0)
                      ).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 ring-1 ring-transparent hover:ring-indigo-100 transition-colors"
                          aria-label={`Edit ${item.item_name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 ring-1 ring-transparent hover:ring-rose-100 transition-colors"
                          aria-label={`Delete ${item.item_name}`}
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

      {/* Add / Edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin-premium"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  {editingId ? "Edit Item" : "Add New Item"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingId
                    ? "Update stock item details"
                    : "Add a new item to your inventory"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) =>
                    setFormData({ ...formData, item_name: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className={inputClass}
                  placeholder="e.g., Electronics, Furniture"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Purchase Price (₹) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.mrp}
                    onChange={(e) =>
                      setFormData({ ...formData, mrp: e.target.value })
                    }
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={labelClass}>Offer Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_price: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>GST %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.gst_percent}
                  onChange={(e) =>
                    setFormData({ ...formData, gst_percent: e.target.value })
                  }
                  className={inputClass}
                  placeholder="e.g., 18"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Item"
                      : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
