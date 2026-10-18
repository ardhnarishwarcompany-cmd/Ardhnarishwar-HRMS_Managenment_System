import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MessageCircle, Search, Users, Code2, UserRound } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const UPLOADS_BASE_URL =
  import.meta.env.VITE_UPLOADS_BASE_URL ||
  BASE_URL.replace(/\/api\/?$/, "");

const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (avatar.startsWith("/uploads/")) {
    return `${UPLOADS_BASE_URL}${avatar.startsWith("/uploads/") ? avatar.slice(8) : avatar}`;
  }
  if (avatar.startsWith("uploads/")) {
    return `${UPLOADS_BASE_URL}/${avatar}`;
  }
  return `${UPLOADS_BASE_URL}/uploads/${avatar.replace(/^\/+/, "")}`;
};

const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

export default function ChatList({ setActiveChat, activeChat }) {
  const [clients, setClients] = useState([]);
  const [itContacts, setItContacts] = useState([]);
  const [hrContacts, setHrContacts] = useState([]);
  const [search, setSearch] = useState("");

  const previousUnreadRef = useRef(new Map());
  const firstLoadRef = useRef(true);

  const token = localStorage.getItem("hrms_hr_Token");
  const auth = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    let cancelled = false;

    const auth = {
      headers: { Authorization: `Bearer ${token}` },
    };

    const notifyNewMessage = async (contact, unreadCount) => {
      if (!("Notification" in window)) return;

      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission !== "granted") return;

        const notification = new Notification(
          contact.name || "New message",
          {
            body:
              unreadCount > 1
                ? `${unreadCount} unread messages`
                : "You have a new message",
            icon: getAvatarUrl(contact.avatar) || "/favicon.ico",
            tag: `internal-chat-${contact.room}`,
          },
        );

        notification.onclick = () => {
          window.focus();
          setActiveChat({
            internal: true,
            room: contact.room,
            recipientId: Number(contact.id),
            name: contact.name,
            email: contact.email,
            avatar: contact.avatar || null,
            contactType: contact.contactType || "it",
            last_message: contact.last_message || "",
            last_message_at: contact.last_message_at || null,
            unread_count: contact.unread_count || 0,
          });
          notification.close();
        };
      } catch (err) {
        console.warn("Browser notification error:", err);
      }
    };

    const load = async () => {
      try {
        // One failing list must not blank the other two.
        const [clientsRes, itRes, hrRes] = await Promise.allSettled([
          axios.get(`${BASE_URL}/chat/hr/clients`, auth),
          axios.get(`${BASE_URL}/chat/internal/it-contacts`, auth),
          axios.get(`${BASE_URL}/chat/internal/hrs`, auth),
        ]);
        const rowsOf = (result, label) => {
          if (result.status === "fulfilled") return result.value.data?.data || [];
          console.error(`Chat ${label} load error:`, result.reason);
          return null;
        };

        const clientRows = rowsOf(clientsRes, "clients");
        const itRows = rowsOf(itRes, "IT contacts");
        const hrRows = rowsOf(hrRes, "HR contacts");

        const nextClients = clientRows || [];
        const nextItContacts = (itRows || []).map((contact) => ({
          ...contact,
          contactType: "it",
        }));
        const nextHrContacts = (hrRows || []).map((contact) => ({
          ...contact,
          contactType: "hr",
        }));

        if (cancelled) return;

        if (clientRows) setClients(nextClients);
        if (itRows) setItContacts(nextItContacts);
        if (hrRows) setHrContacts(nextHrContacts);

        if (!firstLoadRef.current) {
          for (const contact of [...nextItContacts, ...nextHrContacts]) {
            const currentUnread = Number(contact.unread_count || 0);
            const previousUnread = Number(
              previousUnreadRef.current.get(contact.room) || 0,
            );

            if (currentUnread > previousUnread) {
              const isActive =
                activeChat?.internal && activeChat?.room === contact.room;

              if (!isActive) {
                await notifyNewMessage(contact, currentUnread);
              }
            }
          }
        }

        const unreadMap = new Map();
        for (const contact of [...nextItContacts, ...nextHrContacts]) {
          unreadMap.set(contact.room, Number(contact.unread_count || 0));
        }

        previousUnreadRef.current = unreadMap;
        firstLoadRef.current = false;
      } catch (err) {
        if (!cancelled) {
          console.error("Chat contacts load error:", err);
        }
      }
    };

    load();

    const interval = setInterval(load, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeChat?.internal, activeChat?.room, token, setActiveChat]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return clients;

    return clients.filter((c) =>
      [c.company_name, c.client_name, c.email].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [clients, search]);

  const filteredItContacts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return itContacts;

    return itContacts.filter((c) =>
      [c.name, c.email, c.employee_code, c.department].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [itContacts, search]);

  const filteredHrContacts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return hrContacts;

    return hrContacts.filter((c) =>
      [c.name, c.email, c.employee_code, c.department].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [hrContacts, search]);

  const openInternal = (contact) => {
    setActiveChat({
      internal: true,
      room: contact.room,
      recipientId: Number(contact.id),
      name: contact.name,
      email: contact.email,
      avatar: contact.avatar || null,
      contactType: contact.contactType || "it",
      last_message: contact.last_message || "",
      last_message_at: contact.last_message_at || null,
      unread_count: Number(contact.unread_count || 0),
    });
  };

  const openClient = async (client) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/chat/hr/start`,
        { clientId: client.id },
        auth,
      );

      setActiveChat({
        conversation_id: res.data.conversationId,
        company_name: client.company_name,
        client_name: client.client_name,
      });
    } catch (err) {
      console.error("Client chat start error:", err);
    }
  };

  const renderSection = ({
    title,
    icon,
    tone = "indigo",
    children,
    count,
  }) => (
    <div>
      <div className="flex items-center justify-between px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>

        {typeof count === "number" && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              tone === "violet"
                ? "bg-violet-50 text-violet-600"
                : "bg-indigo-50 text-indigo-600"
            }`}
          >
            {count}
          </span>
        )}
      </div>

      {children}
    </div>
  );

  const renderContact = ({ contact, type }) => {
    const isActive =
      activeChat?.internal && activeChat?.room === contact.room;

    const avatarUrl = getAvatarUrl(contact.avatar);
    const unreadCount = Number(contact.unread_count || 0);

    return (
      <button
        key={arguments[0]?.key}
        type="button"
        onClick={() => openInternal(contact)}
        className={`flex w-full items-center gap-3 border-b border-slate-100 border-l-4 p-3.5 text-left transition-all duration-200 ${
          isActive
            ? "border-l-indigo-500 bg-indigo-50"
            : "border-l-transparent hover:bg-slate-50"
        }`}
      >
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold ring-2 transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:shadow-lg ${
            type === "it"
              ? "bg-sky-50 text-sky-600 ring-sky-100"
              : "bg-violet-50 text-violet-600 ring-violet-100"
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={contact.name || "Employee"}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            initials(contact.name)
          )}

          {contact.is_online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
              {contact.name}
            </div>

            {contact.last_message_at && (
              <span className="shrink-0 text-[10px] text-slate-400">
                {new Date(contact.last_message_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <div
              className={`min-w-0 flex-1 truncate text-xs ${
                unreadCount > 0
                  ? "font-semibold text-slate-700"
                  : "text-slate-500"
              }`}
            >
              {contact.last_message || contact.email || (
                type === "it" ? "IT employee" : "HR employee"
              )}
            </div>

            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex w-[285px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Messages</h2>
            <p className="text-[11px] text-slate-400">
              Private conversations
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
            <MessageCircle size={18} />
          </div>
        </div>

        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people or chats..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {renderSection({
          title: "IT Employees",
          Icon: Code2,
          tone: "indigo",
          count: itContacts.length,
          children: filteredItContacts.length ? (
            filteredItContacts.map((c) =>
              renderContact({ key: `it-${c.id}`, contact: c, type: "it" })
            )
          ) : (
            <div className="px-4 py-5 text-xs text-slate-400">
              {itContacts.length
                ? "No IT employee matches your search."
                : "No active IT employees found."}
            </div>
          ),
        })}

        {renderSection({
          title: "HR Employees",
          Icon: UserRound,
          tone: "violet",
          count: hrContacts.length,
          children: filteredHrContacts.length ? (
            filteredHrContacts.map((c) =>
              renderContact({ key: `hr-${c.id}`, contact: c, type: "hr" })
            )
          ) : (
            <div className="px-4 py-5 text-xs text-slate-400">
              {hrContacts.length
                ? "No HR employee matches your search."
                : "No other HR employees found."}
            </div>
          ),
        })}

        {renderSection({
          title: "Clients",
          Icon: Users,
          tone: "indigo",
          count: clients.length,
          children: filteredClients.length ? (
            filteredClients.map((client) => (
              <button
                key={`client-${client.id}`}
                type="button"
                onClick={() => openClient(client)}
                className="flex w-full items-center gap-3 border-b border-slate-100 border-l-4 border-l-transparent p-3.5 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-600 ring-1 ring-emerald-100">
                  {initials(client.client_name || client.company_name)}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {client.client_name || client.company_name}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {client.company_name || client.email || "Client"}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-5 text-xs text-slate-400">
              {clients.length
                ? "No client matches your search."
                : "No clients found."}
            </div>
          ),
        })}
      </div>
    </div>
  );
}
