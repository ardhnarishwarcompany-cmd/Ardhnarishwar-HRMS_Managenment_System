import { useState } from "react";
import { Building2, Plus, MapPin, Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function OfficeLocation({ onSave, initialLocations = [] }) {
  const [locations, setLocations] = useState(initialLocations);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: 0.1,
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "radius" ? parseFloat(value) || 0 : value,
    }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
        toast.success("Current location set");
      },
      (error) => {
        toast.error(`Error: ${error.message}`);
      }
    );
  };

  const handleAdd = () => {
    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error("Please fill all required fields");
      return;
    }

    const newLocation = {
      id: Date.now(),
      name: formData.name,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius: formData.radius,
    };

    setLocations((prev) => [...prev, newLocation]);
    setFormData({ name: "", latitude: "", longitude: "", radius: 0.1 });
    setIsAdding(false);
    toast.success("Office location added");
  };

  const handleEdit = (location) => {
    setEditingId(location.id);
    setFormData({
      name: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius: location.radius,
    });
  };

  const handleUpdate = () => {
    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error("Please fill all required fields");
      return;
    }

    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === editingId
          ? {
              ...loc,
              name: formData.name,
              latitude: parseFloat(formData.latitude),
              longitude: parseFloat(formData.longitude),
              radius: formData.radius,
            }
          : loc
      )
    );
    setEditingId(null);
    setFormData({ name: "", latitude: "", longitude: "", radius: 0.1 });
    toast.success("Office location updated");
  };

  const handleDelete = (id) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    toast.success("Office location deleted");
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave?.(locations);
      toast.success("Office locations saved successfully");
    } catch {
      toast.error("Failed to save locations");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="it-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[var(--p)]">
            <Building2 className="w-5 h-5 text-[var(--p)]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--ink)]">Office Locations</h3>
            <p className="text-xs text-[var(--mute)]">Manage office locations for geofencing</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm shadow-md shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-5 bg-[var(--soft)]/50 rounded-2xl border border-[var(--line)]">
          <h4 className="font-bold text-sm text-[var(--ink)] mb-4">Add New Office Location</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Office Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Main Office"
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Radius (km)
              </label>
              <input
                type="number"
                name="radius"
                value={formData.radius}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Latitude *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="e.g., 28.6139"
                  className="flex-1 px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
                />
                <button
                  onClick={getCurrentLocation}
                  className="px-3.5 py-2.5 bg-white border border-[var(--line)] hover:bg-[var(--soft)] rounded-xl transition text-[var(--mute)] hover:text-[var(--p)]"
                  title="Use current location"
                >
                  <MapPin className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Longitude *
              </label>
              <input
                type="text"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                placeholder="e.g., 77.2090"
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[var(--line)]">
            <button
              onClick={() => {
                setIsAdding(false);
                setFormData({ name: "", latitude: "", longitude: "", radius: 0.1 });
              }}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--line)] text-[var(--mute)] hover:bg-white hover:text-[var(--ink)] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm shadow-md shadow-purple-500/20 transition hover:shadow-purple-500/35 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {locations.length === 0 ? (
          <div className="text-center py-12 text-[var(--mute)]">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40 text-[var(--p)]" />
            <p className="font-semibold text-sm text-[var(--ink)]">No office locations configured</p>
            <p className="text-xs text-[var(--mute)] mt-1">Add locations to enable geofencing</p>
          </div>
        ) : (
          locations.map((location) => (
            <div
              key={location.id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/30 hover:bg-white hover:shadow-sm transition"
            >
              {editingId === location.id ? (
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm focus:outline-none focus:border-[var(--p)]"
                  />
                  <input
                    type="text"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm focus:outline-none focus:border-[var(--p)]"
                  />
                  <input
                    type="text"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm focus:outline-none focus:border-[var(--p)]"
                  />
                  <input
                    type="number"
                    name="radius"
                    value={formData.radius}
                    onChange={handleInputChange}
                    step="0.01"
                    className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm focus:outline-none focus:border-[var(--p)]"
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--ink)]">{location.name}</p>
                    <p className="text-xs text-[var(--mute)] mt-0.5">
                      {location.latitude}, {location.longitude}
                    </p>
                    <p className="text-[11px] font-semibold text-[var(--p)] mt-1">
                      Radius: {location.radius} km
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {editingId === location.id ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setFormData({ name: "", latitude: "", longitude: "", radius: 0.1 });
                      }}
                      className="p-2 text-[var(--mute)] hover:bg-gray-100 rounded-xl transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-[var(--p)] hover:bg-purple-50 rounded-xl transition"
                      title="Edit location"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      title="Delete location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {locations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--line)]">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save All Locations
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
