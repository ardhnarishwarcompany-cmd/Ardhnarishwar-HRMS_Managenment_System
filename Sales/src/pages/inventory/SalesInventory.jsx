import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  IndianRupee,
  AlertTriangle,
  Layers,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";
import API from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import toast from "react-hot-toast";

const emptyForm = {
  item_name: "",
  category: "",
  quantity: "",
  price: "",
  mrp: "",
  discount_price: "",
  gst_percent: "",
  low_stock_threshold: "5",
};

const inr = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function SalesInventory() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [invRes, statsRes] = await Promise.all([
        API.get("/sales/inventory"),
        API.get("/sales/inventory/stats"),
      ]);
      setItems(Array.isArray(invRes.data) ? invRes.data : []);
      setStats(statsRes.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchSearch = search
        ? it.item_name.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchCat = category ? it.category === category : true;
      return matchSearch && matchCat;
    });
  }, [items, search, category]);

  const categories = useMemo(
    () =>
      [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items],
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      item_name: item.item_name || "",
      category: item.category || "",
      quantity: String(item.quantity ?? ""),
      price: String(item.price ?? ""),
      mrp: String(item.mrp ?? ""),
      discount_price: String(item.discount_price ?? ""),
      gst_percent: String(item.gst_percent ?? ""),
      low_stock_threshold: String(item.low_stock_threshold ?? "5"),
    });
    setFormError("");
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) {
      setFormError("Item name is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        await API.put(`/sales/inventory/${editingId}`, form);
      } else {
        await API.post("/sales/inventory/add", form);
      }
      setShowModal(false);
      await fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.item_name}" from inventory?`)) return;
    try {
      await API.delete(`/sales/inventory/${item.id}`);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete item");
    }
  };

  const handleStock = async (item, delta) => {
    try {
      const res = await API.patch(`/sales/inventory/stock/${item.id}`, {
        delta,
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, quantity: res.data.quantity } : it,
        ),
      );
      API.get("/sales/inventory/stats")
        .then((r) => setStats(r.data))
        .catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        desc="Track products, stock levels and value"
      />

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Items"
          value={stats ? stats.total_items : "—"}
          subText="Distinct products"
          icon={<Package className="text-blue-600" size={22} />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
        />
        <StatCard
          title="Stock Value"
          value={stats ? `₹${inr(stats.total_value)}` : "—"}
          subText="Quantity × price"
          icon={<IndianRupee className="text-emerald-600" size={22} />}
          gradient="bg-gradient-to-br from-emerald-500 to-green-700"
        />
        <StatCard
          title="Total Units"
          value={stats ? stats.total_units : "—"}
          subText="Units in stock"
          icon={<Layers className="text-indigo-600" size={22} />}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
        />
        <StatCard
          title="Low Stock"
          value={stats ? (stats.low_stock_count ?? 0) : "—"}
          subText="At or below threshold"
          icon={<AlertTriangle className="text-amber-600" size={22} />}
          gradient="bg-gradient-to-br from-orange-500 to-amber-700"
        />
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input sm:w-48"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={openAdd}
          className="btn-primary"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="th">Item</th>
              <th className="th">Category</th>
              <th className="th">Stock</th>
              <th className="th">Price</th>
              <th className="th">MRP</th>
              <th className="th">Discount</th>
              <th className="th">GST %</th>
              <th className="th">Value</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center py-12 text-gray-500">
                  Loading inventory...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="10" className="text-center py-12 text-red-500">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-12 text-gray-500">
                  {items.length === 0
                    ? "No inventory items yet. Click \u201CAdd Item\u201D to create the first one."
                    : "No items match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((it) => {
                const low = it.quantity <= it.low_stock_threshold;
                return (
                  <tr key={it.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="td font-medium text-gray-800">
                      {it.item_name}
                    </td>
                    <td className="td text-gray-600">{it.category || "-"}</td>
                    <td className="td">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStock(it, -1)}
                          className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                          aria-label={`Decrease stock of ${it.item_name}`}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-10 text-center font-semibold text-gray-800">
                          {it.quantity}
                        </span>
                        <button
                          onClick={() => handleStock(it, 1)}
                          className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                          aria-label={`Increase stock of ${it.item_name}`}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="td text-gray-700">₹{inr(it.price)}</td>
                    <td className="td text-gray-500">
                      {Number(it.mrp) > 0 ? `₹${inr(it.mrp)}` : "-"}
                    </td>
                    <td className="td text-gray-500">
                      {Number(it.discount_price) > 0
                        ? `₹${inr(it.discount_price)}`
                        : "-"}
                    </td>
                    <td className="td text-gray-500">
                      {Number(it.gst_percent) > 0 ? `${it.gst_percent}%` : "-"}
                    </td>
                    <td className="td font-medium text-gray-700">
                      ₹{inr(it.quantity * it.price)}
                    </td>
                    <td className="td">
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={11} /> Low
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          In stock
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(it)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                          aria-label={`Edit ${it.item_name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(it)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${it.item_name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editingId ? "Edit Item" : "Add Inventory Item"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Item Name *
                  </label>
                  <input
                    name="item_name"
                    value={form.item_name}
                    onChange={handleChange}
                    placeholder="e.g. Wireless Mouse"
                    className="input"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Category
                  </label>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="e.g. Electronics"
                    className="input"
                    list="inv-categories"
                  />
                  <datalist id="inv-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Quantity *
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="0"
                    className="input"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Selling Price (₹) *
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="input"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    MRP (₹)
                  </label>
                  <input
                    name="mrp"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.mrp}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="input"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Discount Price (₹)
                  </label>
                  <input
                    name="discount_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="input"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    GST %
                  </label>
                  <input
                    name="gst_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.gst_percent}
                    onChange={handleChange}
                    placeholder="18"
                    className="input"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Low Stock Alert At
                  </label>
                  <input
                    name="low_stock_threshold"
                    type="number"
                    min="0"
                    value={form.low_stock_threshold}
                    onChange={handleChange}
                    placeholder="5"
                    className="input"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
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
