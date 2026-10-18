import { useState } from "react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import InternalChatWindow from "./InternalChatWindow";
import { MessageCircle } from "lucide-react";
import PageHeader from "../common/PageHeader";

const MY_TYPE = "hr";

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState(null);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
      <PageHeader
        icon={MessageCircle}
        title="Chat"
        subtitle="Message employees, HR contacts and clients in real time."
      />
      <div className="flex h-[calc(100vh-230px)] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ChatList setActiveChat={setActiveChat} activeChat={activeChat} />
        {activeChat?.internal ? (
          <InternalChatWindow activeChat={activeChat} myType={MY_TYPE} />
        ) : activeChat ? (
          <ChatWindow activeChat={activeChat} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 text-slate-400">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
              <MessageCircle
                size={36}
                aria-hidden="true"
                className="text-indigo-400"
              />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-700">
              Select a chat
            </h3>
            <p className="text-sm">
              Choose an IT employee, HR contact, or client to start a private conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
