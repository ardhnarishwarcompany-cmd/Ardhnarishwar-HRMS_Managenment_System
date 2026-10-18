import { useEffect, useState } from "react";
import API from "../../api/axios";

// Values that HR users typed in "Other" / new entries. Shared for everyone via the backend.
const cache = {};
const pending = {};
const listeners = {};

const emit = (type) => (listeners[type] || []).forEach((fn) => fn([...(cache[type] || [])]));

function loadExtras(type) {
  if (!pending[type]) {
    pending[type] = API.get(`/joining-suggestions/${type}`)
      .then((res) => {
        const d = res?.data?.data;
        cache[type] = Array.isArray(d) ? d.filter((x) => typeof x === "string") : [];
        emit(type);
      })
      .catch(() => {
        cache[type] = cache[type] || [];
      });
  }
  return pending[type];
}

export async function saveExtra(type, value) {
  let saved = value;
  try {
    const res = await API.post(`/joining-suggestions/${type}`, { value });
    saved = res?.data?.data?.value || value;
  } catch (e) {
    // backend not available: keep it for this session only
  }
  const cur = cache[type] || [];
  if (!cur.some((x) => x.toLowerCase() === saved.toLowerCase())) {
    cache[type] = [...cur, saved];
    emit(type);
  }
  return saved;
}

export function useExtras(type) {
  const [extras, setExtras] = useState(() => (type && cache[type] ? [...cache[type]] : []));
  useEffect(() => {
    if (!type) return undefined;
    listeners[type] = listeners[type] || [];
    listeners[type].push(setExtras);
    loadExtras(type).then(() => setExtras([...(cache[type] || [])]));
    return () => {
      listeners[type] = (listeners[type] || []).filter((fn) => fn !== setExtras);
    };
  }, [type]);
  return extras;
}
