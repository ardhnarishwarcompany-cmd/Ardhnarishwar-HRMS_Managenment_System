import React, { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import API from "../api/axios";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Hello! I am your Sales Assistant. Ask me about your clients, follow-ups, proposals, invoices, targets, leads or EOD reports - or say \"summary\" for today's snapshot.",
      time: new Date(),
    },
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const userText = text.trim();
    if (!userText || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: userText, time: new Date() }]);
    setText("");
    setLoading(true);

    try {
      const res = await API.post("/automation/chatbot/message", {
        message: userText,
        session_id: sessionId,
        user_type: "SALES",
      });
      const data = res.data?.data;
      setSessionId(data?.session_id ?? sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: data?.response || "Sorry, I could not get a response.", time: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Connection error. Please try again.", time: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fmt = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="sp-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 bg-brand-gradient px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <Bot className="text-white" size={23} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">Sales Assistant</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> Online · Answers from your live sales data
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={`${msg.time}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[76%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${msg.role === "user" ? "bg-slate-700" : "bg-brand-gradient"}`}>
                    {msg.role === "user" ? <User className="text-white" size={15} /> : <Bot className="text-white" size={15} />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${msg.role === "user" ? "rounded-br-md bg-brand-gradient text-white shadow-brand" : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>
                    <p className="whitespace-pre-line text-sm leading-6">{msg.content}</p>
                    <p className={`mt-1.5 text-[10px] ${msg.role === "user" ? "text-white/75" : "text-slate-400"}`}>{fmt(msg.time)}</p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient">
                    <Bot className="text-white" size={15} />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-4 sm:p-5">
          <div className="mx-auto w-full max-w-4xl">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about leads, targets, proposals or sales strategy..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                disabled={loading}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!text.trim() || loading}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {loading ? <Loader2 className="animate-spin" size={19} /> : <Send size={19} />}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">Sales Assistant · Ask about leads, targets, proposals or sales strategy</p>
          </div>
        </footer>
      </div>
    </section>
  );
}
